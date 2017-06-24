var TJAWriter = function() {
    this.segments = [];
    this.properties = {};
}

var TJASegment = function() {
    this.size = 0;
    this.notes = [];
    this.events = [];
}

var TJAEvent = function(index, name, arg) {
    this.index = 0;
    this.name = name.toUpperCase();
    this.arg = arg;
    this.line = '#' + name + ' ' + arg;
}

var TJAComment = function(index, content) {
    this.index = 0;
    this.content = content;
    this.line = '//' + content;
}

(function() {

    var TJAEventProto = {
        constructor: TJAEvent,
        toString: function() {
            return this.line;
        }
    }


})();


