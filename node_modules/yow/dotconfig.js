const fs = require('fs');
const Path = require('path');

module.exports = function loadConfig(fileName) {

	let configFile = '';
	let config = {};

	if (fileName == undefined)
		fileName = '.config';

	try {
		if (!fs.existsSync(configFile)) {
			configFile = Path.join(Path.dirname(process.argv[1]), fileName);
		}
	
		if (!fs.existsSync(configFile)) {
			configFile = Path.resolve(process.cwd(), fileName);
		}
		
		if (fs.existsSync(configFile)) {
			config = JSON.parse(fs.readFileSync(configFile));	
		}
	}
	catch(error) {
		console.error(error);
	}

	return config;
}
