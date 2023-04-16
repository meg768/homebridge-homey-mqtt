module.exports.writeJSON = function(fileName, object) {
	var fs = require('fs');
	return fs.writeFileSync(fileName, JSON.stringify(object, null, '\t'));
}