var { API, Service, Characteristic } = require("../homebridge.js");
let Capability = require("../capability.js");

module.exports = class extends Capability {
    constructor(options) {
        super(options);
    }


    enableCapability() {

		let isLowBattery = (value) => {
            let BATTERY_LEVEL_NORMAL = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
            let BATTERY_LEVEL_LOW = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;

            return value <= 20 ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
        };

		let batteryLevel = this.service.getCharacteristic(Characteristic.BatteryLevel);
		let statusLowBattery = this.service.getCharacteristic(Characteristic.StatusLowBattery);

        let currentValue = this.getCapabilityValue();
        let capabilityID = this.getCapabilityID();

        batteryLevel.updateValue(currentValue);
        statusLowBattery.updateValue(isLowBattery(currentValue));

        batteryLevel.onGet(async () => {
            return currentValue;
        });

        statusLowBattery.onGet(async () => {
            return isLowBattery(currentValue);
        });

        this.accessory.on(capabilityID, (value) => {
            currentValue = value;
            this.debug(`Updating ${this.accessory.name}/${capabilityID}:${value}`);
            batteryLevel.updateValue(value);
            statusLowBattery.updateValue(isLowBattery(value));
        });
    }
};
