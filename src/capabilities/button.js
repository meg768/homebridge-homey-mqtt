var { API, Service, Characteristic } = require("../homebridge.js");
let Capability = require("../capability.js");

module.exports = class extends Capability {


    enableCapability() {
		let on = this.service.getCharacteristic(Characteristic.On);

        let currentValue = false;
        let capabilityID = this.getCapabilityID();

        let delay = async (delay = 500) => {
            return new Promise((resolve) => setTimeout(() => resolve(), delay));
        }

        on.updateValue(currentValue);

        on.onGet(async () => {
            return currentValue;
        });

        on.onSet(async (value) => {
            if (value) {
                currentValue = true;
                await this.accessory.publish(capabilityID, currentValue);

                await delay(500);

                currentValue = value;
                await this.accessory.publish(capabilityID, currentValue);

            }
        });

/*         
        this.accessory.on(capabilityID, async (value) => {

            if (value) {
                currentValue = value;
                this.debug(`Updating ${this.accessory.name}/${capabilityID}:${currentValue}`);
                on.updateValue(currentValue);

                await delay(500);
                
                currentValue = value;
                this.debug(`Updating ${this.accessory.name}/${capabilityID}:${currentValue}`);
                on.updateValue(currentValue);


            }
        });
*/

    }
};
