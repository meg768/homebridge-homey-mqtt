

module.exports = function mkpath(path, mode) {

    var Path = require('path');
    var fs = require('fs');
    var mkdir = require('./mkdir.js');

    path = Path.resolve(path);

    if (typeof mode === 'undefined')
        mode = 0777 & (~process.umask());

    try {
        if (!fs.statSync(path).isDirectory()) {
            throw new Error(path + ' exists and is not a directory');
        }
    } 
    catch (error) {
		if (error.code === 'ENOENT') {
			mkpath(Path.dirname(path), mode);
			mkdir(path, mode);
		}
		else {
			throw error;
		}
	}
};
