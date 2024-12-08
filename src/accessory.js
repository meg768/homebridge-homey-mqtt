var { API, Service, Characteristic } = require('./homebridge.js');
var Events = require('events');
var Timer = require('yow/timer');

module.exports = class extends Events {
	constructor(options) {
		super();

		let { device, platform } = options;
		let uuid = device.id;

		this.name = device.name;

		// Apparently we need a display name...
		this.displayName = device.name;

		// Seems like we have to set the uuid_base member to a unique ID to have several platforms with accessories with the same name
		this.uuid_base = uuid;

		// What do I know, but this is set also...
		this.UUID = uuid;
		this.uuid = uuid;

		this.platform = platform;
		this.device = device;
		this.log = platform.log;
		this.debug = platform.debug;
		this.services = [];


		switch (this.device.class) {
			case 'tv': {
				this.addService(new Service.Television(this.name, this.UUID));
				this.enableOnOff(Service.Television);
				break;
			}
			case 'socket': {
				this.addService(new Service.Outlet(this.name, this.UUID));
				this.enableOnOff(Service.Outlet);
				break;
			}
			case 'light': {
				this.addService(new Service.Lightbulb(this.name, this.UUID));
				this.enableOnOff(Service.Lightbulb);
				this.enableBrightness(Service.Lightbulb);
				this.enableColorTemperature(Service.Lightbulb);
				break;
			}
			case 'lock': {
				this.addService(new Service.LockMechanism(this.name, this.UUID));
				this.enableLock(Service.LockMechanism);
				break;
			}
			default: {
				if (device.capabilitiesObj.onoff) {
					this.addService(new Service.Switch(this.name, this.UUID));
					this.enableOnOff(Service.Switch);
				}
				break;
			}
		}

		if (this.device.capabilitiesObj['alarm_motion']) {
			this.addService(new Service.MotionSensor(`${this.name} - rörelse`, this.UUID));
			this.enableMotionDetected(Service.MotionSensor);	
		}
		if (this.device.capabilitiesObj['measure_temperature']) {
			this.addService(new Service.TemperatureSensor(`${this.name} - temperatur`, this.UUID));
			this.enableCurrentTemperature(Service.TemperatureSensor);		
		}
		if (this.device.capabilitiesObj['measure_luminance']) {
			this.addService(new Service.LightSensor(`${this.name} - ljusstyrka`, this.UUID));
			this.enableLightSensor(Service.LightSensor);			
		}
		if (this.device.capabilitiesObj['measure_humidity']) {
			this.addService(new Service.HumiditySensor(`${this.name} - luftfuktighet`, this.UUID));
			this.enableCurrentRelativeHumidity(Service.HumiditySensor);		
		}
		if (this.device.capabilitiesObj['measure_battery']) {
			this.addService(new Service.Battery(`${this.name} - batteri`, this.UUID));
			this.enableStatusLowBattery(Service.Battery);
			this.enableBatteryLevel(Service.Battery);		
		}

		if (this.services.length == 0) {
			throw new Error(`No service available for device '${this.name}'`);
		}

		this.addService(new Service.AccessoryInformation());
		this.updateCharacteristicValue(Service.AccessoryInformation, Characteristic.FirmwareRevision, '1.0');
		this.updateCharacteristicValue(Service.AccessoryInformation, Characteristic.Model, this.device.driverId);
		this.updateCharacteristicValue(Service.AccessoryInformation, Characteristic.Manufacturer, this.device.driverUri);
		this.updateCharacteristicValue(Service.AccessoryInformation, Characteristic.SerialNumber, this.device.id);

		try {
			this.updateCharacteristicValue(Service.AccessoryInformation, Characteristic.Manufacturer, this.device.settings['zb_manufacturer_name']);
			this.updateCharacteristicValue(Service.AccessoryInformation, Characteristic.Model, this.device.settings['zb_product_id']);
		} catch (error) {}

	}

	addService(service) {
		this.services.push(service);
	}

	getServices() {
		return this.services;
	}

	getService(name) {
		if (name instanceof Service) return name;

		for (var index in this.services) {
			var service = this.services[index];

			if (typeof name === 'string' && (service.displayName === name || service.name === name)) return service;
			else if (typeof name === 'function' && (service instanceof name || name.UUID === service.UUID)) return service;
		}
	}

	async publish(capabilityID, value) {
		this.debug(`Publishing ${this.platform.config.mqtt.topic}/devices/${this.device.id}/${capabilityID}:${value}`);
		await this.platform.mqtt.publish(`${this.platform.config.mqtt.topic}/devices/${this.device.id}/${capabilityID}`, JSON.stringify(value));
	}

	getServiceCharacteristic(service, characteristic) {
		return this.getService(service).getCharacteristic(characteristic);
	}

	updateCharacteristicValue(service, characteristic, value) {
		this.getService(service).getCharacteristic(characteristic).updateValue(value);
	}


	enableCharacteristic(service, characteristic, getter, setter) {
		service = this.getService(service);

		if (typeof getter === 'function') {
			service.getCharacteristic(characteristic).on('get', async (callback) => {
				try {
					var value = await getter();
					callback(null, value);
				} catch (error) {
					this.log(error);
					callback();
				}
			});
		}

		if (typeof setter === 'function') {
			service.getCharacteristic(characteristic).on('set', async (value, callback) => {
				try {
					await setter(value);
				} catch (error) {
					this.log(error);
				} finally {
					callback();
				}
			});
		}
	}

	evaluate(code, args = {}) {
		// Call is used to define where "this" within the evaluated code should reference.
		// eval does not accept the likes of eval.call(...) or eval.apply(...) and cannot
		// be an arrow function
		return function () {
			// Create an args definition list e.g. "arg1 = this.arg1, arg2 = this.arg2"
			const argsStr = Object.keys(args)
				.map((key) => `${key} = this.${key}`)
				.join(',');
			const argsDef = argsStr ? `let ${argsStr};` : '';

			return eval(`${argsDef}${code}`);
		}.call(args);
	}

	enableOnOff(service) {

		let capabilityID = 'dim';

		if (this.device.capabilitiesObj[capabilityID] == undefined) {
			return;
		}

		let characteristic = this.getServiceCharacteristic(service, Characteristic.On);
		let capability = this.device.capabilitiesObj[capabilityID];
		let currentValue = capability.value;

		characteristic.updateValue(currentValue);

		characteristic.onGet(async () => {
			return currentValue;
		});

		characteristic.onSet(async (value) => {
			currentValue = value;
			await this.publish(capabilityID, currentValue);
		});

		this.on(capabilityID, (value) => {
			currentValue = value
			this.debug(`Updating ${this.name}/${capabilityID}:${currentValue}`);
			characteristic.updateValue(currentValue);
		});
	}


	enableLock(service) {
		var UNSECURED = Characteristic.LockCurrentState.UNSECURED;
		var SECURED = Characteristic.LockCurrentState.SECURED;
		var JAMMED = Characteristic.LockCurrentState.JAMMED;
		var UNKNOWN = Characteristic.LockCurrentState.UNKNOWN;

		let capabilityID = 'locked';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) return;

		let characteristic = this.getService(service).getCharacteristic(Characteristic.LockCurrentState);
		let deviceCapabilityID = `${this.device.id}/${capability.id}`;
		let locked = capability.value ? true : false;

		function getLockState() {
            return locked ? SECURED : UNSECURED;
        }

		async function setLockState(value) {
            this.debug(`SETTINGS LOCK VALUE!`);
            let convertedValue = value == SECURED;

            this.debug(`Setting device ${this.name}/${capabilityID} to ${convertedValue} (${deviceCapabilityID}).`);
            await this.publish(capabilityID, convertedValue);

        }

		this.enableCharacteristic(Service.LockMechanism, Characteristic.LockCurrentState, getLockState);
		this.enableCharacteristic(Service.LockMechanism, Characteristic.LockTargetState, getLockState, setLockState);

		this.debug(`ENABELING LOCK!!!!!!!!!!!!!!!!!!`);

		this.getService(service).getCharacteristic(Characteristic.LockCurrentState).updateValue(locked ? SECURED : UNSECURED);


		this.on(capabilityID, (value) => {
			this.debug(`UPDATING LOCK VALUE!`);
			locked = value;
			this.debug(`Updating ${deviceCapabilityID}:${locked} (${this.name})`);

			this.getService(service).getCharacteristic(Characteristic.LockCurrentState).updateValue(locked ? SECURED : UNSECURED);
			this.getService(service).getCharacteristic(Characteristic.LockTargetState).updateValue(locked ? SECURED : UNSECURED);
		});
	}

	updateValue(characteristic, value) {
		characteristic.updateValue(value);
	}

	enableLightSensor(service) {
		let capabilityID = 'measure_luminance';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) {
			return;
		}

		let characteristic = this.getService(service).getCharacteristic(Characteristic.CurrentAmbientLightLevel);
		let currentValue = capability.value;

		characteristic.updateValue(currentValue);

		characteristic.onGet(async () => {
			return currentValue;
		});

		this.on(capabilityID, (value) => {
			currentValue = value
			this.debug(`Updating ${this.name}/${capabilityID}:${currentValue}`);
			characteristic.updateValue(currentValue);
		});
	}

	enableBrightness(service) {
		let capabilityID = 'dim';

		if (this.device.capabilitiesObj[capabilityID] == undefined) {
			return;
		}

		let capability = this.device.capabilitiesObj[capabilityID];
		let characteristic = this.getService(service).getCharacteristic(Characteristic.Brightness);
		let currentValue = capability.value;

		let toHomeKit = (value) => {
			value = (value - capability.min) / (capability.max - capability.min);
			value = value * (characteristic.props.maxValue - characteristic.props.minValue) + characteristic.props.minValue;
			return value;
		}

		let toHomey = (value) => {
			value = (value - characteristic.props.minValue) / (characteristic.props.maxValue - characteristic.props.minValue);
			value = value * (capability.max - capability.min) + capability.min;
			return value;
		}

		characteristic.updateValue(toHomeKit(currentValue));

		characteristic.onGet(async () => {
			return toHomeKit(currentValue);
		});

		characteristic.onSet(async (value) => {
			currentValue = toHomey(value);
			await this.publish(capabilityID, currentValue);
		});

		this.on(capabilityID, (value) => {
			currentValue = value;
			value = toHomeKit(value);

			this.debug(`Updating ${this.name}/${capabilityID}:${value}`);
			characteristic.updateValue(value);
		});
	}

	enableColorTemperature(service) {

		let capabilityID = 'light_temperature';

		if (this.device.capabilitiesObj[capabilityID] == undefined) {
			return;
		}

		let capability = this.device.capabilitiesObj[capabilityID];
		let characteristic = this.getService(service).getCharacteristic(Characteristic.ColorTemperature);
		let currentValue = capability.value;

		let toHomeKit = (value) => {
			value = (value - capability.min) / (capability.max - capability.min);
			value = value * (characteristic.props.maxValue - characteristic.props.minValue) + characteristic.props.minValue;
			return value;
		}

		let toHomey = (value) => {
			value = (value - characteristic.props.minValue) / (characteristic.props.maxValue - characteristic.props.minValue);
			value = value * (capability.max - capability.min) + capability.min;
			return value;
		}

		characteristic.updateValue(toHomeKit(currentValue));

		characteristic.onGet(async () => {
			return toHomeKit(currentValue);
		});

		characteristic.onSet(async (value) => {
			currentValue = toHomey(value);
			await this.publish(capabilityID, currentValue);
		});

		this.on(capabilityID, (value) => {
			currentValue = value;
			value = toHomeKit(value);

			this.debug(`Updating ${this.name}/${capabilityID}:${value}`);
			characteristic.updateValue(value);
		});
	}

	enableCurrentTemperature(service) {
		let capabilityID = 'measure_temperature';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) {
			return;
		}

		let characteristic = this.getService(service).getCharacteristic(Characteristic.CurrentTemperature);
		let currentValue = capability.value;

		characteristic.updateValue(currentValue);

		characteristic.onGet(async () => {
			return currentValue;
		});

		this.on(capabilityID, (value) => {
			currentValue = value;

			this.debug(`Updating ${this.name}/${capabilityID}:${value}`);
			characteristic.updateValue(value);
		});
	}

	enableCurrentRelativeHumidity(service) {
		let capabilityID = 'measure_humidity';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) {
			return;
		}

		let characteristic = this.getService(service).getCharacteristic(Characteristic.CurrentRelativeHumidity);
		let currentValue = capability.value;

		characteristic.updateValue(currentValue);

		characteristic.onGet(async () => {
			return currentValue;
		});

		this.on(capabilityID, (value) => {
			currentValue = value;

			this.debug(`Updating ${this.name}/${capabilityID}:${value}`);
			characteristic.updateValue(value);
		});
	}


	enableStatusLowBattery(service) {

		let isLowBattery = (value) => {
			let BATTERY_LEVEL_NORMAL = Characteristic.StatusLowBattery.BATTERY_LEVEL_NORMAL;
			let BATTERY_LEVEL_LOW = Characteristic.StatusLowBattery.BATTERY_LEVEL_LOW;
	
			return value <= 20 ? BATTERY_LEVEL_LOW : BATTERY_LEVEL_NORMAL;
		}

		let capabilityID = 'measure_battery';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) {
			return;
		}

		let characteristic = this.getService(service).getCharacteristic(Characteristic.StatusLowBattery);
		let currentValue = capability.value;

		characteristic.updateValue(isLowBattery(currentValue));

		characteristic.onGet(async () => {
			return isLowBattery(currentValue);
		});

		this.on(capabilityID, (value) => {
			currentValue = value;
			value = isLowBattery(value);
			this.debug(`Updating ${this.name}/${capabilityID}:${value}`);
			characteristic.updateValue(value);
		});
	}

	enableBatteryLevel(service) {
		let capabilityID = 'measure_battery';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) return;

		let characteristic = this.getService(service).getCharacteristic(Characteristic.BatteryLevel);
		let currentValue = capability.value;

		characteristic.updateValue(currentValue);

		characteristic.onGet(async () => {
			return currentValue;
		});


		this.on(capabilityID, (value) => {
			currentValue = value;

			this.debug(`Updating ${this.name}/${capabilityID}:${currentValue}`);
			characteristic.updateValue(currentValue);
		});
	}


	enableMotionDetected(service) {
		let capabilityID = 'alarm_motion';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) {
			return;
		}

		let characteristic = this.getService(service).getCharacteristic(Characteristic.MotionDetected);
		let currentValue = capability.value;

		characteristic.updateValue(currentValue);

		characteristic.onGet(async () => {
			return currentValue;
		});

		this.on(capabilityID, (value) => {
			currentValue = value;
			this.debug(`Updating ${this.name}/${capabilityID}:${currentValue}`);
			characteristic.updateValue(currentValue);
		});
	}

	enableProgrammableSwitchEvent(service) {
		this.log('-------------------------------');

		let capabilityID = 'alarm_generic';
		let capability = this.device.capabilitiesObj[capabilityID];

		if (capability == undefined) return;

		let characteristic = this.getService(service).getCharacteristic(Characteristic.ProgrammableSwitchEvent);
		let deviceCapabilityID = `${this.device.id}/${capability.id}`;
		let capabilityValue = capability.value;

		characteristic.setProps({ maxValue: 0 });
		this.log(`${capabilityValue}!!!!!!!!`);
		//		characteristic.updateValue(capabilityValue ? 1 : 0);

		this.on(capabilityID, (value) => {
			capabilityValue = value;
			this.debug(`Updating ${this.name} ProgrammableSwitchEvent to ${capabilityValue}.`);
			//			characteristic.updateValue(capabilityValue ? 1 : 0);
		});
	}
};
