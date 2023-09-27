const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookPushButtonAccessory(ServiceParam, CharacteristicParam, platform, pushButtonConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = pushButtonConfig["id"];
  this.type = "pushbutton";
  this.name = pushButtonConfig["name"];
  this.rejectUnauthorized = pushButtonConfig["rejectUnauthorized"] === undefined ? true: pushButtonConfig["rejectUnauthorized"] === true;
  this.pushURL = pushButtonConfig["push_url"] || "";
  this.pushMethod = pushButtonConfig["push_method"] || "GET";
  this.pushBody = pushButtonConfig["push_body"] || "";
  this.pushForm = pushButtonConfig["push_form"] || "";
  this.pushHeaders = pushButtonConfig["push_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.Switch(this.name);
  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

HttpWebHookPushButtonAccessory.prototype.changeFromServer = function(urlParams) {
  if (!urlParams.state) {
    return {
      "success" : true
    };
  }
  else {
    var state = urlParams.state;
    var stateBool = state === "true";
    // this.log("[INFO Http WebHook Server] State change of '%s'
    // to '%s'.",accessory.id,stateBool);
    if (stateBool) {
      this.log("Change HomeKit state for push button to '%s'.", stateBool);
      this.service.getCharacteristic(Characteristic.On).updateValue(stateBool, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      setTimeout(function() {
        this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
      }.bind(this), 1000);
    }
    return {
      "success" : true
    };
  }
}

HttpWebHookPushButtonAccessory.prototype.getState = function(callback) {
  this.log.debug("Getting current state for '%s'...", this.id);
  var state = false;
  callback(null, state);
};

HttpWebHookPushButtonAccessory.prototype.setState = function(powerOn, callback, context) {
  this.log("Push buttons state change for '%s'...", this.id);
  if (!powerOn) {
    callback(null);
  }
  else if (this.pushURL === "" || context === Constants.CONTEXT_FROM_WEBHOOK) {
    callback(null);
    setTimeout(function() {
      this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
    }.bind(this), 1000);
  }
  else {
    var urlToCall = this.pushURL;
    var urlMethod = this.pushMethod;
    var urlBody = this.pushBody;
    var urlForm = this.pushForm;
    var urlHeaders = this.pushHeaders;

    var onSuccessAndFailureCallback = (function() {
      setTimeout(function() {
        this.service.getCharacteristic(Characteristic.On).updateValue(false, undefined, Constants.CONTEXT_FROM_TIMEOUTCALL);
      }.bind(this), 1000);
    }).bind(this);

    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context, onSuccessAndFailureCallback, onSuccessAndFailureCallback);
  }
};

HttpWebHookPushButtonAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookPushButtonAccessory;
