const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookThermostatAccessory(ServiceParam, CharacteristicParam, platform, thermostatConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = thermostatConfig["id"];
  this.name = thermostatConfig["name"];
  this.type = "thermostat";
  this.minValue = thermostatConfig["minTemp"] || 15;
  this.maxValue = thermostatConfig["maxTemp"] || 30;
  this.minStep = thermostatConfig["minStep"] || 0.5;
  this.rejectUnauthorized = thermostatConfig["rejectUnauthorized"] === undefined ? true: thermostatConfig["rejectUnauthorized"] === true;
  this.setTargetTemperatureURL = thermostatConfig["set_target_temperature_url"] || "";
  this.setTargetTemperatureMethod = thermostatConfig["set_target_temperature_method"] || "GET";
  this.setTargetTemperatureBody = thermostatConfig["set_target_temperature_body"] || "";
  this.setTargetTemperatureForm = thermostatConfig["set_target_temperature_form"] || "";
  this.setTargetTemperatureHeaders = thermostatConfig["set_target_temperature_headers"] || "{}";
  this.setTargetHeatingCoolingStateURL = thermostatConfig["set_target_heating_cooling_state_url"] || "";
  this.setTargetHeatingCoolingStateMethod = thermostatConfig["set_target_heating_cooling_state_method"] || "GET";
  this.setTargetHeatingCoolingStateBody = thermostatConfig["set_target_heating_cooling_state_body"] || "";
  this.setTargetHeatingCoolingStateForm = thermostatConfig["set_target_heating_cooling_state_form"] || "";
  this.setTargetHeatingCoolingStateHeaders = thermostatConfig["set_target_heating_cooling_state_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.Thermostat(this.name);
  this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get', this.getTargetHeatingCoolingState.bind(this)).on('set', this.setTargetHeatingCoolingState.bind(this));
  this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get', this.getCurrentHeatingCoolingState.bind(this));
  this.service.getCharacteristic(Characteristic.TargetTemperature).on('get', this.getTargetTemperature.bind(this)).on('set', this.setTargetTemperature.bind(this)).setProps({
    minValue: this.minValue,
    maxValue: this.maxValue,
    minStep: this.minStep
   });
  this.service.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getCurrentTemperature.bind(this));
}

HttpWebHookThermostatAccessory.prototype.changeFromServer = function(urlParams) {
  if (urlParams.currenttemperature != null) {
    var cachedCurTemp = this.storage.getItemSync("http-webhook-current-temperature-" + this.id);
    if (cachedCurTemp === undefined) {
      cachedCurTemp = 0;
    }
    this.storage.setItemSync("http-webhook-current-temperature-" + this.id, urlParams.currenttemperature);
    if (cachedCurTemp !== urlParams.currenttemperature) {
      this.log("Change current Temperature for thermostat to '%d'.", urlParams.currenttemperature);
      this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(urlParams.currenttemperature, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }
  if (urlParams.targettemperature != null) {
    var cachedCurTemp = this.storage.getItemSync("http-webhook-target-temperature-" + this.id);
    if (cachedCurTemp === undefined) {
      cachedCurTemp = 10;
    }
    this.storage.setItemSync("http-webhook-target-temperature-" + this.id, urlParams.targettemperature);
    if (cachedCurTemp !== urlParams.targettemperature) {
      this.log("Change target Temperature for thermostat to '%d'.", urlParams.targettemperature);
      this.service.getCharacteristic(Characteristic.TargetTemperature).updateValue(urlParams.targettemperature, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }
  if (urlParams.currentstate != null) {
    var cachedState = this.storage.getItemSync("http-webhook-current-heating-cooling-state-" + this.id);
    if (cachedState === undefined) {
      cachedState = Characteristic.CurrentHeatingCoolingState.OFF;
    }
    this.storage.setItemSync("http-webhook-current-heating-cooling-state-" + this.id, urlParams.currentstate);
    if (cachedState !== urlParams.currentstate) {
      if (urlParams.currentstate) {
        this.log("Change Current Heating Cooling State for thermostat to '%s'.", urlParams.currentstate);
        this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(urlParams.currentstate, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      }
    }
  }
  if (urlParams.targetstate != null) {
    var cachedState = this.storage.getItemSync("http-webhook-target-heating-cooling-state-" + this.id);
    if (cachedState === undefined) {
      cachedState = Characteristic.TargetHeatingCoolingState.OFF;
    }
    this.storage.setItemSync("http-webhook-target-heating-cooling-state-" + this.id, urlParams.targetstate);
    if (cachedState !== urlParams.targetstate) {
      if (urlParams.targetstate) {
        this.log("Change Target Heating Cooling State for thermostat to '%s'.", urlParams.targetstate);
        this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(urlParams.targetstate, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      }
    }
  }
  return {
    "success" : true
  };
}

HttpWebHookThermostatAccessory.prototype.getTargetTemperature = function(callback) {
  this.log.debug("Getting target temperature for '%s'...", this.id);
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
  var urlBody = this.setTargetTemperatureBody;
  var urlForm = this.setTargetTemperatureForm;
  var urlHeaders = this.setTargetTemperatureHeaders;

  Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookThermostatAccessory.prototype.getCurrentTemperature = function(callback) {
  this.log.debug("Getting current temperature for '%s'...", this.id);
  var temp = this.storage.getItemSync("http-webhook-current-temperature-" + this.id);
  if (temp === undefined) {
    temp = 20;
  }
  callback(null, temp);
};

HttpWebHookThermostatAccessory.prototype.getTargetHeatingCoolingState = function(callback) {
  this.log.debug("Getting current Target Heating Cooling state for '%s'...", this.id);
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
  var urlBody = this.setTargetHeatingCoolingStateBody;
  var urlForm = this.setTargetHeatingCoolingStateForm;
  var urlHeaders = this.setTargetHeatingCoolingStateHeaders;

  Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookThermostatAccessory.prototype.getCurrentHeatingCoolingState = function(callback) {
  this.log.debug("Getting current Target Heating Cooling state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-current-heating-cooling-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.CurrentHeatingCoolingState.OFF;
  }
  callback(null, state);
};

HttpWebHookThermostatAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookThermostatAccessory;
