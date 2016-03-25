function debugOutput(input, outputType) {
	if (typeof debugDevBuild === 'undefined') return;
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
// expects array
//returns {'corrected', 'unCorrectable'
function badUserInput(badTokens) {
	if (badTokens.length == 0) return;
	var successArr = [];
	var evaluatedToken;
	debugOutput("bad Tokens: " + badTokens.join(" "), 'log');
	//attempt 1 User copy pasted RegEx 

	for (i = 0; i < badTokens.length; i++) {
		badTokens[i] = badTokens[i].replace(/\w\?/gi, "");
		while (badTokens[i].indexOf(")?") > -1) {
			badTokens[i] = badTokens[i].replace(/\([^\(\)]*\)\?/, "")
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

	debugOutput("bad Tokens attmept 2: " + badTokens.join(" "), 'log');
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
		debugOutput("after filtering", 'log');
		debugOutput(attempt, 'log');
		if ((attempt.length >= 2)) {
			for (var i = 0; i < attempt.length - 1; i++) {
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

	debugOutput("Result", 'log');
	debugOutput(successArr, 'log');
	debugOutput("Failure", 'log');
	debugOutput(badTokens, 'log');
	return {'corrected': successArr, 'unCorrectable': badTokens};
}


// var terms = {};
function parseSearchInput(_terms, input) {
	debugOutput('parseSearchInput: ' + input, 'trace');
// 	terms = _terms;

	// special search term handling
	if (/\bfree\b/i.test(input) && /\bbo\b/i.test(input)) {
		// free items cannot have buyouts so let's remove the bo search term if any
		debugOutput("removing 'bo' as a special handling of 'free'", 'info');
		input = input.replace(/\bbo\b/i, "").trim();
	}

	// capture literal search terms (LST) like name="veil of the night"
	var regex = /([^\s]*[:=]\".*?\")/g;
	var lsts = input.match(regex);
	var _input = input.replace(regex, 'LST');
	var parseResult = parseSearchInputTokens(_input);

	var i = 0;
	parseResult.queryString = parseResult.queryString.replace('LST', function (match) {
		var lst = lsts[i];
		i++;
		var lstStr = lst.toLowerCase()
			.replace("name", "info.tokenized.fullName")
			.replace("=", ":");
		return lstStr;
	});

	return parseResult;
}

function parseSearchInputTokens(input, rerun) {
	var rerun = typeof rerun !== 'undefined' ? rerun : false;
	var tokens = input.split(" ");
	debugOutput(tokens, 'trace');
	var queryTokens = [];
	var badTokens = [];
	for (i in tokens) {
		var evaluatedToken = tokens[i];
		if (!evaluatedToken) continue;
		var token = evaluatedToken.toUpperCase();

		if (/^(OR|AND|LST|NOT)$/i.test(token)) {
			evaluatedToken = token;
		} else {
			var isNegation = hasNegation(token);
			if (isNegation) evaluatedToken = evaluatedToken.substring(1);

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
		badTokens = correction['unCorrectable'];
		queryString += " " + correction['corrected'].join(" ");
	}
	ga('send', 'event', 'Search', 'Bad Tokens', badTokens);
	return {'queryString': queryString, 'badTokens': badTokens};
}

function evalSearchTerm(token) {
	var result = "";
	for (var regex in terms) {
		if (terms.hasOwnProperty(regex)) {
			var rgexTest = new RegExp('^(' + regex + ')$', 'i');
			var rgex = new RegExp(regex, 'i');
			var cleanToken = removeParensAndBackTick(token);
			var isNegation = hasNegation(cleanToken);
			if (isNegation) cleanToken = cleanToken.substring(1);
			var foundMatch = rgexTest.test(cleanToken);
			if (foundMatch) {
				result = terms[regex].query;
				// apply any captured regex groups
				var arr = rgex.exec(cleanToken);
				// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
				result = result.replace(/\$(\d+)/g, function replacer(match, p1, offset, string) {
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
				if (isNegation)  result = '-' + result;
				if (hasOpenParen(token))  result = /\(+/.exec(token)[0] + result;
				if (hasCloseParen(token)) result = result + /\)+/.exec(token)[0];
				debugOutput(cleanToken + ' + ' + rgex + '=' + result, 'trace');
				break;
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
	for (var key in obj) break;
	// "key" is the first key here
	return key;
}

function modToDisplay(value, mod) {
	if (typeof value === 'number') {
		mod = mod.replace('#', value);
	} else if (typeof value === "object") {
		var valstr = value['min'] + '-' + value['max'] + ' (' + value['avg'] + ')';
		mod = mod.replace('#-#', valstr);
		value.has
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

function buildListOfOnlinePlayers(onlineplayersStash) {
	var players = [];
	$.each(onlineplayersStash, function (playerBucket) {
		var accountName = onlineplayersStash[playerBucket].key;
		if ($.inArray(players, accountName) == -1) {
			players.push(accountName);
		}
	});
	debugOutput('Number of online players in stash:  ' + players.length, 'trace');
	return players;
}

(function () {
	'use strict';

	var appModule = angular.module('application', [
		'elasticsearch',
		'ui.router',
		'ngAnimate',

		//foundation
		'foundation',
		'foundation.dynamicRouting',
		'foundation.dynamicRouting.animations',
		'ngclipboard',
		'duScroll',
		'angular-cache',
		'angularSpinner'
	]);

	appModule.config(config);
	appModule.run(run);

	config.$inject = ['$urlRouterProvider', '$locationProvider'];

	function config($urlProvider, $locationProvider) {
		$urlProvider.otherwise('/');

		$locationProvider.html5Mode({
			enabled: true,
			requireBase: false
		});

		$locationProvider.hashPrefix('!');
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
		var stashOnlinePlayerCache;

		// Check to make sure the cache doesn't already exist
	    if (!CacheFactory.get('ladderPlayerCache')) {
		  		ladderPlayerCache = CacheFactory('ladderPlayerCache', {
		  		maxAge: 3 * 60 * 1000,
  		  		deleteOnExpire: 'aggressive',
				storageMode: 'localStorage',
				storagePrefix: 'exiletrade-cache-v1',
				storeOnResolve: true//,
// 				onExpire: function (key, value) {
// 					var split = key.split('.');
// 					var league = split[0];
// 					var accountName = split[1];
// 					refreshLadderPlayerCache(league, [accountName]);
// 				}
		  	});
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
			debugOutput("Loading up online players from indexer", 'trace')
			var promise = es.search({
				index: 'index',
				body: buildPlayerStashOnlineElasticJSONRequestBody()
			});
			stashOnlinePlayerCache.put('stashOnlinePlayers', promise);
			return promise;
		}

		function refreshLadderPlayerCache(league, accountNames) {
			var accountNamesParam = accountNames.join(':')
			debugOutput("Loading up players from ladder: " + accountNamesParam, 'trace')
			var url = "http://api.exiletools.com/ladder?league=" + league + "&short=1&accountName=" + accountNamesParam;
			var promise = $http.get(url);
			promise.then(function (result) {
				if (typeof result.data === 'object') {
					// TODO: Figure out how to handle player with multiple toons in the ladder
					// right now we just remove any 'extra' toons that are offline
					var toons = {};
					$.each(result.data, function (key, value) {
						var key = league + '.' + value.accountName;
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
			addCustomFieldLadderData: function (_league, items) {
				var ladderLeaguesMap = {
					"Perandus SC": "perandus",
					"Perandus HC": "perandushc",
					"Standard": "standard",
					"Hardcore": "hardcore"
				};
				var league = ladderLeaguesMap[_league];

				function getPlayerDataFromCache(item) {
					var accountName = item.shop.sellerAccount;
					return ladderPlayerCache.get(league + '.' + accountName);
				}

				var cacheMisses = {};
				$.each(items, function (index, value) {
					var playerData = getPlayerDataFromCache(value);
					var foundInCache = typeof playerData !== 'undefined';
					if (foundInCache) {
						value.ladder = playerData;
						value.isOnline = playerData.online == "1";
					} else {
						cacheMisses[value.shop.sellerAccount] = null;
					}
				});

				var cacheMissesLength = Object.keys(cacheMisses).length;
				debugOutput('Ladder cacheMisses count: ' + cacheMissesLength, 'trace');

				if (cacheMissesLength > 0) {
					return refreshLadderPlayerCache(league, Object.keys(cacheMisses)).then(function () {
						$.each(cacheMisses, function (key, value) {
							$.each(items, function (index, item) {
								if (item.shop.sellerAccount == key) {
									var playerData = getPlayerDataFromCache(item);
									var foundInCache = typeof playerData !== 'undefined';
									if (foundInCache) {
										item.ladder = playerData;
										item.isOnline = playerData.online == "1";
									}
								}
							});
						});
					});
				} else {
					return $q.resolve([]);
				}
			},
			getStashOnlinePlayers: function () {
				var stashOnlinePlayers = stashOnlinePlayerCache.get('stashOnlinePlayers');
				var foundInCache = typeof stashOnlinePlayers !== 'undefined';
				debugOutput('stashOnlinePlayers found from cache: ' + foundInCache, 'trace')
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

	appModule.controller('SearchController', ['$q', '$scope', '$http', '$location', 'es', 'playerOnlineService', function ($q, $scope, $http, $location, es, playerOnlineService) {
		debugOutput('controller', 'info');
		$scope.searchInput = ""; // sample (gloves or chest) 60life 80eleres
		$scope.badSearchInputTerms = []; // will contain any unrecognized search term
		$scope.elasticJsonRequest = "";
		$scope.switchOnlinePlayersOnly = true;
		$scope.showSpinner = false;
		$scope.disableScroll = true;
		$scope.onlinePlayers = [];

		var httpParams = $location.search();
		debugOutput('httpParams:' + angular.toJson(httpParams, true), 'trace');
		var sortKeyDefault = 'shop.chaosEquiv';
		var sortOrderDefault = 'asc';
		var limitDefault = 50;
		if (httpParams['q']) $scope.searchInput = httpParams['q'];
		if (httpParams['sortKey'])   sortKeyDefault = httpParams['sortKey'];
		if (httpParams['sortOrder']) sortOrderDefault = httpParams['sortOrder'];
		if (httpParams['limit'])     limitDefault = httpParams['limit'];

		$scope.savedSearchesList = JSON.parse(localStorage.getItem("savedSearches"));
		$scope.savedItemsList = JSON.parse(localStorage.getItem("savedItems"));
		$scope.loadedOptions = JSON.parse(localStorage.getItem("savedOptions"));
		$scope.lastRequestedSavedItem = {};

		$scope.options = {
			"leagueSelect": {
				"type": "select",
				"name": "League",
				"value": 'Perandus SC',
				"options": ["Perandus SC", "Perandus HC", "Standard", "Hardcore"]
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
				"value": 'Status: New',
				"options": ["Status: New", "Status: All", "Status: Gone"]
			},
			"searchPrefixInputs": []
		};

		if ($scope.loadedOptions) checkDefaultOptions();

		function checkDefaultOptions() {

			if (typeof $scope.loadedOptions.leagueSelect !== 'undefined') {
				$scope.options.leagueSelect.value = $scope.loadedOptions.leagueSelect.value;
			}
			if (typeof $scope.loadedOptions.buyoutSelect !== 'undefined') {
				$scope.options.buyoutSelect.value = $scope.loadedOptions.buyoutSelect.value;
			}
			if (typeof $scope.loadedOptions.verificationSelect !== 'undefined') {
				$scope.options.verificationSelect.value = $scope.loadedOptions.verificationSelect.value;
			}
			if (typeof $scope.loadedOptions.searchPrefixInputs !== 'undefined' && $scope.loadedOptions.searchPrefixInputs !== null) {
				$scope.options.searchPrefixInputs = $scope.loadedOptions.searchPrefixInputs;
			}
		}

		function createSearchPrefix(options) {
			var searchPrefix = options['leagueSelect']['value'].replace(" ", "");
			var buyout = options['buyoutSelect']['value'];
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
			switch (options['verificationSelect']['value']) {
				case "Status: New":
					searchPrefix += " new";
					break;
				case "Status: All":
					searchPrefix += "";
					break;
				case "Status: Gone":
					searchPrefix += " gone";
					break;
			}
			options['searchPrefixInputs'].forEach(function (e) {
				var prefix = e['value'];
				if (prefix) {
					searchPrefix += " " + prefix;
				}
			});
			return searchPrefix;
		}

// 		$scope.termsMap = {};

// 		var mergeIntoTermsMap = function(res){
// 			var ymlData = jsyaml.load(res.data);
// 			jQuery.extend($scope.termsMap, ymlData);
// 		};

// 		$q.all([
// 			$http.get('assets/terms/itemtypes.yml'),
// 			$http.get('assets/terms/gems.yml'),
// 			$http.get('assets/terms/mod-ofs.yml'),
// 			$http.get('assets/terms/mod-def.yml'),
// 			$http.get('assets/terms/mod-vaal.yml'),
// 			$http.get('assets/terms/attributes.yml'),
// 			$http.get('assets/terms/sockets.yml'),
// 			$http.get('assets/terms/buyout.yml'),
// 			$http.get('assets/terms/uniques.yml'),
// 			$http.get('assets/terms/basetypes.yml'),
// 			$http.get('assets/terms/currencies.yml'),
// 			$http.get('assets/terms/leagues.yml'),
// 			$http.get('assets/terms/seller.yml'),
// 			$http.get('assets/terms/mod-jewels.yml'),
// 			$http.get('assets/terms/mod-groups.yml')
// 		]).then(function (results) {
// 			for (var i = 0; i < results.length; i++) {
// 				mergeIntoTermsMap(results[i]);
// 			}
// 			if (typeof httpParams['q'] !== 'undefined') $scope.doSearch();
// 		});


		/*
		 Runs the current searchInput with default sort
		 */
		$scope.doSearch = function () {
			debugOutput('doSearch called, $scope.searchInput = ' + $scope.searchInput, 'info');
			doActualSearch($scope.searchInput, limitDefault, sortKeyDefault, sortOrderDefault);
			ga('send', 'event', 'Search', 'User Input', $scope.searchInput);
		};

		$scope.stateChanged = function () {
			debugOutput('stateChanged', 'log');
		};

		$scope.toggleOnlinePlayersOnly = function () {
			$scope.switchOnlinePlayersOnly = !$scope.switchOnlinePlayersOnly;
		};

		/*
		 Runs the current searchInput with a custom sort
		 */
		$scope.doSearchWithSort = function (event) {
			var elem = event.currentTarget;
			var sortKey = elem.getAttribute('data-sort-key');
			var sortOrder = elem.getAttribute('data-sort-order');
			var limit = 50;
			if (httpParams['limit']) limit = httpParams['limit'];
			doActualSearch($scope.searchInput, limit, sortKey, sortOrder);
		};

		/*
		 Runs the actual search code. For online only, we do a search-and-collect-till-we-get-enough strategy.
		 See also:
		 - https://github.com/trackpete/exiletools-indexer/issues/123
		 - http://stackoverflow.com/questions/20607313/angularjs-promise-with-recursive-function
		 */
		function doActualSearch(searchInput, limit, sortKey, sortOrder) {
			debugOutput("$scope.switchOnlinePlayersOnly = " + $scope.switchOnlinePlayersOnly, 'info');
			$scope.Response = null;
			$scope.disableScroll = true;
			$scope.showSpinner = true;
			limit = Number(limit);
			if (limit > 999) limit = 999; // deny power overwhelming
			ga('send', 'event', 'Search', 'PreFix', createSearchPrefix($scope.options));
			var finalSearchInput = searchInput + ' ' + createSearchPrefix($scope.options);
			finalSearchInput = finalSearchInput.trim();
			$location.search({'q': searchInput, 'sortKey': sortKey, 'sortOrder': sortOrder, 'limit': limit});
			$location.replace();
			debugOutput('changed location to: ' + $location.absUrl(), 'trace');
			var parseResult = parseSearchInput($scope.termsMap, finalSearchInput);
			$scope.searchQuery = parseResult.queryString;
			$scope.badSearchInputTerms = parseResult.badTokens;
			debugOutput("searchQuery=" + $scope.searchQuery, 'log');

			if (parseResult.badTokens.length > 0) {
				$scope.showSpinner = false;
				return;
			}

			loadOnlinePlayersIntoScope().then(function () {
				$scope.from = 0;
				$scope.sortKey = sortKey;
				$scope.sortOrder = sortOrder;
				$scope.disableScroll = false;
				$scope.scrollNext();
			});
		}

		function loadOnlinePlayersIntoScope() {
			return playerOnlineService.getStashOnlinePlayers().then(function (results) {
				var onlineplayersStash = results.aggregations.filtered.sellers.buckets;
				$scope.onlinePlayers = buildListOfOnlinePlayers(onlineplayersStash);
			});
		}

		$scope.scrollNext = function () {
			debugOutput('scrollNext called, $scope.disableScroll = ' + $scope.disableScroll, 'trace')
			if ($scope.disableScroll) { return; }
			$scope.disableScroll = true;
			var actualSearchDuration = 0;
			var items = [];
			var limit = 6;
			var fetchSize = $scope.switchOnlinePlayersOnly ? 30 : limit;
			function fetch() {
				doElasticSearch($scope.searchQuery, $scope.from, fetchSize, $scope.sortKey, $scope.sortOrder)
					.then(function (response) {
						actualSearchDuration += response.took;

						var hitsItems = response.hits.hits.map(function(value) { return value._source; });
						playerOnlineService.addCustomFieldLadderData($scope.options.leagueSelect.value, hitsItems).then(function () {
							var accountNamesFilter = $scope.switchOnlinePlayersOnly ? $scope.onlinePlayers : [];
							response.hits.hits = response.hits.hits.filter(function (item) {
								var onlineInTheRiver = accountNamesFilter.indexOf(item._source.shop.sellerAccount) != -1;
								return item._source.isOnline || onlineInTheRiver || !$scope.switchOnlinePlayersOnly;
							});

							$.merge(items, response.hits.hits);
							$scope.from = $scope.from + fetchSize;
							if (accountNamesFilter.length != 0 && items.length < limit && response.hits.total > limit && $scope.from < (fetchSize * 10)) {
								return fetch();
							}

							response.took = actualSearchDuration;
							$.each(items, function (index, value) {
								addCustomFields(value._source);
							});
							
							if (!$scope.Response) {
								$scope.Response = response;
								$scope.Response.hits.hits = items;
							} else {
								// probably from scrolling, so we just append
								$.merge($scope.Response.hits.hits, items);
							}

							if (hitsItems.length < fetchSize) {
								// no more data to scroll
								$scope.disableScroll = true;
							} else {
								$scope.disableScroll = false;
							}

							$scope.showSpinner = false;
							debugOutput('scrollNext finished, $scope.disableScroll = ' + $scope.disableScroll, 'trace')
						});
					}, function (err) {
						debugOutput(err.message, 'trace');
						$scope.showSpinner = false;
					});
			}
			fetch();
		}

		function doElasticSearch(searchQuery, _from, _size, sortKey, sortOrder) {
			var esBody = {
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
			var esPayload = {
				index: 'index',
				sort: [sortKey + ':' + sortOrder],
				from: _from,
				size: _size,
				body: esBody
			};
			$scope.elasticJsonRequest = angular.toJson(esPayload, true);
			debugOutput("Gonna run elastic: " + $scope.elasticJsonRequest, 'trace');
			return es.search(esPayload)
		}

		/*
		 Add custom fields to the item object
		 */
		function addCustomFields(item) {
			if (item.mods) createForgottenMods(item);
			if (item.mods) createImplicitMods(item);
			if (item.mods) createCraftedMods(item);
			if (item.shop) {
				var added = new Date(item.shop.added);
				var updated = new Date(item.shop.updated);
				var modified = new Date(item.shop.modified);
				item.shop['addedHuman'] = added.toLocaleString();
				item.shop['udpatedHuman'] = updated.toLocaleString();
				item.shop['modifiedHuman'] = modified.toLocaleString();
				var now = new Date();
				var hourInMillis = 3600000;
				item.shop['addedHoursAgo'] = (Math.abs(now.getTime() - added.getTime()) / hourInMillis).toFixed(2);
				item.shop['modifiedHoursAgo'] = (Math.abs(now.getTime() - modified.getTime()) / hourInMillis).toFixed(2);
				item.shop['updatedHoursAgo'] = (Math.abs(now.getTime() - updated.getTime()) / hourInMillis).toFixed(2);
				if (!item.isOnline) {
					item.isOnline = $scope.onlinePlayers.indexOf(item.shop['sellerAccount']) != -1;
				}
			}
		}

		function createForgottenMods(item) {
			var itemTypeKey = firstKey(item.mods);
			var explicits = item.mods[itemTypeKey].explicit;
			var forgottenMods = $.map(explicits, function (propertyValue, modKey) {
				return {
					display: modToDisplay(propertyValue, modKey),
					key: 'mods.' + itemTypeKey + '.explicit.' + modKey,
					name: modKey,
					value: propertyValue,
					css: getModCssClasses(modKey)
				};
			});
			item['forgottenMods'] = forgottenMods;
			// we call on fm.js to do it's awesome work
			fm_process(item);
		}

		/*
		 Get CSS Classes for element resistances
		 */
		function getModCssClasses(mod) {
			var css = "";
			if (mod.indexOf("Resistance") > -1) {
				if (mod.indexOf("Cold") > -1) {
					css = "mod-cold-res"
				}
				else if (mod.indexOf("Fire") > -1) {
					css = "mod-fire-res"
				}
				else if (mod.indexOf("Lightning") > -1) {
					css = "mod-lightning-res"
				}
				else if (mod.indexOf("Chaos") > -1) {
					css = "mod-chaos-res"
				}
			}
			if (mod.indexOf("Damage") > -1) {
				if (mod.indexOf("Cold") > -1) {
					css = "mod-cold-dmg"
				}
				else if (mod.indexOf("Fire") > -1) {
					css = "mod-fire-dmg"
				}
				else if (mod.indexOf("Lightning") > -1) {
					css = "mod-lightning-dmg"
				}
				else if (mod.indexOf("Chaos") > -1) {
					css = "mod-chaos-dmg"
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

		function createImplicitMods(item) {
			var itemTypeKey = firstKey(item.mods);
			var implicits = item.mods[itemTypeKey].implicit;
			var implicitMods = $.map(implicits, function (propertyValue, modKey) {
				return {
					display: modToDisplay(propertyValue, modKey),
					key: 'mods.' + itemTypeKey + '.implicit.' + modKey
				};
			});
			item['implicitMods'] = implicitMods;
		}

		function createCraftedMods(item) {
			var itemTypeKey = firstKey(item.mods);
			var crafteds = item.mods[itemTypeKey].crafted;
			item['craftedMods'] = $.map(crafteds, function (propertyValue, modKey) {
				return {
					display: modToDisplay(propertyValue, modKey),
					key: 'mods.' + itemTypeKey + '.crafted.' + modKey
				};
			});
		}


		/*
		 Save the current/last search terms to HTML storage
		 */
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
		 Delete selected saved search terms from HTML storage
		 */
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
		 Save item to HTML storage
		 */
		$scope.saveItem = function (id, name, seller) {
			var savedItems = JSON.parse(localStorage.getItem("savedItems"));
			var description = name + ' (from: ' + seller + ')';
			var item = {itemId: id, itemDescription: description};

			if (savedItems === null) {
				savedItems = []
			}

			// return if item is already saved
			if (findObjectById(savedItems, id) !== undefined) {
				return;
			}

			savedItems.push(item);
			localStorage.setItem("savedItems", JSON.stringify(savedItems));
			$scope.savedItemsList = savedItems.reverse();
		};

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
			loadOnlinePlayersIntoScope().then(function() {
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

		$scope.resizeGridFrame = function (opened) {
			if ( opened === true ){
				jQuery('#mainGrid').animate({
					marginRight: "400px"
				}, 500, 'swing');
			} else {
				jQuery('#mainGrid').animate({
					marginRight: "0px"
				}, 380, 'swing');
			}
		};

		/*
		 Delete selected saved search terms from HTML storage
		 */
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
		 Add input Fields (search Prefixes)
		 */
		$scope.addInputField = function () {
			$scope.options.searchPrefixInputs.push({"value": ""});
		};

		/*
		 Save options to HTML storage
		 */
		$scope.saveOptions = function () {
			ga('send', 'event', 'Save', 'Options', createSearchPrefix($scope.options));
			localStorage.setItem("savedOptions", JSON.stringify($scope.options));
		};

		$scope.removeInputFromList = function (x) {
			var savedOptions = JSON.parse(localStorage.getItem("savedOptions"));
		};

		$scope.scrollToTop = function () {
			ga('send', 'event', 'Feature', 'Scroll To Top');
			angular.element(mainGrid).scrollTo(0, 0, 350);
		};

		/*
		 Find Object by id in Array
		 */
		function findObjectById(list, id) {
			return list.filter(function (obj) {
				// coerce both obj.id and id to numbers
				// for val & type comparison
				return obj.itemId === id;
			})[0];
		}

		/*
		 Trigger saved Search
		 */
		$scope.doSavedSearch = function (x) {
			$scope.searchInput = x;
			$scope.doSearch();
		};

		/*
		 Prepare Whisper Message
		 */
		$scope.copyWhisperToClipboard = function (item) {
			var message = item._source.shop.defaultMessage;
			var seller = item._source.shop.lastCharacterName;
			var itemName = item._source.info.fullName;
			var league = item._source.attributes.league;
			var stashTab = item._source.shop.stash.stashName;
			var x = item._source.shop.stash.xLocation;
			var y = item._source.shop.stash.yLocation;

			//removing the "Unknown" tag from currency
			var n = message.indexOf('Unknown (');
			if (n > -1 ) {
				message = message.replace('Unknown ', '');
			}

			if (message === undefined) {
				message = '@' + seller + " Hi, I'd like to buy your "
				+ itemName + ' in ' + league
				+ ' (Stash-Tab: "' + stashTab + '" [x' + x + ',y' + y + '])'
				+ ', my offer is : ';
			}
			return message;
		};

		/*
		 Add values to mod description
		 */
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
						if (prop == 'avg') continue;
						mod = mod.replace('#', obj[prop]);
					}
				}
				mods.push(mod);
			}
			return mods;
		};

		/*
			Get CSS Classes for item sockets
		*/
		$scope.getSocketClasses = function (x) {
			if (typeof x == "undefined") return [];
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
			Get CSS classes for item socket links
		*/
		$scope.getSocketLinkClasses = function (x) {
			if (typeof x == "undefined") return [];
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

		$scope.isEmpty = function (obj) {
			for (var i in obj) if (obj.hasOwnProperty(i)) return false;
			return true;
		};

		$scope.needsILvl = function (item) {
			var type = item.itemType;
			var blacklist = ['Map', 'Gem', 'Card', 'Currency'];

			return blacklist.indexOf(type) == -1;
		};
		debugOutput("Loaded " + Object.keys(terms).length + " terms.", "info");
		if (typeof httpParams['q'] !== 'undefined') $scope.doSearch();
	}]);


	// Custom filters
	appModule.filter("currencyToCssClass", [function() {
		return function (str) {
			var currencyCssClassMap = new Map([
				["Chaos Orb", "chaos-orb"],
				["Exalted Orb", "exalt-orb"]
			]);
			var result = currencyCssClassMap.get(str);
			if (!result) result = str;
			return result;
		};
	}]);

	appModule.filter("defaultToValue", [function() {
		return function(str) {
			var defaultValues = new Map([
				[undefined, "0"]
			]);
			var result = defaultValues.get(str);
			if (!result) result = str;
			return result;			
		};
	}]);

	appModule.filter('isEmpty', [function () {
		return function (object) {
			return angular.equals({}, object);
		}
	}]);

	appModule.filter('cleanCurrency', [function () {
		return function (str) {
			if (typeof str === 'undefined') {
				return
			}
			str =  str.replace(/[^\w\s]/gi, '').replace(/[0-9]/g, '').toLowerCase();

			var currencyMap = new Map([
				["unknown shekel", "coins"],
				["unknown pc", "coins"],
				["unknown p", "coins"],
				["unknown perandus", "coins"],
				["unknown perandus coin", "coins"],
				["unknown perandus coins", "coins"],
				["unknown peranduscoins", "coins"],
				["unknown per", "coins"],
				["unknown exa", "exalted"],
				["unknown fuse", "fusing"],
				["unknown alt", "alteration"],
				["unknown aug", "augmentation"],
				["unknown jewel", "jewellers"],
				["unknown cartographer", "chisel"],
				["unknown scour", "scouring"],
				["unknown gemcutter", "gcp"],
				["unknown transmute", "transmutation"],
				["unknown alch", "alchemy"]
			]);
			var result = currencyMap.get(str);
			if (!result) result = str;

			return result;
		}
	}]);

	// Custom Directive
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
			// console.log("Scrolling = " + (el.scrollHeight - el.scrollTop) + " to " + clientHeight + " with allowance " + allowance);
			if ((el.scrollHeight - el.scrollTop) <= (clientHeight + allowance)) { // fully scrolled
			  debugOutput("Scrolled to bottom", 'trace');
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
			// todo: shouldn't need to inherit entire scope
			scope: true
		};
	});
})();
