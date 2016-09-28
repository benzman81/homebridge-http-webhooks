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

    accessories: (function(callback) {
        var sensorAccessories = [];
        for(var i = 0; i < this.sensors.length; i++){
            var sensor = new HttpWebHookSensorAccessory(this.log, this.sensors[i]);
            sensorAccessories.push(sensor);
        }
        var sensorAccessoriesCount = sensorAccessories.length;
        callback(sensorAccessories);
        
        http.createServer((function(request, response) {
            var theUrl = request.url;
            var theUrlParts = url.parse(theUrl, true);
            var theUrlParams = theUrlParts.query;
            var body = [];
            request.on('error', function(err) {
                console.error("[ERROR Http WebHook Server] Reason: %s.", err);
            }).on('data', function(chunk) {
                body.push(chunk);
            }).on('end', (function() {
                body = Buffer.concat(body).toString();

                response.on('error', function(err) {
                    console.error("[ERROR Http WebHook Server] Reason: %s.", err);
                });

                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');

                if(!theUrlParams.accessoryId || !theUrlParams.state) {
                    response.statusCode = 404;
                    response.setHeader("Content-Type", "text/plain");
                    var errorText = "[ERROR Http WebHook Server] No accessoryId or state in request.";
                    console.error(errorText);
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
                            this.storage.setItemSync("http-webhook-"+accessoryId, state);
                            sensorAccessory.changeHandler(state);
                            break;
                        }
                    }
                    response.write(JSON.stringify(responseBody));
                    response.end();
                }
            }).bind(this));
        }).bind(this)).listen(webHookServerPort);    
        constructorLog("Started server for webhooks on port '%s'.", webHookServerPort);
    }).bind(this);
}

function HttpWebHookSensorAccessory(log, sensorConfig) {
    this.log = log;
    this.id = sensorConfig["id"];
    this.name = sensorConfig["name"];
    this.type = sensorConfig["type"];
}

HttpWebHookSensorAccessory.prototype = {

    getServices: function() {
        var service, changeAction;
        if(this.type === "contact"){
            service = new Service.ContactSensor();
            changeAction = function(newState){
                service.getCharacteristic(Characteristic.ContactSensorState)
                        .setValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED);
            };
        } else {
            service = new Service.MotionSensor();
            changeAction = function(newState){
                service.getCharacteristic(Characteristic.MotionDetected)
                        .setValue(newState);
            };
        }

        this.changeHandler = function(newState){
            changeAction(newState);
        }.bind(this);

        return [service];
    }
};