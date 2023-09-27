const Constants = require('../../Constants');

function HttpWebHookCarbonDioxideSensorAccessory(ServiceParam, CharacteristicParam, platform, sensorConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = sensorConfig["id"];
  this.name = sensorConfig["name"];
  this.type = "co2";
  this.co2PeakLevel = sensorConfig["co2_peak_level"] || 1200;

  this.informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);

  this.service = new Service.CarbonDioxideSensor(this.name);
  this.service.getCharacteristic(Characteristic.CarbonDioxideLevel).on('get', this.getCarbonDioxideLevel.bind(this));
  this.service.getCharacteristic(Characteristic.CarbonDioxideDetected).on('get', this.getCarbonDioxideDetected.bind(this));
}

HttpWebHookCarbonDioxideSensorAccessory.prototype.changeFromServer = function(urlParams) {
  var cached = this.storage.getItemSync("http-webhook-" + this.id) || 0;
  if (urlParams.value === undefined) {
    this.log.debug("No urlValue");
    return {
      "success" : true,
      "state" : cached
    };
  }
  var urlValue = urlParams.value;
  var co2Detected = urlValue > this.co2PeakLevel;
  this.log.debug("urlValue: "+ urlValue);
  this.log.debug("co2Detected: "+ co2Detected);
  this.storage.setItemSync("http-webhook-carbon-dioxide-level-" + this.id, urlValue);
  this.storage.setItemSync("http-webhook-carbon-dioxide-detected-" + this.id, co2Detected);
  this.log.debug("cached: "+ cached);
  this.log.debug("cached !== urlValue: "+ (cached !== urlValue));
  if (cached !== urlValue) {
    this.log("Change HomeKit value for " + this.type + " sensor to '%s'.", urlValue);
    this.service.getCharacteristic(Characteristic.CarbonDioxideLevel).updateValue(urlValue, undefined, Constants.CONTEXT_FROM_WEBHOOK);
    this.service.getCharacteristic(Characteristic.CarbonDioxideDetected).updateValue(co2Detected ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL, undefined, Constants.CONTEXT_FROM_WEBHOOK);
  }
  return {
    "success" : true
  };
}

HttpWebHookCarbonDioxideSensorAccessory.prototype.getCarbonDioxideLevel = function(callback) {
  this.log.debug("Getting carbon dioxide level for '%s'...", this.id);
  var temp = this.storage.getItemSync("http-webhook-carbon-dioxide-level-" + this.id);
  if (temp === undefined) {
    temp = 0;
  }
  callback(null, temp);
};

HttpWebHookCarbonDioxideSensorAccessory.prototype.getCarbonDioxideDetected = function(callback) {
    this.log.debug("Getting carbon dioxide detected state for '%s'...", this.id);
    var state = this.storage.getItemSync("http-webhook-carbon-dioxide-detected-" + this.id);
    if (state === undefined) {
        state = false;
    }
    callback(null, state ? Characteristic.CarbonDioxideDetected.CO2_LEVELS_ABNORMAL : Characteristic.CarbonDioxideDetected.CO2_LEVELS_NORMAL);
};

HttpWebHookCarbonDioxideSensorAccessory.prototype.getServices = function() {
  return [ this.service, this.informationService ];
};

module.exports = HttpWebHookCarbonDioxideSensorAccessory;
