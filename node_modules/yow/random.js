
var isArray   = require('./isArray.js');
var isInteger = require('./isInteger.js');
var isObject  = require('./isObject.js');


function rand(min, max) {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}


function choose(items) {
	return items[Math.floor((Math.random() * items.length))];
}



var random = module.exports = function() {

	if (arguments.length == 0)
		return Math.random();

	if (arguments.length == 1) {
		var arg = arguments[0];

		if (isArray(arg)) {
			return choose(arg);
		}

		if (isInteger(arg)) {
			return Math.floor(Math.random() * arg);
		}

		if (isObject(arg)) {
			return arg[choose(Object.keys(arg))];
		}

	}

	if (arguments.length == 2) {
		if (isInteger(arguments[0]) && isInteger(arguments[1])) {
			return rand(arguments[0], arguments[1]);
		}
	}

	return 42;

}
