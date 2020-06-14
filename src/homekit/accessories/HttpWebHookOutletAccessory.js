const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookOutletAccessory(ServiceParam, CharacteristicParam, platform, outletConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = outletConfig["id"];
  this.name = outletConfig["name"];
  this.type = "outlet";
  this.onURL = outletConfig["on_url"] || "";
  this.onMethod = outletConfig["on_method"] || "GET";
  this.onBody = outletConfig["on_body"] || "";
  this.onForm = pushButtonConfig["on_form"] || "";
  this.onHeaders = outletConfig["on_headers"] || "{}";
  this.offURL = outletConfig["off_url"] || "";
  this.offMethod = outletConfig["off_method"] || "GET";
  this.offBody = outletConfig["off_body"] || "";
  this.offForm = pushButtonConfig["off_form"] || "";
  this.offHeaders = outletConfig["off_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookOutletAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookOutletAccessory-" + this.id);

  this.service = new Service.Outlet(this.name);
  this.changeHandler = (function(newState) {
    this.log("Change HomeKit state for outlet to '%s'.", newState);
    this.service.getCharacteristic(Characteristic.On).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);
  this.changeHandlerInUse = (function(newState) {
    this.log("Change HomeKit stateInUse for outlet to '%s'.", newState);
    this.service.getCharacteristic(Characteristic.OutletInUse).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);
  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
  this.service.getCharacteristic(Characteristic.OutletInUse).on('get', this.getStateInUse.bind(this));
}

HttpWebHookOutletAccessory.prototype.getState = function(callback) {
  this.log("Getting current state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  if (state === undefined) {
    state = false;
  }
  callback(null, state);
};

HttpWebHookOutletAccessory.prototype.getStateInUse = function(callback) {
  this.log("Getting current state for '%s'...", this.id);
  var stateInUse = this.storage.getItemSync("http-webhook-" + this.id + "-inUse");
  if (stateInUse === undefined) {
    stateInUse = false;
  }
  callback(null, stateInUse);
};

HttpWebHookOutletAccessory.prototype.setState = function(powerOn, callback, context) {
  this.log("Switch outlet state for '%s'...", this.id);
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

HttpWebHookOutletAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookOutletAccessory;