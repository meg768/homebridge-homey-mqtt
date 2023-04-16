var fs = require('fs');
var fileExists = require('./fileExists.js');

module.exports = function(path, mode) {

    if (typeof mode === 'undefined')
        mode = 0777 & (~process.umask());
	
	if (!fileExists(path))
		fs.mkdirSync(path, mode);		
}
