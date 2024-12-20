var { API, Service, Characteristic } = require("../homebridge.js");
let Capability = require("../capability.js");

module.exports = class extends Capability{
    constructor(options) {
        super(options);
    }

    toHomey(value) {
        return !value;
    }

    toHomeKit(value) {
        return !value;
    }

    enableCapability() {
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
