let { API, Service, Characteristic } = require('./../homebridge.js');
let Capability = require('../capability.js');


module.exports = class extends Capability {
    constructor(options) {
        super({ capabilityID: "measure_battery", ...options });
    }

    getCharacteristic() {
		return this.service.getCharacteristic(Characteristic.BatteryLevel);
    }
};
