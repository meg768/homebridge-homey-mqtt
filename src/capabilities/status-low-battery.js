let { API, Service, Characteristic } = require('./../homebridge.js');
let Capability = require('../capability.js');


module.exports = class extends Capability {
    constructor(options) {
        super({ capabilityID: "measure_battery", ...options });
    }

    getCharacteristic() {
        return Characteristic.BatteryLevel;
    }

    toHomeKit(value) {
        let BATTERY_LEVEL_NORMAL = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
        let BATTERY_LEVEL_LOW = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;

        return value <= 20 ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
    }
};
