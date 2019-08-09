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
};

var TJAComment = function(index, content, breakLine) {
    this.index = index;
    this.content = content;
    if (!breakLine) this.keepLine = true;
    this.line = (breakLine ? '// ' : ' // ') + content;
};

var TJASegment = function(initSize) {
    this.size = initSize || 0;
    this.notes = [];
    for (var i = 0; i < this.size; ++i)
        this.notes.push('0');
    this.events = [];
    this.endEvents = [];
    this.eventSorted = true;
};

(function() {

    var TJAEventProto = {
        toString: function() {
            return this.line;
        }
    };

    TJAEvent.prototype = TJAEventProto;
    TJAComment.prototype = TJAEventProto;

    TJASegment.prototype = {
        toString: function() {
            var res = this.size == 0 ? '0' : '';
            
            if (!this.eventSorted) {
                this.events.sort(function (a, b) {
                    return a.index - b.index;
                })
                this.eventSorted = true;
            }
            
            var i_event = 0;
            var event = this.events.length == 0 ? null : this.events[0];
            for (var index = 0; index < this.size; ++index) {
                var note = this.notes[index] || '0';
                var firstEventInBatch = true;
                while (event && event.index <= index) {
                    if (!event.keepLine && firstEventInBatch && index != 0) {
                        res += '\r\n';
                    }
                    firstEventInBatch = false;
                    res += event;
                    res += '\r\n';
                    ++i_event;
                    event = i_event < this.events.length ? this.events[i_event] : null;
                }
                res += note;
            }

            res += ',';

            for (i_event in this.endEvents) {
                event = this.endEvents[i_event];
                if (!event.keepLine)
                    res += '\r\n';
                res += event;
                res += '\r\n';
            }

            return res;
        },

        addEvent: function(event) {
            if (typeof event == 'string')
                event = new TJAComment(0, event, false);
            this.events.push(event);
            this.eventSorted = false;
        },

        addEndEvent: function(event) {
            if (typeof event == 'string')
                event = new TJAComment(0, event, false);
            this.endEvents.push(event);
        }

    };
    
    // TJAWriter

    TJAWriter.prototype = {
        startEvent: new TJAEvent(0, 'START'),
        endEvent: new TJAEvent(0, 'END'),

        //constructor: TJAWriter,

        prop: function(key, value) {
            this.properties[key.toUpperCase()] = (typeof value != 'undefined') ? value : '[Unknown]';
        },

        generateString: function() {
            var res = '';
            for (var prop in this.properties) {
                var value = this.properties[prop];
                res += prop + ':' + value + '\r\n';
            }
            res += '\r\n';
            res += this.startEvent + '\r\n';
            for (var i_seg in this.segments) {
                var segment = this.segments[i_seg];
                res += segment + '\r\n';
            }
            res += this.endEvent + '\r\n';
            res += '\r\n';
            return res;
        },

        addTestData: function() {
            this.properties['PROP2'] = 'first';
            this.properties['PROP1'] = 765765;
            this.properties['PROP3'] = 'value';

            var segment = new TJASegment(16);
            segment.notes = '1020112010201';
            segment.addEvent(new TJAEvent(8, 'BARLINEOFF'))
            segment.addEvent(new TJAEvent(12, 'SCROLL', 1.0))
            this.segments.push(segment);

            segment = new TJASegment(8);
            segment.notes = '2010221020102';
            segment.addEvent(new TJAEvent(0, 'TeSTeVeNT', 'TeSTaRGuMeNT'));
            segment.addEvent(new TJAEvent(8, 'err..', 'nothing.'));
            this.segments.push(segment);
            
            segment = new TJASegment(8);
            segment.notes = '12345678';
            segment.addEvent(new TJAComment(1, 'This is a comment.'));
            segment.addEvent(new TJAComment(2, 'This is a comment on new line.', true));
            segment.addEndEvent('This is a comment after comma.');
            this.segments.push(segment);

            segment = new TJASegment(0);
            segment.addEndEvent(new TJAEvent(0, 'EndEvent'));
            this.segments.push(segment);

            /*
            Expected Output:
            PROP2:first
            PROP1:765765
            PROP3:value

            #START
            10201120
            #BARLINEOFF
            1020
            #SCROLL 1
            1000,
            #TESTEVENT TeSTaRGuMeNT
            20102210,
            1 // This is a comment.
            2
            // This is a comment on new line.
            345678, // This is a comment after comma.
            0,
            #ENDEVENT
            #END
            */

        },

    };

})();


