let { API, Service, Characteristic } = require('./../homebridge.js');
let Capability = require('../capability.js');


module.exports = class extends Capability {
    toHomeKit(value) {
        return value === true;
    }


    getCharacteristic() {
        return this.service.getCharacteristic(Characteristic.On);
    }
};
