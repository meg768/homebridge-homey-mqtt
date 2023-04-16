
module.exports = function(path) {
	var fs = require('fs');
	return fs.existsSync(path);
}