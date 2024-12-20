let { API, Service, Characteristic } = require('./../homebridge.js');
let Capability = require('../capability.js');


module.exports = class extends Capability {

    getCharacteristic() {
		return this.service.getCharacteristic(Characteristic.BatteryLevel);
    }
};
