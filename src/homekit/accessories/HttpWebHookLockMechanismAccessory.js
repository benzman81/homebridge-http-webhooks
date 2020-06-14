const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookLockMechanismAccessory(ServiceParam, CharacteristicParam, platform, lockMechanismOpenerConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = lockMechanismOpenerConfig["id"];
  this.name = lockMechanismOpenerConfig["name"];
  this.type = "lockmechanism";
  this.setLockTargetStateOpenURL = lockMechanismOpenerConfig["open_url"] || "";
  this.setLockTargetStateOpenMethod = lockMechanismOpenerConfig["open_method"] || "GET";
  this.setLockTargetStateOpenBody = lockMechanismOpenerConfig["open_body"] || "";
  this.setLockTargetStateOpenForm = lockMechanismOpenerConfig["open_form"] || "";
  this.setLockTargetStateOpenHeaders = lockMechanismOpenerConfig["open_headers"] || "{}";
  this.setLockTargetStateCloseURL = lockMechanismOpenerConfig["close_url"] || "";
  this.setLockTargetStateCloseMethod = lockMechanismOpenerConfig["close_method"] || "GET";
  this.setLockTargetStateCloseBody = lockMechanismOpenerConfig["close_body"] || "";
  this.setLockTargetStateCloseForm = lockMechanismOpenerConfig["close_form"] || "";
  this.setLockTargetStateCloseHeaders = lockMechanismOpenerConfig["close_headers"] || "{}";

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookLockMechanismAccessory-" + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookLockMechanismAccessory-" + this.id);

  this.service = new Service.LockMechanism(this.name);
  this.changeLockCurrentStateHandler = (function(newState) {
    if (newState) {
      this.log("Change Current Lock State for locking to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.LockCurrentState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);
  this.changeLockTargetStateHandler = (function(newState) {
    if (newState) {
      this.log("Change Target Lock State for locking to '%s'.", newState);
      this.service.getCharacteristic(Characteristic.LockTargetState).updateValue(newState, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    }
  }).bind(this);

  this.service.getCharacteristic(Characteristic.LockTargetState).on('get', this.getLockTargetState.bind(this)).on('set', this.setLockTargetState.bind(this));
  this.service.getCharacteristic(Characteristic.LockCurrentState).on('get', this.getLockCurrentState.bind(this));
}

HttpWebHookLockMechanismAccessory.prototype.getLockTargetState = function(callback) {
  this.log("Getting current Target Lock State for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-lock-target-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.LockTargetState.SECURED;
  }
  callback(null, state);
};

HttpWebHookLockMechanismAccessory.prototype.setLockTargetState = function(homeKitState, callback, context) {
  var doLock = homeKitState == Characteristic.LockTargetState.SECURED;
  var newHomeKitState = doLock ? Characteristic.LockCurrentState.SECURED : Characteristic.LockCurrentState.UNSECURED;
  var newHomeKitStateTarget = doLock ? Characteristic.LockTargetState.SECURED : Characteristic.LockTargetState.UNSECURED;

  this.log("Target Lock State for '%s' to '%s'...", this.id, doLock);
  this.storage.setItemSync("http-webhook-lock-target-state-" + this.id, homeKitState);
  var urlToCall = this.setLockTargetStateCloseURL;
  var urlMethod = this.setLockTargetStateCloseMethod;
  var urlBody = this.setLockTargetStateCloseBody;
  var urlForm = this.setLockTargetStateCloseForm;
  var urlHeaders = this.setLockTargetStateCloseHeaders;

  if (!doLock) {
    urlToCall = this.setLockTargetStateOpenURL;
    urlMethod = this.setLockTargetStateOpenMethod;
    urlBody = this.setLockTargetStateOpenBody;
    urlForm = this.setLockTargetStateOpenForm;
    urlHeaders = this.setLockTargetStateOpenHeaders;
  }

  Util.callHttpApi(urlToCall, urlMethod, urlBody, urlForm, urlHeaders, callback, context, (function() {
    this.storage.setItemSync("http-webhook-lock-current-state-" + this.id, newHomeKitState);
    this.service.getCharacteristic(Characteristic.LockTargetState).updateValue(newHomeKitStateTarget, undefined, null);
    this.service.getCharacteristic(Characteristic.LockCurrentState).updateValue(newHomeKitState, undefined, null);
  }).bind(this), (function() {
    this.storage.setItemSync("http-webhook-lock-current-state-" + this.id, Characteristic.LockCurrentState.UNKNOWN);
    this.service.getCharacteristic(Characteristic.LockTargetState).updateValue(newHomeKitStateTarget, undefined, null);
    this.service.getCharacteristic(Characteristic.LockCurrentState).updateValue(Characteristic.LockCurrentState.UNKNOWN, undefined, null);
  }).bind(this));
};

HttpWebHookLockMechanismAccessory.prototype.getLockCurrentState = function(callback) {
  this.log("Getting Current Lock State for '%s'...", this.id);
  var state = this.storage.getItemSync("http-webhook-lock-current-state-" + this.id);
  if (state === undefined) {
    state = Characteristic.LockCurrentState.SECURED;
  }
  callback(null, state);
};

HttpWebHookLockMechanismAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookLockMechanismAccessory;