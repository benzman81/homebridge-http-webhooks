const Constants = require('../../Constants');

var request = require("request");

function HttpWebHookSensorAccessory(ServiceParam, CharacteristicParam, platform, sensorConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = sensorConfig["id"];
  this.name = sensorConfig["name"];
  this.type = sensorConfig["type"];
  this.autoRelease = sensorConfig["autoRelease"];
  this.autoReleaseTime = sensorConfig["autoReleaseTime"] || Constants.DEFAULT_SENSOR_TIMEOUT;

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookSensorAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookSensorAccessory-" + this.id);

  if (this.type === "contact") {
    this.service = new Service.ContactSensor(this.name);
    this.changeHandler = (function(newState) {
      // this.log("Change HomeKit state for contact sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(newState ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      if (this.autoRelease) {
        setTimeout(function() {
          this.storage.setItemSync("http-webhook-" + this.id, true);
          this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(Characteristic.ContactSensorState.CONTACT_DETECTED, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), this.autoReleaseTime);
      }
    }).bind(this);
    this.service.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getState.bind(this));
  }
  else if (this.type === "motion") {
    this.service = new Service.MotionSensor(this.name);
    this.changeHandler = (function(newState) {
      // this.log("Change HomeKit state for motion sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      if (this.autoRelease) {
        setTimeout(function() {
          this.storage.setItemSync("http-webhook-" + this.id, false);
          this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(false, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), this.autoReleaseTime);
      }
    }).bind(this);
    this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getState.bind(this));
  }
  else if (this.type === "occupancy") {
    this.service = new Service.OccupancySensor(this.name);
    this.changeHandler = (function(newState) {
      // this.log("Change HomeKit state for occupancy sensor to '%s'.",
      // newState);
      this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(newState ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      if (this.autoRelease) {
        setTimeout(function() {
          this.storage.setItemSync("http-webhook-" + this.id, false);
          this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), this.autoReleaseTime);
      }
    }).bind(this);
    this.service.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getState.bind(this));
  }
  else if (this.type === "smoke") {
    this.service = new Service.SmokeSensor(this.name);
    this.changeHandler = (function(newState) {
      this.log("Change HomeKit state for smoke sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(newState ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getState.bind(this));
  }
  else if (this.type === "humidity") {
    this.service = new Service.HumiditySensor(this.name);
    this.changeHandler = (function(newState) {
      this.log("Change HomeKit value for humidity sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getState.bind(this));
  }
  else if (this.type === "temperature") {
    this.service = new Service.TemperatureSensor(this.name);
    this.changeHandler = (function(newState) {
      this.log("Change HomeKit value for temperature sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.CurrentTemperature).setProps({
      minValue : -100,
      maxValue : 140
    }).on('get', this.getState.bind(this));
  }
  else if (this.type === "airquality") {
    this.service = new Service.AirQualitySensor(this.name);
    this.changeHandler = (function(newState) {
      this.log("Change HomeKit value for air quality sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.AirQuality).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.AirQuality).on('get', this.getState.bind(this));
  }
  else if (this.type === "light") {
    this.service = new Service.LightSensor(this.name);
    this.changeHandler = (function(newState) {
      newState = parseFloat(newState)
      this.log("Change HomeKit value for light sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on('get', this.getState.bind(this));
  }
  else if (this.type === "leak") {
    this.service = new Service.LeakSensor(this.name);
    this.changeHandler = (function(newState) {
      this.log("Change HomeKit value for Leak sensor to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.LeakDetected).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }).bind(this);
    this.service.getCharacteristic(Characteristic.LeakDetected).on('get', this.getState.bind(this));
  }

}

HttpWebHookSensorAccessory.prototype.getState = function(callback) {
  this.log("Getting current state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  this.log("State for '%s' is '%s'", this.id, state);
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
  else if (this.type === "light") {
    callback(null, parseFloat(state));
  }
  else {
    callback(null, state);
  }
};

HttpWebHookSensorAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookSensorAccessory;