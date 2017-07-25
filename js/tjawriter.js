var TJAWriter = function() {
    this.segments = [];
    this.properties = {};
};

// TJAEvent and TJAComment

var TJAEvent = function(index, name, arg) {
    this.index = index;
    this.name = name.toUpperCase();
    this.arg = arg;
    this.line = '#' + this.name + (typeof arg == 'undefined' ? '' : ' ' + arg);
}

var TJAComment = function(index, content, breakLine) {
    this.index = index;
    this.content = content;
    if (!breakLine) this.keepLine = true;
    this.line = (breakLine ? '// ' : ' // ') + content;
}

var TJASegment = function(initSize) {
    this.size = initSize || 0;
    this.notes = [];
    for (var i = 0; i < this.size; ++i)
        this.notes.push('0');
    this.events = [];
    this.endEvents = [];
    this.eventSorted = true;
}

(function() {


})();


