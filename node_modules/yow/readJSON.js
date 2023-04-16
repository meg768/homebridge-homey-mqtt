module.exports = function(fileName) {
	var fs = require('fs');
	return fs.existsSync(fileName) ? JSON.parse(fs.readFileSync(fileName)) : {};
}

