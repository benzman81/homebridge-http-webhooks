const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookSecurityAccessory(ServiceParam, CharacteristicParam, platform, securityConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = securityConfig["id"];
  this.name = securityConfig["name"];
  this.type = "security";
  this.rejectUnauthorized = securityConfig["rejectUnauthorized"] === undefined ? true: securityConfig["rejectUnauthorized"] === true;
  this.setStateURL = securityConfig["set_state_url"] || "";
  this.setStateMethod = securityConfig["set_state_method"] || "GET";
  this.setStateBody = securityConfig["set_state_body"] || "";
  this.setStateForm = securityConfig["set_state_form"] || "";
  this.setStateHeaders = securityConfig["set_state_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.SecuritySystem(this.name);
  this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).on('get', this.getTargetSecurityState.bind(this)).on('set', this.setTargetSecurityState.bind(this));
  this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).on('get', this.getCurrentSecurityState.bind(this));
}

HttpWebHookSecurityAccessory.prototype.changeFromServer = function(urlParams) {
  var cachedCurrentState = this.storage.getItemSync("http-webhook-current-security-state-" + this.id);
  if (cachedCurrentState === undefined) {
    cachedCurrentState = Characteristic.SecuritySystemCurrentState.DISARMED;
  }
  if (!urlParams.currentstate && !urlParams.targetstate) {
    return {
      "success" : true,
      "currentState" : cachedCurrentState
    };
  }

  if (urlParams.currentstate != null) {
    this.storage.setItemSync("http-webhook-current-security-state-" + this.id, urlParams.currentstate);
    if (cachedCurrentState !== urlParams.currentstate) {
      this.log("Change current state for security to '%d'.", urlParams.currentstate);
      this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(urlParams.currentstate, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }

  if (urlParams.targetstate != null) {
    var cachedState = this.storage.getItemSync("http-webhook-target-security-state-" + this.id);
    if (cachedState === undefined) {
      cachedState = Characteristic.SecuritySystemTargetState.DISARM;
    }
    this.storage.setItemSync("http-webhook-target-security-state-" + this.id, urlParams.targetstate);
    if (cachedState !== urlParams.targetstate) {
      this.log("Change target state for security to '%d'.", urlParams.targetstate);
      this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).updateValue(urlParams.targetstate, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }
  return {
    "success" : true
  };
}

HttpWebHookSecurityAccessory.prototype.getTargetSecurityState = function(callback) {
  this.log.debug("Getting Target Security state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-target-security-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.SecuritySystemTargetState.DISARM;
  }
  callback(null, state);
};

HttpWebHookSecurityAccessory.prototype.setTargetSecurityState = function(newState, callback, context) {
  this.log("Target Security state for '%s'...", this.id);
  this.storage.setItemSync("http-webhook-target-security-state-" + this.id, newState);
  this.storage.setItemSync("http-webhook-current-security-state-" + this.id, newState);
  var urlToCall = this.setStateURL.replace("%d", newState);
  var urlMethod = this.setStateMethod;
  var urlBody = this.setStateBody;
  var urlForm = this.setStateForm;
  var urlHeaders = this.setStateHeaders;
  Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context, (function() {
    this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(newState, undefined, null);
  }).bind(this));
};

HttpWebHookSecurityAccessory.prototype.getCurrentSecurityState = function(callback) {
  this.log.debug("Getting Current Security state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-current-security-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.SecuritySystemCurrentState.DISARMED;
  }
  callback(null, state);
};

HttpWebHookSecurityAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookSecurityAccessory;
