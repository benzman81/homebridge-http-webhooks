const Constants = require('../Constants');
const Server = require('../Server');

var HttpWebHookSensorAccessory = require('./accessories/HttpWebHookSensorAccessory');
var HttpWebHookSwitchAccessory = require('./accessories/HttpWebHookSwitchAccessory');
var HttpWebHookPushButtonAccessory = require('./accessories/HttpWebHookPushButtonAccessory');
var HttpWebHookLightBulbAccessory = require('./accessories/HttpWebHookLightBulbAccessory');
var HttpWebHookThermostatAccessory = require('./accessories/HttpWebHookThermostatAccessory');
var HttpWebHookOutletAccessory = require('./accessories/HttpWebHookOutletAccessory');
var HttpWebHookSecurityAccessory = require('./accessories/HttpWebHookSecurityAccessory');
var HttpWebHookGarageDoorOpenerAccessory = require('./accessories/HttpWebHookGarageDoorOpenerAccessory');
var HttpWebHookStatelessSwitchAccessory = require('./accessories/HttpWebHookStatelessSwitchAccessory');
var HttpWebHookLockMechanismAccessory = require('./accessories/HttpWebHookLockMechanismAccessory');
var HttpWebHookWindowCoveringAccessory = require('./accessories/HttpWebHookWindowCoveringAccessory');
var HttpWebHookFanv2Accessory = require('./accessories/HttpWebHookFanv2Accessory');
var HttpWebHookCarbonDioxideSensoryAccessory = require('./accessories/HttpWebHookCarbonDioxideSensorAccessory');
var HttpWebHookValveAccessory = require('./accessories/HttpWebHookValveAccessory');

var Service, Characteristic;

function HttpWebHooksPlatform(log, config, homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;

  this.log = log;
  this.cacheDirectory = config["cache_directory"] || Constants.DEFAULT_CACHE_DIR;
  this.storage = require('node-persist');
  this.storage.initSync({
    dir : this.cacheDirectory
  });

  this.sensors = config["sensors"] || [];
  this.switches = config["switches"] || [];
  this.pushButtons = config["pushbuttons"] || [];
  this.lights = config["lights"] || [];
  this.thermostats = config["thermostats"] || [];
  this.outlets = config["outlets"] || [];
  this.security = config["security"] || [];
  this.garageDoorOpeners = config["garagedooropeners"] || [];
  this.statelessSwitches = config["statelessswitches"] || [];
  this.windowCoverings = config["windowcoverings"] || [];
  this.lockMechanisms = config["lockmechanisms"] || [];
  this.fanv2s = config["fanv2s"] || [];
  this.co2sensors = config["co2sensors"] || [];
  this.valves = config["valves"] || [];

  this.server = new Server(Service, Characteristic, this, config);
};

HttpWebHooksPlatform.prototype.accessories = function(callback) {
  var accessories = [];

  for (var i = 0; i < this.sensors.length; i++) {
    var sensor = new HttpWebHookSensorAccessory(Service, Characteristic, this, this.sensors[i]);
    accessories.push(sensor);
  }

  for (var i = 0; i < this.switches.length; i++) {
    var switchAccessory = new HttpWebHookSwitchAccessory(Service, Characteristic, this, this.switches[i]);
    accessories.push(switchAccessory);
  }

  for (var i = 0; i < this.pushButtons.length; i++) {
    var pushButtonsAccessory = new HttpWebHookPushButtonAccessory(Service, Characteristic, this, this.pushButtons[i]);
    accessories.push(pushButtonsAccessory);
  }

  for (var i = 0; i < this.lights.length; i++) {
    var lightAccessory = new HttpWebHookLightBulbAccessory(Service, Characteristic, this, this.lights[i]);
    accessories.push(lightAccessory);
  }

  for (var i = 0; i < this.thermostats.length; i++) {
    var thermostatAccessory = new HttpWebHookThermostatAccessory(Service, Characteristic, this, this.thermostats[i]);
    accessories.push(thermostatAccessory);
  }

  for (var i = 0; i < this.outlets.length; i++) {
    var outletAccessory = new HttpWebHookOutletAccessory(Service, Characteristic, this, this.outlets[i]);
    accessories.push(outletAccessory);
  }

  for (var i = 0; i < this.security.length; i++) {
    var securityAccessory = new HttpWebHookSecurityAccessory(Service, Characteristic, this, this.security[i]);
    accessories.push(securityAccessory);
  }

  for (var i = 0; i < this.garageDoorOpeners.length; i++) {
    var garageDoorOpenerAccessory = new HttpWebHookGarageDoorOpenerAccessory(Service, Characteristic, this, this.garageDoorOpeners[i]);
    accessories.push(garageDoorOpenerAccessory);
  }

  for (var i = 0; i < this.windowCoverings.length; i++) {
    var WindowCoveringAccessory = new HttpWebHookWindowCoveringAccessory(Service, Characteristic, this, this.windowCoverings[i]);
    accessories.push(WindowCoveringAccessory);
  }

  for (var i = 0; i < this.statelessSwitches.length; i++) {
    var statelessSwitchAccessory = new HttpWebHookStatelessSwitchAccessory(Service, Characteristic, this, this.statelessSwitches[i]);
    accessories.push(statelessSwitchAccessory);
  }

  for (var i = 0; i < this.lockMechanisms.length; i++) {
    var lockMechanismAccessory = new HttpWebHookLockMechanismAccessory(Service, Characteristic, this, this.lockMechanisms[i]);
    accessories.push(lockMechanismAccessory);
  }

  for (var i = 0; i < this.fanv2s.length; i++) {
    var fanv2Accessory = new HttpWebHookFanv2Accessory(Service, Characteristic, this, this.fanv2s[i]);
    accessories.push(fanv2Accessory);
  }

  for (var i = 0; i < this.co2sensors.length; i++) {
    var co2sensorAccessory = new HttpWebHookCarbonDioxideSensoryAccessory(Service, Characteristic, this, this.co2sensors[i]);
    accessories.push(co2sensorAccessory);
  }

  for (var i = 0; i < this.valves.length; i++) {
    var valveAccessory = new HttpWebHookValveAccessory(Service, Characteristic, this, this.valves[i]);
    accessories.push(valveAccessory);
  }

  this.server.setAccessories(accessories);
  this.server.start();

  callback(accessories);
};

module.exports = HttpWebHooksPlatform;
