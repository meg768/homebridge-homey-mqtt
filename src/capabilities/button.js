var { API, Service, Characteristic } = require("../homebridge.js");
let Capability = require("../capability.js");

module.exports = class extends Capability {


    enableCapability() {
		let programmableSwitchEvent = this.service.getCharacteristic(Characteristic.ProgrammableSwitchEvent);

        let currentValue = this.getCapabilityValue();
        let capabilityID = this.getCapabilityID();


        programmableSwitchEvent.onGet(async () => {
            return Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS;
        });


        this.accessory.on(capabilityID, (value) => {

            currentValue = value;

            if (value) {
                this.debug(`Updating ${this.accessory.name}/${capabilityID}:${value}`);
                programmableSwitchEvent.updateValue(Characteristic.ProgrammableSwitchEvent.SINGLE_PRESS);

            }
        });


    }
};
