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

    this.service = new Service.Fanv2(this.name);
    this.service.getCharacteristic(Characteristic.Active).on('get', this.getState.bind(this)).on('set', this.setState.bind(this));
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

HttpWebHookFanv2Accessory.prototype.getServices = function () {
    return [this.service, this.informationService];
};

module.exports = HttpWebHookFanv2Accessory;