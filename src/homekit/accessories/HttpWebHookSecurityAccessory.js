const Constants = require('../../Constants');

var request = require("request");

function HttpWebHookSecurityAccessory(ServiceParam, CharacteristicParam, platform, securityConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = securityConfig["id"];
  this.name = securityConfig["name"];
  this.type = "security";
  this.setStateURL = securityConfig["set_state_url"] || "";
  this.setStateMethod = securityConfig["set_state_method"] || "GET";
  this.setStateBody = securityConfig["set_state_body"] || "";
  this.setStateForm = securityConfig["set_state_form"] || "";
  this.setStateHeaders = securityConfig["set_state_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookSecurityAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookSecurityAccessory-" + this.id);

  this.service = new Service.SecuritySystem(this.name);
  this.changeCurrentStateHandler = (function(newState) {
    this.log("Change current state for security to '%d'.", newState);
    this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);
  this.changeTargetStateHandler = (function(newState) {
    this.log("Change target state for security to '%d'.", newState);
    this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);

  this.service.getCharacteristic(Characteristic.SecuritySystemTargetState).on('get', this.getTargetSecurityState.bind(this)).on('set', this.setTargetSecurityState.bind(this));
  this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).on('get', this.getCurrentSecurityState.bind(this));
}

HttpWebHookSecurityAccessory.prototype.getTargetSecurityState = function(callback) {
  this.log("Getting current Target Security state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-target-security-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.SecuritySystemTargetState.DISARM;
  }
  callback(null, state);
};

HttpWebHookSecurityAccessory.prototype.setTargetSecurityState = function(newState, callback, context) {
  this.log("Target Security state for '%s'...", this.id);
  this.storage.setItemSync("http-webhook-target-security-state-" + this.id, newState);
  var urlToCall = this.setStateURL.replace("%d", newState);
  var urlMethod = this.setStateMethod;
  var urlBody = this.setStateBody;
  var urlForm = this.setStateForm;
  var urlHeaders = this.setStateHeaders;

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
        this.service.getCharacteristic(Characteristic.SecuritySystemCurrentState).updateValue(newState, undefined, null);
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

HttpWebHookSecurityAccessory.prototype.getCurrentSecurityState = function(callback) {
  this.log("Getting current Target Security state for '%s'...", this.id);
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