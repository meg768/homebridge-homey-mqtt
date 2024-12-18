let { API, Service, Characteristic } = require("./../homebridge.js");
let Capability = require("../capability.js");

module.exports = class extends Capability {
    constructor(options) {
        super({ capabilityID: "locked", characteristic: Characteristic.LockCurrentState, ...options });
    }

    toHomeKit(value) {
        let UNSECURED = Characteristic.LockCurrentState.UNSECURED;
        let SECURED = Characteristic.LockCurrentState.SECURED;

        return value ? SECURED : UNSECURED;
    }

    toHomey(value) {
        let UNSECURED = Characteristic.LockCurrentState.UNSECURED;
        let SECURED = Characteristic.LockCurrentState.SECURED;

        return value == SECURED;
    }
};
