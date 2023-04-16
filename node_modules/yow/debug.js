
module.exports = function() {
	var sprintf = require('./sprintf.js');
	var debugMode = process.env.DEBUG == undefined ? 1 : parseInt(process.env.DEBUG) != 0;
	
	if (debugMode) {
		var date  = new Date();
		var args = Array.prototype.slice.call(arguments);
	
		args.unshift(sprintf('%04d-%02d-%02d %02d:%02d.%02d:', date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()));
	
		console.log.apply(this, args);	
	}	
}

