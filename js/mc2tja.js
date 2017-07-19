function requireScript(type, url)
{
    if (type) return;
    var head = document.getElementsByTagName('head')[0];
    var script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;
    head.appendChild(script);
}

requireScript(MCReader, 'mcreader.js');
requireScript(TJAWriter, 'tjawriter.js');

var mc2tja = function() {
    this.generated = null; // the generated result text of tja
    this.standardTja = false; // set to true to disable tja features that is only supported by malody
    this.overrideLevel = 0; // change this to specify an malody level other than the one giving in mc
    this.defaultCourse = 3; // default value if no course info is concluded
    this.defaultStar = 10; // default value if no star info is concluded
    this.levelTable = [ // standard level table, matching level & course to stars
        [0,1,2,3,4,5], // Kantan / Easy
        [0,0,0,1,2,3,4,5,6,6,7], // Futsuu / Normal
        [0,0,0,0,0,0,0,1,2,3,4,5,5,6,6,7,7,8], // Muzukashii / Hard
        [1,1,1,1,1,1,1,1,1,1,1,2,3,4,4,5,5,5,6,6,7,7,8,8,8,9,9,9,10] // Oni
    ];
    this.harderLevelTable = // stars below 10-star (tentatively formed by xipigu), starting from lv.28
        [1,1,2,2,3,3,4,4,4,5,5,5,6,6,6,7,7,7,8,8,8,9,9];
    this.courseStrings = [
        ["kantan", "easy"],
        ["futsuu", "normal", "futsu"],
        ["muzukashii", "hard", "muzu"],
        ["oni", "ura", "inner", "+"]
    ]
};

(function() {
    mc2tja.prototype = {
        constructor: mc2tja,

        // Find all possible names in version text to know what course the chart could possible be in.
        // Return an integer represents the course, being used in "COURSE:" property in tja.
        getCourseFromName: function(text) {
            var t = text.toLowerCase();
            for (var course = 3; course >= 0; --course)
                for (var i in this.courseStrings[course])
                    if (t.indexOf(this.courseStrings[course][i]) != -1)
                        return course;
            return -1;
        },

        // Find a possible course the level fits, from Kantan firstly to Muzukashii, every last situation going to Oni.
        // Return an integer represents the course, being used in "COURSE:" property in tja.
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

        convert: function(mc) {
            if (typeof mc == "string") { // mc text content
                var text = mc;
                mc = new MCReader();
                mc.parse(text);
            } else if (!(mc instanceof MCReader)) { // no MCReader, no accepts
                throw TypeError("Parameter not supported by mc2tja.convert");
            } else if (mc.text == null) {
                throw Error("Not chart parsed by parameter MCReader");
            }

            var tja = new TJAWriter();

            if(mc.meta.mode != 5) {
                console.error("Non-taiko MC chart detected. the convertion has failed.")
                return false;
            }

            // TODO: syntax check
            
            // First: fill out all necessary properties 

            tja.prop("TITLE", mc.meta.song.title);
            tja.prop("SUBTITLE", mc.meta.song.artist);
            if (!this.standardTja) {
                tja.prop("ARTIST", mc.meta.song.artist);
                tja.prop("AUTHOR", mc.meta.creator);
                tja.prop("COVER", mc.meta.background);
            }

            if (mc.mainSample) {
                tja.prop("WAVE", mc.mainSample.sound);
                tja.prop("OFFSET", (-0.001 * mc.mainSample.offset).toFixed(3));
                tja.prop("DEMOSTART", mc.meta.preview ? mc.meta.preview : mc.mainSample.offset);
            }
            if (mc.initTime) {
                tja.prop("BPM", mc.initTime.bpm);
            }
            tja.prop("SONGVOL", 100);
            tja.prop("SEVOL", 100);

            var course = this.getCourseFromName(mc.meta.version);
            var level = this.getLevelFromName(mc.meta.version);
            if (course == -1)
                course = this.getCourseFromLevel(level);
            var star = this.getStarFromCourseLevel(course, level);

            tja.prop("COURSE", course);
            tja.prop("LEVEL", star);
            tja.prop("SCOREMODE", 2);
            tja.prop("SCOREINIT", "");
            tja.prop("SCOREDIFF", "");
            
            // TODO: get something into BALLOON after grouping notes
            //tja.prop("BALLOON", "");

            // Second: group notes in segments
            // Third: add events according to time points, scaling segments if necessary
            //        we will do it online, so we do not have to record beat info for all bars

            // -- Steps to group some notes:
            // -- 1. Make a list of signature. Some useful functions is recommended.
            // -- 2. Find the beginning bar. If there's notes before, go backward for some bars.
            // -- 3. If there's remaining notes, push forward for a bar and create a segment; or else goto 5.
            // -- 4. Join beat fractions together, and calculate the indices. Repeat from 3.
            // -- 5. Cheers!

            // beginning bar property in mc meta
            var barBegin = mc.meta.mode_ext.bar_begin;
            // the beat of current bar
            var barBeat = barBegin;
            // next signature index after the beat of current bar
            var nextSignIndex = 0;
            var sign = 4;

            // get all notes
            var notes = mc.note.slice(0);
            notes.sort(function(a, b) {
                return a.beat.compare(b.beat) < 0;
            });

            // get all signatures
            var signs = [];
            for (var i in mc.effect) {
                if (mc.effect[i].signature)
                    signs.push({signature: mc.effect[i].signature, beat: mc.effect[i].beat});
            }
            if (signs.length == 0) // just mix the default value in default logic
                signs.push({signature: 4, beat: new Fraction([0, 0, 1])});
            signs.sort(function(a, b) {
                return a.beat.compare(b.beat) < 0;
            });

            // some frequently used functions
            var incBar = function() {

            }

            // ...

            // Finally: just generate!

            this.generated = tja.generateString();

            return true;
        }
    }

})();


