var MCReader = function() {
	this.text = null;
	this.content = {};
	this.meta = null;
	this.time = null;
	this.effect = null;
	this.note = null;
	this.extra = null;
};

(function() {

	function compareInt(a, b) {
		return a == b ? 0 : a < b ? -1 : 1;
	}

	function gcd(a, b) {
		var t;
		while (a != 1) {
			t = b % a;
			b = a;
			a = t;
		}
		return b;
	}
	
	var BeatTimeProto = {
		value: function() {
			return this.beat[0] + this.beat[1] / (this.beat[2] > 0 ? this.beat[2] : 1);
		},
		compare: function(other) {
			var den1 = this.beat[2], den2 = other.beat[2];
			var div = gcd(den1, den2);
			var mul1 = den2 / div, mul2 = den1 / div;
			return compareInt((this.beat[0] * den1 + this.beat[1]) * mul1, (other.beat[0] * den2 + other.beat[1]) * mul2)
		}
	}
 
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

			for (var i in this.note) {
				var note = this.note[i];
				Object.setPrototypeOf(note.beat, BeatTimeProto);
				if (note.endbeat != null)
					Object.setPrototypeOf(note.endbeat, BeatTimeProto);
			}
			for (var i in this.time) {
				var tp = this.time[i];
				Object.setPrototypeOf(tp.beat, BeatTimeProto);
			}

		},

		read: function(url, onload) {
			var self = this;
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
			f.onload = function() {
				self.parse(f.result);
				onload.apply(self);
			};
			f.readAsText(url);
		}

	}

})();
