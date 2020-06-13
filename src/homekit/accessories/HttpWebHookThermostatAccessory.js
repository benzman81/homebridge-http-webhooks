const Constants = require('../../Constants');

var request = require("request");

function HttpWebHookThermostatAccessory(ServiceParam, CharacteristicParam, platform, thermostatConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = thermostatConfig["id"];
  this.name = thermostatConfig["name"];
  this.type = "thermostat";
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
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookThermostatAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookThermostatAccessory-" + this.id);

  this.service = new Service.Thermostat(this.name);
  this.changeCurrentTemperatureHandler = (function(newTemp) {
    this.log("Change current Temperature for thermostat to '%d'.", newTemp);
    this.service.getCharacteristic(Characteristic.CurrentTemperature).updateValue(newTemp, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);
  this.changeTargetTemperatureHandler = (function(newTemp) {
    this.log("Change target Temperature for thermostat to '%d'.", newTemp);
    this.service.getCharacteristic(Characteristic.TargetTemperature).updateValue(newTemp, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);
  this.changeCurrentHeatingCoolingStateHandler = (function(newState) {
    if (newState) {
      this.log("Change Current Heating Cooling State for thermostat to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);
  this.changeTargetHeatingCoolingStateHandler = (function(newState) {
    if (newState) {
      this.log("Change Target Heating Cooling State for thermostat to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);

  this.service.getCharacteristic(Characteristic.TargetHeatingCoolingState).on('get', this.getTargetHeatingCoolingState.bind(this)).on('set', this.setTargetHeatingCoolingState.bind(this));
  this.service.getCharacteristic(Characteristic.CurrentHeatingCoolingState).on('get', this.getCurrentHeatingCoolingState.bind(this));
  this.service.getCharacteristic(Characteristic.TargetTemperature).on('get', this.getTargetTemperature.bind(this)).on('set', this.setTargetTemperature.bind(this));
  this.service.getCharacteristic(Characteristic.CurrentTemperature).on('get', this.getCurrentTemperature.bind(this));
}

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
  var urlBody = this.setTargetTemperatureBody;
  var urlForm = this.setTargetTemperatureForm;
  var urlHeaders = this.setTargetTemperatureHeaders;
  if (urlToCall !== "" && context !== Constants.CONTEXT_FROM_WEBHOOK) {
    var theRequest = {
      method : urlMethod,
      url : urlToCall,
      timeout : Constants.DEFAULT_REQUEST_TIMEOUT,
      headers : JSON.parse(urlHeaders)
    };
    if (urlMethod === "POST" || urlMethod === "PUT") {
      if (urlForm) {
        this.log("Adding Form " + urlForm);
        theRequest.form = JSON.parse(urlForm);
      }
      else if (urlBody) {
        this.log("Adding Body " + urlBody);
        theRequest.body = urlBody;
      }
    }
    request(theRequest, (function(err, response, body) {
      var statusCode = response && response.statusCode ? response.statusCode : -1;
      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);
      if (!err && statusCode >= 200 && statusCode < 300) {
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

HttpWebHookThermostatAccessory.prototype.getCurrentTemperature = function(callback) {
  this.log("Getting current temperature for '%s'...", this.id);
  var temp = this.storage.getItemSync("http-webhook-current-temperature-" + this.id);
  if (temp === undefined) {
    temp = 20;
  }
  callback(null, temp);
};

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
  var urlBody = this.setTargetHeatingCoolingStateBody;
  var urlForm = this.setTargetHeatingCoolingStateForm;
  var urlHeaders = this.setTargetHeatingCoolingStateHeaders;
  if (urlToCall !== "" && context !== Constants.CONTEXT_FROM_WEBHOOK) {
    var theRequest = {
      method : urlMethod,
      url : urlToCall,
      timeout : Constants.DEFAULT_REQUEST_TIMEOUT,
      headers : JSON.parse(urlHeaders)
    };
    if (urlMethod === "POST" || urlMethod === "PUT") {
      if (urlForm) {
        this.log("Adding Form " + urlForm);
        theRequest.form = JSON.parse(urlForm);
      }
      else if (urlBody) {
        this.log("Adding Body " + urlBody);
        theRequest.body = urlBody;
      }
    }
    request(theRequest, (function(err, response, body) {
      var statusCode = response && response.statusCode ? response.statusCode : -1;
      this.log("Request to '%s' finished with status code '%s' and body '%s'.", urlToCall, statusCode, body, err);
      if (!err && statusCode >= 200 && statusCode < 300) {
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

HttpWebHookThermostatAccessory.prototype.getCurrentHeatingCoolingState = function(callback) {
  this.log("Getting current Target Heating Cooling state for '%s'...", this.id);
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