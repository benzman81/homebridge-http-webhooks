const Constants = require('../../Constants');

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
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  if (this.type === "contact") {
    this.service = new Service.ContactSensor(this.name);
    this.service.getCharacteristic(Characteristic.ContactSensorState).on('get', this.getState.bind(this));
  }
  else if (this.type === "motion") {
    this.service = new Service.MotionSensor(this.name);
    this.service.getCharacteristic(Characteristic.MotionDetected).on('get', this.getState.bind(this));
  }
  else if (this.type === "occupancy") {
    this.service = new Service.OccupancySensor(this.name);
    this.service.getCharacteristic(Characteristic.OccupancyDetected).on('get', this.getState.bind(this));
  }
  else if (this.type === "smoke") {
    this.service = new Service.SmokeSensor(this.name);
    this.service.getCharacteristic(Characteristic.SmokeDetected).on('get', this.getState.bind(this));
  }
  else if (this.type === "humidity") {
    this.service = new Service.HumiditySensor(this.name);
    this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).on('get', this.getState.bind(this));
  }
  else if (this.type === "temperature") {
    this.service = new Service.TemperatureSensor(this.name);
    this.service.getCharacteristic(Characteristic.CurrentTemperature).setProps({
      minValue : -100,
      maxValue : 140
    }).on('get', this.getState.bind(this));
  }
  else if (this.type === "airquality") {
    this.service = new Service.AirQualitySensor(this.name);
    this.service.getCharacteristic(Characteristic.AirQuality).on('get', this.getState.bind(this));
  }
  else if (this.type === "light") {
    this.service = new Service.LightSensor(this.name);
    this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).on('get', this.getState.bind(this));
  }
  else if (this.type === "leak") {
    this.service = new Service.LeakSensor(this.name);
    this.service.getCharacteristic(Characteristic.LeakDetected).on('get', this.getState.bind(this));
  }
}

HttpWebHookSensorAccessory.prototype.changeFromServer = function(urlParams) {
  var cached = this.storage.getItemSync("http-webhook-" + this.id);
  var isNumberBased = this.type === "leak" || this.type === "humidity" || this.type === "temperature" || this.type === "airquality" || this.type === "light";
  if (cached === undefined) {
    cached = isNumberBased ? 0 : false;
  }
  var noUrlValue = isNumberBased ? urlParams.value === undefined : urlParams.state === undefined;
  if (noUrlValue) {
    this.log.debug("No urlValue");
    return {
      "success" : true,
      "state" : cached
    };
  }
  var urlValue = isNumberBased ? urlParams.value : urlParams.state === "true";
  this.log.debug("urlValue: "+ urlValue);
  this.storage.setItemSync("http-webhook-" + this.id, urlValue);
  this.log.debug("cached: "+ cached);
  this.log.debug("cached !== urlValue: "+ (cached !== urlValue));
  if (cached !== urlValue) {
    this.log("Change HomeKit value for " + this.type + " sensor to '%s'.", urlValue);

    if (this.type === "contact") {
      this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(urlValue ? Characteristic.ContactSensorState.CONTACT_DETECTED : Characteristic.ContactSensorState.CONTACT_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      if (this.autoRelease) {
        setTimeout(function() {
          this.storage.setItemSync("http-webhook-" + this.id, true);
          this.service.getCharacteristic(Characteristic.ContactSensorState).updateValue(Characteristic.ContactSensorState.CONTACT_DETECTED, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), this.autoReleaseTime);
      }
    }
    else if (this.type === "motion") {
      this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      if (this.autoRelease) {
        setTimeout(function() {
          this.storage.setItemSync("http-webhook-" + this.id, false);
          this.service.getCharacteristic(Characteristic.MotionDetected).updateValue(false, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), this.autoReleaseTime);
      }
    }
    else if (this.type === "occupancy") {
      this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(urlValue ? Characteristic.OccupancyDetected.OCCUPANCY_DETECTED : Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      if (this.autoRelease) {
        setTimeout(function() {
          this.storage.setItemSync("http-webhook-" + this.id, false);
          this.service.getCharacteristic(Characteristic.OccupancyDetected).updateValue(Characteristic.OccupancyDetected.OCCUPANCY_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
        }.bind(this), this.autoReleaseTime);
      }
    }
    else if (this.type === "smoke") {
      this.service.getCharacteristic(Characteristic.SmokeDetected).updateValue(urlValue ? Characteristic.SmokeDetected.SMOKE_DETECTED : Characteristic.SmokeDetected.SMOKE_NOT_DETECTED, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    else if (this.type === "humidity") {
      this.service.getCharacteristic(Characteristic.CurrentRelativeHumidity).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    else if (this.type === "temperature") {
      this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    else if (this.type === "airquality") {
      this.service.getCharacteristic(Characteristic.AirQuality).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    else if (this.type === "light") {
      urlValue = parseFloat(urlValue)
      this.service.getCharacteristic(Characteristic.CurrentAmbientLightLevel).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
    else if (this.type === "leak") {
      this.service.getCharacteristic(Characteristic.LeakDetected).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }

  }
  return {
    "success" : true
  };
};

HttpWebHookSensorAccessory.prototype.getState = function(callback) {
  this.log.debug("Getting current state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  this.log.debug("State for '%s' is '%s'", this.id, state);
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
