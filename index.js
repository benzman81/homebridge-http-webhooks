var request = require("request");

var http = require('http');

var url = require('url');

var auth = require('http-auth');

var Service, Characteristic;

var DEFAULT_REQUEST_TIMEOUT = 10000;

var CONTEXT_FROM_WEBHOOK = "fromHTTPWebhooks";

var CONTEXT_FROM_TIMEOUTCALL = "fromTimeoutCall";



module.exports = function(homebridge) {

  Service = homebridge.hap.Service;

  Characteristic = homebridge.hap.Characteristic;



  homebridge.registerPlatform("homebridge-http-webhooks", "HttpWebHooks", HttpWebHooksPlatform);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSensor", HttpWebHookSensorAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSwitch", HttpWebHookSwitchAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookPushButton", HttpWebHookPushButtonAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookLight", HttpWebHookLightAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookThermostat", HttpWebHookThermostatAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookOutlet", HttpWebHookOutletAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSecurity", HttpWebHookSecurityAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookGarageDoorOpener", HttpWebHookGarageDoorOpenerAccessory);

  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookLockMechanism", HttpWebHookLockMechanismAccessory);

};



function HttpWebHooksPlatform(log, config) {

  this.log = log;

  this.cacheDirectory = config["cache_directory"] || "./.node-persist/storage";

  this.webhookPort = config["webhook_port"] || 51828;

  this.sensors = config["sensors"] || [];

  this.switches = config["switches"] || [];

  this.pushButtons = config["pushbuttons"] || [];

  this.lights = config["lights"] || [];

  this.thermostats = config["thermostats"] || [];

  this.outlets = config["outlets"] || [];

  this.security = config["security"] || [];

  this.garageDoorOpeners = config["garagedooropeners"] || [];

  this.lockMechanisms = config["lockmechanisms"] || [];

  this.httpAuthUser = config["http_auth_user"] || null;

  this.httpAuthPass = config["http_auth_pass"] || null;

  this.storage = require('node-persist');

  this.storage.initSync({

    dir : this.cacheDirectory

  });

}



HttpWebHooksPlatform.prototype = {



  accessories : function(callback) {

    var accessories = [];

    for (var i = 0; i < this.sensors.length; i++) {

      var sensor = new HttpWebHookSensorAccessory(this.log, this.sensors[i], this.storage);

      accessories.push(sensor);

    }



    for (var i = 0; i < this.switches.length; i++) {

      var switchAccessory = new HttpWebHookSwitchAccessory(this.log, this.switches[i], this.storage);

      accessories.push(switchAccessory);

    }



    for (var i = 0; i < this.pushButtons.length; i++) {

      var pushButtonsAccessory = new HttpWebHookPushButtonAccessory(this.log, this.pushButtons[i], this.storage);

      accessories.push(pushButtonsAccessory);

    }



    for (var i = 0; i < this.lights.length; i++) {

      var lightAccessory = new HttpWebHookLightAccessory(this.log, this.lights[i], this.storage);

      accessories.push(lightAccessory);

    }



    for (var i = 0; i < this.thermostats.length; i++) {

      var thermostatAccessory = new HttpWebHookThermostatAccessory(this.log, this.thermostats[i], this.storage);

      accessories.push(thermostatAccessory);

    }



    for (var i = 0; i < this.outlets.length; i++) {

      var outletAccessory = new HttpWebHookOutletAccessory(this.log, this.outlets[i], this.storage);

      accessories.push(outletAccessory);

    }



    for (var i = 0; i < this.security.length; i++) {

      var securityAccessory = new HttpWebHookSecurityAccessory(this.log, this.security[i], this.storage);

      accessories.push(securityAccessory);

    }



    for (var i = 0; i < this.garageDoorOpeners.length; i++) {

      var garageDoorOpenerAccessory = new HttpWebHookGarageDoorOpenerAccessory(this.log, this.garageDoorOpeners[i], this.storage);

      accessories.push(garageDoorOpenerAccessory);

    }



    for (var i = 0; i < this.lockMechanisms.length; i++) {

      var lockMechanismAccessory = new HttpWebHookLockMechanismAccessory(this.log, this.lockMechanisms[i], this.storage);

      accessories.push(lockMechanismAccessory);

    }



    var accessoriesCount = accessories.length;



    callback(accessories);



    var createServerCallback = (function(request, response) {

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

            success : true

          };

          var accessoryId = theUrlParams.accessoryId;

          for (var i = 0; i < accessoriesCount; i++) {

            var accessory = accessories[i];

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

                  success : true

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

                  success : true,

                  currentState : cachedCurrentDoorState,

                  targetState : cachedTargetDoorState,

                  obstruction : cachedObstructionDetected                  

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

                  success : true,

                  currentState : cachedLockCurrentState,

                  targetState : cachedLockTargetState
                 

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

                  success : true

                };

              }

              else {

                if (accessory.type == "humidity" || accessory.type == "temperature" || accessory.type == "airquality") {

                  var cachedValue = this.storage.getItemSync("http-webhook-" + accessoryId);

                  if (cachedValue === undefined) {

                    cachedValue = 0;

                  }

                  if (!theUrlParams.value) {

                    responseBody = {

                      success : true,

                      state : cachedValue

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

                      success : true,

                      state : cachedState,

                      stateOutletInUse : cachedStateInUse

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

                      success : true,

                      state : cachedState

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

                else {

                  var cachedState = this.storage.getItemSync("http-webhook-" + accessoryId);

                  if (cachedState === undefined) {

                    cachedState = false;

                  }

                  if (!theUrlParams.state) {

                    responseBody = {

                      success : true,

                      state : cachedState

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



    if (this.httpAuthUser && this.httpAuthPass) {

      var httpAuthUser = this.httpAuthUser;

      var httpAuthPass = this.httpAuthPass;

      basicAuth = auth.basic({

        realm : "Auth required"

      }, function(username, password, callback) {

        callback(username === httpAuthUser && password === httpAuthPass);

      });

      http.createServer(basicAuth, createServerCallback).listen(this.webhookPort, "0.0.0.0");

    }

    else {

      http.createServer(createServerCallback).listen(this.webhookPort, "0.0.0.0");

    }

    this.log("Started server for webhooks on port '%s'.", this.webhookPort);

  }

}



function HttpWebHookSensorAccessory(log, sensorConfig, storage) {

  this.log = log;

  this.id = sensorConfig["id"];

  this.name = sensorConfig["name"];

  this.type = sensorConfig["type"];

  this.storage = storage;



  if (this.type === "contact") {

    this.service = new Service.ContactSensor(this.name);

    this.changeHandler = (function(newState) {

      this.log("Change HomeKit state for contact sensor to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);

    }).bind(this);

    this.service.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getState.bind(this));

  }

  else if (this.type === "motion") {

    this.service = new Service.MotionSensor(this.name);

    this.changeHandler = (function(newState) {

      // this.log("Change HomeKit state for motion sensor to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }).bind(this);

    this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getState.bind(this));

  }

  else if (this.type === "occupancy") {

    this.service = new Service.OccupancySensor(this.name);

    this.changeHandler = (function(newState) {

      // this.log("Change HomeKit state for occupancy sensor to '%s'.",

      // newState);

      this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(newState ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);

    }).bind(this);

    this.service.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getState.bind(this));

  }

  else if (this.type === "smoke") {

    this.service = new Service.SmokeSensor(this.name);

    this.changeHandler = (function(newState) {

      this.log("Change HomeKit state for smoke sensor to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(newState ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);

    }).bind(this);

    this.service.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getState.bind(this));

  }

  else if (this.type === "humidity") {

    this.service = new Service.HumiditySensor(this.name);

    this.changeHandler = (function(newState) {

      this.log("Change HomeKit value for humidity sensor to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }).bind(this);

    this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getState.bind(this));

  }

  else if (this.type === "temperature") {

    this.service = new Service.TemperatureSensor(this.name);

    this.changeHandler = (function(newState) {

      this.log("Change HomeKit value for temperature sensor to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }).bind(this);

    this.service.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getState.bind(this));

  }

  else if (this.type === "airquality") {

    this.service = new Service.AirQualitySensor(this.name);

    this.changeHandler = (function(newState) {

      this.log("Change HomeKit value for air quality sensor to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.AirQuality).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }).bind(this);

    this.service.getCharacteristic(Characteristic.AirQuality).on('get', this.getState.bind(this));

  }



}



HttpWebHookSensorAccessory.prototype.getState = function(callback) {

  this.log("Getting current state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-" + this.id);

  if (state === undefined) {

    state = false;

  }

  if (this.type === "contact") {

    callback(null, state ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);

  }

  else if (this.type === "smoke") {

    callback(null, state ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);

  }

  else if (this.type === "occupancy") {

    callback(null, state ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);

  }

  else {

    callback(null, state);

  }

};



HttpWebHookSensorAccessory.prototype.getServices = function() {

  return [ this.service ];

};



function HttpWebHookSwitchAccessory(log, switchConfig, storage) {

  this.log = log;

  this.id = switchConfig["id"];

  this.name = switchConfig["name"];

  this.onURL = switchConfig["on_url"] || "";

  this.onMethod = switchConfig["on_method"] || "GET";

  this.offURL = switchConfig["off_url"] || "";

  this.offMethod = switchConfig["off_method"] || "GET";

  this.storage = storage;



  this.service = new Service.Switch(this.name);

  this.changeHandler = (function(newState) {

    this.log("Change HomeKit state for switch to '%s'.", newState);

    this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);

  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));

}



HttpWebHookSwitchAccessory.prototype.getState = function(callback) {

  this.log("Getting current state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-" + this.id);

  if (state === undefined) {

    state = false;

  }

  callback(null, state);

};



HttpWebHookSwitchAccessory.prototype.setState = function(powerOn, callback, context) {

  this.log("Switch state for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-" + this.id, powerOn);

  var urlToCall = this.onURL;

  var urlMethod = this.onMethod;

  if (!powerOn) {

    urlToCall = this.offURL;

    urlMethod = this.offMethod;

  }

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



HttpWebHookSwitchAccessory.prototype.getServices = function() {

  return [ this.service ];

};



function HttpWebHookPushButtonAccessory(log, pushButtonConfig, storage) {

  this.log = log;

  this.id = pushButtonConfig["id"];

  this.type = "pushbutton";

  this.name = pushButtonConfig["name"];

  this.pushURL = pushButtonConfig["push_url"] || "";

  this.pushMethod = pushButtonConfig["push_method"] || "GET";



  this.service = new Service.Switch(this.name);

  this.changeHandler = (function(newState) {

    if (newState) {

      this.log("Change HomeKit state for push button to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

      setTimeout(function() {

        this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);

      }.bind(this), 1000);

    }

  }).bind(this);

  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));

}



HttpWebHookPushButtonAccessory.prototype.getState = function(callback) {

  this.log("Getting current state for '%s'...", this.id);

  var state = false;

  callback(null, state);

};



HttpWebHookPushButtonAccessory.prototype.setState = function(powerOn, callback, context) {

  this.log("Push buttons state change for '%s'...", this.id);

  if (!powerOn) {

    callback(null);

  }

  else if (this.pushURL === "" || context === CONTEXT_FROM_WEBHOOK) {

    callback(null);

    setTimeout(function() {

      this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);

    }.bind(this), 1000);

  }

  else {

    var urlToCall = this.pushURL;

    var urlMethod = this.pushMethod;

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

      setTimeout(function() {

        this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);

      }.bind(this), 1000);

    }).bind(this));

  }

};



HttpWebHookPushButtonAccessory.prototype.getServices = function() {

  return [ this.service ];

};



function HttpWebHookLightAccessory(log, lightConfig, storage) {

  this.log = log;

  this.id = lightConfig["id"];

  this.name = lightConfig["name"];

  this.onURL = lightConfig["on_url"] || "";

  this.onMethod = lightConfig["on_method"] || "GET";

  this.offURL = lightConfig["off_url"] || "";

  this.offMethod = lightConfig["off_method"] || "GET";

  this.storage = storage;



  this.service = new Service.Lightbulb(this.name);

  this.changeHandler = (function(newState) {

    this.log("Change HomeKit state for light to '%s'.", newState);

    this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);

  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));

}



HttpWebHookLightAccessory.prototype.getState = function(callback) {

  this.log("Getting current state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-" + this.id);

  if (state === undefined) {

    state = false;

  }

  callback(null, state);

};



HttpWebHookLightAccessory.prototype.setState = function(powerOn, callback, context) {

  this.log("Light state for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-" + this.id, powerOn);

  var urlToCall = this.onURL;

  var urlMethod = this.onMethod;

  if (!powerOn) {

    urlToCall = this.offURL;

    urlMethod = this.offMethod;

  }

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



HttpWebHookLightAccessory.prototype.getServices = function() {

  return [ this.service ];

};



function HttpWebHookThermostatAccessory(log, thermostatConfig, storage) {

  this.log = log;

  this.id = thermostatConfig["id"];

  this.name = thermostatConfig["name"];

  this.type = "thermostat";

  this.setTargetTemperatureURL = thermostatConfig["set_target_temperature_url"] || "";

  this.setTargetTemperatureMethod = thermostatConfig["set_target_temperature_method"] || "GET";

  this.setTargetHeatingCoolingStateURL = thermostatConfig["set_target_heating_cooling_state_url"] || "";

  this.setTargetHeatingCoolingStateMethod = thermostatConfig["set_target_heating_cooling_state_method"] || "GET";

  this.storage = storage;



  this.service = new Service.Thermostat(this.name);

  this.changeCurrentTemperatureHandler = (function(newTemp) {

    this.log("Change current Temperature for thermostat to '%d'.", newTemp);

    this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newTemp, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);

  this.changeTargetTemperatureHandler = (function(newTemp) {

    this.log("Change target Temperature for thermostat to '%d'.", newTemp);

    this.service.getCharacteristic(Characteristic.TargetTemperature).updateValue(newTemp, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);

  this.changeCurrentHeatingCoolingStateHandler = (function(newState) {

    if (newState) {

      this.log("Change Current Heating Cooling State for thermostat to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }

  }).bind(this);

  this.changeTargetHeatingCoolingStateHandler = (function(newState) {

    if (newState) {

      this.log("Change Target Heating Cooling State for thermostat to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }

  }).bind(this);



  this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get', this.getTargetHeatingCoolingState.bind(this)).on('set', this.setTargetHeatingCoolingState.bind(this));

  this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get', this.getCurrentHeatingCoolingState.bind(this));

  // .on('set', this.setCurrentHeatingCoolingState.bind(this));

  this.service.getCharacteristic(Characteristic.TargetTemperature).on('get', this.getTargetTemperature.bind(this)).on('set', this.setTargetTemperature.bind(this));

  this.service.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getCurrentTemperature.bind(this));

  // .on('set', this.setCurrentTemperature.bind(this));

}



// TargetTemperature

HttpWebHookThermostatAccessory.prototype.getTargetTemperature = function(callback) {

  this.log("Getting target temperature for '%s'...", this.id);

  var temp = this.storage.getItemSync("http-webhook-target-temperature-" + this.id);

  if (temp === undefined) {

    temp = 20;

  }

  callback(null, temp);

};



HttpWebHookThermostatAccessory.prototype.setTargetTemperature = function(temp, callback, context) {

  this.log("Target temperature for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-target-temperature-" + this.id, temp);

  var urlToCall = this.setTargetTemperatureURL.replace("%f", temp);

  var urlMethod = this.setTargetTemperatureMethod;

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



// Current Temperature

HttpWebHookThermostatAccessory.prototype.getCurrentTemperature = function(callback) {

  this.log("Getting current temperature for '%s'...", this.id);

  var temp = this.storage.getItemSync("http-webhook-current-temperature-" + this.id);

  if (temp === undefined) {

    temp = 20;

  }

  callback(null, temp);

};



// Target Heating Cooling State

HttpWebHookThermostatAccessory.prototype.getTargetHeatingCoolingState = function(callback) {

  this.log("Getting current Target Heating Cooling state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-target-heating-cooling-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.TargetHeatingCoolingState.OFF;

  }

  callback(null, state);

};



HttpWebHookThermostatAccessory.prototype.setTargetHeatingCoolingState = function(newState, callback, context) {

  this.log("Target Heating Cooling state for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-target-heating-cooling-state-" + this.id, newState);

  var urlToCall = this.setTargetHeatingCoolingStateURL.replace("%b", newState);

  var urlMethod = this.setTargetHeatingCoolingStateMethod;

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



// Current Heating Cooling State

HttpWebHookThermostatAccessory.prototype.getCurrentHeatingCoolingState = function(callback) {

  this.log("Getting current Target Heating Cooling state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-current-heating-cooling-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.CurrentHeatingCoolingState.OFF;

  }

  callback(null, state);

};



HttpWebHookThermostatAccessory.prototype.getServices = function() {

  return [ this.service ];

};





function HttpWebHookGarageDoorOpenerAccessory(log, garageDoorOpenerConfig, storage) {

  this.log = log;

  this.id = garageDoorOpenerConfig["id"];

  this.name = garageDoorOpenerConfig["name"];

  this.type = "garagedooropener";

  this.setTargetDoorStateOpenURL = garageDoorOpenerConfig["open_url"] || "";

  this.setTargetDoorStateOpenMethod = garageDoorOpenerConfig["open_method"] || "GET";  

  this.setTargetDoorStateCloseURL = garageDoorOpenerConfig["close_url"] || "";

  this.setTargetDoorStateCloseMethod = garageDoorOpenerConfig["close_method"] || "GET";  

  this.storage = storage;



  this.service = new Service.GarageDoorOpener(this.name);

  this.changeCurrentDoorStateHandler = (function(newState) {

    if (newState) {

      this.log("Change Current Door State for garage door opener to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }

  }).bind(this);

  this.changeTargetDoorStateHandler = (function(newState) {

    if (newState) {

      this.log("Change Target Door State for garage door opener to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }

  }).bind(this);

  this.changeObstructionDetectedHandler = (function(newState) {

    if (newState) {

      this.log("Change Obstruction Detected for garage door opener to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.ObstructionDetected).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }

  }).bind(this);



  this.service.getCharacteristic(Characteristic.TargetDoorState).on('get', this.getTargetDoorState.bind(this)).on('set', this.setTargetDoorState.bind(this));

  this.service.getCharacteristic(Characteristic.CurrentDoorState).on('get', this.getCurrentDoorState.bind(this));

  this.service.getCharacteristic(Characteristic.ObstructionDetected).on('get', this.getObstructionDetected.bind(this));

}



// Target Door State

HttpWebHookGarageDoorOpenerAccessory.prototype.getTargetDoorState = function(callback) {

  this.log("Getting current Target Door State for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-target-door-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.TargetDoorState.CLOSED;

  }

  callback(null, state);

};



HttpWebHookGarageDoorOpenerAccessory.prototype.setTargetDoorState = function(newState, callback, context) {

  this.log("Target Door State for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-target-door-state-" + this.id, newState);

  var urlToCall = this.setTargetDoorStateCloseURL;

  var urlMethod = this.setTargetDoorStateCloseMethod;

  if (newState == Characteristic.TargetDoorState.OPEN) {

    var urlToCall = this.setTargetDoorStateOpenURL;

    var urlMethod = this.setTargetDoorStateOpenMethod;

  }

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



// Current Door State

HttpWebHookGarageDoorOpenerAccessory.prototype.getCurrentDoorState = function(callback) {

  this.log("Getting Current Door State for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-current-door-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.CurrentDoorState.CLOSED;

  }

  callback(null, state);

};



// Obstruction Detected

HttpWebHookGarageDoorOpenerAccessory.prototype.getObstructionDetected = function(callback) {

  this.log("Getting Obstruction Detected for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-obstruction-detected-" + this.id);

  if (state === undefined) {

    state = false;

  }

  callback(null, state);

};


HttpWebHookGarageDoorOpenerAccessory.prototype.getServices = function() {

  return [ this.service ];

};


function HttpWebHookLockMechanismAccessory(log, lockMechanismOpenerConfig, storage) {

  this.log = log;

  this.id = lockMechanismOpenerConfig["id"];

  this.name = lockMechanismOpenerConfig["name"];

  this.type = "lockmechanism";

  this.setLockTargetStateOpenURL = lockMechanismOpenerConfig["open_url"] || "";

  this.setLockTargetStateOpenMethod = lockMechanismOpenerConfig["open_method"] || "GET";  

  this.setLockTargetStateCloseURL = lockMechanismOpenerConfig["close_url"] || "";

  this.setLockTargetStateCloseMethod = lockMechanismOpenerConfig["close_method"] || "GET";  

  this.storage = storage;



  this.service = new Service.LockMechanism(this.name);

  this.changeLockCurrentStateHandler = (function(newState) {

    if (newState) {

      this.log("Change Current Lock State for locking to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.LockCurrentState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }

  }).bind(this);

  this.changeLockTargetStateHandler = (function(newState) {

    if (newState) {

      this.log("Change Target Lock State for locking to '%s'.", newState);

      this.service.getCharacteristic(Characteristic.LockTargetState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

    }

  }).bind(this);

  

  this.service.getCharacteristic(Characteristic.LockTargetState).on('get', this.getLockTargetState.bind(this)).on('set', this.setLockTargetState.bind(this));

  this.service.getCharacteristic(Characteristic.LockCurrentState).on('get', this.getLockCurrentState.bind(this));

}



// Target Lock State

HttpWebHookLockMechanismAccessory.prototype.getLockTargetState = function(callback) {

  this.log("Getting current Target Lock State for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-lock-target-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.LockTargetState.SECURED;

  }

  callback(null, state);

};



HttpWebHookLockMechanismAccessory.prototype.setLockTargetState = function(newState, callback, context) {

  this.log("Target Lock State for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-lock-target-state-" + this.id, newState);

  var urlToCall = this.setLockTargetStateCloseURL;

  var urlMethod = this.setLockTargetStateCloseMethod;

  if (newState == Characteristic.LockTargetState.OPEN) {

    var urlToCall = this.setLockTargetStateOpenURL;

    var urlMethod = this.setLockTargetStateOpenMethod;

  }

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



// Current Lock State

HttpWebHookLockMechanismAccessory.prototype.getLockCurrentState = function(callback) {

  this.log("Getting Current Lock State for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-lock-current-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.LockCurrentState.SECURED;

  }

  callback(null, state);

};


HttpWebHookLockMechanismAccessory.prototype.getServices = function() {

  return [ this.service ];

};


function HttpWebHookOutletAccessory(log, outletConfig, storage) {

  this.log = log;

  this.id = outletConfig["id"];

  this.name = outletConfig["name"];

  this.type = "outlet";

  this.onURL = outletConfig["on_url"] || "";

  this.onMethod = outletConfig["on_method"] || "GET";

  this.offURL = outletConfig["off_url"] || "";

  this.offMethod = outletConfig["off_method"] || "GET";

  this.storage = storage;



  this.service = new Service.Outlet(this.name);

  this.changeHandler = (function(newState) {

    this.log("Change HomeKit state for outlet to '%s'.", newState);

    this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);

  this.changeHandlerInUse = (function(newState) {

    this.log("Change HomeKit stateInUse for outlet to '%s'.", newState);

    this.service.getCharacteristic(Characteristic.OutletInUse).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);

  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));

  this.service.getCharacteristic(Characteristic.OutletInUse).on('get', this.getStateInUse.bind(this));

}



HttpWebHookOutletAccessory.prototype.getState = function(callback) {

  this.log("Getting current state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-" + this.id);

  if (state === undefined) {

    state = false;

  }

  callback(null, state);

};



HttpWebHookOutletAccessory.prototype.getStateInUse = function(callback) {

  this.log("Getting current state for '%s'...", this.id);

  var stateInUse = this.storage.getItemSync("http-webhook-" + this.id + "-inUse");

  if (stateInUse === undefined) {

    stateInUse = false;

  }

  callback(null, stateInUse);

};



HttpWebHookOutletAccessory.prototype.setState = function(powerOn, callback, context) {

  this.log("Switch outlet state for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-" + this.id, powerOn);

  var urlToCall = this.onURL;

  var urlMethod = this.onMethod;

  if (!powerOn) {

    urlToCall = this.offURL;

    urlMethod = this.offMethod;

  }

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



HttpWebHookOutletAccessory.prototype.getServices = function() {

  return [ this.service ];

};



function HttpWebHookSecurityAccessory(log, securityConfig, storage) {

  this.log = log;

  this.id = securityConfig["id"];

  this.name = securityConfig["name"];

  this.type = "security";

  this.setStateURL = securityConfig["set_state_url"] || "";

  this.setStateMethod = securityConfig["set_state_method"] || "GET";

  this.storage = storage;



  this.service = new Service.SecuritySystem(this.name);

  this.changeCurrentStateHandler = (function(newState) {

    this.log("Change current state for security to '%d'.", newState);

    this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);

  this.changeTargetStateHandler = (function(newState) {

    this.log("Change target state for security to '%d'.", newState);

    this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);

  }).bind(this);



  this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).on('get', this.getTargetSecurityState.bind(this)).on('set', this.setTargetSecurityState.bind(this));

  this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).on('get', this.getCurrentSecurityState.bind(this));

}



HttpWebHookSecurityAccessory.prototype.getTargetSecurityState = function(callback) {

  this.log("Getting current Target Security state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-target-security-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.SecuritySystemTargetState.DISARM;

  }

  callback(null, state);

};



HttpWebHookSecurityAccessory.prototype.setTargetSecurityState = function(newState, callback, context) {

  this.log("Target Security state for '%s'...", this.id);

  this.storage.setItemSync("http-webhook-target-security-state-" + this.id, newState);

  var urlToCall = this.setStateURL.replace("%d", newState);

  var urlMethod = this.setStateMethod;

  if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {

    request({

      method : urlMethod,

      url : urlToCall,

      timeout : DEFAULT_REQUEST_TIMEOUT

    }, (function(err, response, body) {

      var statusCode = response && response.statusCode ? response.statusCode : -1;

      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);

      if (!err && statusCode == 200) {

        callback(null);

      }

      else {

        callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));

      }

    }).bind(this));

  }

  else {

    callback(null);

  }

};



HttpWebHookSecurityAccessory.prototype.getCurrentSecurityState = function(callback) {

  this.log("Getting current Target Security state for '%s'...", this.id);

  var state = this.storage.getItemSync("http-webhook-current-security-state-" + this.id);

  if (state === undefined) {

    state = Characteristic.SecuritySystemCurrentState.DISARMED;

  }

  callback(null, state);

};



HttpWebHookSecurityAccessory.prototype.getServices = function() {

  return [ this.service ];

};
