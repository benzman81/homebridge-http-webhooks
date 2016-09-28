# homebridge-http-webhooks
A http plugin with support of webhooks for Homebridge: https://github.com/nfarina/homebridge.

To trigger a sensor you need to call the url http://yourHomebridgeServerIp:webhook_port/?accessoryId=theAccessoryIdToTrigger&state=true/false .

Currently supports contact and motion sensors.

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
                    }
                    ,
                    {
                        "id": "sensor1",
                        "name": "Sensor name 2",
                        "type": "motion"
                    }
                ]
            }
        ]
    }