# homebridge-http-webhooks
A http plugin with support of webhooks for Homebridge: https://github.com/nfarina/homebridge.

Currently supports contact and motion sensors.

# Trigger change
To trigger a change of an accessory you need to call the url http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToTrigger&state=NEWSTATE .

## Contact sensor
For contact sensors the value for NEWSTATE is either 'true' for contact or 'false' for no contact.

## Motion sensor
For motion sensors the value for NEWSTATE is either 'true' for motion detection or 'false' for no motion.

# Configuration
Example config.json:
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
                    "id": "sensor1",
                    "name": "Sensor name 2",
                    "type": "motion"
                    }
                ]
            }
        ]
    }