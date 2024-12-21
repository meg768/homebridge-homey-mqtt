var { API, Service, Characteristic } = require("../homebridge.js");
let Capability = require("./lock.js");

module.exports = class extends Capability {
    constructor(options) {
        super(options);
    }

    toHomey(value) {
        return !value;
    }

    toHomeKit(value) {
        return !value;
    }
};
