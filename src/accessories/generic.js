var {Service, Characteristic} = require('../homebridge.js')
var Accessory = require('../accessory.js');


module.exports = class extends Accessory {


    constructor(options) {

		super(options);

		let serviceCount = this.services.length;

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


		if (serviceCount == this.services.length) {
			throw new Error('Whopps');
		}
	}




}

