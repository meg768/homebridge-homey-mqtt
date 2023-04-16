# mqtt-dispatch
This is a dispatcher for MQTT.js [https://www.npmjs.com/package/mqtt] which
supports message routing for specific topics. 

You no longer need to parse the topic in the 'message' event from MQTT.js.
This module makes it easy to listen to specific events in your MQTT tree of events.

See example below.

## Example

```javascript

function example() {
	let Mqtt = require('mqtt');
	let MqttDispatch = require('mqtt-dispatch');

	// Connect to mosquittos test server
	let options = {
		host:"mqtt://test.mosquitto.org",
		port:1883
	};

	console.log(`Connecting to MQTT broker ${options.host}...`);

	// Connect to MQTT broker as usual.
	let client = Mqtt.connect(options.host, options);

	// Modify MQTT client to dispatch messages
	client = MqttDispatch(client);

	// Notify when connected
	client.on('connect', () => {
		console.log(`Connected to MQTT broker ${options.host} on port ${options.port}.`);
	});
	
	// Subscribe to the topic "Example"
	client.subscribe('Example/#');

	// Listen to specific topics
	client.on('Example/A', (message) => {
		console.log(`Message A is ${JSON.stringify(message)}`);
	});

	client.on('Example/B', (message) => {
		console.log(`Message B is ${JSON.stringify(message)}`);
	});
	
	// Listen to topics using paramaters
	client.on('Example/:name/:value', (message, args) => {
		console.log(`Message ${args.name}/${args.value} is ${JSON.stringify(message)}`);
	});
	
	// Publish 
	client.publish('Example/A', 'AA');
	client.publish('Example/B', 'BB');
	client.publish('Example/A/B', 'AABB');
}

example();
```
