var { API, Service, Characteristic } = require('./homebridge.js');

module.exports = class {
    constructor(options) {
        let { accessory, service, capabilityID, characteristic, capabilityValue, optional = false } = options;

        if (capabilityID == undefined) {
            throw new Error(`Capability ID must be specified.`);
        }

        if (characteristic == undefined) {
            throw new Error(`A HomeKit characteristic must be specified.`);
        }

        this.device = accessory.device;
        this.log = accessory.log;
        this.debug = accessory.debug;
        this.accessory = accessory;
        this.service = service;
        this.capabilityID = capabilityID;
        this.characteristic = characteristic;

        if (capabilityValue == undefined) {
            this.getCapabilityValue = () => {
				let capability = this.getCapability();
				return capability.value;	
            };
        } else {
            this.getCapabilityValue = capabilityValue;
        }

        if (this.getCapabilityValue() != undefined) {
            this.enableCapability();
        }
    }

    getCharacteristic() {
        return this.service.getCharacteristic(this.characteristic);
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
            currentValue = this.toHomey(value);
            await this.accessory.publish(capabilityID, currentValue);
        });

        this.accessory.on(capabilityID, (value) => {
            currentValue = value;
            value = this.toHomeKit(value);
            this.debug(`Updating ${this.accessory.name}/${capabilityID}:${value}`);
            characteristic.updateValue(value);
        });
    }
};
