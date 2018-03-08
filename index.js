var request = require("request");
var http = require('http');
var url = require('url');
var Service, Characteristic;
var DEFAULT_REQUEST_TIMEOUT = 10000;
var CONTEXT_FROM_WEBHOOK = "fromHTTPWebhooks";
var CONTEXT_FROM_TIMEOUTCALL = "fromTimeoutCall";
var SENSOR_TIMEOUT = 5000;

module.exports = function (homebridge) {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;

    homebridge.registerPlatform("homebridge-http-webhooks", "HttpWebHooks", HttpWebHooksPlatform);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSensor", HttpWebHookSensorAccessory);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSwitch", HttpWebHookSwitchAccessory);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookPushButton", HttpWebHookPushButtonAccessory);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookLight", HttpWebHookLightAccessory);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookThermostat", HttpWebHookThermostatAccessory);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookOutlet", HttpWebHookOutletAccessory);
    homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookStatelessSwitch", HttpWebHookStatelessSwitchAccessory);
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
    this.statelessSwitches = config["statelessswitches"] || [];
    this.storage = require('node-persist');
    this.storage.initSync({
        dir: this.cacheDirectory
    });
}

HttpWebHooksPlatform.prototype = {

    accessories: function (callback) {
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

        for (var i = 0; i < this.statelessSwitches.length; i++) {
            var statelessSwitchAccessory = new HttpWebHookStatelessSwitchAccessory(this.log, this.statelessSwitches[i], this.storage);
            accessories.push(statelessSwitchAccessory);
        }

        var accessoriesCount = accessories.length;

        callback(accessories);

        http.createServer((function (request, response) {
            var theUrl = request.url;
            var theUrlParts = url.parse(theUrl, true);
            var theUrlParams = theUrlParts.query;
            var body = [];
            request.on('error', (function (err) {
                this.log("[ERROR Http WebHook Server] Reason: %s.", err);
            }).bind(this)).on('data', function (chunk) {
                body.push(chunk);
            }).on('end', (function () {
                body = Buffer.concat(body).toString();

                response.on('error', function (err) {
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
                        success: true
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
                                    success: true
                                };
                            }
                            else {
                                if (accessory.type == "humidity" || accessory.type == "temperature") {
                                    var cachedValue = this.storage.getItemSync("http-webhook-" + accessoryId);
                                    if (cachedValue === undefined) {
                                        cachedValue = 0;
                                    }
                                    if (!theUrlParams.value) {
                                        responseBody = {
                                            success: true,
                                            state: cachedValue
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
                                            success: true,
                                            state: cachedState,
                                            stateOutletInUse: cachedStateInUse
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
                                            success: true,
                                            state: cachedState
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
                                else {
                                    var cachedState = this.storage.getItemSync("http-webhook-" + accessoryId);
                                    if (cachedState === undefined) {
                                        cachedState = false;
                                    }
                                    if (!theUrlParams.state) {
                                        responseBody = {
                                            success: true,
                                            state: cachedState
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
        }).bind(this)).listen(this.webhookPort);
        this.log("Started server for webhooks on port '%s'.", this.webhookPort);
    }
}

function HttpWebHookSensorAccessory(log, sensorConfig, storage) {
    this.log = log;
    this.id = sensorConfig["id"];
    this.name = sensorConfig["name"];
    this.type = sensorConfig["type"];
    this.autoRelease = sensorConfig["autoRelease"] || false;
    this.storage = storage;

    if (this.type === "contact") {
        this.service = new Service.ContactSensor(this.name);
        this.changeHandler = (function (newState) {
            this.log("Change HomeKit state for contact sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getState.bind(this));
    }
    else if (this.type === "motion") {
        this.service = new Service.MotionSensor(this.name);
        this.changeHandler = (function (newState) {
            // this.log("Change HomeKit state for motion sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
            if (this.autoRelease) {
                setTimeout(function () {
                    this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);
                }.bind(this), SENSOR_TIMEOUT);
            }
        }).bind(this);
        this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getState.bind(this));
    }
    else if (this.type === "occupancy") {
        this.service = new Service.OccupancySensor(this.name);
        this.changeHandler = (function (newState) {
            // this.log("Change HomeKit state for occupancy sensor to '%s'.",
            // newState);
            this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(newState ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
            if (this.autoRelease) {
                setTimeout(function () {
                    this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, CONTEXT_FROM_TIMEOUTCALL);
                }.bind(this), SENSOR_TIMEOUT);
            }
        }).bind(this);
        this.service.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getState.bind(this));
    }
    else if (this.type === "smoke") {
        this.service = new Service.SmokeSensor(this.name);
        this.changeHandler = (function (newState) {
            this.log("Change HomeKit state for smoke sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(newState ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getState.bind(this));
    }
    else if (this.type === "humidity") {
        this.service = new Service.HumiditySensor(this.name);
        this.changeHandler = (function (newState) {
            this.log("Change HomeKit value for humidity sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getState.bind(this));
    }
    else if (this.type === "temperature") {
        this.service = new Service.TemperatureSensor(this.name);
        this.changeHandler = (function (newState) {
            this.log("Change HomeKit value for temperature sensor to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }).bind(this);
        this.service.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getState.bind(this));
    }
}

HttpWebHookSensorAccessory.prototype.getState = function (callback) {
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

HttpWebHookSensorAccessory.prototype.getServices = function () {
    return [this.service];
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
    this.changeHandler = (function (newState) {
        this.log("Change HomeKit state for switch to '%s'.", newState);
        this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

HttpWebHookSwitchAccessory.prototype.getState = function (callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    callback(null, state);
};

HttpWebHookSwitchAccessory.prototype.setState = function (powerOn, callback, context) {
    this.log("Switch state for '%s'...", this.id);
    this.storage.setItemSync("http-webhook-" + this.id, powerOn);
    var urlToCall = this.onURL;
    var urlMethod = this.onMethod;
    var urlBody = this.onBody;
    if (!powerOn) {
        urlToCall = this.offURL;
        urlMethod = this.offMethod;
        urlBody = this.offBody;
    }
    if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {
        var theRequest = {
            method: urlMethod,
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT,
        };
        if ((urlMethod === "POST" || urlMethod === "PUT" || urlMethod === "PATCH") && urlBody) {
            this.log("Adding body");
            theRequest.body = urlBody;
        }
        request(theRequest, (function (err, response, body) {
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

HttpWebHookSwitchAccessory.prototype.getServices = function () {
    return [this.service];
};

function HttpWebHookStatelessSwitchAccessory(log, statelessSwitchConfig, storage) {
    this.log = log;
    this.id = statelessSwitchConfig["id"];
    this.type = "statelessswitch";
    this.name = statelessSwitchConfig["name"];
    this.buttons = statelessSwitchConfig["buttons"] || [];

    this.service = [];
    for(var index=0; index< this.buttons.length; index ++){
      var single_press = this.buttons[index]["single_press"] == undefined ? true : this.buttons[index]["single_press"];
      var double_press = this.buttons[index]["double_press"] == undefined ? true : this.buttons[index]["double_press"];
      var long_press = this.buttons[index]["long_press"] == undefined ? true : this.buttons[index]["long_press"];
        var button = new Service.StatelessProgrammableSwitch(this.buttons[index].name, '' + index);
        button.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(GetStatelessSwitchProps(single_press, double_press, long_press));
        button.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(index + 1);
        this.service.push(button);
    }
    this.changeHandler = (function (buttonName, event) {
          for(var index = 0; index < this.service.length; index++ ){
            var serviceName = this.service[index].getCharacteristic(Characteristic.Name).value;
            if (serviceName === buttonName) {
                this.log("Pressing '%s' with event '%i'", buttonName, event)
                this.service[index].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(event, undefined, CONTEXT_FROM_WEBHOOK);
            }
        }
    }).bind(this);
};

function GetStatelessSwitchProps(single_press, double_press, long_press) {
    var props;
    if (single_press && !double_press && !long_press) {
        props = {
            minValue: Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
            maxValue: Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
        };
    }
    if (single_press && double_press && !long_press) {
        props = {
            minValue: Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
            maxValue: Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
        };
    }
    if (single_press && !double_press && long_press) {
        props = {
            minValue: Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
            maxValue: Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
            validValues: [
                 Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
                 Characteristic.ProgrammableSwitchEvent.LONG_PRESS
            ]
        };
    }
    if (!single_press && double_press && !long_press) {
        props = {
            minValue: Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
            maxValue: Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
        };
    }
    if (!single_press && double_press && long_press) {
        props = {
            minValue: Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
            maxValue: Characteristic.ProgrammableSwitchEvent.LONG_PRESS
        };
    }
    if (!single_press && !double_press && long_press) {
        props = {
            minValue: Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
            maxValue: Characteristic.ProgrammableSwitchEvent.LONG_PRESS
        };
    }
    if (single_press && double_press && long_press) {
        props = {
            minValue: Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
            maxValue: Characteristic.ProgrammableSwitchEvent.LONG_PRESS
        };
    }
    return props;
}

HttpWebHookStatelessSwitchAccessory.prototype.getServices = function () {
    return this.service;
};

function HttpWebHookPushButtonAccessory(log, pushButtonConfig, storage) {
    this.log = log;
    this.id = pushButtonConfig["id"];
    this.type = "pushbutton";
    this.name = pushButtonConfig["name"];
    this.pushURL = pushButtonConfig["push_url"] || "";
    this.pushMethod = pushButtonConfig["push_method"] || "GET";

    this.service = new Service.Switch(this.name);
    this.changeHandler = (function (newState) {
        if (newState) {
            this.log("Change HomeKit state for push button to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
            setTimeout(function () {
                this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);
            }.bind(this), 1000);
        }
    }).bind(this);
    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

HttpWebHookPushButtonAccessory.prototype.getState = function (callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = false;
    callback(null, state);
};

HttpWebHookPushButtonAccessory.prototype.setState = function (powerOn, callback, context) {
    this.log("Push buttons state change for '%s'...", this.id);
    if (!powerOn) {
        callback(null);
    }
    else if (this.pushURL === "" || context === CONTEXT_FROM_WEBHOOK) {
        callback(null);
        setTimeout(function () {
            this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), 1000);
    }
    else {
        var urlToCall = this.pushURL;
        var urlMethod = this.pushMethod;
        request({
            method: urlMethod,
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function (err, response, body) {
            var statusCode = response && response.statusCode ? response.statusCode : -1;
            this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);
            if (!err && statusCode == 200) {
                callback(null);
            }
            else {
                callback(err || new Error("Request to '" + urlToCall + "' was not succesful."));
            }
            setTimeout(function () {
                this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, CONTEXT_FROM_TIMEOUTCALL);
            }.bind(this), 1000);
        }).bind(this));
    }
};

HttpWebHookPushButtonAccessory.prototype.getServices = function () {
    return [this.service];
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
    this.changeHandler = (function (newState) {
        this.log("Change HomeKit state for light to '%s'.", newState);
        this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

HttpWebHookLightAccessory.prototype.getState = function (callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    callback(null, state);
};

HttpWebHookLightAccessory.prototype.setState = function (powerOn, callback, context) {
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
            method: urlMethod,
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function (err, response, body) {
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

HttpWebHookLightAccessory.prototype.getServices = function () {
    return [this.service];
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
    this.changeCurrentTemperatureHandler = (function (newTemp) {
        this.log("Change current Temperature for thermostat to '%d'.", newTemp);
        this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newTemp, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.changeTargetTemperatureHandler = (function (newTemp) {
        this.log("Change target Temperature for thermostat to '%d'.", newTemp);
        this.service.getCharacteristic(Characteristic.TargetTemperature).updateValue(newTemp, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.changeCurrentHeatingCoolingStateHandler = (function (newState) {
        if (newState) {
            this.log("Change Current Heating Cooling State for thermostat to '%s'.", newState);
            this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
        }
    }).bind(this);
    this.changeTargetHeatingCoolingStateHandler = (function (newState) {
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
HttpWebHookThermostatAccessory.prototype.getTargetTemperature = function (callback) {
    this.log("Getting target temperature for '%s'...", this.id);
    var temp = this.storage.getItemSync("http-webhook-target-temperature-" + this.id);
    if (temp === undefined) {
        temp = 20;
    }
    callback(null, temp);
};

HttpWebHookThermostatAccessory.prototype.setTargetTemperature = function (temp, callback, context) {
    this.log("Target temperature for '%s'...", this.id);
    this.storage.setItemSync("http-webhook-target-temperature-" + this.id, temp);
    var urlToCall = this.setTargetTemperatureURL.replace("%f", temp);
    var urlMethod = this.setTargetTemperatureMethod;
    if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {
        request({
            method: urlMethod,
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function (err, response, body) {
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
HttpWebHookThermostatAccessory.prototype.getCurrentTemperature = function (callback) {
    this.log("Getting current temperature for '%s'...", this.id);
    var temp = this.storage.getItemSync("http-webhook-current-temperature-" + this.id);
    if (temp === undefined) {
        temp = 20;
    }
    callback(null, temp);
};

// Target Heating Cooling State
HttpWebHookThermostatAccessory.prototype.getTargetHeatingCoolingState = function (callback) {
    this.log("Getting current Target Heating Cooling state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-target-heating-cooling-state-" + this.id);
    if (state === undefined) {
        state = Characteristic.TargetHeatingCoolingState.OFF;
    }
    callback(null, state);
};

HttpWebHookThermostatAccessory.prototype.setTargetHeatingCoolingState = function (newState, callback, context) {
    this.log("Target Heating Cooling state for '%s'...", this.id);
    this.storage.setItemSync("http-webhook-target-heating-cooling-state-" + this.id, newState);
    var urlToCall = this.setTargetHeatingCoolingStateURL.replace("%b", newState);
    var urlMethod = this.setTargetHeatingCoolingStateMethod;
    if (urlToCall !== "" && context !== CONTEXT_FROM_WEBHOOK) {
        request({
            method: urlMethod,
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function (err, response, body) {
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
HttpWebHookThermostatAccessory.prototype.getCurrentHeatingCoolingState = function (callback) {
    this.log("Getting current Target Heating Cooling state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-current-heating-cooling-state-" + this.id);
    if (state === undefined) {
        state = Characteristic.CurrentHeatingCoolingState.OFF;
    }
    callback(null, state);
};

HttpWebHookThermostatAccessory.prototype.getServices = function () {
    return [this.service];
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
    this.changeHandler = (function (newState) {
        this.log("Change HomeKit state for outlet to '%s'.", newState);
        this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.changeHandlerInUse = (function (newState) {
        this.log("Change HomeKit stateInUse for outlet to '%s'.", newState);
        this.service.getCharacteristic(Characteristic.OutletInUse).updateValue(newState, undefined, CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
    this.service.getCharacteristic(Characteristic.OutletInUse).on('get', this.getStateInUse.bind(this));
}

HttpWebHookOutletAccessory.prototype.getState = function (callback) {
    this.log("Getting current state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    callback(null, state);
};

HttpWebHookOutletAccessory.prototype.getStateInUse = function (callback) {
    this.log("Getting current state for '%s'...", this.id);
    var stateInUse = this.storage.getItemSync("http-webhook-" + this.id + "-inUse");
    if (stateInUse === undefined) {
        stateInUse = false;
    }
    callback(null, stateInUse);
};

HttpWebHookOutletAccessory.prototype.setState = function (powerOn, callback, context) {
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
            method: urlMethod,
            url: urlToCall,
            timeout: DEFAULT_REQUEST_TIMEOUT
        }, (function (err, response, body) {
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

HttpWebHookOutletAccessory.prototype.getServices = function () {
    return [this.service];
};