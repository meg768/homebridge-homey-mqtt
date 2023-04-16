module.exports = function(object, type) {
	return Object.prototype.toString.call(object) == '[object ' + type + ']';
};
