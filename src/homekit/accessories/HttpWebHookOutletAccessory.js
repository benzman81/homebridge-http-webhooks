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
  this.rejectUnauthorized = outletConfig["rejectUnauthorized"] === undefined ? true: outletConfig["rejectUnauthorized"] === true;
  this.onURL = outletConfig["on_url"] || "";
  this.onMethod = outletConfig["on_method"] || "GET";
  this.onBody = outletConfig["on_body"] || "";
  this.onForm = outletConfig["on_form"] || "";
  this.onHeaders = outletConfig["on_headers"] || "{}";
  this.offURL = outletConfig["off_url"] || "";
  this.offMethod = outletConfig["off_method"] || "GET";
  this.offBody = outletConfig["off_body"] || "";
  this.offForm = outletConfig["off_form"] || "";
  this.offHeaders = outletConfig["off_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.Outlet(this.name);
  this.service.getCharacteristic(Characteristic.On).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
  this.service.getCharacteristic(Characteristic.OutletInUse).on('get', this.getStateInUse.bind(this));
}

HttpWebHookOutletAccessory.prototype.changeFromServer = function(urlParams) {
  var cachedState = this.storage.getItemSync("http-webhook-" + this.id);
  if (cachedState === undefined) {
    cachedState = false;
  }
  var cachedStateInUse = this.storage.getItemSync("http-webhook-" + this.id + "-inUse");
  if (cachedStateInUse === undefined) {
    cachedStateInUse = false;
  }
  if (!urlParams.state && !urlParams.stateOutletInUse) {
    return {
      "success" : true,
      "state" : cachedState,
      "stateOutletInUse" : cachedStateInUse
    };
  }
  else {
    if (urlParams.state) {
      var state = urlParams.state;
      var stateBool = state === "true";
      this.storage.setItemSync("http-webhook-" + this.id, stateBool);
      // this.log("[INFO Http WebHook Server] State change of
      // '%s'
      // to '%s'.",accessory.id,stateBool);
      if (cachedState !== stateBool) {
        this.log("Change HomeKit state for outlet to '%s'.", stateBool);
        this.service.getCharacteristic(Characteristic.On).updateValue(stateBool, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      }
    }
    if (urlParams.stateOutletInUse) {
      var stateOutletInUse = urlParams.stateOutletInUse;
      var stateOutletInUseBool = stateOutletInUse === "true";
      this.storage.setItemSync("http-webhook-" + this.id + "-inUse", stateOutletInUseBool);
      // this.log("[INFO Http WebHook Server] State change of
      // '%s'
      // to '%s'.",accessory.id,stateBool);
      if (cachedStateInUse !== stateOutletInUseBool) {
        this.log("Change HomeKit stateInUse for outlet to '%s'.", stateOutletInUseBool);
        this.service.getCharacteristic(Characteristic.OutletInUse).updateValue(stateOutletInUseBool, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      }
    }
    return {
      "success" : true
    };
  }
}

HttpWebHookOutletAccessory.prototype.getState = function(callback) {
  this.log.debug("Getting current state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-" + this.id);
  if (state === undefined) {
    state = false;
  }
  callback(null, state);
};

HttpWebHookOutletAccessory.prototype.getStateInUse = function(callback) {
  this.log.debug("Getting current state for '%s'...", this.id);
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

  Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookOutletAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookOutletAccessory;
