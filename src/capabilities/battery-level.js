let { API, Service, Characteristic } = require('./../homebridge.js');
let Capability = require('../capability.js');


module.exports = class extends Capability {
	constructor(options) {
		super(options);
	}

	getCapabilityID() {
		return 'measure_battery';
	}

	getCharacteristic() {
		return this.service.getCharacteristic(Characteristic.BatteryLevel);
	}

};
