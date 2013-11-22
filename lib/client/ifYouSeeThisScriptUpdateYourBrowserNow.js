// dom events
/*
    got this from here: https://gist.github.com/jonathantneal/2415137
    Thanks a lot! all credits to: https://github.com/jonathantneal
*/
!window.addEventListener && Element.prototype && (function (polyfill) {
	// window.addEventListener, document.addEventListener, <>.addEventListener
	// window.removeEventListener, document.removeEventListener, <>.removeEventListener
 
	function Event() { [polyfill] }
 
	Event.prototype.preventDefault = function () {
		this.nativeEvent.returnValue = false;
	};
 
	Event.prototype.stopPropagation = function () {
		this.nativeEvent.cancelBubble = true;
	};
 
	function addEventListener(type, listener, useCapture) {
		useCapture = !!useCapture;
 
		var cite = this;
 
		cite.__eventListener = cite.__eventListener || {};
		cite.__eventListener[type] = cite.__eventListener[type] || [[],[]];
 
		if (!cite.__eventListener[type][0].length && !cite.__eventListener[type][1].length) {
			cite.__eventListener['on' + type] = function (nativeEvent) {
				var newEvent = new Event, newNodeList = [], node = nativeEvent.srcElement || cite, property;
 
				for (property in nativeEvent) {
					newEvent[property] = nativeEvent[property];
				}
 
				newEvent.currentTarget =  cite;
				newEvent.pageX = nativeEvent.clientX + document.documentElement.scrollLeft;
				newEvent.pageY = nativeEvent.clientY + document.documentElement.scrollTop;
				newEvent.target = node;
				newEvent.timeStamp = +new Date;
 
				newEvent.nativeEvent = nativeEvent;
 
				while (node) {
					newNodeList.unshift(node);
 
					node = node.parentNode;
				}
 
				for (var a, i = 0; (a = newNodeList[i]); ++i) {
					if (a.__eventListener && a.__eventListener[type]) {
						for (var aa, ii = 0; (aa = a.__eventListener[type][0][ii]); ++ii) {
							aa.call(cite, newEvent);
						}
					}
				}
 
				newNodeList.reverse();
 
				for (var a, i = 0; (a = newNodeList[i]) && !nativeEvent.cancelBubble; ++i) {
					if (a.__eventListener && a.__eventListener[type]) {
						for (var aa, ii = 0; (aa = a.__eventListener[type][1][ii]) && !nativeEvent.cancelBubble; ++ii) {
							aa.call(cite, newEvent);
						}
					}
				}
 
				nativeEvent.cancelBubble = true;
			};
 
			cite.attachEvent('on' + type, cite.__eventListener['on' + type]);
		}
 
		cite.__eventListener[type][useCapture ? 0 : 1].push(listener);
	}
 
	function removeEventListener(type, listener, useCapture) {
		useCapture = !!useCapture;
 
		var cite = this, a;
 
		cite.__eventListener = cite.__eventListener || {};
		cite.__eventListener[type] = cite.__eventListener[type] || [[],[]];
 
		a = cite.__eventListener[type][useCapture ? 0 : 1];
 
		for (eventIndex = a.length - 1, eventLength = -1; eventIndex > eventLength; --eventIndex) {
			if (a[eventIndex] == listener) {
				a.splice(eventIndex, 1)[0][1];
			}
		}
 
		if (!cite.__eventListener[type][0].length && !cite.__eventListener[type][1].length) {
			cite.detachEvent('on' + type, cite.__eventListener['on' + type]);
		}
	}
 
	window.constructor.prototype.addEventListener = document.constructor.prototype.addEventListener = Element.prototype.addEventListener = addEventListener;
	window.constructor.prototype.removeEventListener = document.constructor.prototype.removeEventListener = Element.prototype.removeEventListener = removeEventListener;
})();

// indexOf array
/*
    This function is copied from here: http://stackoverflow.com/questions/3629183/why-doesnt-indexof-work-on-an-array-ie8
    Thanks a lot!
*/
if (!Array.prototype.indexOf) {
  Array.prototype.indexOf = function(elt /*, from*/) {
    var len = this.length >>> 0;

    var from = Number(arguments[1]) || 0;
    from = (from < 0)
         ? Math.ceil(from)
         : Math.floor(from);
    if (from < 0)
      from += len;

    for (; from < len; from++) {
      if (from in this &&
          this[from] === elt)
        return from;
    }
    return -1;
  };
}

// Date parse ISO strings
/**
 * Date.parse with progressive enhancement for ISO 8601 <https://github.com/csnover/js-iso8601>
 * © 2011 Colin Snover <http://zetafleet.com>
 * Released under MIT license.
 */
(function (Date, undefined) {
    var origParse = Date.parse, numericKeys = [ 1, 4, 5, 6, 7, 10, 11 ];
    Date.parse = function (date) {
        var timestamp, struct, minutesOffset = 0;

        // ES5 §15.9.4.2 states that the string should attempt to be parsed as a Date Time String Format string
        // before falling back to any implementation-specific date parsing, so that’s what we do, even if native
        // implementations could be faster
        //              1 YYYY                2 MM       3 DD           4 HH    5 mm       6 ss        7 msec        8 Z 9 ±    10 tzHH    11 tzmm
        if ((struct = /^(\d{4}|[+\-]\d{6})(?:-(\d{2})(?:-(\d{2}))?)?(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{3}))?)?(?:(Z)|([+\-])(\d{2})(?::(\d{2}))?)?)?$/.exec(date))) {
            // avoid NaN timestamps caused by “undefined” values being passed to Date.UTC
            for (var i = 0, k; (k = numericKeys[i]); ++i) {
                struct[k] = +struct[k] || 0;
            }

            // allow undefined days and months
            struct[2] = (+struct[2] || 1) - 1;
            struct[3] = +struct[3] || 1;

            if (struct[8] !== 'Z' && struct[9] !== undefined) {
                minutesOffset = struct[10] * 60 + struct[11];

                if (struct[9] === '+') {
                    minutesOffset = 0 - minutesOffset;
                }
            }

            timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
        }
        else {
            timestamp = origParse ? origParse(date) : NaN;
        }

        return timestamp;
    };
}(Date));

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
  Object.keys = (function () {
    'use strict';
    var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({toString: null}).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

    return function (obj) {
      if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
        throw new TypeError('Object.keys called on non-object');
      }

      var result = [], prop, i;

      for (prop in obj) {
        if (hasOwnProperty.call(obj, prop)) {
          result.push(prop);
        }
      }

      if (hasDontEnumBug) {
        for (i = 0; i < dontEnumsLength; i++) {
          if (hasOwnProperty.call(obj, dontEnums[i])) {
            result.push(dontEnums[i]);
          }
        }
      }
      return result;
    };
  }());
}

