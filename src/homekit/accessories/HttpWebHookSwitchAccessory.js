const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookSwitchAccessory(ServiceParam, CharacteristicParam, platform, switchConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = switchConfig["id"];
  this.name = switchConfig["name"];
  this.onURL = switchConfig["on_url"] || "";
  this.onMethod = switchConfig["on_method"] || "GET";
  this.onBody = switchConfig["on_body"] || "";
  this.onForm = switchConfig["on_form"] || "";
  this.onHeaders = switchConfig["on_headers"] || "{}";
  this.offURL = switchConfig["off_url"] || "";
  this.offMethod = switchConfig["off_method"] || "GET";
  this.offBody = switchConfig["off_body"] || "";
  this.offForm = switchConfig["off_form"] || "";
  this.offHeaders = switchConfig["off_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookSwitchAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookSwitchAccessory-" + this.id);

  this.service = new Service.Switch(this.name);
  this.changeHandler = (function(newState) {
    this.log("Change HomeKit state for switch to '%s'.", newState);
    this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);
  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
}

HttpWebHookSwitchAccessory.prototype.getState = function(callback) {
  this.log("Getting current state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  if (state === undefined) {
    state = false;
  }
  callback(null, state);
};

HttpWebHookSwitchAccessory.prototype.setState = function(powerOn, callback, context) {
  this.log("Switch state for '%s'...", this.id);
  this.storage.setItemSync("http-webhook-" + this.id, powerOn);
  var urlToCall = this.onURL;
  var urlMethod = this.onMethod;
  var urlBody = this.onBody;
  var urlForm = this.onForm;
  var urlHeaders = this.onHeaders;

  if (!powerOn) {
    urlToCall = this.offURL;
    urlMethod = this.offMethod;
    urlBody = this.offBody;
    urlForm = this.offForm;
    urlHeaders = this.offHeaders;
  }

  Util.callHttpApi(urlToCall, urlMethod, urlBody, urlForm, urlHeaders, callback, context);
};

HttpWebHookSwitchAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookSwitchAccessory;