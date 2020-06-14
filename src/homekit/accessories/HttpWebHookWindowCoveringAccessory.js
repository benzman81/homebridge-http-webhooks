const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookWindowCoveringAccessory(ServiceParam, CharacteristicParam, platform, windowcoveringConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = windowcoveringConfig["id"];
  this.name = windowcoveringConfig["name"];
  this.type = "windowcovering";
  this.setTargetPositionOpenURL = windowcoveringConfig["open_url"] || "";
  this.setTargetPositionOpenMethod = windowcoveringConfig["open_method"] || "GET";
  this.setTargetPositionOpenBody = windowcoveringConfig["open_body"] || "";
  this.setTargetPositionOpenForm = windowcoveringConfig["open_form"] || "";
  this.setTargetPositionOpenHeaders = windowcoveringConfig["open_headers"] || "{}";
  this.setTargetPositionOpen20URL = windowcoveringConfig["open_20_url"] || "";
  this.setTargetPositionOpen20Method = windowcoveringConfig["open_20_method"] || "GET";
  this.setTargetPositionOpen20Body = windowcoveringConfig["open_20_body"] || "";
  this.setTargetPositionOpen20Form = windowcoveringConfig["open_20_form"] || "";
  this.setTargetPositionOpen20Headers = windowcoveringConfig["open_20_headers"] || "{}";
  this.setTargetPositionOpen40URL = windowcoveringConfig["open_40_url"] || "";
  this.setTargetPositionOpen40Method = windowcoveringConfig["open_40_method"] || "GET";
  this.setTargetPositionOpen40Body = windowcoveringConfig["open_40_body"] || "";
  this.setTargetPositionOpen40Form = windowcoveringConfig["open_40_form"] || "";
  this.setTargetPositionOpen40Headers = windowcoveringConfig["open_40_headers"] || "{}";
  this.setTargetPositionOpen60URL = windowcoveringConfig["open_60_url"] || "";
  this.setTargetPositionOpen60Method = windowcoveringConfig["open_60_method"] || "GET";
  this.setTargetPositionOpen60Body = windowcoveringConfig["open_60_body"] || "";
  this.setTargetPositionOpen60Form = windowcoveringConfig["open_60_form"] || "";
  this.setTargetPositionOpen60Headers = windowcoveringConfig["open_60_headers"] || "{}";
  this.setTargetPositionOpen80URL = windowcoveringConfig["open_80_url"] || "";
  this.setTargetPositionOpen80Method = windowcoveringConfig["open_80_method"] || "GET";
  this.setTargetPositionOpen80Body = windowcoveringConfig["open_80_body"] || "";
  this.setTargetPositionOpen80Form = windowcoveringConfig["open_80_form"] || "";
  this.setTargetPositionOpen80Headers = windowcoveringConfig["open_80_headers"] || "{}";
  this.setTargetPositionCloseURL = windowcoveringConfig["close_url"] || "";
  this.setTargetPositionCloseMethod = windowcoveringConfig["close_method"] || "GET";
  this.setTargetPositionCloseBody = windowcoveringConfig["close_body"] || "";
  this.setTargetPositionCloseForm = windowcoveringConfig["close_form"] || "";
  this.setTargetPositionCloseHeaders = windowcoveringConfig["close_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookWindowCoveringAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookWindowCoveringAccessory-" + this.id);

  this.service = new Service.WindowCovering(this.name);
  this.changeCurrentPositionHandler = (function(newState) {
    this.log("Change Current Window Covering for covers to '%s'.", newState);
    this.service.getCharacteristic(Characteristic.CurrentPosition).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }).bind(this);
  this.changeTargetPositionHandler = (function(newState) {
    if (newState) {
      this.log("Change Target Position for covers to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.TargetPosition).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);
  this.changePositionStateHandler = (function(newState) {
    if (newState) {
      this.log("Change Position State for covers to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.PositionState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);

  this.service.getCharacteristic(Characteristic.TargetPosition).on('get', this.getTargetPosition.bind(this)).on('set', this.setTargetPosition.bind(this));
  this.service.getCharacteristic(Characteristic.CurrentPosition).on('get', this.getCurrentPosition.bind(this));
  this.service.getCharacteristic(Characteristic.PositionState).on('get', this.getPositionState.bind(this));
}

HttpWebHookWindowCoveringAccessory.prototype.getTargetPosition = function(callback) {
  this.log("Getting current Target Position for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-target-position-" + this.id);
  if (state === undefined) {
    state = 100;
  }
  callback(null, state);
};

HttpWebHookWindowCoveringAccessory.prototype.setTargetPosition = function(newState, callback, context) {
  this.log("Target Position State for '%s'...", this.id);
  this.log("newstate is: " + newState);
  this.storage.setItemSync("http-webhook-target-position-" + this.id, newState);
  var urlToCall = this.setTargetPositionCloseURL;
  var urlMethod = this.setTargetPositionCloseMethod;
  var urlBody = this.setTargetPositionCloseBody;
  var urlForm = this.setTargetPositionCloseForm;
  var urlHeaders = this.setTargetPositionCloseHeaders;
  if (newState === 0) {
    urlToCall = this.setTargetPositionOpenURL;
    urlMethod = this.setTargetPositionOpenMethod;
    urlBody = this.setTargetPositionOpenBody;
    urlForm = this.setTargetPositionOpenForm;
    urlHeaders = this.setTargetPositionOpenHeaders;
  }
  if (newState >= 1 && newState <= 25) {
    urlToCall = this.setTargetPositionOpen20URL;
    urlMethod = this.setTargetPositionOpen20Method;
    urlBody = this.setTargetPositionOpen20Body;
    urlForm = this.setTargetPositionOpen20Form;
    urlHeaders = this.setTargetPositionOpen20Headers;
  }
  if (newState >= 26 && newState <= 45) {
    urlToCall = this.setTargetPositionOpen40URL;
    urlMethod = this.setTargetPositionOpen40Method;
    urlBody = this.setTargetPositionOpen40Body;
    urlForm = this.setTargetPositionOpen40Form;
    urlHeaders = this.setTargetPositionOpen40Headers;
  }
  if (newState >= 46 && newState <= 65) {
    urlToCall = this.setTargetPositionOpen60URL;
    urlMethod = this.setTargetPositionOpen60Method;
    urlBody = this.setTargetPositionOpen60Body;
    urlForm = this.setTargetPositionOpen60Form;
    urlHeaders = this.setTargetPositionOpen60Headers;
  }
  if (newState >= 66 && newState <= 94) {
    urlToCall = this.setTargetPositionOpen80URL;
    urlMethod = this.setTargetPositionOpen80Method;
    urlBody = this.setTargetPositionOpen80Body;
    urlForm = this.setTargetPositionOpen80Form;
    urlHeaders = this.setTargetPositionOpen80Headers;
  }
  if (newState >= 95) {
    urlToCall = this.setTargetPositionCloseURL;
    urlMethod = this.setTargetPositionCloseMethod;
    urlBody = this.setTargetPositionCloseBody;
    urlForm = this.setTargetPositionCloseForm;
    urlHeaders = this.setTargetPositionCloseHeaders;
  }

  Util.callHttpApi(urlToCall, urlMethod, urlBody, urlForm, urlHeaders, callback, context, null, null, Constants.COVERS_REQUEST_TIMEOUT);
};

HttpWebHookWindowCoveringAccessory.prototype.getCurrentPosition = function(callback) {
  this.log("Getting Current Position for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-current-position-" + this.id);
  if (state === undefined) {
    // state = Characteristic.CurrentPosition = 100;
    state = 100;
  }
  callback(null, state);
};

HttpWebHookWindowCoveringAccessory.prototype.getPositionState = function(callback) {
  this.log("Getting position state for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-position-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.PositionState.STOPPED;
  }
  callback(null, state);
};

HttpWebHookWindowCoveringAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookWindowCoveringAccessory;