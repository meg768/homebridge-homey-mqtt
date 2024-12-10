let { API, Service, Characteristic } = require('./../homebridge.js');
let Capability = require('../capability.js');


module.exports = class extends Capability {
	constructor(options) {
		super({capabiltyID:'measure_battery', ...options});
	}

	getCharacteristic() {
		return this.service.getCharacteristic(Characteristic.BatteryLevel);
	}

	toHomeKit(value) {
		let BATTERY_LEVEL_NORMAL = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
		let BATTERY_LEVEL_LOW = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;

		return value <= 20 ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
	}
};
