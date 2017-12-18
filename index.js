var request = require("request");
var http = require('http');
var url = require('url');
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
};

function HttpWebHooksPlatform(log, config){
    this.log = log;
    this.cacheDirectory = config["cache_directory"] || "./.node-persist/storage";
    this.webhookPort = config["webhook_port"] || 51828;
    this.sensors = config["sensors"] || [];
    this.switches = config["switches"] || [];
    this.pushButtons = config["pushbuttons"] || [];
    this.lights = config["lights"] || [];
    this.storage = require('node-persist');
    this.storage.initSync({dir:this.cacheDirectory});
}

HttpWebHooksPlatform.prototype = {

    accessories: function(callback) {
        var accessories = [];
        for(var i = 0; i < this.sensors.length; i++){
            var sensor = new HttpWebHookSensorAccessory(this.log, this.sensors[i], this.storage);
            accessories.push(sensor);
        }

        for(var i = 0; i < this.switches.length; i++){
            var switchAccessory = new HttpWebHookSwitchAccessory(this.log, this.switches[i], this.storage);
            accessories.push(switchAccessory);
        }

        for(var i = 0; i < this.pushButtons.length; i++){
            var pushButtonsAccessory = new HttpWebHookPushButtonAccessory(this.log, this.pushButtons[i], this.storage);
            accessories.push(pushButtonsAccessory);
        }

        for(var i = 0; i < this.lights.length; i++){
            var lightAccessory = new HttpWebHookLightAccessory(this.log, this.lights[i], this.storage);
            accessories.push(lightAccessory);
        }

        var accessoriesCount = accessories.length;

        callback(accessories);

        http.createServer((function(request, response) {
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

                if(!theUrlParams.accessoryId) {
                    response.statusCode = 404;
                    response.setHeader("Content-Type", "text/plain");
                    var errorText = "[ERROR Http WebHook Server] No accessoryId in request.";
                    this.log(errorText);
                    response.write(errorText);
                    response.end();
                }
                else {
                    var responseBody = {
                        success: true
                    };
                    var accessoryId = theUrlParams.accessoryId;
                    for(var i = 0; i < accessoriesCount; i++){
                        var accessory = accessories[i];
                        if(accessory.id === accessoryId) {
                            var cachedState = this.storage.getItemSync("http-webhook-"+accessoryId);
                            if(cachedState === undefined) {
                                cachedState = false;
                            }
                            if(!theUrlParams.state) {
                                responseBody = {
                                    success: true,
                                    state: cachedState
                                };
                            }
                            else {
                                var state = theUrlParams.state;
                                var stateBool = state==="true";
                                this.storage.setItemSync("http-webhook-"+accessoryId, stateBool);
                                //this.log("[INFO Http WebHook Server] State change of '%s' to '%s'.",accessory.id,stateBool);
                                if(cachedState !== stateBool) {
                                    accessory.changeHandler(stateBool);
                                }
                            }
                            break;
                        }
                    }
                    response.write(JSON.stringify(responseBody));
                    response.end();
                }
            }).bind(this));
        }).bind(this)).listen(this.webhookPort);
        this.log("Started server for webhooks on port '%s'.", this.webhookPort);
    }
}

function HttpWebHookSensorAccessory(log, sensorConfig, storage) {
    this.log = log;
    this.id = sensorConfig["id"];
    this.name = sensorConfig["name"];
    this.type = sensorConfig["type"];
    this.storage = storage;

    if(this.type === "contact") {
        this.service = new Service.ContactSensor(this.name);
        this.changeHandler = (function(newState){
            this.log("Change HomeKit state for contact sensor to '%s'.", newState);
             this.service.getCharacteristic(Characteristic.ContactSensorState)
                    .setValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service
            .getCharacteristic(Characteristic.ContactSensorState)
            .on('get', this.getState.bind(this));
    } else if(this.type === "motion") {
        this.service = new Service.MotionSensor(this.name);
        this.changeHandler = (function(newState){
            //this.log("Change HomeKit state for motion sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.MotionDetected)
                    .setValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', this.getState.bind(this));
    } else if(this.type === "occupancy") {
        this.service = new Service.OccupancySensor(this.name);
        this.changeHandler = (function(newState){
            //this.log("Change HomeKit state for occupancy sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.OccupancyDetected)
                  .setValue(newState ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service
            .getCharacteristic(Characteristic.OccupancyDetected)
            .on('get', this.getState.bind(this));
    } else if(this.type === "smoke") {
        this.service = new Service.SmokeSensor(this.name);
        this.changeHandler = (function(newState){
            this.log("Change HomeKit state for smoke sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.SmokeDetected)
                    .setValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service
            .getCharacteristic(Characteristic.SmokeDetected)
            .on('get', this.getState.bind(this));
    }
}

HttpWebHookSensorAccessory.prototype.getState = function(callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-"+this.id);
    if(state === undefined) {
        state = false;
    }
    if(this.type === "contact") {
        callback(null, state ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
    }
    else if(this.type === "smoke") { 
        callback(null, state ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED);
    }
    else if(this.type === "occupancy") {
        callback(null, state ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED);
    }
    else {
        callback(null, state);
    }
};

HttpWebHookSensorAccessory.prototype.getServices = function() {
  return [this.service];
};

function HttpWebHookSwitchAccessory(log, switchConfig, storage) {
    this.log = log;
    this.id = switchConfig["id"];
    this.name = switchConfig["name"];
    this.onURL = switchConfig["on_url"] || "";
    this.offURL = switchConfig["off_url"] || "";
    this.storage = storage;

    this.service = new Service.Switch(this.name);
    this.changeHandler = (function(newState) {
        this.log("Change HomeKit state for switch to '%s'.", newState);
        this.service.getCharacteristic(Characteristic.On)
                .setValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getState.bind(this))
        .on('set', this.setState.bind(this));
}

HttpWebHookSwitchAccessory.prototype.getState = function(callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-"+this.id);
    if(state === undefined) {
        state = false;
    }
    callback(null, state);
};

HttpWebHookSwitchAccessory.prototype.setState = function(powerOn, callback) {
    this.log("Switch state for '%s'...", this.id);
    this.storage.setItemSync("http-webhook-"+this.id, powerOn);
    var urlToCall = this.onURL;
    if(!powerOn) {
        urlToCall = this.offURL;
    }
    if(urlToCall !== "") {
        request.get({
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function(err, response, body) {
            var statusCode = response && response.statusCode ? response.statusCode: -1;
            this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);
            if (!err && statusCode == 200) {
                callback(null);
            }
            else {
                callback(err || new Error("Request to '"+urlToCall+"' was not succesful."));
            }
        }).bind(this));
    }
    else {
        callback(null);
    }
};

HttpWebHookSwitchAccessory.prototype.getServices = function() {
  return [this.service];
};

function HttpWebHookPushButtonAccessory(log, pushButtonConfig, storage) {
    this.log = log;
    this.id = pushButtonConfig["id"];
    this.name = pushButtonConfig["name"];
    this.pushURL = pushButtonConfig["push_url"] || "";

    this.service = new Service.Switch(this.name);
    this.changeHandler = (function(newState) {
        if(newState) {
            this.log("Change HomeKit state for push button to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.On)
                    .setValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }
    }).bind(this);
    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getState.bind(this))
        .on('set', this.setState.bind(this));
}

HttpWebHookPushButtonAccessory.prototype.getState = function(callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = false;
    callback(null, state);
};

HttpWebHookPushButtonAccessory.prototype.setState = function(powerOn, callback) {
    this.log("Push buttons state change for '%s'...", this.id);
    if(!powerOn) {
        callback(null);
    }
    else if(this.pushURL === "") {
        callback(null);
        setTimeout(function() {
            this.service.getCharacteristic(Characteristic.On).setValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), 1000);
    }
    else {
        var urlToCall = this.pushURL;
        request.get({
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function(err, response, body) {
            var statusCode = response && response.statusCode ? response.statusCode: -1;
            this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);
            if (!err && statusCode == 200) {
                callback(null);
            }
            else {
                callback(err || new Error("Request to '"+urlToCall+"' was not succesful."));
            }
            setTimeout(function() {
                this.service.getCharacteristic(Characteristic.On).setValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);
            }.bind(this), 1000);
        }).bind(this));
    }
};

HttpWebHookPushButtonAccessory.prototype.getServices = function() {
  return [this.service];
};

function HttpWebHookLightAccessory(log, lightConfig, storage) {
    this.log = log;
    this.id = lightConfig["id"];
    this.name = lightConfig["name"];
    this.onURL = lightConfig["on_url"] || "";
    this.offURL = lightConfig["off_url"] || "";
    this.storage = storage;

    this.service = new Service.Lightbulb(this.name);
    this.changeHandler = (function(newState) {
        this.log("Change HomeKit state for light to '%s'.", newState);
        this.service.getCharacteristic(Characteristic.On)
                .setValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service
        .getCharacteristic(Characteristic.On)
        .on('get', this.getState.bind(this)) 
        .on('set', this.setState.bind(this));
}

HttpWebHookLightAccessory.prototype.getState = function(callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-"+this.id);
    if(state === undefined) {
        state = false;
    }
    callback(null, state);
};

HttpWebHookLightAccessory.prototype.setState = function(powerOn, callback) {
    this.log("Light state for '%s'...", this.id);
    this.storage.setItemSync("http-webhook-"+this.id, powerOn);
    var urlToCall = this.onURL;
    if(!powerOn) {
        urlToCall = this.offURL;
    }
    if(urlToCall !== "") {
        request.get({
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function(err, response, body) {
            var statusCode = response && response.statusCode ? response.statusCode: -1;
            this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);
            if (!err && statusCode == 200) {
                callback(null);
            }
            else {
                callback(err || new Error("Request to '"+urlToCall+"' was not succesful."));
            }
        }).bind(this));
    }
    else {
        callback(null);
    }
};

HttpWebHookLightAccessory.prototype.getServices = function() {
  return [this.service];
};