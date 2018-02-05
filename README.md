# homebridge-http-webhooks
A http plugin with support of webhooks for [Homebridge](https://github.com/nfarina/homebridge).

The plugin gets its states from any system that is calling the url to trigger a state change.

Currently supports contact, motion, occupancy, smoke sensors, switches, push buttons, lights (only on/off), temperature sensors, humidity sensors and thermostats.

# Installation
1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-http-webhooks`
3. Update your configuration file. See sample-config.json snippet below.

# Retrieve state
To retrieve the current state you need to call the url `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToTrigger`
The returned JSON format is:
```
    {
        success: true,
        state: cachedState
    }
```

# Trigger change for boolean accessory
To trigger a change of a boolean accessory you need to call the url `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToTrigger&state=NEWSTATE`

## Contact sensor
For contact sensors the value for `NEWSTATE` is either `true` for contact or `false` for no contact.

## Motion sensor
For motion sensors the value for `NEWSTATE` is either `true` for motion detection or `false` for no motion.

## Occupancy sensor
For occupancy sensors the value for `NEWSTATE` is either `true` for occupancy detection or 'false' for no occupancy.

## Smoke sensor
For smoke sensors the value for `NEWSTATE` is either `true` for smoke detection or `false` for no smoke.

## Switch
For switches the value for `NEWSTATE` is either `true` for on or `false` for off.

## Push button
For push buttons the value for `NEWSTATE` is `true`. The button will be released automatically.

## Light
For lights the value for `NEWSTATE` is either `true` for on or `false` for off.

# Trigger action

## Switch
For switches you can trigger a url of any system for switching the switch on or off.

## Push button
For push buttons you can trigger a url of any system for "pushing the button. The button will be released automatically.

## Light
For lights you can trigger a url of any system for switching the ligth on or off.

# Update a numeric accessory
To update a numeric accessory you need to call the url `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToUpdate&value=NEWVALUE`

## Temperature sensor
For temperature sensors the value for `NEWVALUE` is the new temperature reading.

## Humidity sensor
For humidity sensors the value for `NEWVALUE` is the new ralative humidity percentage reading.

# Thermostat
To update a thermostat you can update four different values:
* Current temperature reading: `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToUpdate&currenttemperature=NEWVALUE`
* Target temperature: `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToUpdate&targettemperature=NEWVALUE`
* Current state (Off=0 / Heating=1 / Cooling=2): `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToUpdate&currentstate=NEWVALUE`
* Target state (Off=0 / Heat=1 / Cool=2 / Auto=3): `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToUpdate&targetstate=NEWVALUE`

# Configuration
Example config.json:
```
    {
        "platforms": [
            {
                "platform": "HttpWebHooks",
                "webhook_port": "51828",
                "cache_directory": "./.node-persist/storage", // (optional, default: "./.node-persist/storage")
                "sensors": [
                    {
                    "id": "sensor1",
                    "name": "Sensor name 1",
                    "type": "contact"
                    },
                    {
                    "id": "sensor2",
                    "name": "Sensor name 2",
                    "type": "motion"
                    },
                    {
                    "id": "sensor3",
                    "name": "Sensor name 3",
                    "type": "occupancy"
                    },
                    {
                    "id": "sensor4",
                    "name": "Sensor name 4",
                    "type": "smoke"
                    },
                    {
                    "id": "sensor5",
                    "name": "Sensor name 5",
                    "type": "temperature"
                    },
                    {
                    "id": "sensor6",
                    "name": "Sensor name 6",
                    "type": "humidity"
                    }
                ],
                "switches": [
                    {
                    "id": "switch1",
                    "name": "Switch name 1",
                    "on_url": "your url to switch the switch on", // (optional)
                    "on_method": "GET", // (optional)
                    "off_url": "your url to switch the switch off", // (optional)
                    "off_method": "GET" // (optional)
                    }
                ],
                "pushbuttons": [
                    {
                    "id": "pushbutton1",
                    "name": "Push button name 1",
                    "push_url": "your url to be called on push", // (optional)
                    "push_method": "GET" // (optional)
                    }
                ],
                "lights": [
                    {
                    "id": "light1",
                    "name": "Light name 1",
                    "on_url": "your url to switch the light on", // (optional)
                    "on_method": "GET", // (optional)
                    "off_url": "your url to switch the light off", // (optional)
                    "off_method": "GET" // (optional)
                    }
                ],
                "thermostats": [
                    {
                    "id": "thermostat1",
                    "name": "Thermostat name 1",
                    "set_target_temperature_url": "http://127.0.0.1/thermostatscript.php?targettemperature=%f",        // %f is replaced by the target temperature
                    "set_target_heating_cooling_state_url": "http://127.0.0.1/thermostatscript.php?targetstate=%b",    // %b is replaced by the target state
                    }
                ]
            }
        ]
    }
```
