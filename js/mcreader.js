var MCReader = function() {
	this.filename = '';
	this.text = null;
	this.content = {};
	this.meta = null;
	this.time = null;
	this.effect = null;
	this.note = null;
	this.extra = null;
	this.mainSample = null;
	this.initTime = null;
};

(function() {

	/*
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

	var BeatTimeProto = {
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
	*/
 
 	MCReader.prototype = {
		constructor: MCReader,

		parse: function(text) {
			this.text = text;
			this.content = JSON.parse(this.text);
			this.meta = this.content.meta;
			this.time = this.content.time;
			this.effect = this.content.effect;
			this.note = this.content.note;
			this.extra = this.content.extra;

			for (var i = 0; i < this.note.length; ++i) {
				var note = this.note[i];
				note.beat = new Fraction(note.beat);
				//Object.setPrototypeOf(note.beat, BeatTimeProto);
				if (note.endbeat != null)
					note.endbeat = new Fraction(note.endbeat);
					//Object.setPrototypeOf(note.endbeat, BeatTimeProto);
				if (note.type == 1)	{
					if (this.mainSample == null)
						this.mainSample = note;
					this.note.splice(i, 1);
					--i;
				}
			}

			for (var i in this.time) {
				var tp = this.time[i];
				tp.beat = new Fraction(tp.beat);
				//Object.setPrototypeOf(tp.beat, BeatTimeProto);
				if (this.initTime == null || this.initTime.beat.compare(tp.beat) > 0)
					this.initTime = tp;
			}

			for (var i in this.effect) {
				var eff = this.effect[i];
				eff.beat = new Fraction(eff.beat);
				//Object.setPrototypeOf(tp.beat, BeatTimeProto);
				if ("sign" in eff) {
					eff.sign = new Fraction(eff.sign);
					if (!eff.sign.isValid()) {
						eff.sign = null;
					}
				}
			}

		},

		parseFilename: function(url) {
			if (url instanceof File) {
				this.filename = url.name;
				return;
			}
			var res = url.match(/(?:.*\/)*([^\/]*\.mc)/i);
			if (res)
				this.filename = res[1];
		},

		read: function(url, onload) {
			var self = this;
			this.parseFilename(url);
			$.ajax({
				url : url,
				success : function(result) {
					self.parse(result);
					onload.apply(self);
				}
			});
		},

		readLocal: function(url, onload) {
			var f = new FileReader();
			var self = this;
			this.parseFilename(url);
			f.onload = function() {
				self.parse(f.result);
				onload.apply(self);
			};
			f.readAsText(url);
		}

	};

})();
