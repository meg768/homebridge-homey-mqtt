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
		let Hue = require('./capabilities/hue.js');
		let Saturation = require('./capabilities/saturation.js');
		
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
				this.caps.hue = new Hue({accessory:this, service:service, optional:true});
				this.caps.saturation = new Saturation({accessory:this, service:service, optional:true});	
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

	updateCharacteristicValue(service, characteristic, value) {
		this.getService(service).getCharacteristic(characteristic).updateValue(value);
	}

};
