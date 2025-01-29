const Constants = require('../../Constants');

function HttpWebHookDoorbellAccessory(ServiceParam, CharacteristicParam, platform, doorbellConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = doorbellConfig["id"];
  this.type = "doorbell";
  this.name = doorbellConfig["name"];

  var single_press = doorbellConfig["single_press"] === undefined ? true : doorbellConfig["single_press"];
  var double_press = doorbellConfig["double_press"] === undefined ? true : doorbellConfig["double_press"];
  var long_press = doorbellConfig["long_press"] === undefined ? true : doorbellConfig["long_press"];

  // first service must be a StatelessProgrammableSwitch to be supported in the Home app. Only need one button for the doorbell
  this.service = [];
  var button = new Service.StatelessProgrammableSwitch(this.name,'sps');
  button.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(GetDoorbellStatelessSwitchProps(single_press, double_press, long_press));
  this.service.push(button);


  // add the Doorbell as a service
  var doorbell = new Service.Doorbell(this.name,'db');
  doorbell.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(GetDoorbellStatelessSwitchProps(single_press, double_press, long_press));
  this.service.push(doorbell);
  

  // add the AccessoryInformation as a service
  var informationService = new Service.AccessoryInformation();
  informationService.setCharacteristic(Characteristic.Manufacturer, "HttpWebHooksPlatform");
  informationService.setCharacteristic(Characteristic.Model, "HttpWebHookDoorbellAccessory-" + this.name);
  informationService.setCharacteristic(Characteristic.SerialNumber, this.id);
  this.service.push(informationService);

};

HttpWebHookDoorbellAccessory.prototype.changeFromServer = function(urlParams) {
  if (urlParams.event && urlParams.event) {
    // loop each service to find the Doorbell and StatelessProgrammableSwitch services
    for (var index = 0; index < this.service.length; index++) {
      var serviceName = this.service[index].getCharacteristic(Characteristic.Name).value;
      var serviceSubtype = this.service[index].subtype;
      var validValues = this.service[index].getCharacteristic(Characteristic.ProgrammableSwitchEvent).props.validValues;

      // for service subtypes sps and db, update the value
      // db is the Doorbell, updateValue causes the HomeKit notification to be sent
      // sps is the StatelessProgrammableSwitch, updateValue causes any programmed switch actions to occur
      if ((['db','sps'].includes(serviceSubtype)) ) {
        if (validValues.includes(Number(urlParams.event))) {
          // event value is valid
          // we need updates for 2 x services, but we only want to do 1 x logging and so log only for the doorbell update
          if (serviceSubtype === 'db') {
            this.log(this.name + ": Pressing '%s' with event '%i'", serviceName, urlParams.event);
            this.service[index].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(urlParams.event, undefined, Constants.CONTEXT_FROM_WEBHOOK);
          }
          // for the sps just do the update, no logging
          if (serviceSubtype === 'sps') {
            this.service[index].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(urlParams.event, undefined, Constants.CONTEXT_FROM_WEBHOOK);
          }
        } else {
          // event value is invalid
          var errorText  = "event value " + urlParams.event + " is outside of valid values: " + validValues;
          this.log.warn(this.name + ": WARNING: " + errorText);
          return {
            "error" : errorText
          };
        }

      }
     }
  }
  return {
    "success" : true
  };
}

function GetDoorbellStatelessSwitchProps(single_press, double_press, long_press) {
  var props;
  if (single_press && !double_press && !long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      validValues : [ Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS ]
    };
  }
  if (single_press && double_press && !long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
      validValues : [ Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS, Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS ]
    };
  }
  if (single_press && !double_press && long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
      validValues : [ Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS, Characteristic.ProgrammableSwitchEvent.LONG_PRESS ]
    };
  }
  if (!single_press && double_press && !long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
      validValues : [ Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS ]
    };
  }
  if (!single_press && double_press && long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
      validValues : [ Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS, Characteristic.ProgrammableSwitchEvent.LONG_PRESS ]
    };
  }
  if (!single_press && !double_press && long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
      validValues : [ Characteristic.ProgrammableSwitchEvent.LONG_PRESS ]
    };
  }
  if (single_press && double_press && long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
      validValues : [ Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS, Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS, Characteristic.ProgrammableSwitchEvent.LONG_PRESS ]
    };
  }
  return props;
}

HttpWebHookDoorbellAccessory.prototype.getServices = function() {
  return this.service;
};

module.exports = HttpWebHookDoorbellAccessory;