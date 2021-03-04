const Constants = require('../../Constants');
const Util = require('../../Util');

function HttpWebHookFanv2Accessory(ServiceParam, CharacteristicParam, platform, fanv2Config) {
    Service = ServiceParam;
    Characteristic = CharacteristicParam;

    this.platform = platform;
    this.log = platform.log;
    this.storage = platform.storage;

    this.id = fanv2Config["id"];
    this.type = "fanv2";
    this.name = fanv2Config["name"];
    this.rejectUnauthorized = fanv2Config["rejectUnauthorized"] === undefined ? true :
        fanv2Config["rejectUnauthorized"] === true;
    //TODO
    this.onURL = fanv2Config["on_url"] || "";
    this.onMethod = fanv2Config["on_method"] || "GET";
    this.onBody = fanv2Config["on_body"] || "";
    this.onForm = fanv2Config["on_form"] || "";
    this.onHeaders = fanv2Config["on_headers"] || "{}";
    this.offURL = fanv2Config["off_url"] || "";
    this.offMethod = fanv2Config["off_method"] || "GET";
    this.offBody = fanv2Config["off_body"] || "";
    this.offForm = fanv2Config["off_form"] || "";
    this.offHeaders = fanv2Config["off_headers"] || "{}";
    this.speedURL = fanv2Config["speed_url"] || "";
    this.speedMethod = fanv2Config["speed_method"] || "GET";
    this.speedBody = fanv2Config["speed_body"] || "";
    this.speedForm = fanv2Config["speed_form"] || "";
    this.speedHeaders = fanv2Config["speed_headers"] || "{}";
    this.speedFactor = fanv2Config["speed_factor"] || 1;

    this.enableLockPhysicalControls = fanv2Config["enableLockPhysicalControls"] || false;
    this.lockURL = fanv2Config["lock_url"] || "";
    this.lockMethod = fanv2Config["lock_method"] || "GET";
    this.lockBody = fanv2Config["lock_body"] || "";
    this.lockForm = fanv2Config["lock_form"] || "";
    this.lockHeaders = fanv2Config["lock_headers"] || "{}";
    this.unlockURL = fanv2Config["unlock_url"] || "";
    this.unlockMethod = fanv2Config["unlock_method"] || "GET";
    this.unlockBody = fanv2Config["unlock_body"] || "";
    this.unlockForm = fanv2Config["unlock_form"] || "";
    this.unlockHeaders = fanv2Config["unlock_headers"] || "{}";

    this.enableModeControls = fanv2Config["enableModeControls"] || false;
    this.modeURL = fanv2Config["mode_url"] || "";
    this.modeMethod = fanv2Config["mode_method"] || "GET";
    this.modeBody = fanv2Config["mode_body"] || "";
    this.modeForm = fanv2Config["mode_form"] || "";
    this.modeHeaders = fanv2Config["mode_headers"] || "{}";

    this.informationService = new Service.AccessoryInformation();
    this.informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
    this.informationService.setCharacteristic(Characteristic.Model, "HttpWebHookFanv2Accessory-" + this.name);
    this.informationService.setCharacteristic(Characteristic.SerialNumber, "HttpWebHookFanv2Accessory-" + this.id);

    this.service = new Service.Fanv2(this.name);
    this.service.getCharacteristic(Characteristic.Active).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
    this.service.getCharacteristic(Characteristic.RotationSpeed).on('get', this.getSpeed.bind(this)).on('set', this.setSpeed.bind(this));

    if (this.enableLockPhysicalControls) {
        this.service.getCharacteristic(Characteristic.LockPhysicalControls).on('get', this.getLockState.bind(this)).on('set', this.setLockState.bind(this));
    }

    if (this.enableModeControls) {
        this.service.getCharacteristic(Characteristic.TargetFanState).on('get', this.getTargetState.bind(this)).on('set', this.setTargetState.bind(this));
    }
}

HttpWebHookFanv2Accessory.prototype.getState = function (callback) {
    this.log.debug("Getting current state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    callback(null, state);
};

HttpWebHookFanv2Accessory.prototype.setState = function (powerOn, callback, context) {
    this.log("Fanv2 state for '%s'...", this.id);
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

HttpWebHookFanv2Accessory.prototype.getSpeed = function (callback) {
    this.log.debug("Getting current speed for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    var speed = 0;
    if (state) {
        speed = this.storage.getItemSync("http-webhook-speed-" + this.id);
        if (speed === undefined) {
            speed = 100;
        }
    }
    callback(null, parseInt(speed));
};

HttpWebHookFanv2Accessory.prototype.setSpeed = function (speed, callback, context) {
    this.log("Fanv2 rotation speed for '%s'...", this.id);
    var newState = speed > 0;
    this.storage.setItemSync("http-webhook-" + this.id, newState);
    this.storage.setItemSync("http-webhook-speed-" + this.id, speed);
    var speedFactor = this.speedFactor;
    var speedToSet = Math.ceil(speed * speedFactor);
    var urlToCall = this.replaceVariables(this.speedURL, newState, speedToSet);
    var urlMethod = this.speedMethod;
    var urlBody = this.speedBody;
    var urlForm = this.speedForm;
    var urlHeaders = this.speedHeaders;

    if (urlForm) {
        urlForm = this.replaceVariables(urlForm, newState, speedToSet);
    }
    else if (urlBody) {
        urlBody = this.replaceVariables(urlBody, newState, speedToSet);
    }

    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.getLockState = function (callback) {
    this.log.debug("Getting current lock state for '%s'...", this.id);
    var lockstate = this.storage.getItemSync("http-webhook-lockstate-" + this.id);
    if (lockstate === undefined) {
        lockstate = false;
    }
    callback(null, lockstate);
};

HttpWebHookFanv2Accessory.prototype.setLockState = function (lockState, callback, context) {
    this.log("Fanv2 lock state for '%s'...", this.id);
    this.storage.setItemSync("http-webhook-lockstate-" + this.id, lockState);
    var urlToCall = this.lockURL;
    var urlMethod = this.lockMethod;
    var urlBody = this.lockBody;
    var urlForm = this.lockForm;
    var urlHeaders = this.lockHeaders;
    if (!lockState) {
        urlToCall = this.unlockURL;
        urlMethod = this.unlockMethod;
        urlBody = this.unlockBody;
        urlForm = this.unlockForm;
        urlHeaders = this.unlockHeaders;
    }
    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.getTargetState = function (callback) {
    this.log.debug("Getting current target state for '%s'...", this.id);
    var targetState = this.storage.getItemSync("http-webhook-targetstate-" + this.id);
    if (targetState === undefined) {
        targetState = false;
    }
    callback(null, targetState);
};

HttpWebHookFanv2Accessory.prototype.setTargetState = function (targetState, callback, context) {
    this.log("Fanv2 target state for '%s'...", this.id);
    this.storage.setItemSync("http-webhook-targetstate-" + this.id, targetState);
    var state = this.storage.getItemSync("http-webhook-" + this.id);
    if (state === undefined) {
        state = false;
    }
    var urlToCall = this.modeURL.replace("%targetMode", targetState);
    var urlMethod = this.modeMethod;
    var urlBody = this.modeBody;
    var urlForm = this.modeForm;
    var urlHeaders = this.modeHeaders;

    Util.callHttpApi(this.log, urlToCall, urlMethod, urlBody, urlForm, urlHeaders, this.rejectUnauthorized, callback, context);
};

HttpWebHookFanv2Accessory.prototype.replaceVariables = function (text, state, speed) {
    return text.replace("%statusPlaceholder", state).replace("%speedPlaceholder", speed);
};


HttpWebHookFanv2Accessory.prototype.getServices = function () {
    return [this.service, this.informationService];
};

module.exports = HttpWebHookFanv2Accessory;