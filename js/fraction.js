function Fraction(initVal) {
	if (initVal instanceof Fraction) {
		this[0] = initVal[0];
		this[1] = initVal[1];
		this[2] = initVal[2];
	} else if (Array.isArray(initVal)) {
		if (initVal.length == 2) {
			this[0] = 0;
			this[1] = initVal[0];
			this[2] = initVal[1];
		} else if (initVal.length >= 3) {
			this[0] = initVal[0];
			this[1] = initVal[1];
			this[2] = initVal[2];
		} else {
			this[0] = 0;
			this[1] = 0;
			this[2] = 1;
		}
		this.reduct();
	} else if (typeof initVal == 'number') {
		var x = parseFloat(initVal);
		var xi = Math.floor(x);
		this[0] = xi;
		this[1] = Math.round((x - xi) * 288);
		this[2] = 288;
		this.reduct();
	}
}

(function() {

	function compareInt(a, b) {
		return a == b ? 0 : a < b ? -1 : 1;
	};

	function gcd(a, b) {
		var t;
		while (a != 0) {
			t = b % a;
			b = a;
			a = t;
		}
		return b;
	};
	
	Fraction.gcd = gcd;
    
    Fraction.prototype = {
		isValid: function() {
			return isFinite(this[0]) && isFinite(this[1]) && isFinite(this[2]);
		},

		// override default behavior in converting a fraction to a number
		valueOf: function() {
			return this[0] + this[1] / (this[2] > 0 ? this[2] : 1);
		},
		
		// compares a fraction to another fraction or number. return -1, 0, 1 in different cases, lesser, equal or greater
		compare: function(other) {
			if (typeof other == 'number') {
				var val = this.valueOf();
				return val == other ? 0 : val < other ? -1 : 1;
			}
			var den1 = this[2], den2 = other[2];
			return compareInt((this[0] * den1 + this[1]) * den2, (other[0] * den2 + other[1]) * den1)
		},

		// reducts the fraction. normally not to be used outside the class
		reduct: function() {
			// make a proper mixed fraction
			this[0] += parseInt(this[1] / this[2]);
			this[1] %= this[2];
			// what, a minus numerator?
			if (this[1] < 0){
				this[0]--;
				this[1] += this[2];
			}
			// the reduction
			var div = gcd(this[1], this[2]);
			if (div > 1) {
				this[1] /= div;
				this[2] /= div;
			}
		},
		
		// returns multiple times of the fraction
		time: function(times) {
			var den = this[2], num = (this[0] * den + this[1]) * times;
			return new Fraction([0, num, den]);
		},

		// returns multiple divides of the fraction
		divide: function(times) {
			var den = this[2], num = this[0] * den + this[1];
			return new Fraction([0, num, den * times]);
		},

		// scale the fraction down from [0, range] to [0, 1]
		normalize: function(range) {
			var den1 = this[2], num1 = this[0] * den1 + this[1];
			var den2 = range[2], num2 = range[0] * den2 + range[1];
			this[0] = 0;
			this[1] = num1 * den2;
			this[2] = den1 * num2;
			this.reduct();
			return this;
		},

		// apply the fraction to [0, range) and return an integer index in range
		index: function(range) {
			if (range)
				return parseInt((this[0] + this[1] / this[2]) * range);
			return this[0] * this[2] + this[1];
		},

		// increases the fraction
		inc: function(beat) {
			if (typeof beat == 'number') {
				this[0] += Math.round(beat);
				return this;
			}
			this[0] += beat[0];
			this[1] = this[1] * beat[2] + beat[1] * this[2];
			this[2] *= beat[2];
			this.reduct();
			return this;
		},

		// decreases the fraction
		dec: function(beat) {
			if (typeof beat == 'number') {
				this[0] -= Math.round(beat);
				return this;
			}
			this[0] -= beat[0];
			this[1] = this[1] * beat[2] - beat[1] * this[2];
			this[2] *= beat[2];
			this.reduct();
			return this;
		},

		// adds the fraction and returns the result
		add: function(beat) {
			var result = new Fraction(this);
			return result.inc(beat);
		},

		// cuts off the fraction and returns the result
		cutoff: function(beat) {
			var result = new Fraction(this);
			return result.dec(beat);
		}

	};
	
	Fraction.Infinity = new Fraction([Infinity, 0, 1]);
	Fraction.MinusInfinity = new Fraction([-Infinity, 0, 1]);
    
})();
