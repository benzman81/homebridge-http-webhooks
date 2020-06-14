const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookGarageDoorOpenerAccessory(ServiceParam, CharacteristicParam, platform, garageDoorOpenerConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = garageDoorOpenerConfig["id"];
  this.name = garageDoorOpenerConfig["name"];
  this.type = "garagedooropener";
  this.setTargetDoorStateOpenURL = garageDoorOpenerConfig["open_url"] || "";
  this.setTargetDoorStateOpenMethod = garageDoorOpenerConfig["open_method"] || "GET";
  this.setTargetDoorStateOpenBody = garageDoorOpenerConfig["open_body"] || "";
  this.setTargetDoorStateOpenForm = garageDoorOpenerConfig["open_form"] || "";
  this.setTargetDoorStateOpenHeaders = garageDoorOpenerConfig["open_headers"] || "{}";
  this.setTargetDoorStateCloseURL = garageDoorOpenerConfig["close_url"] || "";
  this.setTargetDoorStateCloseMethod = garageDoorOpenerConfig["close_method"] || "GET";
  this.setTargetDoorStateCloseBody = garageDoorOpenerConfig["close_body"] || "";
  this.setTargetDoorStateCloseForm = garageDoorOpenerConfig["close_form"] || "";
  this.setTargetDoorStateCloseHeaders = garageDoorOpenerConfig["close_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookGarageDoorOpenerAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookGarageDoorOpenerAccessory-" + this.id);

  this.service = new Service.GarageDoorOpener(this.name);
  this.changeCurrentDoorStateHandler = (function(newState) {
    if (newState) {
      this.log("Change Current Door State for garage door opener to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);
  this.changeTargetDoorStateHandler = (function(newState) {
    if (newState) {
      this.log("Change Target Door State for garage door opener to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);
  this.changeObstructionDetectedHandler = (function(newState) {
    if (newState) {
      this.log("Change Obstruction Detected for garage door opener to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.ObstructionDetected).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);

  this.service.getCharacteristic(Characteristic.TargetDoorState).on('get', this.getTargetDoorState.bind(this)).on('set', this.setTargetDoorState.bind(this));
  this.service.getCharacteristic(Characteristic.CurrentDoorState).on('get', this.getCurrentDoorState.bind(this));
  this.service.getCharacteristic(Characteristic.ObstructionDetected).on('get', this.getObstructionDetected.bind(this));
}

HttpWebHookGarageDoorOpenerAccessory.prototype.getTargetDoorState = function(callback) {
  this.log("Getting current Target Door State for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-target-door-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.TargetDoorState.CLOSED;
  }
  callback(null, state);
};

HttpWebHookGarageDoorOpenerAccessory.prototype.setTargetDoorState = function(newState, callback, context) {
  this.log("Target Door State for '%s'...", this.id);
  this.storage.setItemSync("http-webhook-target-door-state-" + this.id, newState);

  var doOpen = newState == Characteristic.TargetDoorState.OPEN;
  var newHomeKitState = doOpen ? Characteristic.CurrentDoorState.OPEN : Characteristic.CurrentDoorState.CLOSED;
  var newHomeKitStateTarget = doOpen ? Characteristic.TargetDoorState.OPEN : Characteristic.TargetDoorState.CLOSED;
  var urlToCall = this.setTargetDoorStateCloseURL;
  var urlMethod = this.setTargetDoorStateCloseMethod;
  var urlBody = this.setTargetDoorStateCloseBody;
  var urlForm = this.setTargetDoorStateCloseForm;
  var urlHeaders = this.setTargetDoorStateCloseHeaders;
  if (doOpen) {
    urlToCall = this.setTargetDoorStateOpenURL;
    urlMethod = this.setTargetDoorStateOpenMethod;
    urlBody = this.setTargetDoorStateOpenBody;
    urlForm = this.setTargetDoorStateOpenForm;
    urlHeaders = this.setTargetDoorStateOpenHeaders;
  }
  Util.callHttpApi(urlToCall, urlMethod, urlBody, urlForm, urlHeaders, callback, context, (function() {
    this.service.getCharacteristic(Characteristic.TargetDoorState).updateValue(newHomeKitStateTarget, undefined, null);
    this.service.getCharacteristic(Characteristic.CurrentDoorState).updateValue(newHomeKitState, undefined, null);
  }).bind(this));
};

HttpWebHookGarageDoorOpenerAccessory.prototype.getCurrentDoorState = function(callback) {
  this.log("Getting Current Door State for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-current-door-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.CurrentDoorState.CLOSED;
  }
  callback(null, state);
};

HttpWebHookGarageDoorOpenerAccessory.prototype.getObstructionDetected = function(callback) {
  this.log("Getting Obstruction Detected for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-obstruction-detected-" + this.id);
  if (state === undefined) {
    state = false;
  }
  callback(null, state);
};

HttpWebHookGarageDoorOpenerAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookGarageDoorOpenerAccessory;