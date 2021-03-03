var HttpWebHooksPlatform = require('./src/homekit/HttpWebHooksPlatform');
var HttpWebHookSensorAccessory = require('./src/homekit/accessories/HttpWebHookSensorAccessory');
var HttpWebHookSwitchAccessory = require('./src/homekit/accessories/HttpWebHookSwitchAccessory');
var HttpWebHookPushButtonAccessory = require('./src/homekit/accessories/HttpWebHookPushButtonAccessory');
var HttpWebHookLightBulbAccessory = require('./src/homekit/accessories/HttpWebHookLightBulbAccessory');
var HttpWebHookThermostatAccessory = require('./src/homekit/accessories/HttpWebHookThermostatAccessory');
var HttpWebHookOutletAccessory = require('./src/homekit/accessories/HttpWebHookOutletAccessory');
var HttpWebHookSecurityAccessory = require('./src/homekit/accessories/HttpWebHookSecurityAccessory');
var HttpWebHookGarageDoorOpenerAccessory = require('./src/homekit/accessories/HttpWebHookGarageDoorOpenerAccessory');
var HttpWebHookStatelessSwitchAccessory = require('./src/homekit/accessories/HttpWebHookStatelessSwitchAccessory');
var HttpWebHookLockMechanismAccessory = require('./src/homekit/accessories/HttpWebHookLockMechanismAccessory');
var HttpWebHookWindowCoveringAccessory = require('./src/homekit/accessories/HttpWebHookWindowCoveringAccessory');
var HttpWebHookFanv2Accessory = require('./src/homekit/accessories/HttpWebHookFanv2Accessory');

module.exports = function(homebridge) {
  homebridge.registerPlatform("homebridge-http-webhooks", "HttpWebHooks", HttpWebHooksPlatform);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSensor", HttpWebHookSensorAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSwitch", HttpWebHookSwitchAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookPushButton", HttpWebHookPushButtonAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookLight", HttpWebHookLightBulbAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookThermostat", HttpWebHookThermostatAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookOutlet", HttpWebHookOutletAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookSecurity", HttpWebHookSecurityAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookGarageDoorOpener", HttpWebHookGarageDoorOpenerAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookStatelessSwitch", HttpWebHookStatelessSwitchAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookLockMechanism", HttpWebHookLockMechanismAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookWindowCovering", HttpWebHookWindowCoveringAccessory);
  homebridge.registerAccessory("homebridge-http-webhooks", "HttpWebHookFanv2", HttpWebHookFanv2Accessory);
};