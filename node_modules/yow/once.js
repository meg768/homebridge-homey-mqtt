
module.exports = function(fn, context) { 

    var result = undefined;

    return function() { 
        if (fn) {
            result = fn.apply(context || this, arguments);
            fn = null;
        }

        return result;
    };
}
