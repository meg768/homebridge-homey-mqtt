
module.exports = function() {
	function collate(a, b) {
		if (b) {
			if (b.constructor == Object) {
				for (var p in b) {
					if (b[p].constructor == Object) {
						if (a[p]) {
							collate(a[p], b[p]);
							continue;
						}
					} 
					a[p] = b[p];
				}	
			}
			else if (b.constructor == Array) {
				b.forEach((c) => {
					collate(a, c);
				});
			}
		} 
	};	
	

	for (var i = 1; i < arguments.length; i++) {
		collate(arguments[0], arguments[i]);
	}

	return arguments[0];
}