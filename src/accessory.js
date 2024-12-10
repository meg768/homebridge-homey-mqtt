var { API, Service, Characteristic } = require('./homebridge.js');
var Events = require('events');
var Timer = require('yow/timer');

module.exports = class extends Events {
	constructor(options) {
		let On = require('./capabilities/on.js');
		let Brightness = require('./capabilities/brightness.js');
		let ColorTemperature = require('./capabilities/color-temperature.js');
		let MotionDetected = require('./capabilities/motion-detected.js');
		let CurrentAmbientLightLevel = require('./capabilities/current-ambient-light-level.js');
		let CurrentRelativeHumidity = require('./capabilities/current-relative-humidity.js');
		let CurrentTemperature = require('./capabilities/current-temperature.js');
		let BatteryLevel = require('./capabilities/battery-level.js');
		let StatusLowBattery = require('./capabilities/status-low-battery.js');
		
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
		this.caps = {};

		switch (this.device.class) {
			case 'tv': {
				let service = this.addService(new Service.Television(this.name, this.UUID));
				this.caps.on = new On({accessory:this, service:service, optional:false});
				break;
			}
			case 'socket': {
				let service = this.addService(new Service.Outlet(this.name, this.UUID));
				this.caps.on = new On({accessory:this, service:service, optional:false});
				break;
			}
			case 'light': {
				let service = this.addService(new Service.Lightbulb(this.name, this.UUID));
				this.caps.on = new On({accessory:this, service:service, optional:false});
				this.caps.brightness = new Brightness({accessory:this, service:service, optional:true});
				this.caps.colorTemperature = new ColorTemperature({accessory:this, service:service, optional:true});

				break;
			}
			case 'lock': {
				break;
			}
			default: {
				if (device.capabilitiesObj.onoff) {
					let service = this.addService(new Service.Switch(this.name, this.UUID));
					this.caps.on = new On({accessory:this, service:service, optional:false});
				}
				break;
			}
		}

		if (this.device.capabilitiesObj.alarm_motion) {
			let service = this.addService(new Service.MotionSensor(`${this.name} - rörelse`, this.UUID));
			this.caps.motionDetected = new MotionDetected({accessory:this, service:service, optional:false});
		}
		if (this.device.capabilitiesObj.measure_temperature) {
			let service = this.addService(new Service.TemperatureSensor(`${this.name} - temperatur`, this.UUID));
			this.caps.currentTemperature = new CurrentTemperature({accessory:this, service:service, optional:false});
		}
		if (this.device.capabilitiesObj.measure_luminance) {
			let service = this.addService(new Service.LightSensor(`${this.name} - ljusstyrka`, this.UUID));
			this.caps.currentAmbientLightLevel = new CurrentAmbientLightLevel({accessory:this, service:service, optional:false});
		}
		if (this.device.capabilitiesObj.measure_humidity) {
			let service = this.addService(new Service.HumiditySensor(`${this.name} - luftfuktighet`, this.UUID));
			this.caps.currentRelativeHumidity = new CurrentRelativeHumidity({accessory:this, service:service, optional:false});
		}
		if (this.device.capabilitiesObj.measure_battery) {
			let service = this.addService(new Service.Battery(`${this.name} - batteri`, this.UUID));
			this.caps.statusLowBattery = new StatusLowBattery({accessory:this, service:service, optional:false});
			this.caps.batteryLevel = new BatteryLevel({accessory:this, service:service, optional:true});
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
		return service;
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

		let capabilityID = 'onoff';

		if (this.device.capabilitiesObj[capabilityID] == undefined) {
			return;
		}

		let characteristic = this.getService(service).getCharacteristic(Characteristic.On);
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
