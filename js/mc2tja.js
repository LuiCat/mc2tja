function requireScript(load, url)
{
    if (!load) return;
    if (typeof require == 'undefined') {
        var head = document.getElementsByTagName('head')[0];
        var script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = 'js/' + url;
        head.appendChild(script);
        alert('1');
    } else {
        require(url);
    }
}

requireScript(typeof Fraction == 'undefined', 'fraction.js');
requireScript(typeof MCReader == 'undefined', 'mcreader.js');
requireScript(typeof TJAWriter == 'undefined', 'tjawriter.js');

var mc2tja = function() {
    this.generated = null; // the generated result text of tja
    this.standardTja = false; // set to true to disable tja features that is only supported by malody
    this.overrideLevel = 0; // change this to specify an malody level other than the one giving in mc
    this.defaultCourse = 3; // default value if no course info is concluded
    this.defaultStar = 10; // default value if no star info is concluded
    this.levelTable = [ // standard level table, matching level & course to stars
        [0,2,3,4,5], // Kantan / Easy
        [0,0,1,2,3,4,5,6,6,7], // Futsuu / Normal
        [0,0,0,0,0,0,1,2,3,4,5,5,6,6,7,7,8], // Muzukashii / Hard
        [1,1,1,1,1,1,1,1,1,1,2,3,4,4,5,5,5,6,6,7,7,8,8,9,9,10] // Oni
    ];
    this.harderLevelTable = // stars below 10-star (according to xipigu), starting from lv.25
        [1,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9];
    this.courseStrings = [
        ['kantan', 'easy'],
        ['futsuu', 'normal', 'futsu'],
        ['muzukashii', 'hard', 'muzu'],
        ['oni', 'mania', 'extreme', 'extra', 'ura', 'inner', '+']
    ]
};

(function() {
    mc2tja.prototype = {
        constructor: mc2tja,

        // Find all possible names in version text to know what course the chart could possible be in.
        // Return an integer represents the course, being used in 'COURSE:' property in tja.
        getCourseFromName: function(text) {
            var t = text.toLowerCase();
            for (var course = 3; course >= 0; --course)
                for (var i in this.courseStrings[course])
                    if (t.indexOf(this.courseStrings[course][i]) != -1)
                        return course;
            return -1;
        },

        // Find a possible course the level fits, from Kantan firstly to Muzukashii, every last situation going to Oni.
        // Return an integer represents the course, being used in 'COURSE:' property in tja.
        getCourseFromLevel: function(level) {
            if (level < 0) // nice try hehe
                return this.defaultCourse;
            for (var course = 0; course < 3; ++course)
                if (level < this.levelTable[course].length && this.levelTable[course][level] != 0)
                    return course;
            return this.defaultCourse;
        },

        getLevelFromName: function(text) {
            var res = text.match(/l(?:v|evel) *\.? *(\d+)/i);
            return res ? parseInt(res[1]) : 0;
        },

        getStarFromCourseLevel: function(course, level) {
            if (level < 0 || course < 0) // nice try hehe
                return 1;
            if (course > 3)
                course = 3;
            if (course == this.defaultCourse && level == 0)
                return this.defaultStar;
            var star;
            if (level < this.levelTable[course].length)
                star = this.levelTable[course][level];
            else
                star = this.levelTable[course][this.levelTable[course].length - 1];
            return star < 1 ? 1 : star;
        },

        getNumFromNoteStyle: function(style) {
            style += 1;
            if (style == 2 || style == 3)
                style = 5 - style;
            return style.toString();
        },

        convert: function(mc, onsuccess) {
            if (typeof mc == 'string') { // mc text content
                var text = mc;
                mc = new MCReader();
                mc.parse(text);
            } else if (!(mc instanceof MCReader)) { // no MCReader, no accepts
                throw TypeError('Parameter not supported by mc2tja.convert');
            } else if (mc.text == null) {
                throw Error('Not chart parsed by parameter MCReader');
            }

            var tja = new TJAWriter();

            if(mc.meta.mode != 5) {
                console.error('Non-taiko MC chart detected. the convertion has failed.')
                return false;
            }

            // TODO: mc syntax check

            // Zero: preparations
            
            // beginning bar property in mc meta
            var barBegin = mc.meta.mode_ext.bar_begin;

            // get all notes
            var notes = mc.note.slice(0);
            notes.sort(function(a, b) {
                return a.beat.compare(b.beat);
            });

            // get all signatures
            var signs = [];
            for (var i in mc.effect) {
                if (mc.effect[i].sign)
                    signs.push({sign: mc.effect[i].sign, beat: mc.effect[i].beat});
            }
            signs.unshift({sign: 4, beat: Fraction.MinusInfinity});
            signs.sort(function(a, b) {
                return a.beat.compare(b.beat);
            });

            // get all bpms
            var bpms = mc.time.slice(0);
            bpms.sort(function(a, b) {
                return a.beat.compare(b.beat);
            });

            // get all effects
            var effects = mc.effect.slice(0);
            effects.sort(function(a, b) {
                return a.beat.compare(b.beat);
            });
            
            // First: fill out all necessary properties 

            tja.prop('TITLE', mc.meta.song.title);
            tja.prop('SUBTITLE', '--'+mc.meta.song.artist);
            if (!this.standardTja) {
                tja.prop('ARTIST', mc.meta.song.artist);
                tja.prop('AUTHOR', mc.meta.creator);
                tja.prop('COVER', mc.meta.background);
            }

            if (mc.mainSample) {
                tja.prop('WAVE', mc.mainSample.sound);
                // calculate the real offset & preview offset
                var offset = 0;
                var lastBPM = mc.initTime.bpm;
                var lastBeat = mc.mainSample.beat;
                for (var i in bpms) {
                    if (bpms[i].beat.compare(barBegin) >= 0) {
                        break;
                    }
                    if (bpms[i].beat.compare(lastBeat) > 0) {
                        offset += (bpms[i].beat - lastBeat) * 60 / lastBPM;
                    }
                    lastBPM = bpms[i].bpm;
                    lastBeat = bpms[i].beat;
                }
                offset += (barBegin - lastBeat) * 60 / lastBPM - 0.001 * mc.mainSample.offset;
                tja.prop('OFFSET', (-offset).toFixed(3));
                tja.prop('DEMOSTART', (mc.meta.preview ? 0.001 * mc.meta.preview : offset).toFixed(3));
            }
            if (mc.initTime) {
                tja.prop('BPM', mc.initTime.bpm);
            }
            tja.prop('SONGVOL', 100);
            tja.prop('SEVOL', 100);

            var course = this.getCourseFromName(mc.meta.version);
            var level = this.getLevelFromName(mc.meta.version);
            if (course == -1)
                course = this.getCourseFromLevel(level);
            var star = this.getStarFromCourseLevel(course, level);

            tja.prop('COURSE', course);
            tja.prop('LEVEL', star);
            tja.prop('SCOREMODE', 2);
            tja.prop('SCOREINIT', '');
            tja.prop('SCOREDIFF', '');

            // Second: group notes in segments
            // Third: add events according to time points, scaling segments if necessary
            //        we will do it online, so we do not have to record beat info for all bars

            // -- Steps to group some notes:
            // -- 1. Make a list of signature. Some useful functions is recommended.
            // -- 2. Find the beginning bar. If there's notes before, go backward for some bars.
            // -- 3. If there's remaining notes, push forward for a bar and create a segment; or else goto 5.
            // -- 4. Join beat fractions together, and calculate the indices. Repeat from 3.
            // -- 5. Cheers!

            // the beat of current bar
            var barBeat = new Fraction(barBegin);
            // next signature index after the beat of current bar
            var nextSignIndex = 0;
            var sign = 4;

            // function to find signature index on the beat, based on binary search
            var findSignIndex = function(beat) {
                var i = 0, j = signs.length - 1, mid;
                while (i < j) {
                    mid = parseInt((i + j + 1) / 2); // make a integer division
                    if (signs[mid].beat.compare(beat) > 0) // left half, should be not greater than parameter
                        j = mid - 1;
                    else // right half
                        i = mid;
                }
                return i;
            }

            // function to move beat forward by bars, or backward if a minus deltaBar value is given
            // DEPRECATED, this one is based on integration
            var moveBeatIntegrate = function(beat, deltaBar) {
                var currSignIndex = findSignIndex(beat);
                var currBeat = beat;
                deltaBar = Math.round(deltaBar);
                if (deltaBar > 0) { // go forward
                    deltaBar = new Fraction(deltaBar);
                    while (true) {
                        var nextSignBeat = currSignIndex + 1 < signs.length ? signs[currSignIndex + 1].beat : Fraction.Infinity;
                        var sign = Math.round(signs[currSignIndex].sign);
                        var nextBeat = currBeat.add(deltaBar.time(sign));
                        if (nextBeat.compare(nextSignBeat) <= 0) {
                            currBeat = nextBeat;
                            break;
                        }
                        deltaBar.dec(nextSignBeat.cutoff(currBeat).divide(sign));
                        currBeat = nextSignBeat;
                        currSignIndex++;
                    }
                    return currBeat;
                } else if (deltaBar < 0) { // go backward
                    deltaBar = new Fraction(-deltaBar); // absolute value
                    while (true) {
                        var prevSignBeat = currSignIndex > 0 ? signs[currSignIndex].beat : Fraction.MinusInfinity;
                        var sign = Math.round(signs[currSignIndex].sign);
                        var nextBeat = currBeat.cutoff(deltaBar.time(sign));
                        if (nextBeat.compare(prevSignBeat) >= 0) {
                            currBeat = nextBeat;
                            break;
                        }
                        deltaBar.dec(currBeat.cutoff(prevSignBeat).divide(sign));
                        currBeat = prevSignBeat;
                        currSignIndex--;
                    }
                    return currBeat;
                }
            }
            
            // function to move beat forward by bars, or backward if a minus deltaBar value is given
            var moveBeat = function(beat, deltaBar) {
                var currSignIndex = findSignIndex(beat);
                var currBeat = new Fraction(beat);
                deltaBar = Math.round(deltaBar);
                if (deltaBar > 0) { // go forward
                    while (deltaBar > 0) {
                        var nextSignBeat = currSignIndex + 1 < signs.length ? signs[currSignIndex + 1].beat : Fraction.Infinity;
                        var sign = signs[currSignIndex].sign;
                        var nextBeat = currBeat.add(sign);
                        if (nextBeat.compare(nextSignBeat) <= 0) {
                            currBeat = nextBeat;
                            deltaBar--;
                            continue;
                        }
                        deltaBar--;
                        currBeat.inc(sign);
                        currSignIndex++;
                    }
                    return currBeat;
                } else if (deltaBar < 0) { // go backward
                    deltaBar = -deltaBar; // absolute value
                    while (deltaBar > 0) {
                        var prevSignBeat = currSignIndex > 0 ? signs[currSignIndex].beat : Fraction.MinusInfinity;
                        var sign = signs[currSignIndex].sign;
                        var nextBeat = currBeat.cutoff(sign);
                        if (nextBeat.compare(prevSignBeat) >= 0) {
                            currBeat = nextBeat;
                            deltaBar--;
                            continue;
                        }
                        deltaBar--;
                        currBeat.dec(sign);
                        currSignIndex--;
                    }
                    return currBeat;
                }
            }

            // the beat of beginning note
            var firstBeat = notes.length == 0 ? barBeat : notes[0].beat;
            // find the beginning bar
            while (barBeat.compare(firstBeat) > 0) {
                barBeat = moveBeat(barBeat, -1);
            }

            var noteIndex = 0;
            var bpmIndex = 0;
            var effectIndex = 0;
            var lastBarLength = new Fraction(4);
            var lastLongNote = null;
            var balloons = [];
            while (noteIndex < notes.length || lastLongNote) {
                // HOW TO CREATE A TJA SEGMENT FROM MC
                // 1. Get the beat on the beginning of next bar, and measure the beat length of current bar;
                // 2. Add all notes during this bar to a list, divide the beat values by bar length and temporary stores previous unfinished long note;
                // 3. Unify denomitator of the beat values using gcd and fill the notes to the segment according to the numerators;
                // 4. If the beat length changed, add a #MEASURE event directly at the beginning (position 0).
                
                // get beat values
                var nextBarBeat = moveBeat(barBeat, 1);
                var barLength = nextBarBeat.cutoff(barBeat);
                var segmentNotes = [];
                var segmentEvents = [];

                // get note into lists and at the same time convert note styles
                for (; noteIndex < notes.length && notes[noteIndex].beat.compare(nextBarBeat) < 0; ++noteIndex) {
                    if (lastLongNote) {
                        if (notes[noteIndex].beat.compare(lastLongNote) <= 0) {
                            continue;
                        }
                        segmentNotes.push({beat: lastLongNote.cutoff(barBeat), num:'8'});
                        lastLongNote = null;
                    }
                    segmentNotes.push({beat: notes[noteIndex].beat.cutoff(barBeat), num:this.getNumFromNoteStyle(notes[noteIndex].style)});
                    if (notes[noteIndex].endbeat)
                        lastLongNote = notes[noteIndex].endbeat;
                    if (notes[noteIndex].hits)
                        balloons.push(notes[noteIndex].hits);
                }
                if (lastLongNote && lastLongNote.compare(nextBarBeat) < 0) {
                    segmentNotes.push({beat: lastLongNote.cutoff(barBeat), num:'8'});
                    lastLongNote = null;
                }

                // get bpm beats into calculation
                for (; bpmIndex < bpms.length; ++bpmIndex) {
                    bpm = bpms[bpmIndex];
                    if (bpm.beat >= nextBarBeat) break;
                    segmentEvents.push({beat: bpm.beat.cutoff(barBeat), event: new TJAEvent(0, 'BPMCHANGE', bpm.bpm)});
                }

                // check measure changes
                if (barLength.compare(lastBarLength) != 0) {
                    var measure = barLength.divide(4);
                    var times = (measure[2] == 1 ? 4 : measure[2] == 2 ? 2 : 1);
                    segmentEvents.push({beat: new Fraction(0), event: new TJAEvent(0, 'MEASURE', (measure.index() * times) + '/' + (measure[2] * times))});
                }

                // add tja events
                for (; effectIndex < effects.length; ++effectIndex) {
                    effect = effects[effectIndex];
                    if (effect.beat >= nextBarBeat) break;
                    var beat = effect.beat.cutoff(barBeat);
                    if (effect.hs) segmentEvents.push({beat: beat, event: new TJAEvent(0, 'SCROLL', effect.hs)});
                    if (effect.ggt) segmentEvents.push({beat: beat, event: new TJAEvent(0, 'GOGO' + (effect.ggt ? 'START' : 'END'))});
                    if (effect.showbar) segmentEvents.push({beat: beat, event: new TJAEvent(0, 'BARLINE' + (effect.showbar ? 'ON' : 'OFF'))});
                    // TODO: add other tja events
                }
                
                // divide beat values by bar length and calc unified denomitator
                var denom = 1;
                for (var i in segmentNotes) {
                    segmentNotes[i].beat.normalize(barLength);
                    denom *= segmentNotes[i].beat[2] / Fraction.gcd(segmentNotes[i].beat[2], denom);
                }
                for (var i in segmentEvents) {
                    segmentEvents[i].beat.normalize(barLength);
                    if (segmentEvents[i].beat[0] < 0) continue;
                    denom *= segmentEvents[i].beat[2] / Fraction.gcd(segmentEvents[i].beat[2], denom);
                }

                // add notes into the segment
                var segment = new TJASegment(denom);
                for (var i in segmentNotes) {
                    segment.notes[segmentNotes[i].beat.index(denom)] = segmentNotes[i].num;
                }

                for (var i in segmentEvents) {
                    segmentEvents[i].event.index = (segmentEvents[i].beat[0] < 0 ? 0 : segmentEvents[i].beat.index(denom));
                    segment.addEvent(segmentEvents[i].event);
                }

                tja.segments.push(segment);

                barBeat = nextBarBeat;
                lastBarLength = barLength;

            }

            // TODO: add #BARLINEOFF & #BARLINEON events according to barBegin

            // don't forget the balloons!
            if (balloons.length > 0)
                tja.prop('BALLOON', balloons.join(','));

            // Finally: just generate!

            this.generated = tja.generateString();

            onsuccess();

            return true;
        
        }
    };

})();


