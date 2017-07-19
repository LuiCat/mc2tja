function Fraction(initVal) {
	if (initVal instanceof Array) {
		this[0] = initVal[0];
		this[1] = initVal[1];
		this[2] = initVal[2];
	} else {
		this[0] = 0;
		this[1] = 0;
		this[2] = 1;
	}
}

(function() {

	function compareInt(a, b) {
		return a == b ? 0 : a < b ? -1 : 1;
	}

	function gcd(a, b) {
		var t;
		while (a != 0) {
			t = b % a;
			b = a;
			a = t;
		}
		return b;
    }
    
    Fraction.prototype = {
		valueOf: function() {
			return this[0] + this[1] / (this[2] > 0 ? this[2] : 1);
        },
        
		compare: function(other) {
			var den1 = this[2], den2 = other[2];
			var div = gcd(den1, den2);
			var mul1 = den2 / div, mul2 = den1 / div;
			return compareInt((this[0] * den1 + this[1]) * mul1, (other[0] * den2 + other[1]) * mul2)
        }

    }
    

    
})();
