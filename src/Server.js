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
  this.webhookEnableCORS = platformConfig["webhook_enable_cors"] || false;
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
    if(this.webhookEnableCORS) {
      // Based on https://gist.github.com/balupton/3696140
      response.setHeader('Access-Control-Allow-Origin', '*');
      response.setHeader('Access-Control-Request-Method', '*');
      response.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
      response.setHeader('Access-Control-Allow-Headers', '*');
      if (request.method === 'OPTIONS') {
        response.writeHead(200);
        response.end();
        return;
      }
    }
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
        var responseBody = null;
        var accessoryId = theUrlParams.accessoryId;
        var found = false;
        for (var i = 0; i < this.accessories.length; i++) {
          var accessory = this.accessories[i];
          if (accessory.id === accessoryId) {
            responseBody = accessory.changeFromServer(theUrlParams);
            found = true;
            break;
          }
        }
        if(responseBody) {
          response.write(JSON.stringify(responseBody));
          response.end();
        }
        else {
          response.statusCode = 404;
          response.setHeader("Content-Type", "text/plain");
          var errorText = "[ERROR Http WebHook Server] AccessoryId '"+theUrlParams.accessoryId+"' did not return a response body from 'changeFromServer'.";
          if(!found) {
            errorText = "[ERROR Http WebHook Server] AccessoryId '"+theUrlParams.accessoryId+"' not found.";
          }
          this.log(errorText);
          response.write(errorText);
          response.end();
        }
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