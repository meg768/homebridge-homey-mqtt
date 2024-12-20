var { API, Service, Characteristic } = require("../homebridge.js");

module.exports = class {
    constructor(options) {
        let { accessory, service, capabilityID } = options;

        if (capabilityID == undefined) {
            throw new Error(`Capability ID must be specified.`);
        }

        this.device = accessory.device;
        this.log = accessory.log;
        this.debug = accessory.debug;
        this.accessory = accessory;
        this.service = service;
        this.capabilityID = capabilityID;

        this.enable();
    }

    getCapabilityValue = () => {
        return this.getCapability().value;
    };

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

    enable() {

        let lockCurrentState = this.service.getCharacteristic(Characteristic.LockCurrentState);
        let lockTargetState = this.service.getCharacteristic(Characteristic.LockTargetState);

        let currentValue = this.getCapabilityValue();
        let capabilityID = this.getCapabilityID();

        lockTargetState.updateValue(this.toHomeKit(currentValue));
        lockCurrentState.updateValue(this.toHomeKit(currentValue));

        lockCurrentState.onGet(async () => {
            return this.toHomeKit(currentValue);
        });

        lockTargetState.onGet(async () => {
            return this.toHomeKit(currentValue);
        });

        lockTargetState.onSet(async (value) => {
            currentValue = this.toHomey(value);
            await this.accessory.publish(capabilityID, currentValue);
        });

        this.accessory.on(capabilityID, (value) => {
            currentValue = value;
            value = this.toHomeKit(value);
            this.debug(`Updating ${this.accessory.name}/${capabilityID}:${value}`);
            lockTargetState.updateValue(value);
            lockCurrentState.updateValue(value);
        });
    }
};
