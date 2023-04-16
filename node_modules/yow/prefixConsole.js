
module.exports = function(fn) {


	var sprintf = require('./sprintf');
	var isFunction = require('./isFunction');
	var methodsNames = ['log', 'error', 'warn', 'info', 'debug'];

	if (fn == undefined) {
		fn = function() {
			var date = new Date();
			return sprintf('%04d-%02d-%02d %02d:%02d.%02d:', date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds());
		}
	}

	methodsNames.forEach((methodName) => {
		var method = console[methodName];

		console[methodName] = function() {
			var args = Array.prototype.slice.call(arguments);
			var prefix = isFunction(fn) ? fn() : fn;
		
			args.unshift(prefix);
		
			method.apply(console, args);	
		}
		
    });
    
    return console;

}
