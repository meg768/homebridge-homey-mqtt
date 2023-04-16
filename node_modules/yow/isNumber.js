module.exports = function(object) {
	return typeof object == 'number' && object != NaN;
};
