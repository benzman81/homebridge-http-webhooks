const Constants = require('./Constants');

var request = require("request");
var http = require('http');
var https = require('https');
var url = require('url');
var auth = require('http-auth');
var fs = require('fs');
var Service, Characteristic;

function Server(ServiceParam, CharacteristicParam, platform, platformConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.webhookPort = platformConfig["webhook_port"] || Constants.DEFAULT_PORT;
  this.webhookListenHost = platformConfig["webhook_listen_host"] || Constants.DEFAULT_LISTEN_HOST;
  this.httpAuthUser = platformConfig["http_auth_user"] || null;
  this.httpAuthPass = platformConfig["http_auth_pass"] || null;
  this.https = platformConfig["https"] === true;
  this.httpsKeyFile = platformConfig["https_keyfile"];
  this.httpsCertFile = platformConfig["https_certfile"];
}

Server.prototype.setAccessories = function(accessories) {
  this.accessories = accessories;
};

Server.prototype.createSSLCertificate = function() {
  this.log("Generating new ssl certificate.");
  var selfsigned = require('selfsigned');
  var certAttrs = [{ name: 'homebridgeHttpWebhooks', value: 'homebridgeHttpWebhooks.com' , type: 'homebridgeHttpWebhooks'}];
  var certOpts = { days: Constants.CERT_DAYS};
  certOpts.extensions = [{
    name: 'subjectAltName',
    altNames: [{
            type: 2,
            value: 'homebridgeHttpWebhooks.com'
    }, {
            type: 2,
            value: 'localhost'
    }]
  }];
  var pems = selfsigned.generate(certAttrs, certOpts);
  var cachedSSLCert = pems;
  cachedSSLCert.timestamp = Date.now();
  cachedSSLCert.certVersion = Constants.CERT_VERSION;
  return cachedSSLCert;
};

Server.prototype.getSSLServerOptions = function() {
  var sslServerOptions = {};
  if(this.https) {
    if(!this.httpsKeyFile || !this.httpsCertFile) {
      this.log("Using automatic created ssl certificate.");
      var cachedSSLCert = this.storage.getItemSync("http-webhook-ssl-cert");
      if(cachedSSLCert) {
        var certVersion = cachedSSLCert.certVersion;
        var timestamp = Date.now() - cachedSSLCert.timestamp;
        var diffInDays = timestamp/1000/60/60/24;
        if(diffInDays > Constants.CERT_DAYS - 1 || certVersion !== Constants.CERT_VERSION) {
          cachedSSLCert = null;
        }
      }
      if(!cachedSSLCert) {
        cachedSSLCert = this.createSSLCertificate();
        this.storage.setItemSync("http-webhook-ssl-cert", cachedSSLCert);
      }

      sslServerOptions = {
          key: cachedSSLCert.private,
          cert: cachedSSLCert.cert
      };
    }
    else {
      sslServerOptions = {
          key: fs.readFileSync(this.httpsKeyFile),
          cert: fs.readFileSync(this.httpsCertFile)
      };
    }
  }
  return sslServerOptions;
};

Server.prototype.createServerCallback = function() {
  return (function(request, response) {
    var theUrl = request.url;
    var theUrlParts = url.parse(theUrl, true);
    var theUrlParams = theUrlParts.query;
    var body = [];
    request.on('error', (function(err) {
      this.log("[ERROR Http WebHook Server] Reason: %s.", err);
    }).bind(this)).on('data', function(chunk) {
      body.push(chunk);
    }).on('end', (function() {
      body = Buffer.concat(body).toString();

      response.on('error', function(err) {
        this.log("[ERROR Http WebHook Server] Reason: %s.", err);
      });

      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');

      if (!theUrlParams.accessoryId) {
        response.statusCode = 404;
        response.setHeader("Content-Type", "text/plain");
        var errorText = "[ERROR Http WebHook Server] No accessoryId in request.";
        this.log(errorText);
        response.write(errorText);
        response.end();
      }
      else {
        var responseBody = {
          "success" : true
        };
        var accessoryId = theUrlParams.accessoryId;
        for (var i = 0; i < this.accessories.length; i++) {
          var accessory = this.accessories[i];
          if (accessory.id === accessoryId) {
            if (accessory.type == "thermostat") {
              if (theUrlParams.currenttemperature != null) {
                var cachedCurTemp = this.storage.getItemSync("http-webhook-current-temperature-" + accessoryId);
                if (cachedCurTemp === undefined) {
                  cachedCurTemp = 0;
                }
                this.storage.setItemSync("http-webhook-current-temperature-" + accessoryId, theUrlParams.currenttemperature);
                if (cachedCurTemp !== theUrlParams.currenttemperature) {
                  accessory.changeCurrentTemperatureHandler(theUrlParams.currenttemperature);
                }
              }
              if (theUrlParams.targettemperature != null) {
                var cachedCurTemp = this.storage.getItemSync("http-webhook-target-temperature-" + accessoryId);
                if (cachedCurTemp === undefined) {
                  cachedCurTemp = 10;
                }
                this.storage.setItemSync("http-webhook-target-temperature-" + accessoryId, theUrlParams.targettemperature);
                if (cachedCurTemp !== theUrlParams.targettemperature) {
                  accessory.changeTargetTemperatureHandler(theUrlParams.targettemperature);
                }
              }
              if (theUrlParams.currentstate != null) {
                var cachedState = this.storage.getItemSync("http-webhook-current-heating-cooling-state-" + accessoryId);
                if (cachedState === undefined) {
                  cachedState = Characteristic.CurrentHeatingCoolingState.OFF;
                }
                this.storage.setItemSync("http-webhook-current-heating-cooling-state-" + accessoryId, theUrlParams.currentstate);
                if (cachedState !== theUrlParams.currentstate) {
                  accessory.changeCurrentHeatingCoolingStateHandler(theUrlParams.currentstate);
                }
              }
              if (theUrlParams.targetstate != null) {
                var cachedState = this.storage.getItemSync("http-webhook-target-heating-cooling-state-" + accessoryId);
                if (cachedState === undefined) {
                  cachedState = Characteristic.TargetHeatingCoolingState.OFF;
                }
                this.storage.setItemSync("http-webhook-target-heating-cooling-state-" + accessoryId, theUrlParams.targetstate);
                if (cachedState !== theUrlParams.targetstate) {
                  accessory.changeTargetHeatingCoolingStateHandler(theUrlParams.targetstate);
                }
              }
              responseBody = {
                "success" : true
              };
            }
            else if (accessory.type == "garagedooropener") {
              if (theUrlParams.currentdoorstate != null) {
                var cachedCurrentDoorState = this.storage.getItemSync("http-webhook-current-door-state-" + accessoryId);
                if (cachedCurrentDoorState === undefined) {
                  cachedCurrentDoorState = Characteristic.CurrentDoorState.CLOSED;
                }
                this.storage.setItemSync("http-webhook-current-door-state-" + accessoryId, theUrlParams.currentdoorstate);
                if (cachedCurrentDoorState !== theUrlParams.currentdoorstate) {
                  accessory.changeCurrentDoorStateHandler(theUrlParams.currentdoorstate);
                }
              }
              if (theUrlParams.targetdoorstate != null) {
                var cachedTargetDoorState = this.storage.getItemSync("http-webhook-target-door-state-" + accessoryId);
                if (cachedTargetDoorState === undefined) {
                  cachedTargetDoorState = Characteristic.TargetDoorState.CLOSED;
                }
                this.storage.setItemSync("http-webhook-target-door-state-" + accessoryId, theUrlParams.targetdoorstate);
                if (cachedTargetDoorState !== theUrlParams.targetdoorstate) {
                  accessory.changeTargetDoorStateHandler(theUrlParams.targetdoorstate);
                }
              }
              if (theUrlParams.obstructiondetected != null) {
                var cachedObstructionDetected = this.storage.getItemSync("http-webhook-obstruction-detected-" + accessoryId);
                if (cachedObstructionDetected === undefined) {
                  cachedObstructionDetected = false;
                }
                this.storage.setItemSync("http-webhook-obstruction-detected-" + accessoryId, theUrlParams.obstructiondetected);
                if (cachedObstructionDetected !== theUrlParams.obstructiondetected) {
                  accessory.changeObstructionDetectedHandler(theUrlParams.obstructiondetected);
                }
              }
              responseBody = {
                "success" : true,
                "currentState" : cachedCurrentDoorState,
                "targetState" : cachedTargetDoorState,
                "obstruction" : cachedObstructionDetected
              };
            }
            else if (accessory.type == "windowcovering") {
              if (theUrlParams.currentposition != null) {
                var cachedCurrentPosition = this.storage.getItemSync("http-webhook-current-position-" + accessoryId);
                if (cachedCurrentPosition === undefined) {
                  cachedCurrentPosition = 100;
                }
                this.storage.setItemSync("http-webhook-current-position-" + accessoryId, theUrlParams.currentposition);
                if (cachedCurrentPosition !== theUrlParams.currentposition) {
                  accessory.changeCurrentPositionHandler(theUrlParams.currentposition);
                }
              }

              if (theUrlParams.targetposition != null) {
                var cachedTargetPosition = this.storage.getItemSync("http-webhook-target-position-" + accessoryId);
                if (cachedTargetPosition === undefined) {
                  cachedTargetPosition = 100;
                }
                this.storage.setItemSync("http-webhook-target-position-" + accessoryId, theUrlParams.targetposition);
                if (cachedTargetPosition !== theUrlParams.targetposition) {
                  accessory.changeTargetPositionHandler(theUrlParams.targetposition);
                }
              }
              if (theUrlParams.positionstate != null) {
                var cachedPositionState = this.storage.getItemSync("http-webhook-position-state-" + accessoryId);
                if (cachedPositionState === undefined) {
                  cachedPositionState = false;
                }
                this.storage.setItemSync("http-webhook-position-state-" + accessoryId, theUrlParams.positionstate);
                if (cachedPositionState !== theUrlParams.positionstate) {
                  accessory.changePositionStateHandler(theUrlParams.positionstate);
                }
              }
              responseBody = {
                "success" : true,
                "CurrentPosition" : cachedCurrentPosition,
                "TargetPosition" : cachedTargetPosition,
                "PositionState" : cachedPositionState
              };
            }
            else if (accessory.type == "lockmechanism") {
              if (theUrlParams.lockcurrentstate != null) {
                var cachedLockCurrentState = this.storage.getItemSync("http-webhook--lock-current-state-" + accessoryId);
                if (cachedLockCurrentState === undefined) {
                  cachedLockCurrentState = Characteristic.LockCurrentState.SECURED;
                }
                this.storage.setItemSync("http-webhook-lock-current-state-" + accessoryId, theUrlParams.lockcurrentstate);
                if (cachedLockCurrentState !== theUrlParams.lockcurrentstate) {
                  accessory.changeLockCurrentStateHandler(theUrlParams.lockcurrentstate);
                }
              }
              if (theUrlParams.locktargetstate != null) {
                var cachedLockTargetState = this.storage.getItemSync("http-webhook-lock-target-state-" + accessoryId);
                if (cachedLockTargetState === undefined) {
                  cachedLockTargetState = Characteristic.LockTargetState.SECURED;
                }
                this.storage.setItemSync("http-webhook-lock-target-state-" + accessoryId, theUrlParams.locktargetstate);
                if (cachedLockTargetState !== theUrlParams.locktargetstate) {
                  accessory.changeLockTargetStateHandler(theUrlParams.locktargetstate);
                }
              }
              responseBody = {
                "success" : true,
                "currentState" : cachedLockCurrentState,
                "targetState" : cachedLockTargetState
              };
            }
            else if (accessory.type == "security") {
              if (theUrlParams.currentstate != null) {
                var cachedState = this.storage.getItemSync("http-webhook-current-security-state-" + accessoryId);
                if (cachedState === undefined) {
                  cachedState = Characteristic.SecuritySystemCurrentState.DISARMED;
                }
                this.storage.setItemSync("http-webhook-current-security-state-" + accessoryId, theUrlParams.currentstate);
                if (cachedState !== theUrlParams.currentstate) {
                  accessory.changeCurrentStateHandler(theUrlParams.currentstate);
                }
              }
              if (theUrlParams.targetstate != null) {
                var cachedState = this.storage.getItemSync("http-webhook-target-security-state-" + accessoryId);
                if (cachedState === undefined) {
                  cachedState = Characteristic.SecuritySystemTargetState.DISARM;
                }
                this.storage.setItemSync("http-webhook-target-security-state-" + accessoryId, theUrlParams.targetstate);
                if (cachedState !== theUrlParams.targetstate) {
                  accessory.changeTargetStateHandler(theUrlParams.targetstate);
                }
              }
              responseBody = {
                "success" : true
              };
            }
            else {
              if (accessory.type == "leak" || accessory.type == "humidity" || accessory.type == "temperature" || accessory.type == "airquality" || accessory.type == "light") {
                var cachedValue = this.storage.getItemSync("http-webhook-" + accessoryId);
                if (cachedValue === undefined) {
                  cachedValue = 0;
                }
                if (!theUrlParams.value) {
                  responseBody = {
                    "success" : true,
                    "state" : cachedValue
                  };
                }
                else {
                  var value = theUrlParams.value;
                  this.storage.setItemSync("http-webhook-" + accessoryId, value);
                  if (cachedValue !== value) {
                    accessory.changeHandler(value);
                  }
                }
              }
              else if (accessory.type == "outlet") {
                var cachedState = this.storage.getItemSync("http-webhook-" + accessoryId);
                if (cachedState === undefined) {
                  cachedState = false;
                }
                var cachedStateInUse = this.storage.getItemSync("http-webhook-" + accessoryId + "-inUse");
                if (cachedStateInUse === undefined) {
                  cachedStateInUse = false;
                }
                if (!theUrlParams.state && !theUrlParams.stateOutletInUse) {
                  responseBody = {
                    "success" : true,
                    "state" : cachedState,
                    "stateOutletInUse" : cachedStateInUse
                  };
                }
                else {
                  if (theUrlParams.state) {
                    var state = theUrlParams.state;
                    var stateBool = state === "true";
                    this.storage.setItemSync("http-webhook-" + accessoryId, stateBool);
                    // this.log("[INFO Http WebHook Server] State change of
                    // '%s'
                    // to '%s'.",accessory.id,stateBool);
                    if (cachedState !== stateBool) {
                      accessory.changeHandler(stateBool);
                    }
                  }
                  if (theUrlParams.stateOutletInUse) {
                    var stateOutletInUse = theUrlParams.stateOutletInUse;
                    var stateOutletInUseBool = stateOutletInUse === "true";
                    this.storage.setItemSync("http-webhook-" + accessoryId + "-inUse", stateOutletInUseBool);
                    // this.log("[INFO Http WebHook Server] State change of
                    // '%s'
                    // to '%s'.",accessory.id,stateBool);
                    if (cachedStateInUse !== stateOutletInUseBool) {
                      accessory.changeHandlerInUse(stateOutletInUseBool);
                    }
                  }
                }
              }
              else if (accessory.type == "pushbutton") {
                if (!theUrlParams.state) {
                  responseBody = {
                    "success" : true,
                    "state" : cachedState
                  };
                }
                else {
                  var state = theUrlParams.state;
                  var stateBool = state === "true";
                  // this.log("[INFO Http WebHook Server] State change of '%s'
                  // to '%s'.",accessory.id,stateBool);
                  accessory.changeHandler(stateBool);
                }
              }
              else if (accessory.type == "statelessswitch") {
                if (theUrlParams.event && theUrlParams.event) {
                  accessory.changeHandler(theUrlParams.buttonName, theUrlParams.event);
                }
              }
              else if (accessory.type == "lightbulb") {
                var cachedState = this.storage.getItemSync("http-webhook-" + accessoryId);
                if (cachedState === undefined) {
                  cachedState = false;
                }
                var cachedBrightness = this.storage.getItemSync("http-webhook-brightness-" + accessoryId);
                if (cachedBrightness === undefined) {
                  cachedBrightness = -1;
                }
                if (!theUrlParams.state && !theUrlParams.value) {
                  responseBody = {
                    "success" : true,
                    "brightness" : cachedBrightness,
                    "state" : cachedState
                  };
                }
                else {
                  var brightness = theUrlParams.value || cachedBrightness;
                  var state = theUrlParams.state || cachedState;
                  var stateBool = state === "true" || state === true;
                  this.storage.setItemSync("http-webhook-" + accessoryId, stateBool);
                  var brightnessInt = parseInt(brightness);
                  this.storage.setItemSync("http-webhook-brightness-" + accessoryId, brightnessInt);
                  if (cachedState !== stateBool || cachedBrightness != brightnessInt) {
                    accessory.changeHandler(stateBool, brightnessInt);
                  }
                }
              }
              else {
                var cachedState = this.storage.getItemSync("http-webhook-" + accessoryId);
                if (cachedState === undefined) {
                  cachedState = false;
                }
                if (!theUrlParams.state) {
                  responseBody = {
                    "success" : true,
                    "state" : cachedState
                  };
                }
                else {
                  var state = theUrlParams.state;
                  var stateBool = state === "true";
                  this.storage.setItemSync("http-webhook-" + accessoryId, stateBool);
                  // this.log("[INFO Http WebHook Server] State change of '%s'
                  // to '%s'.",accessory.id,stateBool);
                  if (cachedState !== stateBool) {
                    accessory.changeHandler(stateBool);
                  }
                }
              }
              break;
            }
          }
        }
        response.write(JSON.stringify(responseBody));
        response.end();
      }
    }).bind(this));
  }).bind(this);
};

Server.prototype.start = function() {
  var sslServerOptions = this.getSSLServerOptions();

  var serverCallback = this.createServerCallback();

  if (this.httpAuthUser && this.httpAuthPass) {
    var httpAuthUser = this.httpAuthUser;
    var httpAuthPass = this.httpAuthPass;
    basicAuth = auth.basic({
      realm : "Auth required"
    }, function(username, password, callback) {
      callback(username === httpAuthUser && password === httpAuthPass);
    });
    if(this.https) {
      https.createServer(basicAuth, sslServerOptions, serverCallback).listen(this.webhookPort, this.webhookListenHost);
    }
    else {
      http.createServer(basicAuth, serverCallback).listen(this.webhookPort, this.webhookListenHost);
    }
  }
  else {
    if(this.https) {
      https.createServer(sslServerOptions, serverCallback).listen(this.webhookPort, this.webhookListenHost);
    }
    else {
      http.createServer(serverCallback).listen(this.webhookPort, this.webhookListenHost);
    }
  }
  this.log("Started server for webhooks on port '%s' listening for host '%s'.", this.webhookPort, this.webhookListenHost);
};

module.exports = Server;