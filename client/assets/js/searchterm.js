/*
  handles parsing of search term based user input
  returns a parseResult object
 */
var searchterm = (function (util) {

  function parseSearchInput(_terms, input) {
  	util.out('parseSearchInput: ' + input, 'trace');

  	// allow literal search terms (LST) like "Summon Lightning Golem"
  	var regex = /([^\s]*[:=]?\".*?\")/g;
  	var lsts = input.match(regex);
  	var _input = input.replace(regex, 'LST');
  	var parseResult = parseSearchInputTokens(_input);

  	var i = 0;
  	parseResult.queryString = parseResult.queryString.replace('LST', function () {
  		var lst = lsts[i];
  		i++;
  		var lstStr = lst
  			.replace(/name/i, "info.name")
  			.replace("=", ":");
  		return lstStr;
  	});

  	return parseResult;
  }

  function parseSearchInputTokens(input) {
  	//var rerun = typeof rerun !== 'undefined' ? rerun : false;
  	var tokens = input.split(" ");
  	util.out(tokens, 'trace');
  	var queryTokens = [];
  	var badTokens = [];
  	for (var i in tokens) {
  		var evaluatedToken = tokens[i];
  		if (!evaluatedToken) {
  			continue;
  		}
  		var token = evaluatedToken.toUpperCase();

  		if (/^(OR|AND|LST|NOT)$/i.test(token)) {
  			evaluatedToken = token;
  		} else {
  			var isNegation = hasNegation(token);
  			if (isNegation) {
  				evaluatedToken = evaluatedToken.substring(1);
  			}

  			evaluatedToken = evalSearchTerm(evaluatedToken);
  			util.out(token + '=' + evaluatedToken, 'trace');
  			if (evaluatedToken) {
  				if (isNegation) {
  					evaluatedToken = createMissingQuery(evaluatedToken);
  				} else if (util.hasBackTick(evaluatedToken)) {
  					evaluatedToken = parseSearchInputTokens(evaluatedToken).queryString;
  				}
  			} else {
  				badTokens.push(tokens[i]);
  			}
  		}
  		queryTokens.push(evaluatedToken);
  	}
  	var queryString = queryTokens.join(" ");

  	//rerun bad tokens
  	var correction = badUserInput(badTokens);
  	if (correction) {
  		badTokens = correction.unCorrectable;
  		queryString += " " + correction.corrected.join(" ");
  	}
  	return {'queryString': queryString, 'badTokens': badTokens};
  }


  function splitToken(token) {
  	var rgx = new RegExp(/((\d+)-(\d+)|(\d+))/);
  	var numberPart;
  	var letterPart = token;
  	if (rgx.test(token)) {
  		var match = rgx.exec(token);
  		if (match) {
  			numberPart = match[0];
  		}
  		letterPart = token.replace(rgx, "");
  	}
  	if (numberPart) {
  		util.out(numberPart, 'log');
  	}
  	numberPart = formatNumber(numberPart);
  	util.out({'numberPart': numberPart, 'letterPart': letterPart}, 'log');
  	return {'numberPart': numberPart, 'letterPart': letterPart};
  }

  function formatNumber(str) {
  	if (!str) {
  		return;
  	}
  	var result;
  	if (str.indexOf("-") != -1) {
  		var tmp = str.split("-");
  		result = ":[" + tmp[0] + " TO " + tmp[1] + "]";
  	} else {
  		result = ":>=" + str;
  	}
  	return result;
  }

  function evalSearchTerm(token) {
  	var result = "";
  	for (var regex in terms) {
  		// terms is a map object located in data.js
  		if (terms.hasOwnProperty(regex)) {
  			var rgexTest = new RegExp('^(' + regex + ')$', 'i');
  			var rgex = new RegExp(regex, 'i');
  			var cleanToken = removeParensAndBackTick(token);
  			var isNegation = hasNegation(cleanToken);
  			if (isNegation) {
  				cleanToken = cleanToken.substring(1);
  			}
  			var foundMatch = rgexTest.test(cleanToken);
  			if (foundMatch) {
  				result = terms[regex].query;
  				// apply any captured regex groups
  				var arr = rgex.exec(cleanToken);
  				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
  				result = result.replace(/\$(\d+)/g, function replacer(match, p1) {
  					var filter = terms[regex].filter;
  					var value = arr[p1];
  					if (filter) {
  						var filterFn = Function("val", filter);
  						value = filterFn(value);
  					}
  					return value;
  				});
  				//result = cleanToken.replace(rgex, result);
  				// escape spaces for elasticsearch
  				result = escapeField(result);
  				if (isNegation) {
  					result = '-' + result;
  				}
  				if (hasOpenParen(token)) {
  					result = /\(+/.exec(token)[0] + result;
  				}
  				if (hasCloseParen(token)) {
  					result = result + /\)+/.exec(token)[0];
  				}
  				util.out(cleanToken + ' + ' + rgex + '=' + result, 'trace');
  				break;
  			}
  		}
  	}
  	return result;
  }

  // Used to determine the sortKey from sorting search terms
  function evalSearchTermFieldKey(token) {
  	var result = "";
  	for (var regex in terms) {
  		// terms is a map object located in data.js
  		if (terms.hasOwnProperty(regex)) {
  			var rgexTest = new RegExp('^(' + regex + ')$', 'i');
  			var foundMatch = rgexTest.test(token);
  			if (foundMatch) {
  				var query = terms[regex].query;
  				var delimIdx = query.indexOf(':');
  				if (!/[`\(\)]/i.test(query) && delimIdx !== -1) {
  					result = query.substring(0, delimIdx);
  					// remove any escaping, e.g. 'modsTotal.Adds \#-# Physical Damage.avg'
  					result = result.replace("\\", "");
  				}
  			}
  		}
  	}
  	return result;
  }

  // expects array
  //returns {'corrected', 'unCorrectable'
  function badUserInput(badTokens) {
  	if (badTokens.length === 0) {
  		return;
  	}
  	var successArr = [];
  	var evaluatedToken;
  	var i = 0;
  	//attempt 0 numbers at the end
  	for (i = 0; i < badTokens.length; i++) {
  		var rgx = new RegExp(/((\d+)$|(\d+)-(\d+)$)/);
  		if (rgx.test(badTokens[i])) {
  			var match = rgx.exec(badTokens[i]);
  			badTokens[i] = badTokens[i].replace(rgx, "");
  			badTokens[i] = match[0] + badTokens[i];
  		}
  	}
  	for (i = 0; i < badTokens.length; i++) {
  		evaluatedToken = evalSearchTerm(badTokens[i]);
  		util.out(badTokens[i] + '=' + evaluatedToken, 'log');
  		if (evaluatedToken) {
  			successArr.push(evaluatedToken);
  			badTokens.splice(i, 1);
  			i--;
  		}
  	}

  	//attempt 1 User copy pasted RegEx
  	if (badTokens.length > 0) {
  		for (i = 0; i < badTokens.length; i++) {
  			badTokens[i] = badTokens[i].replace(/\w\?/gi, "");
  			while (badTokens[i].indexOf(")?") > -1) {
  				badTokens[i] = badTokens[i].replace(/\([^\(\)]*\)\?/, "");
  			}
  		}
  		for (i = 0; i < badTokens.length; i++) {
  			evaluatedToken = evalSearchTerm(badTokens[i]);
  			util.out(badTokens[i] + '=' + evaluatedToken, 'log');
  			if (evaluatedToken) {
  				successArr.push(evaluatedToken);
  				badTokens.splice(i, 1);
  				i--;
  			}
  		}
  	}

  	//attempt 2 removing spaces
  	if (badTokens.length > 0) {
  		//all spaces
  		var attmpt = badTokens.join("");
  		evaluatedToken = evalSearchTerm(attmpt);
  		util.out(attmpt + '=' + evaluatedToken, 'log');
  		if (evaluatedToken) {
  			successArr.push(evaluatedToken);
  			badTokens = [];
  		}
  	}

  	if (badTokens.length > 0) {
  		//groups of two
  		var attempt = [];
  		for (i = 0; i < badTokens.length; i++) {
  			if (!(/^(of|the)$/i.test(badTokens[i]))) {
  				attempt.push(badTokens[i]);
  			}
  		}
  		if ((attempt.length >= 2)) {
  			for (i = 0; i < attempt.length - 1; i++) {
  				for (var j = i + 1; j < attempt.length; j++) {
  					evaluatedToken = evalSearchTerm(attempt[i] + attempt[j]);
  					if (evaluatedToken) {
  						successArr.push(evaluatedToken);
  						attempt.splice(j, 1);
  						attempt.splice(i, 1);
  						i--;
  						break;
  					}
  					evaluatedToken = evalSearchTerm(attempt[j] + attempt[i]);
  					if (evaluatedToken) {
  						successArr.push(evaluatedToken);
  						attempt.splice(j, 1);
  						attempt.splice(i, 1);
  						i--;
  						break;
  					}
  				}
  			}
  		}
  		badTokens = attempt;
  	}

  	//Interpret bad Tokens as tokenized fullname
  	if (badTokens.length > 0) {
  		var tmpArr = [];
  		ga('send', 'event', 'Search', 'Bad Tokens', badTokens.join(","));
  		for (i = 0; i < badTokens.length; i++) {
  			tmpArr.push("info.tokenized.fullName:" + badTokens[i].toLowerCase() + "~");
  		}
  		successArr.push(tmpArr.join(" OR "));
  	}
  	util.out("Result", 'log');
  	util.out(successArr, 'log');
  	util.out("Failure", 'log');
  	util.out(badTokens, 'log');
  	return {'corrected': successArr, 'unCorrectable': badTokens};
  }


  function removeParensAndBackTick(token) {
  	var _token = token.replace(/[\(\)`]/g, "");
  	return _token;
  }

  function hasOpenParen(token) {
  	return token.startsWith('(');
  }

  function hasCloseParen(token) {
  	return token.endsWith(')');
  }

  function hasNegation(token) {
  	return token.startsWith('-');
  }

  function escapeField(result) {
  	var res = result;
  	var delimIdx = result.indexOf(':');
  	if (delimIdx != -1) {
  		var field = res.substr(0, delimIdx);
  		res = res.replace(field, field.replace(/(\s|\*)/g, '\\$1'));
  		if (field == 'info.name') {
  			var value = res.substr(delimIdx);
  			res = res.replace(value, value.replace(/(\s)/g, '\\$1'));
  		}
  	}
  	return res;
  }

  function createMissingQuery(evaluatedToken) {
  	return "-" + evaluatedToken;
  }

  return {
    parseSearchInput: parseSearchInput,
	evalSearchTermFieldKey: evalSearchTermFieldKey
  }
}(util));
