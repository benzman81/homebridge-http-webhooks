# homebridge-http-webhooks
A http plugin with support of webhooks for [Homebridge](https://github.com/nfarina/homebridge).

The plugin gets its states from any system that is calling the url to trigger a state change.

Currently supports contact, motion, occupancy, smoke sensors, switches and push buttons.

# Installation
1. Install homebridge using: `npm install -g homebridge`
2. Install this plugin using: `npm install -g homebridge-http-webhooks`
3. Update your configuration file. See sample-config.json snippet below.

# Retrieve state
To retireve the current state you need to call the url `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToTrigger`
The returned JSON format is:
```
    {
        success: true,
        state: cachedState
    }
```

# Trigger change
To trigger a change of an accessory you need to call the url `http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToTrigger&state=NEWSTATE`

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

# Trigger action

## Switch
For switches you can trigger a url of any system for switching the switch on or off.

## Push button
For push buttons you can trigger a url of any system for "pushing the button. The button will be released automatically.

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
                    }
                ],
                "switches": [
                    {
                    "id": "switch1",
                    "name": "Switch name 1",
                    "on_url": "your url to switch the switch on", // (optional)
                    "off_url": "your url to switch the switch off" // (optional)
                    }
                ],
                "pushbuttons": [
                    {
                    "id": "pushbutton1",
                    "name": "Push button name 1",
                    "push_url": "your url to be called on push" // (optional)
                    }
                ]
            }
        ]
    }
```
