let { API, Service, Characteristic } = require('./../homebridge.js');
let Capability = require('../capability.js');


module.exports = class extends Capability {

    getCharacteristic() {
        return this.service.getCharacteristic(Characteristic.ColorTemperature);
    }

    toHomeKit(value) {
        let characteristic = this.getCharacteristic();
        let capability = this.getCapability();

        value = (value - capability.min) / (capability.max - capability.min);
        value = value * (characteristic.props.maxValue - characteristic.props.minValue) + characteristic.props.minValue;
        return value;
    }

    toHomey(value) {
        let characteristic = this.getCharacteristic();
        let capability = this.getCapability();

        value = (value - characteristic.props.minValue) / (characteristic.props.maxValue - characteristic.props.minValue);
        value = value * (capability.max - capability.min) + capability.min;
        return value;
    }
};
