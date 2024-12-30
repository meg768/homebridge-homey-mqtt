var { API, Service, Characteristic } = require("./homebridge.js");
var Timer = require('yow/timer');

module.exports = class {
    constructor(options) {
        let { accessory, service, capabilityID} = options;

        if (capabilityID == undefined) {
            throw new Error(`Capability ID must be specified.`);
        }

        this.device = accessory.device;
        this.log = accessory.log;
        this.debug = accessory.debug;
        this.accessory = accessory;
        this.service = service;
        this.capabilityID = capabilityID;
        this.timer = new Timer();

        if (this.device.capabilitiesObj[this.capabilityID] != undefined) {
            this.enableCapability();
        };
    }

    getCapabilityValue = () => {
        return this.getCapability().value;
    };

    getCharacteristic() {
        this.log(`Need to implement getCharacteristic()`); 
    }

    getCapability() {
        return this.device.capabilitiesObj[this.capabilityID];
    }

    getCapabilityID() {
        return this.capabilityID;
    }

    toHomey(value) {
        return value;
    }

    toHomeKit(value) {
        return value;
    }

    enableCapability() {
        let currentValue = this.getCapabilityValue();
        let characteristic = this.getCharacteristic();
        let capabilityID = this.getCapabilityID();

        characteristic.updateValue(this.toHomeKit(currentValue));

        characteristic.onGet(async () => {
            return this.toHomeKit(currentValue);
        });

        characteristic.onSet(async (value) => {
            value = this.toHomey(value);

            if (value != currentValue) {
                this.timer.setTimer(500, async () => {
                    await this.accessory.publish(capabilityID, currentValue = value);
                });

            }
        });


        this.accessory.on(capabilityID, (value) => {
            if (!this.accessory.isPublishing()) {
                if (value != currentValue) {
                    currentValue = value;
                    value = this.toHomeKit(value);
                    this.debug(`Updating ${this.accessory.name}/${capabilityID}:${value}`);
                    characteristic.updateValue(value);

                }
            }
        });

    }


};
