
module.exports = function(min, max, step) {

	var items = [];

	if (step == undefined)
		step = 1;

	if (step > 0) {
		for (var i = min; i < max; i += step)
			items.push(i);
	}

	return items;
}
