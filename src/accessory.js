var { API, Service, Characteristic } = require("./homebridge.js");
var Events = require("events");

module.exports = class extends Events {
    constructor(options) {
        super(options);

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
        this.capabilities = {};

        switch (this.device.class) {
            case "tv": {
                let OnOff = require("./capabilities/onoff.js");
                let service = this.addService(new Service.Television(this.name, this.UUID));
                this.capabilities.onoff = new OnOff({ capabilityID: "onoff", accessory: this, service: service });
                break;
            }
            case "socket": {
                let OnOff = require("./capabilities/onoff.js");
                let service = this.addService(new Service.Outlet(this.name, this.UUID));
                this.capabilities.onoff = new OnOff({ capabilityID: "onoff", accessory: this, service: service });
                break;
            }
            case "light": {
                let OnOff = require("./capabilities/onoff.js");
                let ColorBrightness = require("./capabilities/color-brightness.js");
                let ColorHue = require("./capabilities/color-hue.js");
                let ColorSaturation = require("./capabilities/color-saturation.js");
                let ColorTemperature = require("./capabilities/color-temperature.js");

                let service = this.addService(new Service.Lightbulb(this.name, this.UUID));
                this.capabilities.onoff = new OnOff({ capabilityID: "onoff", accessory: this, service: service });
                this.capabilities.dim = new ColorBrightness({ capabilityID: "dim", accessory: this, service: service });
                this.capabilities.light_hue = new ColorHue({ capabilityID: "light_hue", accessory: this, service: service });
                this.capabilities.light_saturation = new ColorSaturation({ capabilityID: "light_saturation", accessory: this, service: service });
                this.capabilities.light_temperature = new ColorTemperature({ capabilityID: "light_temperature", accessory: this, service: service });

                break;
            }
            default: {
                if (device.capabilitiesObj.onoff) {
                    let OnOff = require("./capabilities/onoff.js");

                    let service = this.addService(new Service.Switch(this.name, this.UUID));
                    this.capabilities.onoff = new OnOff({ capabilityID: "onoff", accessory: this, service: service });
                }
                break;
            }
        }

        /*
        if (this.device.capabilitiesObj.button) {
            let Button = require("./capabilities/button.js");
            let service = this.addService(new Service.Switch(this.name, this.UUID));
            this.capabilities.button = new Button({ capabilityID: "button", accessory: this, service: service });
        }
        */

        if (this.device.capabilitiesObj.locked) {
            let Lock = require("./capabilities/lock.js");
            let service = this.addService(new Service.LockMechanism(this.name, this.UUID));
            this.capabilities.car_doors_locked = new Lock({ capabilityID: "locked", accessory: this, service: service });
        }

        if (this.device.capabilitiesObj.car_doors_locked) {
            let Lock = require("./capabilities/lock-inverted.js");
            let service = this.addService(new Service.LockMechanism(this.name, this.UUID));
            this.capabilities.car_doors_locked = new Lock({ capabilityID: "car_doors_locked", accessory: this, service: service });
        }

        if (this.device.capabilitiesObj.alarm_motion) {
            let Motion = require("./capabilities/sensor-motion.js");
            let service = this.addService(new Service.MotionSensor(this.name, this.UUID));
            this.capabilities.alarm_motion = new Motion({ capabilityID: "alarm_motion", accessory: this, service: service });
        }
        if (this.device.capabilitiesObj.measure_temperature) {
            let Capability = require("./capabilities/sensor-temperature.js");
            let service = this.addService(new Service.TemperatureSensor(this.name, this.UUID));
            this.capabilities.measure_temperature = new Capability({ capabilityID: "measure_temperature", accessory: this, service: service });
        }

        if (this.device.capabilitiesObj.measure_luminance) {
            let Capability = require("./capabilities/sensor-luminance.js");
            let service = this.addService(new Service.LightSensor(this.name, this.UUID));
            this.capabilities.measure_luminance = new Capability({ capabilityID: "measure_luminance", accessory: this, service: service });
        }

        if (this.device.capabilitiesObj.measure_humidity) {
            let Capability = require("./capabilities/sensor-humidity.js");
            let service = this.addService(new Service.HumiditySensor(this.name, this.UUID));
            this.capabilities.measure_humidity = new Capability({ capabilityID: "measure_humidity", accessory: this, service: service });
        }

        if (this.device.capabilitiesObj.measure_battery) {
            let Capability = require("./capabilities/battery.js");
            let service = this.addService(new Service.Battery(this.name, this.UUID));
            this.capabilities.measure_battery = new Capability({ capabilityID: "measure_battery", accessory: this, service: service });
        }

        if (this.services.length == 0) {
            throw new Error(`No service available for device '${this.name}'`);
        }

        if (true) {
            let service = this.addService(new Service.AccessoryInformation());
            service.getCharacteristic(Characteristic.FirmwareRevision).updateValue("1.0");
            service.getCharacteristic(Characteristic.Model).updateValue(this.device.driverId);
            service.getCharacteristic(Characteristic.Manufacturer).updateValue(this.device.driverUri);
            service.getCharacteristic(Characteristic.SerialNumber).updateValue(this.device.id);
        }
    }

    addCapability({ service, Capability, capabilityID }) {
        
        // Skip if already defined
        if (this.capabilities[capabilityID]) {
            return;
        }

        // Skip if no capability
        if (this.device.capabilitiesObj[capabilityID] == undefined) {
            return;
        }

        this.capabilities[capabilityID] = new Capability({ capabilityID: capabilityID, accessory: this, service: service });
    }

    addService(service) {
        this.services.push(service);
        return service;
    }

    getServices() {
        return this.services;
    }

    async publish(capabilityID, value) {
        this.debug(`Publishing ${this.platform.config.mqtt.topic}/devices/${this.device.id}/${capabilityID}:${value}`);
        await this.platform.mqtt.publish(`${this.platform.config.mqtt.topic}/devices/${this.device.id}/${capabilityID}`, JSON.stringify(value));
    }
};
