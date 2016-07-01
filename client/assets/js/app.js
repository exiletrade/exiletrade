function debugOutput(input, outputType) {
	if (typeof debugDevBuild === 'undefined') {
		return;
	}
	try {
		if (outputType == "log") {
			console.log(input);
		}
		else if (outputType == "trace") {
			console.trace(input);
		}
		else if (outputType == "info") {
			console.info(input);
		}
		else if (outputType == "error") {
			console.error(input);
		}
	} catch (err) {

	}
}

function defaultFor(arg, val) {
	return typeof arg !== 'undefined' ? arg : val;
}

/*
Find Object by id in Array
* */
function findObjectById(list, id) {
	return list.filter(function (obj) {
		// coerce both obj.id and id to numbers
		// for val & type comparison
		return obj.itemId === id;
	})[0];
}


/*
* Check if input var is empty
* */
function isEmpty (obj) {
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
}

/*
* Check if loadedOptions are defined ans assign their values to options
* */
function checkDefaultOptions(loadedOption, defaultOption, isSelect) {
	if (isSelect) {
		if (typeof loadedOption !== 'undefined') {
			return loadedOption.value;
		}
		else {
			return defaultOption.value;
		}
	}
	else {
		if (typeof loadedOption !== 'undefined' && loadedOption !== null) {
			return loadedOption;
		}
		else {
			return defaultOption;
		}
	}
}

/*
* Set option values
* */
function setDefaultOptions(loadedOption, defaultOption) {
	for (var key in loadedOption) {
		if (typeof loadedOption[key] === 'object' && loadedOption[key].type == 'select') {
			try {
				defaultOption[key].value = checkDefaultOptions(loadedOption[key], defaultOption[key], true);
			} catch (err) {}
		}
		else {
			defaultOption[key] = checkDefaultOptions(loadedOption[key], defaultOption[key], false);
		}
	}
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
		debugOutput(badTokens[i] + '=' + evaluatedToken, 'log');
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
			debugOutput(badTokens[i] + '=' + evaluatedToken, 'log');
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
		debugOutput(attmpt + '=' + evaluatedToken, 'log');
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
	debugOutput("Result", 'log');
	debugOutput(successArr, 'log');
	debugOutput("Failure", 'log');
	debugOutput(badTokens, 'log');
	return {'corrected': successArr, 'unCorrectable': badTokens};
}


function parseSearchInput(_terms, input) {
	debugOutput('parseSearchInput: ' + input, 'trace');

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
	debugOutput(tokens, 'trace');
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
			debugOutput(token + '=' + evaluatedToken, 'trace');
			if (evaluatedToken) {
				if (isNegation) {
					evaluatedToken = createMissingQuery(evaluatedToken);
				} else if (hasBackTick(evaluatedToken)) {
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
		debugOutput(numberPart, 'log');
	}
	numberPart = formatNumber(numberPart);
	debugOutput({'numberPart': numberPart, 'letterPart': letterPart}, 'log');
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
				debugOutput(cleanToken + ' + ' + rgex + '=' + result, 'trace');
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

function createMissingQuery(evaluatedToken) {
	return "-" + evaluatedToken;
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

function hasBackTick(token) {
	return token.indexOf('`') != -1;
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

function firstKey(obj) {
	for (var key in obj) {
		break;
	}
	// "key" is the first key here
	return key;
}

/*
 * Based on JavaScript Pretty Date: http://stackoverflow.com/questions/7641791/javascript-library-for-human-friendly-relative-date-formatting
 * Copyright (c) 2011 John Resig (ejohn.org)
 * Licensed under the MIT and GPL licenses.
 */
function prettyDate(date) {
	var diff = (((new Date()).getTime() - date.getTime()) / 1000),
		day_diff = Math.floor(diff / 86400);

	if (isNaN(day_diff) || day_diff < 0) { return; }

	return day_diff === 0 && (
	diff < 60 && "just now" || diff < 120 && "1 minute ago" || diff < 3600 && Math.floor(diff / 60) + " minutes ago" || diff < 7200 && "1 hour ago" || diff < 86400 && Math.floor(diff / 3600) + " hours ago") || day_diff == 1 && "Yesterday" || day_diff < 7 && day_diff + " days ago" || day_diff < 31 && Math.ceil(day_diff / 7) + " weeks ago" || day_diff > 30 && Math.ceil(day_diff / 31) + " months ago";
}

function modToDisplay(value, mod) {
	if (typeof value === 'number') {
		mod = mod.replace('#', value);
	} else if (typeof value === "object") {
		var valstr = value.min + '-' + value.max + ' (' + value.avg + ')';
		mod = mod.replace('#-#', valstr);
	} else if (typeof value === "boolean") {
		mod = mod;
	} else {
		debugOutput("Mod value is neither a number or an object, maybe ExileTools has a recent change? mod = " +
		mod + ", value = " + value, 'error');
	}
	return mod;
}

function buildPlayerStashOnlineElasticJSONRequestBody() {
	return {
		"aggs": {
			"filtered": {
				"filter": {
					"bool": {
						"should": [{
							"range": {
								"shop.updated": {
									"gte": 'now-15m'
								}
							}
						}, {
							"range": {
								"shop.modified": {
									"gte": 'now-15m'
								}
							}
						}, {
							"range": {
								"shop.added": {
									"gte": 'now-15m'
								}
							}
						}
						]
					}
				},
				"aggs": {
					"sellers": {
						"terms": {
							"field": "shop.sellerAccount",
							size: 100000
						}
					}
				}
			}
		},
		"size": 0
	};
}

function buildListOfOnlinePlayers(ladderOnlinePlayers, onlineplayersStash) {
	var players = ladderOnlinePlayers;
	$.each(onlineplayersStash, function (playerBucket) {
		var accountName = onlineplayersStash[playerBucket].key;
		if ($.inArray(players, accountName) == -1) {
			players.push(accountName);
		}
	});
	return players;
}

function indexerLeagueToLadder(league) {
	var ladderLeaguesMap = {
		"Prophecy SC": "prophecy",
		"Prophecy HC": "prophecyhc",
		"Standard": "standard",
		"Hardcore": "hardcore"
	};
	return ladderLeaguesMap[league];
}

(function () {
	'use strict';

	var appModule = angular.module('application', [
		'elasticsearch',
		'ui.router',
		'ngAnimate',
		'focus-if',
		'ngFileUpload',

		//foundation
		'foundation',
		'foundation.dynamicRouting',
		'foundation.dynamicRouting.animations',
		'ngclipboard',
		'duScroll',
		'angular-cache',
		'angularSpinner',
		'favico.service',
		'MassAutoComplete'
	]);

	appModule.config(config);
	appModule.run(run);

	config.$inject = ['$urlRouterProvider', '$locationProvider', '$sceProvider'];

	function config($urlProvider, $locationProvider, $sceProvider) {
		$urlProvider.otherwise('/');

		$locationProvider.html5Mode({
			enabled: true,
			requireBase: false
		});

		$locationProvider.hashPrefix('!');

		$sceProvider.enabled(false);
	}

	function run() {
		FastClick.attach(document.body);
	}

	// Create the es service from the esFactory
	appModule.service('es', function (esFactory) {
		return esFactory({host: 'http://apikey:07e669ae1b2a4f517d68068a8e24cfe4@api.exiletools.com'}); // poeblackmarketweb@gmail.com
	});

	appModule.service('playerOnlineService', function ($q, $http, CacheFactory, es) {
		var ladderPlayerCache;
		var ladderAllPlayerCache;
		var stashOnlinePlayerCache;

		// Check to make sure the cache doesn't already exist
		if (!CacheFactory.get('ladderPlayerCache')) {
			ladderPlayerCache = CacheFactory('ladderPlayerCache', {
				maxAge: 5 * 60 * 1000,
				deleteOnExpire: 'aggressive',
				storageMode: 'localStorage',
				storagePrefix: 'exiletrade-cache-v1',
				storeOnResolve: true
			});
		}

		if (!CacheFactory.get('ladderAllPlayerCache')) {
			ladderAllPlayerCache = CacheFactory('ladderAllPlayerCache', {
				maxAge: 10 * 60 * 1000,
				deleteOnExpire: 'aggressive',
				storageMode: 'localStorage',
				storagePrefix: 'ladderAllPlayerCache',
				storeOnResolve: true,
				onExpire: function (key, value) {
					var league = key;
					refreshLadderAllPlayerCache(league);
				}
			});
		}

		function refreshLadderAllPlayerCache(league) {
			debugOutput("Loading up all players from ladder league: " + league, 'trace');
			var url = "http://api.exiletools.com/ladder?league=" + league + "&showAllOnline=1&onlineStats=1";

			var promise = $http.get(url).then(function (result) {
				if (typeof result.data === 'object') {
					var toons = {};
					$.each(result.data, function (key, value) {
						toons[value.accountName] = true;
					});
					return Object.keys(toons);
				}
				debugOutput("Invalid result from ladderAllPlayerCache - " + url, 'error');
				debugOutput(result, 'error');
				return [];
			});
			ladderAllPlayerCache.put(league, promise);
			return promise;
		}

		if (!CacheFactory.get('stashOnlinePlayerCache')) {
			stashOnlinePlayerCache = CacheFactory('stashOnlinePlayerCache', {
				maxAge: 3 * 60 * 1000,
				deleteOnExpire: 'aggressive',
				storageMode: 'localStorage',
				storagePrefix: 'exiletrade-cache-v1',
				storeOnResolve: true,
				onExpire: function (key, value) {
					refreshStashOnlinePlayerCache();
				}
			});
		}

		function refreshStashOnlinePlayerCache() {
			debugOutput("Loading up online players from the river", 'trace');
			var promise = es.search({
				index: 'index',
				body: buildPlayerStashOnlineElasticJSONRequestBody()
			});
			stashOnlinePlayerCache.put('stashOnlinePlayers', promise);
			return promise;
		}

		function refreshLadderPlayerCache(league, accountNames) {
			var accountNamesParam = accountNames.join(':');
			debugOutput("Loading up players from ladder: " + accountNamesParam, 'trace');
			var url = "http://api.exiletools.com/ladder?league=" + league + "&short=1&onlineStats=1&accountName=" + accountNamesParam;
			var promise = $http.get(url);
			promise.then(function (result) {
				if (typeof result.data === 'object') {
					// TODO: Figure out how to handle player with multiple toons in the ladder
					// right now we just remove any 'extra' toons that are offline
					var toons = {};
					$.each(result.data, function (key, value) {
						key = league + '.' + value.accountName;
						if (toons.hasOwnProperty(key)) {
							if (toons[key].online == "0") {
								toons[key] = value;
							}
						} else {
							toons[key] = value;
						}
					});
					$.each(toons, function (key, value) {
						ladderPlayerCache.put(key, value);
					});
				}
			});
			return promise;
		}

		return {
			getLadderOnlinePlayers: function (_league) {
				var league = indexerLeagueToLadder(_league);

				if (typeof league === 'undefined') {
					league = 'Standard';
				}
				var toons = ladderAllPlayerCache.get(league);
				if (typeof toons !== 'undefined') {
					return $q.resolve(toons);
				} else {
					return refreshLadderAllPlayerCache(league);
				}
			},
			addCustomFieldLadderData: function (_league, items) {
// 				var league = indexerLeagueToLadder(_league);

// 				function getPlayerDataFromCache(item) {
// 					var accountName = item.shop.sellerAccount;
// 					return ladderPlayerCache.get(league + '.' + accountName);
// 				}

				//var cacheMisses = {};
// 				$.each(items, function (index, value) {
// 					var playerData = getPlayerDataFromCache(value);
// 					var foundInCache = typeof playerData !== 'undefined';
// 					if (foundInCache) {
// 						value.isOnline = playerData.online == "1";
// 					}// else {
				//	cacheMisses[value.shop.sellerAccount] = null;
				//}
// 				});

// 				var cacheMissesLength = Object.keys(cacheMisses).length;
// 				debugOutput('Ladder cacheMisses count: ' + cacheMissesLength, 'trace');

// 				if (cacheMissesLength > 0) {
// 					return refreshLadderPlayerCache(league, Object.keys(cacheMisses)).then(function () {
// 						$.each(cacheMisses, function (key, value) {
// 							$.each(items, function (index, item) {
// 								if (item.shop.sellerAccount == key) {
// 									var playerData = getPlayerDataFromCache(item);
// 									var foundInCache = typeof playerData !== 'undefined';
// 									if (foundInCache) {
// 										item.isOnline = playerData.online == "1";
// 									}
// 								}
// 							});
// 						});
// 					});
// 				} else {
				return $q.resolve([]);
// 				}
			},
			getStashOnlinePlayers: function () {
				var stashOnlinePlayers = stashOnlinePlayerCache.get('stashOnlinePlayers');
				var foundInCache = typeof stashOnlinePlayers !== 'undefined';
				var promise;
				if (foundInCache) {
					promise = $q.resolve(stashOnlinePlayers);
				} else {
					promise = refreshStashOnlinePlayerCache();
				}
				return promise;
			}
		};
	});

	/*
	 Simple favicon service
	 */
	angular.module('favico.service', []).factory('favicoService', [
		function () {
			var favico = new Favico({
				animation: 'fade'
			});

			var badge = function (num) {
				favico.badge(num);
			};
			var reset = function () {
				favico.reset();
			};

			return {
				badge: badge,
				reset: reset
			};
		}
	]);

	appModule.controller('SearchController',
	['$q', '$scope', '$http', '$location', '$interval', 'es', 'playerOnlineService','favicoService','FoundationApi', 'ModalFactory', 'Upload',
	function ($q, $scope, $http, $location, $interval, es, playerOnlineService, favicoService, FoundationApi, ModalFactory, Upload) {
		debugOutput('controller', 'info');

	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Set some global/scope variables
	* ----------------------------------------------------------------------------------------------------------------*/
		$scope.searchInput = ""; // sample (gloves or chest) 60life 80eleres
		$scope.badSearchInputTerms = []; // will contain any unrecognized search term
		$scope.elasticJsonRequest = "";
		$scope.showSpinner = false;
		$scope.disableScroll = true;
		$scope.isScrollBusy = false;
		$scope.onlinePlayers = [];
		$scope.helpState = false;
		$scope.enableTutorialFeature = false;
		$scope.isCurrencySearch = false;

		var httpParams = $location.search();
		debugOutput('httpParams:' + angular.toJson(httpParams, true), 'trace');
		var sortKeyDefault = ['shop.chaosEquiv'];
		var sortOrderDefault = ['asc'];
		var limitDefault = 50;
		if (httpParams.q) {
			$scope.searchInput = httpParams.q;
		}
		if (httpParams.sortKey) {
			sortKeyDefault = httpParams.sortKey;
			if (typeof sortKeyDefault === 'string') {
				sortKeyDefault = [sortKeyDefault];
			}
		}
		if (httpParams.sortOrder) {
			sortOrderDefault = httpParams.sortOrder;
			if (typeof sortOrderDefault === 'string') {
				sortOrderDefault = [sortOrderDefault];
			}
		}
		if (httpParams.limit) {
			limitDefault = httpParams.limit;
		}

		$scope.savedSearchesList = JSON.parse(localStorage.getItem("savedSearches"));
		$scope.savedAutomatedSearches = JSON.parse(localStorage.getItem("savedAutomatedSearches"));
		$scope.savedItemsList = JSON.parse(localStorage.getItem("savedItems"));
		$scope.lastRequestedSavedItem = {};
		$scope.blacklistCandidate = {"account": "", "comment" : "", "commentLength" : 100};
		$scope.accountBlacklist = [];
		$scope.manageBlacklist = {
			"sortType" : "date_added",
			"sortReverse" : false,
			"searchAccounts" : ""
		};
		$scope.enableBlacklistFeature = true;
		$scope.currencyTrading = {};
		$scope.currencyTradingEnabled = true;

	/*------------------------------------------------------------------------------------------------------------------
	* END Set some global/scope variables
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Init/set/handle options
	* ----------------------------------------------------------------------------------------------------------------*/
		$scope.loadedOptions = JSON.parse(localStorage.getItem("savedOptions"));
		$scope.selectedFont = {};
		$scope.audioPath = './assets/sound/';

		/*
		* The soundfiles and sound select names have to be matched
		* in loadSounds() function
		* */
		$scope.audioAlerts = [
			'Tinkle-Lisa_Redfern-1916445296.mp3',
			'double_tone.mp3',
			'Blop-Mark_DiAngelo-79054334.mp3',
			'Cha_Ching_Register-Muska666-173262285.mp3',
			'Metal_Gong-Dianakc-109711828.mp3',
			'Pew_Pew-DKnight556-1379997159.mp3',
			'Short_triumphal_fanfare-John_Stracke-815794903.mp3',
			'Turkey Gobble-SoundBible.com-123256561.mp3',
			'Winchester12-RA_The_Sun_God-1722751268.mp3',
			'alarm_to_the_extreme.mp3'
		];
		$scope.snd = new Audio($scope.audioPath + $scope.audioAlerts[0]);

		/*
		* Create options
		* */
		$scope.options = {
			"leagueSelect": {
				"type": "select",
				"name": "League",
				"value": 'Prophecy SC',
				"options": ["Prophecy SC", "Prophecy HC", "Standard", "Hardcore"]
			},
			"buyoutSelect": {
				"type": "select",
				"name": "Buyout",
				"value": 'Buyout: Yes',
				"options": ["Buyout: Yes", "Buyout: No", "Buyout: Either"]
			},
			"verificationSelect": {
				"type": "select",
				"name": "Verified",
				"value": 'Status: Verified',
				"options": ["Status: Verified", "Status: Gone", "Status: Either"]
			},
			"fontSelect": {
				"type": "select",
				"name": "Font",
				"value": 'Fontin',
				"options": ["Fontin", "Verdana", "Helvetica Neue"]
			},
			"soundSelect": {
				"type": "select",
				"name": "Sound",
				"value": 'Tinkle',
				"options": ["Tinkle", "Double Tone", 'Blop', 'Cha Ching', 'Gong', 'Pew Pew', 'Fanfare', 'Gobble', 'Winchester 12-RA', "Extreme Alarm"]
			},
			"searchPrefixInputs": [],
			"switchOnlinePlayersOnly": true,
			"muteSound": false,
			"notificationVolume": 1,
			"dontShowAdBlockWarning" : false
		};

// 		function loadLeagueJSONfromAPI(url) {
// 			$http.get(url)
// 				.then(function (res) {
// 					if (res.status == 200) {

// 					}
// 				});
// 		}
		// loadLeagueJSONfromAPI("http://api.pathofexile.com/leagues?type=main");

		/*
		* Load new sound; play sound preview
		* */
		$scope.loadSound = function () {
			/* Get index of selected sound to match against audioAlerts array
			 * Sounds have to be in same order in audioAlerts and soundSelect.options */
			var i = $scope.options.soundSelect.options.indexOf($scope.options.soundSelect.value);
			$scope.snd.src = $scope.audioPath + $scope.audioAlerts[i];
			$scope.snd.load();
		};
		$scope.playSound = function () {
			$scope.snd.play();
		};
		$scope.changeNotificationVolume = function () {
			$scope.snd.volume = $scope.options.notificationVolume;
		};

		/*
		* Handle special cases while setting default options
		* */
		$scope.setSpecialDefaultOptions = function(loadedOption, defaultOption) {
			if (typeof loadedOption.fontSelect !== 'undefined') {
				$scope.selectedFont = {
					"font-family": "'" + loadedOption.fontSelect.value + "', 'Helvetica', Helvetica, Arial, sans-serif"
				};
			}
			if (typeof loadedOption.soundSelect !== 'undefined') {
				$scope.loadSound();
			}
		};

		/*
		* Check if options are being loaded and assign values
		* */
		if ($scope.loadedOptions) {
			setDefaultOptions($scope.loadedOptions, $scope.options);
			if ($scope.options.leagueSelect.options.indexOf($scope.options.leagueSelect.value) === -1) {
				if ($scope.options.leagueSelect.value.indexOf('HC')) {
					$scope.options.leagueSelect.value = $scope.options.leagueSelect.options[1];
				}
				else {
					$scope.options.leagueSelect.value = $scope.options.leagueSelect.options[0];
				}
			}
			$scope.setSpecialDefaultOptions($scope.loadedOptions, $scope.options);
		}

		/*
		* Change notification volume if loading saved options
		* */
		if ($scope.snd.volume != $scope.options.notificationVolume) {
			$scope.changeNotificationVolume();
		}

		/*
		* Set font family
		* */
		$scope.setFontFamily = function() {
			$scope.selectedFont = {
				"font-family": "'" + $scope.options.fontSelect.value + "', 'Helvetica', Helvetica, Arial, sans-serif"
			};
		};
	/*------------------------------------------------------------------------------------------------------------------
	* END Init/set/handle options
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Tab related Stuff
	* ----------------------------------------------------------------------------------------------------------------*/
		$scope.tabs = [
		  {
			title: 'Manual',
			id: 0,
			newItems: 0
		  },
		  {
			title: 'Automated',
			id: 1,
			newItems: 0
		  }
		];
		$scope.currentTab = 0;

		$scope.removeAutosearch = function () {
			alert('not implemented');
		};
		$scope.clearAutosearch = function () {
			alert('not implemented');
		};

		/*
		* Handle tabs
		* */
		$scope.onClickTab = function (tab) {
			$scope.currentTab = tab.id;
			$scope.tabs[tab.id].newItems = 0;
			$scope.disableScroll = tab.id !== 0; // no scrolling for automated search
		};
		$scope.isActiveTab = function (tabId) {
			return tabId == $scope.currentTab;
		};
	/*------------------------------------------------------------------------------------------------------------------
	* END Tab related Stuff
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Search related stuff
	* ----------------------------------------------------------------------------------------------------------------*/

		$scope.doStashSearch = function(sellerAccount, stashName) {
			var cleanStashName = stashName;
			cleanStashName = cleanStashName.replace('~', '\~');
			cleanStashName = cleanStashName.replace(/\s/g, '');
			var input = 'seller' + sellerAccount + ' stash' + cleanStashName;
			$scope.doSavedSearch(input);
		};

		var automatedSearchIntervalFn = function () {
			if ($scope.savedAutomatedSearches && $scope.savedAutomatedSearches.length > 0) {
				debugOutput('Gonna run counts on automated searches: ' + $scope.savedAutomatedSearches.length, 'trace');
				var countPromises = $scope.savedAutomatedSearches.map(function (search) {
 					var queryString = buildQueryString(search.searchInput + " timestamp" + search.lastSearch);
					search.lastSearch = new Date().getTime();
					var fetchSize = 20;
					var from = 0;
					var promise = doElasticSearch(queryString, from, fetchSize, ["shop.updated"], ["desc"]).then(function (response) {
						$.each(response.hits.hits, function (index, value) {
							addCustomFields(value._source);
						});
						return {
							response: response,
							searchInput: search.searchInput
						};
					});
					return promise;
				});
				
				$q.all(countPromises).then(function (results) {
					var total = 0;
					results.forEach(function (e, idx, arr) {
						total += e.response.hits.hits.length;
					});
					if (total > 0) {
						var newHitsCtr = 0;
						var automatedTab = $scope.tabs[1];
						results.forEach(function (elem, index, array) {
							if (!automatedTab.response) {
								automatedTab.response = elem.response;
								newHitsCtr = automatedTab.response.hits.hits.length;
							} else {
								elem.response.hits.hits.forEach(function (newHit) {
									var hitExists = automatedTab.response.hits.hits.find(function (hit) {
										return newHit._source.uuid === hit._source.uuid;
									});
									if (!hitExists) {
										automatedTab.response.hits.hits.push(newHit);
										newHitsCtr++;
									}
								});
							}
						});
						if (newHitsCtr > 0 && !$scope.options.muteSound) {
							$scope.snd.play();
							favicoService.badge(total);
							automatedTab.newItems = newHitsCtr;
						}
					}
				});
				localStorage.setItem("savedAutomatedSearches", JSON.stringify($scope.savedAutomatedSearches.reverse()));
			}
		};

		automatedSearchIntervalFn();
		$interval(automatedSearchIntervalFn, 10000); // 10 sec

		function createSearchPrefix(options, containsLeagueTerm, containsBuyoutTerm, containsVerifyTerm) {
			containsLeagueTerm = defaultFor(containsLeagueTerm, false);
			containsBuyoutTerm = defaultFor(containsBuyoutTerm, false);
			containsVerifyTerm = defaultFor(containsVerifyTerm, false);

			var searchPrefix = "";
			if (!containsLeagueTerm) {
				searchPrefix = options.leagueSelect.value.replace(/\s/g, "");
			}

			if (!containsBuyoutTerm) {
				var buyout = options.buyoutSelect.value;
				switch (buyout) {
					case "Buyout: Yes":
						searchPrefix += " bo";
						break;
					case "Buyout: No":
						searchPrefix += " nobo";
						break;
					case "Buyout: Either":
						searchPrefix += "";
						break;
				}
			}

			if (!containsVerifyTerm) {
				switch (options.verificationSelect.value) {
					case "Status: Verified":
						searchPrefix += " new";
						break;
					case "Status: New":
						searchPrefix += " new";
						break;
					case "Status: Either":
						searchPrefix += "";
						break;
					case "Status: Gone":
						searchPrefix += " gone";
						break;
				}
			}

			options.searchPrefixInputs.forEach(function (e) {
				var prefix = e.value;
				if (prefix) {
					searchPrefix += " " + prefix;
				}
			});
			return searchPrefix.trim();
		}

		/*
		* Runs the current searchInput with default sort
		* */
		$scope.doSearch = function () {
			var sfElem = $("#searchField");
			var valueFromInput = sfElem.val();
			if (typeof valueFromInput !== "undefined") {
				sfElem.blur();
				$("#mainGrid").focus();
				$scope.searchInput = valueFromInput;
			}
			debugOutput('doSearch called, $scope.searchInput = ' + $scope.searchInput, 'info');
			$scope.onClickTab($scope.tabs[0]);
			doActualSearch($scope.searchInput, limitDefault, sortKeyDefault, sortOrderDefault);
			ga('send', 'event', 'Search', 'User Input', $scope.searchInput);
		};

		$scope.stateChanged = function () {
			debugOutput('stateChanged', 'log');
		};

		/*
		* Runs the current searchInput with a custom sort
		* */
		$scope.doSearchWithSort = function (event) {
			var elem = event.currentTarget;
			var sortKey = [elem.getAttribute('data-sort-key')];
			var sortOrder = [elem.getAttribute('data-sort-order')];
			var limit = 50;
			if (httpParams.limit) {
				limit = httpParams.limit;
			}
			doActualSearch($scope.searchInput, limit, sortKey, sortOrder);
		};

		/*
		 Runs the actual search code. For online only, we do a search-and-collect-till-we-get-enough strategy.
		 See also:
		 - https://github.com/trackpete/exiletools-indexer/issues/123
		 - http://stackoverflow.com/questions/20607313/angularjs-promise-with-recursive-function
		 */
		function doActualSearch(searchInput, limit, sortKey, sortOrder) {
			debugOutput("$scope.options.switchOnlinePlayersOnly = " + $scope.options.switchOnlinePlayersOnly, 'info');
			$scope.Response = null;
			$scope.disableScroll = true;
			$scope.showSpinner = true;
			if ($scope.currencyTradingEnabled) {
				$scope.isCurrencySearch = /^\w+:\w+/.test(searchInput);
				console.info("$scope.isCurrencySearch = " + $scope.isCurrencySearch);	
			}
			limit = Number(limit);
			if (limit > 999) {
				limit = 999;
			} // deny power overwhelming
			// ga('send', 'event', 'Search', 'PreFix', createSearchPrefix($scope.options));
			$location.search({'q': searchInput});
			var sortRegex = /\b(\w+)(asc|de?sc)\b/gi;
			if (sortRegex.test(searchInput)) {
				var sortTerms = searchInput.match(sortRegex);
				sortKey = [];
				sortOrder = [];
				debugOutput('parsed sortTerms = ' + sortTerms.toString(), 'info');
				sortTerms.forEach(function (token) {
					var rgxArr = sortRegex.exec(token);
					// refresh the regex internal index
					sortRegex.lastIndex = 0;
					var key = rgxArr[1];
					var ord = rgxArr[2].toLowerCase().replace("dsc", "desc");
					key = evalSearchTermFieldKey(key);
					// special handle for 'shop.hasPrice'
					if (key === "shop.hasPrice") {
						key = "shop.chaosEquiv";
					}
					sortKey.push(key);
					sortOrder.push(ord);
				});
				debugOutput('parsed sort keys = ' + sortKey.toString(), 'info');
				debugOutput('parsed sort ords = ' + sortOrder.toString(), 'info');
			}

			$location.replace();
			debugOutput('changed location to: ' + $location.absUrl(), 'trace');

			searchInput = searchInput.replace(sortRegex, "").trim();
			$scope.searchQuery = buildQueryString(searchInput);
			debugOutput("searchQuery=" + $scope.searchQuery, 'log');
			/*
			 if ($scope.badSearchInputTerms.length > 0) {
			 $scope.showSpinner = false;
			 console.log("Bailed out at Line 923");
			 return;
			 }
			 */
			loadOnlinePlayersIntoScope().then(function () {
				$scope.from = 0;
				$scope.sortKey = sortKey;
				$scope.sortOrder = sortOrder;
				$scope.disableScroll = false;
				$scope.scrollNext();
			});
		}

		function buildQueryString(searchInput) {
			searchInput = searchInput.trim();
			var parseResult = parseSearchInput($scope.termsMap, searchInput);
			$scope.badSearchInputTerms = parseResult.badTokens;
			var inputQueryString = parseResult.queryString;

			// special search term handling
			var hasFreeSearchTerm = /\bfree\b/i.test(searchInput);
			var containsLeagueTerm = inputQueryString.indexOf("attributes.league") != -1;
			var containsBuyoutTerm = inputQueryString.indexOf("shop.hasPrice") != -1 || hasFreeSearchTerm;
			var containsVerifyTerm = inputQueryString.indexOf("shop.verified") != -1;

			var prefix = createSearchPrefix($scope.options, containsLeagueTerm, containsBuyoutTerm, containsVerifyTerm);
			var prefixParseResult = parseSearchInput($scope.termsMap, prefix);

			// // see also https://github.com/exiletrade/exiletrade/issues/63
			if (inputQueryString.length > 0) {
				inputQueryString = '( ' + inputQueryString + ' )';
			}
			// note that elastic will be faster if we put more specific filters first
			var finalSearchInput = inputQueryString + ' ' + prefixParseResult.queryString;
			return finalSearchInput.trim();
		}

		function loadOnlinePlayersIntoScope() {
			return $q.all({
				a: playerOnlineService.getLadderOnlinePlayers($scope.options.leagueSelect.value),
				b: playerOnlineService.getStashOnlinePlayers()
			}).then(function (results) {
				var onlineplayersStash = results.b.aggregations.filtered.sellers.buckets;
				$scope.onlinePlayers = buildListOfOnlinePlayers(results.a, onlineplayersStash);
			});
		}

		$scope.scrollNext = function () {
			//debugOutput('scrollNext called, $scope.disableScroll = ' + $scope.disableScroll, 'trace')
			if ($scope.disableScroll) {
				return;
			}
			$scope.isScrollBusy = $scope.Response; // false if call was from doSearch
			$scope.disableScroll = true;
			var actualSearchDuration = 0;
			var limit = 20;
			var fetchSize = $scope.options.switchOnlinePlayersOnly ? 50 : limit;
			var accBlacklist = $scope.enableBlacklistFeature ? $scope.accountBlacklist.map(function (obj) {
				return obj.account;
			}) : [];

			function fetch() {
				doElasticSearch($scope.searchQuery, $scope.from, fetchSize, $scope.sortKey, $scope.sortOrder)
					.then(function (response) {
						actualSearchDuration += response.took;
						// combine currency stacks
						//response.hits.hits = combineCurrencyStacks(response.hits.hits);

						var hitsItems = response.hits.hits.map(function (value) {
							return value._source;
						});

						var blacklisted = 0;
						var offline = 0;

						playerOnlineService.addCustomFieldLadderData($scope.options.leagueSelect.value, hitsItems).then(function () {
							var accountNamesFilter = $scope.options.switchOnlinePlayersOnly ? $scope.onlinePlayers : [];

							response.hits.hits = response.hits.hits.filter(function (item) {
								var onlineInTheRiver = accountNamesFilter.indexOf(item._source.shop.sellerAccount) != -1;
								var isOnline = item._source.isOnline || onlineInTheRiver || !$scope.options.switchOnlinePlayersOnly;
								var isBlacklisted = accBlacklist.indexOf(item._source.shop.sellerAccount) != -1;
								if (isBlacklisted) {
									blacklisted++;
								}
								if (!isOnline) {
									offline++;
								}
								return !isBlacklisted && isOnline;
							});

							$.each(response.hits.hits, function (index, value) {
								addCustomFields(value._source);
							});

							$scope.from = $scope.from + fetchSize;

							if (!$scope.Response) {
								$scope.Response = response;
								$scope.showSpinner = false;
								$scope.tabs[0].response = response;
							} else {
								$.merge($scope.Response.hits.hits, response.hits.hits);
							}

							if (accountNamesFilter.length !== 0 && $scope.Response.hits.hits.length < limit && response.hits.total > limit && $scope.from < (fetchSize * 10)) {
								$scope.isScrollBusy = true;
								return fetch();
							}

							response.took = actualSearchDuration;
							response.blacklisted = blacklisted;
							response.offline = offline;

							$scope.disableScroll = hitsItems.length < fetchSize;

							$scope.showSpinner = false;
							$scope.isScrollBusy = false;
							debugOutput('scrollNext finished, $scope.disableScroll = ' + $scope.disableScroll, 'trace');
						});
					}, function (err) {
						debugOutput(err.message, 'trace');
						$scope.showSpinner = false;
						$scope.isScrollBusy = false;
					});
			}

			fetch();
		};

		function buildEsBody(searchQuery) {
			return {
				"query": {
					"filtered": {
						"filter": {
							"bool": {
								"must": {
									"query_string": {
										"default_operator": "AND",
										"query": searchQuery
									}
								}
							}
						}
					}
				}
			};
		}

		function doElasticSearch(searchQuery, _from, _size, sortKey, sortOrder) {
			var sortArray = sortKey.map(function (key, idx) {
			  var order = sortOrder[idx] !== undefined ? sortOrder[idx] : "desc";
			  return key + ":" + order;
			});
			var esBody = buildEsBody(searchQuery);
			var esPayload = {
				index: 'index',
				sort: sortArray,
				from: _from,
				size: _size,
				body: esBody
			};
			$scope.elasticJsonRequest = angular.toJson(esPayload, true);
			//debugOutput("Gonna run elastic: " + $scope.elasticJsonRequest, 'trace');
			return es.search(esPayload);
		}

		/*
		* Trigger saved Search
		* */
		$scope.doSavedSearch = function (x) {
			$("#searchField").val(x);
			$scope.doSearch();
		};

	/*------------------------------------------------------------------------------------------------------------------
	* END Search related stuff
	* ----------------------------------------------------------------------------------------------------------------*/

		$scope.autocomplete_options = {
			suggest: suggestSearchTermDelimited,
			on_detach: function (current_value) {
				$scope.searchInput = current_value;
			}
		};

		function suggestSearchTerm(term) {
			var q = term.toLowerCase().trim();
			q = q.replace(/[\(\)-\d]/g, "");
			var results = [];

			if (/^(OR|AND|NOT)$/i.test(q)) {
				return results;
			}

			// regex used to determine if a string contains the substring `q`
			var substrRegex = new RegExp(q, 'i');

			// iterate through the pool of strings and for any string that
			// contains the substring `q`, add it to the `results` array
			for (var i = 0; i < sampleTerms.length && results.length < 10; i++) {
				var sample = sampleTerms[i].sample;
				var query = sampleTerms[i].query;
				var isQueryMatch = !hasBackTick(query) && substrRegex.test(query);
				if (substrRegex.test(sample) || isQueryMatch) {
					results.push({
						label: '<strong>' + sample + '</strong>' + '<span>' + "<i>" + query + "</i>" + '</span>',
						value: sample
					});
				}
			}

			return results;
		}

		function suggestSearchTermDelimited(term) {
			var ix = term.lastIndexOf(' '),
				lhs = term.substring(0, ix + 1),
				rhs = term.substring(ix + 1),
				suggestions = suggestSearchTerm(rhs);

			suggestions.forEach(function (s) {
				s.value = lhs + s.value;
			});

			return suggestions;
		}

	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Add/Create/Change item mods
	* ----------------------------------------------------------------------------------------------------------------*/

		/*
		* Add custom fields to the item object
		* */
		function addCustomFields(item) {
			if (item.mods) {
				createForgottenMods(item);
			}
			if (item.mods) {
				createImplicitMods(item);
			}
			if (item.mods) {
				createCraftedMods(item);
			}
			if (item.mods) {
				createEnchantMods(item);
			}
			if (item.shop) {
				var added = new Date(item.shop.added);
				var updated = new Date(item.shop.updated);
				var modified = new Date(item.shop.modified);
				item.shop.addedHuman = prettyDate(added);
				item.shop.updatedHuman = prettyDate(updated);
				item.shop.modifiedHuman = prettyDate(modified);
				if (!item.isOnline) {
					item.isOnline = $scope.onlinePlayers.indexOf(item.shop.sellerAccount) != -1;
				}
			}
		}

		function createForgottenMods(item) {
			var itemTypeKey = firstKey(item.mods);
			var explicits = item.mods[itemTypeKey].explicit;
			var forgottenMods = $.map(explicits, function (propertyValue, modKey) {
				// for mods that have ranged values like 'Adds #-# Physical Damage', we need to sort on avg field
				var keyExtraSuffix = (typeof propertyValue === "object" && propertyValue.avg) ? ".avg" : "";
				return {
					display: modToDisplay(propertyValue, modKey),
					key: 'mods.' + itemTypeKey + '.explicit.' + modKey + keyExtraSuffix,
					name: modKey,
					value: propertyValue,
					css: getModCssClasses(modKey)
				};
			});
			item.forgottenMods = forgottenMods;
			// we call on fm.js to do it's awesome work
			fm_process(item);
		}

		function createImplicitMods(item) {
			var itemTypeKey = firstKey(item.mods);
			var implicits = item.mods[itemTypeKey].implicit;
			var implicitMods = $.map(implicits, function (propertyValue, modKey) {
				// for mods that have ranged values like 'Adds #-# Physical Damage', we need to sort on avg field
				var keyExtraSuffix = (typeof propertyValue === "object" && propertyValue.avg) ? ".avg" : "";
				return {
					display: modToDisplay(propertyValue, modKey),
					key: 'mods.' + itemTypeKey + '.implicit.' + modKey + keyExtraSuffix
				};
			});
			item.implicitMods = implicitMods;
		}

		function createEnchantMods(item) {
			var enchant = item.enchantMods;
			if (!enchant) {
				return;
			}
			var enchantMods = $.map(enchant, function (propertyValue, modKey) {
				return {
					display: modToDisplay(propertyValue, modKey),
					key: 'enchantMods.' + modKey
				};
			});
			item.enchantMods = enchantMods;
		}

		function createCraftedMods(item) {
			var itemTypeKey = firstKey(item.mods);
			var crafteds = item.mods[itemTypeKey].crafted;
			item.craftedMods = $.map(crafteds, function (propertyValue, modKey) {
				// for mods that have ranged values like 'Adds #-# Physical Damage', we need to sort on avg field
				var keyExtraSuffix = (typeof propertyValue === "object" && propertyValue.avg) ? ".avg" : "";
				return {
					display: modToDisplay(propertyValue, modKey),
					key: 'mods.' + itemTypeKey + '.crafted.' + modKey + keyExtraSuffix
				};
			});
		}

		/*
		* Add values to mod description
		* */
		$scope.getItemMods = function (x) {
			var mods = [];

			for (var key in x) {
				var mod = key;

				if (typeof x[key] === 'number') {
					mod = mod.replace('#', x[key]);
				}
				else {
					var obj = x[key];
					for (var prop in obj) {
						if (prop == 'avg') {
							continue;
						}
						mod = mod.replace('#', obj[prop]);
					}
				}
				mods.push(mod);
			}
			return mods;
		};
	/*------------------------------------------------------------------------------------------------------------------
	* END Add/Create/Change item mods
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Save/Delete searches/items/options from/to HTML localStorage
	* ----------------------------------------------------------------------------------------------------------------*/

		/*
		* Save the current/last search terms to HTML storage
		* */
		$scope.saveLastSearch = function () {
			ga('send', 'event', 'Save', 'Last Search', $scope.searchInput);
			var search = $scope.searchInput;
			var savedSearches = [];

			if (localStorage.getItem("savedSearches") !== null) {
				savedSearches = JSON.parse(localStorage.getItem("savedSearches"));
			}

			// return if search is already saved
			if (savedSearches.indexOf(search) != -1) {
				return;
			}
			savedSearches.push(search);
			localStorage.setItem("savedSearches", JSON.stringify(savedSearches));
			$scope.savedSearchesList = savedSearches.reverse();
		};

		/*
		* Delete selected saved search terms from HTML storage
		* */
		$scope.removeSearchFromList = function (x) {
			var savedSearches = JSON.parse(localStorage.getItem("savedSearches"));
			var pos = savedSearches.indexOf(x);

			if (pos != -1) {
				savedSearches.splice(pos, 1);
				localStorage.setItem("savedSearches", JSON.stringify(savedSearches));
				$scope.savedSearchesList = savedSearches.reverse();
			}
		};

		/*
		* Save the current/last search terms to HTML storage - automated
		* */
		$scope.saveAutomatedSearch = function () {
			//ga('send', 'event', 'Save', 'Last Search', $scope.searchInput);
			var search = {searchInput: $scope.searchInput, lastSearch: new Date().getTime()};
			var savedSearches = [];

			if (localStorage.getItem("savedAutomatedSearches") !== null) {
				savedSearches = JSON.parse(localStorage.getItem("savedAutomatedSearches"));
			}

			// return if search is already saved
			if (savedSearches.map(function (s) {
					return s.searchInput;
				}).indexOf(search) != -1) {
				return;
			}
			savedSearches.push(search);
			localStorage.setItem("savedAutomatedSearches", JSON.stringify(savedSearches));
			$scope.savedAutomatedSearches = savedSearches.reverse();
		};

		/*
		* Delete selected saved search terms from HTML storage - automated
		* */
		$scope.removeAutomatedSearchFromList = function (x) {
			var savedSearches = JSON.parse(localStorage.getItem("savedAutomatedSearches"));
			var pos = savedSearches.map(function (s) {
				return s.searchInput;
			}).indexOf(x.searchInput);

			if (pos != -1) {
				savedSearches.splice(pos, 1);
				localStorage.setItem("savedAutomatedSearches", JSON.stringify(savedSearches));
				$scope.savedAutomatedSearches = savedSearches.reverse();
			}
		};

		/*
		* Save item to HTML storage
		* */
		$scope.saveItem = function (id, name, seller) {
			var savedItems = JSON.parse(localStorage.getItem("savedItems"));
			var description = name + ' (from: ' + seller + ')';
			var item = {itemId: id, itemDescription: description};

			if (savedItems === null) {
				savedItems = [];
			}

			// return if item is already saved
			if (findObjectById(savedItems, id) !== undefined) {
				return;
			}

			savedItems.push(item);
			localStorage.setItem("savedItems", JSON.stringify(savedItems));
			$scope.savedItemsList = savedItems.reverse();
		};

		/*
		* Delete selected saved search terms from HTML storage
		* */
		$scope.removeItemFromList = function (id) {
			var savedItems = JSON.parse(localStorage.getItem("savedItems"));

			savedItems = savedItems.filter(function (el) {
					return el.itemId !== id;
				}
			);

			localStorage.setItem("savedItems", JSON.stringify(savedItems));
			$scope.savedItemsList = savedItems.reverse();
		};

		/*
		* Request saved item data to display it in savedItemsAccordion
		* */
		$scope.requestSavedItem = function (itemId) {
			var esPayload = {
				index: 'index',
				body: {
					"filter": {
						"term": {
							"_id": itemId
						}
					}
				}
			};
			loadOnlinePlayersIntoScope().then(function () {
				debugOutput("Gonna run elastic: " + angular.toJson(esPayload, true), 'trace');
				es.search(esPayload).then(function (response) {
					debugOutput("itemId: " + itemId + ". Found " + response.hits.total + " hits.", 'info');
					if (response.hits.total == 1) {
						addCustomFields(response.hits.hits[0]._source);
						playerOnlineService.addCustomFieldLadderData($scope.options.leagueSelect.value, [response.hits.hits[0]._source]);
					}
					$scope.lastRequestedSavedItem = response.hits.hits;
				});
			});
		};

		/*
		* Save options to HTML storage
		* */
		$scope.saveOptions = function () {
			ga('send', 'event', 'Save', 'Options', createSearchPrefix($scope.options));
			localStorage.setItem("savedOptions", JSON.stringify($scope.options));
		};

		/*
		* Add input Fields (options search Prefixes)
		* */
		$scope.addInputField = function () {
			$scope.options.searchPrefixInputs.push({"value": ""});
		};

		$scope.removeInputFromList = function () {
			var savedOptions = JSON.parse(localStorage.getItem("savedOptions"));
		};
	/*------------------------------------------------------------------------------------------------------------------
	* END Save/Delete searchs/items from/to HTML localStorage
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Item css classes
	* ----------------------------------------------------------------------------------------------------------------*/

		/*
		* Get CSS Classes for element resistances
		* */
		function getModCssClasses(mod) {
			var css = "";
			if (mod.indexOf("Resistance") > -1) {
				if (mod.indexOf("Cold") > -1) {
					css = "mod-cold-res";
				}
				else if (mod.indexOf("Fire") > -1) {
					css = "mod-fire-res";
				}
				else if (mod.indexOf("Lightning") > -1) {
					css = "mod-lightning-res";
				}
				else if (mod.indexOf("Chaos") > -1) {
					css = "mod-chaos-res";
				}
			}
			if (mod.indexOf("Damage") > -1) {
				if (mod.indexOf("Cold") > -1) {
					css = "mod-cold-dmg";
				}
				else if (mod.indexOf("Fire") > -1) {
					css = "mod-fire-dmg";
				}
				else if (mod.indexOf("Lightning") > -1) {
					css = "mod-lightning-dmg";
				}
				else if (mod.indexOf("Chaos") > -1) {
					css = "mod-chaos-dmg";
				}
			}
			else if (mod.indexOf("to maximum Life") > -1) {
				css = "mod-life";
			}
			else if (mod.indexOf("to maximum Mana") > -1) {
				css = "mod-mana";
			}
			return css;
		}

		/*
		* Get CSS Classes for item sockets
		* */
		$scope.getSocketClasses = function (x) {
			if (typeof x == "undefined") {
				return [];
			}
			var sockets = [];
			var colors = x.split('-').join('').split('');
			for (var i = 0; i < colors.length; i++) {
				var cssClasses;
				switch (i) {
					case 0 :
						cssClasses = 'socketLeft';
						break;
					case 1 :
						cssClasses = 'socketRight';
						break;
					case 2 :
						cssClasses = 'socketRight middle';
						break;
					case 3 :
						cssClasses = 'socketLeft middle';
						break;
					case 4 :
						cssClasses = 'socketLeft bottom';
						break;
					case 5 :
						cssClasses = 'socketRight bottom';
						break;
				}
				switch (colors[i]) {
					case 'W' :
						cssClasses += ' socketWhite';
						break;
					case 'R' :
						cssClasses += ' socketRed';
						break;
					case 'G' :
						cssClasses += ' socketGreen';
						break;
					case 'B' :
						cssClasses += ' socketBlue';
						break;
				}
				sockets[i] = cssClasses;
			}
			return sockets;
		};

		/*
		* Get CSS classes for item socket links
		* */
		$scope.getSocketLinkClasses = function (x) {
			if (typeof x == "undefined") {
				return [];
			}
			var groups = x.split('-');
			var pointer = 0;
			var pos = [];

			for (var i = 0; i < groups.length; i++) {
				var count = groups[i].length - 1;

				try {
					pointer += groups[i - 1].length;
				} catch (err) {
				}

				if (count > 0) {
					for (var j = 0; j < count; j++) {
						var cssClasses;
						switch (pointer + j) {
							case 0 :
								cssClasses = 'socketLinkCenter';
								break;
							case 1 :
								cssClasses = 'socketLinkRight';
								break;
							case 2 :
								cssClasses = 'socketLinkCenter middle';
								break;
							case 3 :
								cssClasses = 'socketLinkLeft middle';
								break;
							case 4 :
								cssClasses = 'socketLinkCenter bottom';
								break;
						}
						pos.push(cssClasses);
					}
				}
			}
			return pos;
		};
	/*------------------------------------------------------------------------------------------------------------------
	* END Item css classes
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Helpers/stateChecks/random ungrouped stuff
	* ----------------------------------------------------------------------------------------------------------------*/

		/*
		* Resize #mainGrid to simulate off-canvas functionality when using the savedSearches-panel
		* */
		$scope.resizeGridFrame = function (opened) {
			var displayStatus = jQuery('div.screenWidthCheck-640').css('display');

			if (opened === true) {
				jQuery('#mainGrid').animate({
					marginRight: (displayStatus == 'none') ? "400px" : "100%"
				}, 500, 'swing');
			} else {
				jQuery('#mainGrid').animate({
					marginRight: "0px"
				}, 380, 'swing');
			}
		};

		/*
		* Scroll to top
		* */
		$scope.scrollToTop = function () {
			ga('send', 'event', 'Feature', 'Scroll To Top');
			angular.element(document.querySelector('#mainGrid')).scrollTo(0, 0, 350);
		};

		/*
		* Prepare Whisper Message
		* */
		$scope.copyWhisperToClipboard = function (item) {
			var message = item._source.shop.defaultMessage;
			var seller = item._source.shop.lastCharacterName;
			var itemName = item._source.info.fullName;
			var league = item._source.attributes.league;
			var stashTab = item._source.shop.stash.stashName;
			var x = item._source.shop.stash.xLocation;
			var y = item._source.shop.stash.yLocation;

			if (message === undefined) {
				message = '@' + seller + " Hi, I'd like to buy your " + itemName + ' in ' + league + ' (Stash-Tab: "' +
					stashTab + '" [x' + x + ',y' + y + '])' + ', my offer is : ';
			} else {
				//removing the "Unknown" tag from currency
				var n = message.indexOf('Unknown (');
				if (n > -1) {
					message = message.replace('Unknown ', '');
				}
			}
			return message;
		};

		/*
		* Check if obj is empty
		* */
		$scope.isEmpty = function (obj) {
			for (var i in obj) {
				if (obj.hasOwnProperty(i)) {
					return false;
				}
			}
			return true;
		};

		$scope.getKeys = function(obj){
			return Object.keys(obj);
		};

		/*
		* Check if item needs to display the itemlevel
		* */
		$scope.needsILvl = function (item) {
			var type = item.itemType;
			var blacklist = ['Map', 'Gem', 'Card', 'Currency'];

			return blacklist.indexOf(type) == -1;
		};

		debugOutput("Loaded " + Object.keys(terms).length + " terms.", "info");
		sampleTerms.sort(function (a, b) {
			return a.sample.length - b.sample.length;
		});
		if (typeof httpParams.q !== 'undefined') {
			$scope.doSearch();
		} else {
			$q.all({
				a: playerOnlineService.getLadderOnlinePlayers($scope.options.leagueSelect.value),
				b: playerOnlineService.getStashOnlinePlayers()
			});
		}

		/*
		* Toggle Help section
		* */
		$scope.toggleHelp = function () {
			$scope.helpState = ($scope.helpState === false);
			return $scope.helpState;
		};

		/*
		* Set search input autofocus
		* */
		$scope.searchInputState = function() {
			return isEmpty($scope.searchInput);
		};

	/*------------------------------------------------------------------------------------------------------------------
	* END Helpers/stateChecks/random ungrouped stuff
	* ----------------------------------------------------------------------------------------------------------------*/

	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Currency Trading
	* ----------------------------------------------------------------------------------------------------------------*/
		
		// combine currency stacks from the same seller account if the price/ratio is the same
		function combineCurrencyStacks(response) {
			var currencyResponse = [];
			var tempArr = [];

			$.each(response, function (index, value) {
				var name = value._source.shop.sellerAccount;
				var price = value._source.shop.price[value._source.shop.currency];
				var amount = value._source.shop.amount;
				var stackSize = value._source.properties.stackSize.current;
				var stackSizeMax = value._source.properties.stackSize.max;
				var stackSizeMaxTotal = value._source.properties.stackSize.maxTotal;

				if (typeof stackSizeMaxTotal === 'undefined') {
					stackSizeMaxTotal = stackSizeMax;
					value._source.properties.stackSize.maxTotal = stackSizeMax;
				}
				var normalizedRatio = normalizeCurrencyRatio(price,	stackSizeMaxTotal, amount);
				// add normalized ratio to item
				value._source.shop.normalizedRatio = normalizedRatio;

				if (name in tempArr) {
					if (price in tempArr[name]) {
						tempArr[name][price]._source.properties.stackSize.current += stackSize;
						//tempArr[name][price]._source.shop.amount = parseFloat(tempArr[name][price]._source.shop.amount) + parseFloat(amount);
						tempArr[name][price]._source.properties.stackSize.maxTotal += stackSizeMax;
					}
					else {
						tempArr[name][price] = value;
					}
				}
				else {
					tempArr[name] = [];
					tempArr[name][price] = value;
				}
			});

			for (var key in tempArr) {
				for (var priceKey in tempArr[key]) {
					currencyResponse.push(tempArr[key][priceKey]);
				}
			}

			return currencyResponse;
		}

		// TODO fixing currency ratio display
		function normalizeCurrencyRatio(price, stackSize, amount) {
			var ratio =  1/price;
			if (amount >= 1) {
				ratio = ratio * stackSize;
			}
			if( ratio >= 10) {
				ratio = Math.round(ratio * 10) / 10;
			}
			else {
				ratio = Math.round(ratio * 1000) / 1000;
			}

			return ratio;
		}

		// old, not used atm, can probably be removed later
		$scope.getCurrencyRatio = function(price, stack, amount) {
			var ratio = 0;
			for (var key in price) {
				ratio = 1/price[key];
				if (amount >= 1) {
					ratio = ratio * stack;
				}
			}
			if( ratio >= 10) {
				ratio = Math.round(ratio * 10) / 10;
			}
			else {
				ratio = Math.round(ratio * 1000) / 1000;
			}

			return ratio;
		};

		$scope.prepareCurrencyTradingModal = function(item){
			$scope.resetCurrencyTrading();
			$scope.currencyTrading.item = item;
			$scope.currencyTrading.rangeSteps = Math.floor(item.properties.stackSize.current / item.shop.amount);
			console.log($scope.currencyTrading.rangeSteps);
			$scope.currencyTrading.rangeValue = 1 * $scope.currencyTrading.rangeSteps;
			$scope.currencyTrading.rangeMax = item.properties.stackSize.current;
			$scope.currencyTrading.rangeMin = $scope.currencyTrading.rangeValue;

			$scope.updateCurrencyBuyMessage(item, $scope.currencyTrading.rangeValue);
			FoundationApi.publish('showCurrencyTradingModal', 'open');
		};

		$scope.$watch('currencyTrading.rangeValue', function() {
			$scope.currencyTrading.rangeValue = parseInt($scope.currencyTrading.rangeValue);

			console.log($scope.currencyTrading.rangeSteps);
		});

		// TODO fix buy/pay/slider values
		$scope.updateCurrencyBuyMessage = function(item, rangeValue){
			var buy = item.info.fullName;
			var pay = item.shop.currency;
			var amount = item.shop.amount;
			var stackSize = item.properties.stackSize.current;
			var buyTotal = rangeValue;
			var priceSingle = item.shop.price[pay] * (item.properties.stackSize.maxTotal / item.properties.stackSize.max);
			var payTotal = Math.round(($scope.currencyTrading.rangeValue * (priceSingle/stackSize)) * 100 ) / 100;
			var ign = item.shop.lastCharacterName;
			var league = item.attributes.league;

			$scope.currencyTrading.msg = '@' + ign + ' Hi, I would like to buy your ' + buyTotal + ' ' + buy + ' for my ' + payTotal + ' ' + pay +
				' in ' + league + '.';

			$scope.currencyTrading.buy = buyTotal;
			$scope.currencyTrading.pay = payTotal;
		};
		$scope.resetCurrencyTrading = function() {
			$scope.currencyTrading = {
				"msg": "", "item" : {}, "rangeValue" : 0, "buy" : 0, "pay" : 1
			};
		};

	/*------------------------------------------------------------------------------------------------------------------
	* END Currency Trading
	* ----------------------------------------------------------------------------------------------------------------*/

	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Account Blacklist
	* ----------------------------------------------------------------------------------------------------------------*/

		/*
		* Load Blacklist from localstorage
		* */
		$scope.loadAccountBlacklistFromStorage = function() {
			var list = JSON.parse(localStorage.getItem("accountBlacklist"));
			if (list !== null) {
				$scope.accountBlacklist = list;
			}
		};
		$scope.loadAccountBlacklistFromStorage();

		/*
		* Add player as candidate for blacklisting (temp variables)
		* */
		$scope.addBlacklistCandidate = function(account, comment) {
			$scope.blacklistCandidate.account = account;
			$scope.blacklistCandidate.comment = comment;
		};

		/*
		* Clear blacklist candidate variables
		* */
		$scope.clearBlacklistCandidate = function() {
			$scope.blacklistCandidate.account = '';
			$scope.blacklistCandidate.comment = '';
			$scope.blacklistCandidate.commentLength = 100;
		};

		/*
		* Add player to blacklist
		* */
		$scope.addPlayerToBlacklist = function(account, comment) {
			var timestamp = Date.now();
			var obj = { "date_added" : timestamp, "account" : account, "comment" : comment};
			var check = $.grep($scope.accountBlacklist, function(e){ return e.account == account; });
			// add player if not already added
			if (check.length === 0) {
				$scope.accountBlacklist.push(obj);
			}
			$scope.updateBlacklistLocalStorage();
			$scope.clearBlacklistCandidate();
		};

		/*
		* Remove player from blacklist
		* */
		$scope.removePlayerFromBlacklist = function(account) {
			// remove player if found
			for (var i = 0; i < $scope.accountBlacklist.length; i++) {
				if ($scope.accountBlacklist[i].account == account) {
					$scope.accountBlacklist.splice(i,1);
				}
			}
			$scope.updateBlacklistLocalStorage();
		};

		/*
		* Update localStoarge blacklist
		* */
		$scope.updateBlacklistLocalStorage = function() {
			localStorage.setItem("accountBlacklist", JSON.stringify($scope.accountBlacklist));
		};

		/*
		* Save blacklist to JSON file and download the file
		* */
		$scope.saveBlacklistToJSON = function (data, filename) {
			if (!data) {
				console.error('No data');
				return;
			}

			if (!filename) {
				var timestamp = Date.now();
				filename = 'exiletrade_account_blacklist_' + timestamp + '.json';
			}

			if (typeof data === 'object') {
				data = JSON.stringify(data, undefined, 2);
			}

			var blob = new Blob([data], {type: 'text/json'}),
				e = document.createEvent('MouseEvents'),
				a = document.createElement('a');

			a.download = filename;
			a.href = window.URL.createObjectURL(blob);
			a.dataset.downloadurl = ['text/json', a.download, a.href].join(':');
			e.initEvent('click', true, false, window,
				0, 0, 0, 0, 0, false, false, false, false, 0, null);
			a.dispatchEvent(e);
		};

		/*
		* Upload blacklist JSON file and overwrite localStorage
		* */
		$scope.uploadBlacklist = function(file, errFiles) {
			$scope.f = file;
			$scope.errFile = errFiles && errFiles[0];
			if (file) {
				var upload = Upload.dataUrl(file, false).then(function(url){
					$http.get(url).success (function(data) {
						$scope.accountBlacklist = data;
						$scope.updateBlacklistLocalStorage();
					});
				});
			}
		};
	/*------------------------------------------------------------------------------------------------------------------
	* END Account Blacklist
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN Tutorial
	* ----------------------------------------------------------------------------------------------------------------*/
		/*
		* Return popup html element
		* */
		function getPopup(index, step) {
			var el, i;
			if (typeof index === 'number') {
				if (step=='next') {
					index++;
				}
				else if (step=='previous') {
					index--;
				}
				el = angular.element('#tutorial-'+ index);
				i = index;
			}
			else {
				el = angular.element(index.target).parents('.tutorial-popup');
				i = parseInt(angular.element(el).attr('id').replace('tutorial-', ''));
				if (step=='next') {
					i++;
					el = angular.element('#tutorial-'+ i);
				}
				else if (step=='prev') {
					i--;
					el = angular.element('#tutorial-'+ i);
				}
			}

			return [el, i];
		}

		/*
		* Close tutorial popup
		* */
		$scope.closeTutorialPopup = function(tutorialIndex) {
			var obj = getPopup(tutorialIndex)[0];
			var popup = obj[0];
			var index = obj[1];
			angular.element(popup).removeClass('active');
		};

		/*
		* Open next tutorial popup in sequence (next and previous)
		* */
		$scope.openTutorialPopup = function(step, tutorialIndex){
			//step can be omitted with '', tutorialIndex should be $event or an integer
			var obj = getPopup(tutorialIndex, step);
			var popup = obj[0];
			var index = obj[1];

			//return if targeted popup not found
			if (typeof popup[0] === 'undefined') {
				$scope.closeTutorialPopup(index);
				return;
			}

			var targetID = angular.element(popup).data('target');
			var target = angular.element('#'+targetID);

			//close current popup before opening the next/previous one
			if (index >= 0 ) {
				if (step == 'next') {
					$scope.closeTutorialPopup(index-1);
				}
				if (step == 'prev') {
					$scope.closeTutorialPopup(index+1);
				}
			}

			positionTutorialPopup(popup, target);
		};

		/*
		* Calculate tutorial popup position
		* */
		function positionTutorialPopup(popup, target) {
			var windowWidth = angular.element('#mainGrid').outerWidth();
			var popupMarginTop = parseInt(angular.element(popup).css('margin-top').replace("px", ""));
			var popupWidth = angular.element(popup).outerWidth();
			var targetOffset = angular.element(target).offset();
			var targetHeight = angular.element(target).outerHeight();
			var targetWidth = angular.element(target).outerWidth();
			var posLeft = 0;
			var alignment = '';
			var arrowPos = 0;

			posLeft = (targetOffset.left + targetWidth / 2) - (popupWidth / 2);
			angular.element(popup).addClass('middle');

			// popup can't be centered and is positioned left
			if (Math.abs(posLeft) < popupWidth ) {
				posLeft = 5;
				angular.element(popup).removeClass('middle');
				positionPopupArrow('left', targetOffset, windowWidth, targetWidth, popup);
			}
			// popup can't be centered and is positioned right
			else if ((Math.abs(posLeft) + popupWidth) > windowWidth) {
				posLeft = windowWidth - popupWidth - 20;
				angular.element(popup).removeClass('middle');
				positionPopupArrow('right', targetOffset, windowWidth, targetWidth, popup);
			}

			// set popup position
			angular.element(popup).css('top', targetOffset.top + targetHeight + 'px');
			angular.element(popup).css('left', posLeft + 'px');
			angular.element(popup).addClass('active');
			// scroll above target element
			angular.element('#mainGrid').scrollTo(0, 0, targetOffset.top - 10);
		}

		/*
		* Calculate tutorial popup arrow position
		* */
		function positionPopupArrow(alignment, targetOffset, windowWidth, targetWidth, popup) {
			var pos = 0;
			if (alignment == 'left') {
				pos = targetOffset.left + targetWidth / 2 - 10;
			}
			else if (alignment == 'right') {
				pos = windowWidth - (targetOffset.left + targetWidth) - 10;
			}
			angular.element(popup).find('.arrow-shadow').css(alignment, pos);
		}
	/*------------------------------------------------------------------------------------------------------------------
	* END Tutorial
	* ----------------------------------------------------------------------------------------------------------------*/


	/*------------------------------------------------------------------------------------------------------------------
	* BEGIN AdBlock detection
	* ----------------------------------------------------------------------------------------------------------------*/
		$scope.adBlockNotDetected = function() {
			//do something
		};

		/*
		* AdBlock is detected, show console info and adBlock modal
		* */
		$scope.adBlockDetected = function() {
			console.info("If javascript-file 'ads.js' is being blocked by your client you have AdBlock enabled. This error is expected.");
			if ($scope.options.dontShowAdBlockWarning) {
				return;
			}
			setTimeout(function(){
				FoundationApi.publish('showAdBlockModal', 'show');
			}, 50);
		};

		/*
		* Check if an adBlocker is active
		* */
		function checkForAdBlock() {
			if (typeof fuckAdBlock === 'undefined') {
				$scope.adBlockDetected();
			} else {
				fuckAdBlock.onDetected($scope.adBlockDetected);
				fuckAdBlock.onNotDetected($scope.adBlockNotDetected);
				// and|or
				fuckAdBlock.on(true, $scope.adBlockDetected);
				fuckAdBlock.on(false, $scope.adBlockNotDetected);
				// and|or
				fuckAdBlock.on(true, $scope.adBlockDetected).onNotDetected($scope.adBlockNotDetected);
			}
		}
		//checkForAdBlock();

	/*------------------------------------------------------------------------------------------------------------------
	* END AdBlock detection
	* ----------------------------------------------------------------------------------------------------------------*/
	}]);


/*----------------------------------------------------------------------------------------------------------------------
* BEGIN Custom Filters
* --------------------------------------------------------------------------------------------------------------------*/
	appModule.filter("currencyToCssClass", [function() {
		return function (str) {
			var currencyCssClassMap = new Map([
				["Chaos Orb", "chaos-orb"],
				["Exalted Orb", "exalt-orb"]
			]);
			var result = currencyCssClassMap.get(str);
			if (!result) {result = str;}
			return result;
		};
	}]);

	appModule.filter("defaultToValue", [function() {
		return function(str) {
			var defaultValues = new Map([
				[undefined, "0"]
			]);
			var result = defaultValues.get(str);
			if (!result) {result = str;}
			return result;
		};
	}]);

	appModule.filter('isEmpty', [function () {
		return function (object) {
			return angular.equals({}, object);
		};
	}]);

	appModule.filter('cleanCurrency', [function () {
		return function (str) {
			if (typeof str === 'undefined') {
				return;
			}

			var validTerms = [
				"Prophecy",//0
				"regal", 		//1
				"augmentation",	//2
				"wisdom", 		//3
				"portal", 		//4
				"alchemy", 		//5
				"mirror", 		//6
				"blessed", 		//7
				"whetstone",	//8
				"scrap", 		//9
				"vaal",			//10
				"bauble", 		//11
				"chaos", 		//12
				"chisel", 		//13
				"chromatic",	//14
				"divine", 		//15
				"exalted", 		//16
				"transmutation",//17
				"scouring",		//18
				"regret",		//19
				"fusing", 		//20
				"prism", 		//21
				"jeweller",		//22
				"alteration", 	//23
				"chance",		//24
				"unknown",		//25
				"silver"	//26
			];

			str =  str.replace(/[^\w\s]/gi, '').replace(/[0-9]/g, '').toLowerCase();

			var currencyMap = new Map([
				["unknown shekel", validTerms[0]],
				["unknown shekels", validTerms[0]],
				["unknown pc", validTerms[0]],
				["unknown p", validTerms[0]],
				["unknown perandus", validTerms[0]],
				["unknown perandus coin", validTerms[0]],
				["unknown perandus coins", validTerms[0]],
				["unknown peranduscoins", validTerms[0]],
				["unknown pcoins", validTerms[0]],
				["unknown pcoin", validTerms[0]],
				["unknown per", validTerms[0]],
				["unknown exa", validTerms[16]],
				["unknown fuse", validTerms[20]],
				["unknown alt", validTerms[23]],
				["unknown aug", validTerms[2]],
				["unknown jewel", validTerms[22]],
				["jewellers", validTerms[22]],
				["jewellers orb", validTerms[22]],
				["unknown cartographer", validTerms[13]],
				["unknown scour", validTerms[18]],
				["unknown gemcutter", validTerms[21]],
				["unknown transmute", validTerms[17]],
				["unknown x", validTerms[16]],
				["unknown chaoss", validTerms[12]],
				["unknown alch", validTerms[5]],
				["perandus coin", validTerms[0]],
				["silver coin", validTerms[26]],
				["unknown silver coin", validTerms[26]],
				["unknown silver", validTerms[26]],
				["unknown silvercoin", validTerms[26]],
				["unknown silvercoins", validTerms[26]],
				["unknown silver coins", validTerms[26]]
			]);

			var result = currencyMap.get(str);
			if (!result) {result = str;}

			return result;
		};
	}]);
/*----------------------------------------------------------------------------------------------------------------------
* END Custom Filters
* --------------------------------------------------------------------------------------------------------------------*/


/*----------------------------------------------------------------------------------------------------------------------
* BEGIN Custom Directives
* --------------------------------------------------------------------------------------------------------------------*/
	appModule.directive('myEnter', function () {
		return function (scope, element, attrs) {
			element.bind("keydown keypress", function (event) {
				if (event.which === 13) {
					scope.$apply(function () {
						scope.$eval(attrs.myEnter);
					});

					event.preventDefault();
				}
			});
		};
	});

	appModule.directive('execOnScrollToBottom', function () {
		return {
			restrict: 'A',
			scope: true,
			link: function (scope, element, attrs) {
				var mainGrid = element[0].parentElement;
				mainGrid.onscroll = function (e) {
					var el = e.target;
					var allowance = 340;
					var clientHeight = mainGrid.clientHeight;
					//debugOutput("Scrolling = " + (el.scrollHeight - el.scrollTop) + " to " + clientHeight + " with allowance " + allowance, 'log');
					if ((el.scrollHeight - el.scrollTop) <= (clientHeight + allowance)) { // fully scrolled
						//debugOutput("Scrolled to bottom", 'trace');
						scope.$apply(attrs.execOnScrollToBottom);
					}
				};
			}
		};
	});

	appModule.directive('item', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/item.html',
			scope: true
		};
	});

	appModule.directive('currency', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/currency.html',
			scope: true
		};
	});

	appModule.directive('termsguide', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/termsGuide.html',
			scope: true,
			replace: true
		};
	});

	appModule.directive('optionspanel', function () {
		return {
			restrict: 'A',
			templateUrl: 'templates/directives/optionsPanel.html',
			scope: true
		};
	});

/*----------------------------------------------------------------------------------------------------------------------
* END Custom Directives
* --------------------------------------------------------------------------------------------------------------------*/
})();
