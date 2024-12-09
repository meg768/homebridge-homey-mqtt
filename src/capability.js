var { API, Service, Characteristic } = require('./homebridge.js');

module.exports = class {
	constructor(options) {
		let { accessory, service, optional = false } = options;

		this.device = accessory.device;
		this.log = accessory.log;
		this.debug = accessory.debug;
		this.accessory = accessory;
		this.service = service;
		this.capability = this.device.capabilitiesObj[this.getCapabilityID()];

		if (!optional && this.capability == undefined) {
			throw new Error(`Capability '${this.getCapabilityID()}' not found.`);
		}

		if (this.capability) {
			this.enableCapability();
		}
	}

	getCapabilityID() {
	}

	getCharacteristic() {
	}

	getCapability() {
		return this.device.capabilitiesObj[this.getCapabilityID()]; 
	}

	toHomey(value) {
		return value;		
	}

	toHomeKit(value) {
		return value;		
	}

	enableCapability() {

		let currentValue = this.capability.value;
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
