module.exports = function(arg) {
	return arg instanceof Date && !isNaN(arg.getTime());
};
