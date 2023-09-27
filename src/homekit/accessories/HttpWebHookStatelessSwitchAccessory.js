const Constants = require('../../Constants');

function HttpWebHookStatelessSwitchAccessory(ServiceParam, CharacteristicParam, platform, statelessSwitchConfig) {
  Service = ServiceParam;
  Characteristic = CharacteristicParam;

  this.platform = platform;
  this.log = platform.log;
  this.storage = platform.storage;

  this.id = statelessSwitchConfig["id"];
  this.type = "statelessswitch";
  this.name = statelessSwitchConfig["name"];
  this.buttons = statelessSwitchConfig["buttons"] || [];

  this.service = [];
  for (var index = 0; index < this.buttons.length; index++) {
    var single_press = this.buttons[index]["single_press"] === undefined ? true : this.buttons[index]["single_press"];
    var double_press = this.buttons[index]["double_press"] === undefined ? true : this.buttons[index]["double_press"];
    var long_press = this.buttons[index]["long_press"] === undefined ? true : this.buttons[index]["long_press"];
    var button = new Service.StatelessProgrammableSwitch(this.buttons[index].name, '' + index);
    button.getCharacteristic(Characteristic.ProgrammableSwitchEvent).setProps(GetStatelessSwitchProps(single_press, double_press, long_press));
    button.getCharacteristic(Characteristic.ServiceLabelIndex).setValue(index + 1);
    this.service.push(button);
  }

  var informationService = new Service.AccessoryInformation();
  this.informationService.setCharacteristic(Characteristic.Manufacturer, this.manufacturer);
  this.informationService.setCharacteristic(Characteristic.Model, this.modelPrefix + this.name);
  this.informationService.setCharacteristic(Characteristic.SerialNumber, this.serialPrefix + this.id);
  this.service.push(informationService);
};

HttpWebHookStatelessSwitchAccessory.prototype.changeFromServer = function(urlParams) {
  if (urlParams.event && urlParams.event) {
    for (var index = 0; index < this.service.length; index++) {
      var serviceName = this.service[index].getCharacteristic(Characteristic.Name).value;
      if (serviceName === urlParams.buttonName) {
        this.log("Pressing '%s' with event '%i'", urlParams.buttonName, urlParams.event)
        this.service[index].getCharacteristic(Characteristic.ProgrammableSwitchEvent).updateValue(urlParams.event, undefined, Constants.CONTEXT_FROM_WEBHOOK);
      }
    }
  }
  return {
    "success" : true
  };
}

function GetStatelessSwitchProps(single_press, double_press, long_press) {
  var props;
  if (single_press && !double_press && !long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS
    };
  }
  if (single_press && double_press && !long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
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
      maxValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS
    };
  }
  if (!single_press && double_press && long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.DOUBLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS
    };
  }
  if (!single_press && !double_press && long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS
    };
  }
  if (single_press && double_press && long_press) {
    props = {
      minValue : Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS,
      maxValue : Characteristic.ProgrammableSwitchEvent.LONG_PRESS
    };
  }
  return props;
}

HttpWebHookStatelessSwitchAccessory.prototype.getServices = function() {
  return this.service;
};

module.exports = HttpWebHookStatelessSwitchAccessory;