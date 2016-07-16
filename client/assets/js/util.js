// Self contained functions, meaning they need not any dependencies to work
var util = (function () {
  return {
    defaultFor: function (arg, val) {
    	return typeof arg !== 'undefined' ? arg : val;
    },

    firstKey: function (obj) {
    	for (var key in obj) {
    		break;
    	}
    	// "key" is the first key here
    	return key;
    },

    // Check if input var is empty
    isEmpty: function (obj) {
    	if (obj === null) {return true;}

    	// Assume if it has a length property with a non-zero value
    	// that that property is correct.
    	if (obj.length > 0)    {return false;}
    	if (obj.length === 0)  {return true;}

    	// Otherwise, does it have any properties of its own?
    	// Note that this doesn't handle
    	// toString and valueOf enumeration bugs in IE < 9
    	for (var key in obj) {
    		if (hasOwnProperty.call(obj, key)) {return false;}
    	}
    },

    // Divide an array arr into subarrays of length len
    chunk: function (arr, len) {

      var chunks = [],
          i = 0,
          n = arr.length;

      while (i < n) {
        chunks.push(arr.slice(i, i += len));
      }

      return chunks;
    },

    /*
     * Based on JavaScript Pretty Date: http://stackoverflow.com/questions/7641791/javascript-library-for-human-friendly-relative-date-formatting
     * Copyright (c) 2011 John Resig (ejohn.org)
     * Licensed under the MIT and GPL licenses.
     */
    prettyDate: function (date) {
    	var diff = (((new Date()).getTime() - date.getTime()) / 1000),
    		day_diff = Math.floor(diff / 86400);

    	if (isNaN(day_diff) || day_diff < 0) { return; }

    	return day_diff === 0 && (
    	diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago" || day_diff > 30 && Math.ceil(day_diff / 31) + " months ago";
    }
  };
}());
