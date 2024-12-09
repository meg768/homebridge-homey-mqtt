var { API, Service, Characteristic } = require('./homebridge.js');

module.exports = class {
	constructor(options) {
		super();

		let { accessory, service, optional = false } = options;

		this.device = accessory.device;
		this.log = accessory.log;
		this.debug = accessory.debug;
		this.accessory = accessory;
		this.service = service;
		this.capability = this.device.capabilitiesObj[this.getCapabilityID()];

		if (!optional && capability == undefined) {
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
			currentValue = value
			this.debug(`Updating ${this.accessory.name}/${capabilityID}:${currentValue}`);
			characteristic.updateValue(currentValue);
		});

	}

};
