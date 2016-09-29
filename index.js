var request = require("request");
var http = require('http');
var url = require('url');
var Service, Characteristic;

module.exports = function(homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform("homebridge-http-webhooks", "HttpWebHooks", HttpWebHooksPlatform);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSensor", HttpWebHookSensorAccessory);
};

function HttpWebHooksPlatform(log, config){
    this.log = log;
    this.cacheDirectory = config["cache_directory"] || "./.node-persist/storage";
    this.webhookPort = config["webhook_port"] || 51828;
    this.sensors = config["sensors"] || [];
    this.storage = require('node-persist');
    this.storage.initSync({dir:this.cacheDirectory});
}

HttpWebHooksPlatform.prototype = {

    accessories: function(callback) {
        var sensorAccessories = [];
        for(var i = 0; i < this.sensors.length; i++){
            var sensor = new HttpWebHookSensorAccessory(this.log, this.sensors[i], this.storage);
            sensorAccessories.push(sensor);
        }
        var sensorAccessoriesCount = sensorAccessories.length;
        callback(sensorAccessories);
        
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

                if(!theUrlParams.accessoryId || !theUrlParams.state) {
                    response.statusCode = 404;
                    response.setHeader("Content-Type", "text/plain");
                    var errorText = "[ERROR Http WebHook Server] No accessoryId or state in request.";
                    this.log(errorText);
                    response.write(errorText);
                    response.end();
                }
                else {
                    var accessoryId = theUrlParams.accessoryId;
                    var state = theUrlParams.state;
                    var responseBody = {
                        success: true
                    };
                    for(var i = 0; i < sensorAccessoriesCount; i++){
                        var sensorAccessory = sensorAccessories[i];
                        if(sensorAccessory.id === accessoryId) {
                            var stateBool = state==="true";
                            this.storage.setItemSync("http-webhook-"+accessoryId, stateBool);
                            this.log("[INFO Http WebHook Server] State change of '%s' to '%s'.",sensorAccessory.id,stateBool);
                            sensorAccessory.changeHandler(stateBool);
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
                    .setValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
        }).bind(this);
        this.service
            .getCharacteristic(Characteristic.ContactSensorState)
            .on('get', this.getState.bind(this));
    } else if(this.type === "motion") {
        this.service = new Service.MotionSensor(this.name);
        this.changeHandler = (function(newState){
            this.log("Change HomeKit state for motion sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.MotionDetected)
                    .setValue(newState);
        }).bind(this);
        this.service
            .getCharacteristic(Characteristic.MotionDetected)
            .on('get', this.getState.bind(this));
    } else if(this.type === "smoke") {
        this.service = new Service.SmokeSensor(this.name);
        this.changeHandler = (function(newState){
            this.log("Change HomeKit state for smoke sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.SmokeDetected)
                    .setValue(newState);
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
    else {
        callback(null, state);
    }
};

HttpWebHookSensorAccessory.prototype.getServices = function() {
  return [this.service];
};