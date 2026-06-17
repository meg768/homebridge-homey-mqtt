"use strict";


module.exports = class Platform {

    constructor(log, config, homebridge) {

		const Mqtt = require("mqtt");
		const MqttAsync = require("mqtt-async");
	
        this.config = config;
        this.log = log;
        this.homebridge = homebridge;
        this.debug = config.debug ? log : () => {};

		this.debug(`Connecting to MQTT broker ${this.config.mqtt.host}...`);

        this.mqtt = MqttAsync(Mqtt.connect(this.config.mqtt.host, {
            username: this.config.mqtt.username,
            password: this.config.mqtt.password,
            port: this.config.mqtt.port
        }));
    
        this.homebridge.on('didFinishLaunching', () => {
            this.debug('Finished launching.');
		});

    }



	createAccessories(devices) {

        let Accessory = require('./accessory.js');
        let accessories = [];

		this.debug(`Creating accessories...`);

		for (let key in devices) {
            let device = devices[key];

			if (this.config.exclude && this.config.exclude.indexOf(device.id) >= 0) {
				this.debug(`Excluding device ${device.name}.`);
				continue;
			}

            if (!device.capabilitiesObj) {
                this.debug(`Ignoring device ${device.name}. No capabilities.`);
                continue;
            }

            try {
				this.debug(`Adding device '${device.name}'.`);
                accessories.push(new Accessory({device:device, platform:this}));
            }
            catch(error) {
				this.debug(`Could not create device '${device.name}'. ${error.stack}`);
            }
	
		}

		return accessories;

	}


    accessories(callback) {
        let accessories = [];
        let accessoriesLoaded = false;
        let didCallback = false;
        let pendingMessages = [];
        let startupTimeout = setTimeout(() => {
            if (didCallback) {
                return;
            }

            this.debug(`No ${this.config.mqtt.topic}/devices retained message received. Starting with no accessories.`);
            callback(accessories);
            didCallback = true;
        }, 10000);

        let finishLoading = nextAccessories => {
            accessories = nextAccessories;
            accessoriesLoaded = true;

            if (!didCallback) {
                clearTimeout(startupTimeout);
                callback(accessories);
                didCallback = true;
            }

            for (let pendingMessage of pendingMessages) {
                this.applyCapabilityMessage(accessories, pendingMessage.topic, pendingMessage.value);
            }

            pendingMessages = [];
        };

        this.mqtt.on('message', (topic, message) => {
            let value;

            try {
                value = JSON.parse(message.toString());
            }
            catch(error) {
                this.debug(`Ignoring invalid JSON on ${topic}. ${error.message}`);
                return;
            }

            if (topic == `${this.config.mqtt.topic}/devices`) {
                finishLoading(this.createAccessories(value));
            }
            else {
                if (!accessoriesLoaded) {
                    pendingMessages.push({ topic, value });
                    return;
                }

                this.applyCapabilityMessage(accessories, topic, value);
            }
        });

        this.mqtt.on('connect', () => {
            this.debug(`Subscribing to ${this.config.mqtt.topic}/devices...`);

            this.mqtt.subscribe(`${this.config.mqtt.topic}/devices`);
            this.mqtt.subscribe(`${this.config.mqtt.topic}/devices/+/+`);
        });
    }

    applyCapabilityMessage(accessories, topic, value) {
        let parts = topic.split('/');
        let capabilityID = parts.pop();
        let deviceID = parts.pop();

        if (!deviceID || !capabilityID) {
            this.debug(`Ignoring unexpected MQTT topic ${topic}.`);
            return;
        }

        let accessory = accessories.find(item => {
            return item.device.id == deviceID;
        });

        if (accessory != undefined)
            accessory.emit(capabilityID, value);
    }

	generateUUID(id) {
        return this.homebridge.hap.uuid.generate(id.toString());
    }

}
