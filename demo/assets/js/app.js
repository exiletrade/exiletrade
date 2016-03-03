
var terms = {};
function parseSearchInput(_terms, input) {
	terms = _terms;

	// capture literal search terms (LST) like name="veil of the night"
	var regex = /([^\s]*=\".*?\")/g;
	var lsts = input.match(regex);
	lsts = expandLsts(lsts);
	var _input = input.replace(regex, 'LST');
	var queryStr = parseSearchInputTokens(_input);
	var i = 0;
	var _queryStr = queryStr.replace('LST', function (match) {
		var lst = lsts[i];
		i++;
		return lst;
	});
	return _queryStr;
	return parseSearchInputTokens(input);
}

function expandLsts(lsts) {
	return lsts;
}

function parseSearchInputTokens(input) {
	var tokens = input.split(" ");
	var queryTokens = [];
	for (i in tokens) {
		var token = tokens[i].toUpperCase();
		var evaluatedToken = token;
		if ( token != "OR" && token != "AND" && token !="LST" && token !="NOT" ) {
			evaluatedToken = evalSearchTerm(token);
			if (evaluatedToken && hasBackTick(evaluatedToken)) {
				evaluatedToken = parseSearchInputTokens(evaluatedToken);
			}
		}
		queryTokens.push(evaluatedToken);
	}
	var queryString = queryTokens.join(" ");
	return queryString;
}

function evalSearchTerm(token) {
	var result = "";
	for (regex in terms) {
		if (terms.hasOwnProperty(regex)) {
			var rgex = new RegExp('^' + regex + '$', 'i');
			var cleanToken = removeParensAndBackTick(token);
			var foundMatch = rgex.test(cleanToken);
			if (foundMatch) {
				result = terms[regex].query;
				// apply any captured regex groups
				result = cleanToken.replace(rgex, result);
				// escape spaces for elasticsearch
				result = escapeField(result);
				if (hasOpenParen(token))  result = '(' + result;
				if (hasCloseParen(token)) result = result + ')';
				break;
			}
		}
	}
	return result;
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

function escapeField(result) {
	var res = result;
	var delimIdx = result.indexOf(':');
	if (delimIdx != -1) {
		var field = res.substr(0, delimIdx);
		res = res.replace(field, field.replace(/\s/g, '\\ '));
	}
	return res;
}

function firstKey(obj) {
	for(var key in obj) break;
 	// "key" is the first key here
 	return key;
}

function modToDisplay(value, mod) {
	if( typeof value === 'number' ) {
		mod = mod.replace('#', value);
	} else if ( typeof value === "object" ) {
		var valstr = value['min'] + '-' + value['max'] + ' (' + value['avg'] + ')';
		mod = mod.replace('#-#', valstr);
		value.has
	} else if ( typeof value === "boolean" ) {
		mod = mod;
	} else {
		console.error("Mod value is neither a number or an object, maybe ExileTools has a recent change? mod = " +
			mod + ", value = " + value);
	}
	return mod;
}

function buildElasticJSONRequestBody(searchQuery, _size, sortKey, sortOrder) {
	var sortObj = {}
	sortObj[sortKey] = { "order": sortOrder };
	var esBody = {
					"sort": [ sortObj ],
					"query": {
						"query_string": { // TODO Is this it faster if we used filter-query instead of query?
							"default_operator": "AND",
							"query": searchQuery
						}
					},
					size:_size
				};
	if(!searchQuery) delete esBody['query'];
	return esBody;
}

(function() {
	'use strict';

	var appModule = angular.module('application', [
		'elasticsearch',
		'ui.router',
		'ngAnimate',

		//foundation
		'foundation',
		'foundation.dynamicRouting',
		'foundation.dynamicRouting.animations',
		'ngclipboard'
	]);

	appModule.config(config);
	appModule.run(run);

	config.$inject = ['$urlRouterProvider', '$locationProvider'];

	function config($urlProvider, $locationProvider) {
		$urlProvider.otherwise('/');

		$locationProvider.html5Mode({
			enabled:false,
			requireBase: false
		});

		$locationProvider.hashPrefix('!');
	}

	function run() {
		FastClick.attach(document.body);
	}

	// Create the es service from the esFactory
	appModule.service('es', function (esFactory) {
		return esFactory({ host: 'http://apikey:07e669ae1b2a4f517d68068a8e24cfe4@api.exiletools.com' }); // poeblackmarketweb@gmail.com
	});

	appModule.controller('SearchController', ['$scope', '$http', 'es', function($scope, $http, es) {
		// Default
		$scope.searchInput = "gloves";
		$scope.queryString = "";
		$scope.savedSearchesList = JSON.parse(localStorage.getItem("savedSearches"));
		$scope.savedItemsList = JSON.parse(localStorage.getItem("savedItems"));

		$scope.termsMap = {};

		var mergeIntoTermsMap = function(res){
			var ymlData = jsyaml.load(res.data);
			jQuery.extend($scope.termsMap, ymlData);
		};

		$http.get('assets/terms/itemtypes.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/gems.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/mod-ofs.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/mod-def.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/mod-vaal.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/attributes.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/sockets.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/buyout.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/uniques.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/basetypes.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/currencies.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/leagues.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/seller.yml').then(mergeIntoTermsMap);
		$http.get('assets/terms/mod-jewels.yml').then(mergeIntoTermsMap);

		/*
			Runs the current searchInput with default sort
		*/		
		$scope.doSearch = function() {
			doActualSearch(150, 'shop.updated', 'desc');
		};

		$scope.stateChanged = function() {
			console.log('h');
		};

		/*
			Runs the current searchInput with a custom sort
		*/
		$scope.doSearchWithSort = function(sortKey){
			doActualSearch(150, sortKey, 'desc');
		};

		function doActualSearch(size, sortKey, sortOrder) {
			$scope.Response = null;
			var searchQuery = parseSearchInput($scope.termsMap, $scope.searchInput);
			console.log("searchQuery=" + searchQuery);
			$scope.queryString = searchQuery;

			var esBody = buildElasticJSONRequestBody(searchQuery, size, sortKey, sortOrder);
			console.info("Final search json: " +  JSON.stringify(esBody));
			
			es.search({
				index: 'index',
				body: esBody
			}).then(function (response) {
				$.each(response.hits.hits, function( index, value ) {
					addCustomFields(value._source);
					addCustomFields(value._source.properties);
				});
				$scope.Response = response;
			}, function (err) {
				console.trace(err.message);
			});
		}

		/*
			Add custom fields to the item object
		*/
		function addCustomFields(item) {
			if (item.mods) item['forgottenMods'] = createForgottenMods(item);
		}

		function createForgottenMods(item) {
			var itemTypeKey = firstKey(item.mods);
			var explicits = item.mods[itemTypeKey].explicit;
			var forgottenMods = $.map( explicits, function( propertyValue, modKey ) {
				return {
					display : modToDisplay(propertyValue, modKey),
					key : 'mods.' + itemTypeKey + '.explicit.' + modKey
				};
			});
			return forgottenMods;
		}


		/*
			Save the current/last search terms to HTML storage
		*/
		$scope.saveLastSearch = function(){
			var search = $scope.searchInput;
			var savedSearches = [];

			if (localStorage.getItem("savedSearches") !== null){
				savedSearches = JSON.parse(localStorage.getItem("savedSearches"));
			}

			// return if search is already saved
			if(savedSearches.indexOf(search) != -1){
				return;
			}
			savedSearches.push(search);
			localStorage.setItem("savedSearches", JSON.stringify(savedSearches));
			$scope.savedSearchesList = savedSearches.reverse();
		};

		/*
			Delete selected saved search terms from HTML storage
		*/
		$scope.removeSearchFromList = function(x){
			var savedSearches = JSON.parse(localStorage.getItem("savedSearches"));
			var pos = savedSearches.indexOf(x);

			if(pos != -1){
				savedSearches.splice(pos, 1);
				localStorage.setItem("savedSearches", JSON.stringify(savedSearches));
				$scope.savedSearchesList = savedSearches.reverse();
			}
		};

		/*
		 Save item to HTML storage
		*/
		$scope.saveItem = function(id, name, seller){
			var savedItems = JSON.parse(localStorage.getItem("savedItems"));
			var description = name +' (from: '+seller+')';
			var item = { itemId : id, itemDescription : description };

			if (savedItems === null){
				savedItems = []
			}

			// return if item is already saved
			if(findObjectById(savedItems, id) !== undefined){
				return;
			}

			savedItems.push(item);
			localStorage.setItem("savedItems", JSON.stringify(savedItems));
			$scope.savedItemsList = savedItems.reverse();
		};

		/*
			Check if Array contains a specific Object
		*/
		function containsObject(obj, list) {
			var i;
			for (i = 0; i < list.length; i++) {
				if (list[i] === obj) {
					return true;
				}
			}

			return false;
		}

		/*
		 Delete selected saved search terms from HTML storage
		*/
		$scope.removeItemFromList = function(id){
			var savedItems = JSON.parse(localStorage.getItem("savedItems"));

			savedItems = savedItems.filter(function (el) {
					return el.itemId !== id;
				}
			);

			localStorage.setItem("savedItems", JSON.stringify(savedItems));
			$scope.savedItemsList = savedItems.reverse();
		};

		/*
			Find Object by id in Array
		*/
		function findObjectById(list, id) {
			return list.filter(function( obj ) {
				// coerce both obj.id and id to numbers
				// for val & type comparison
				return +obj.id === +id;
			})[ 0 ];
		}

		/*
			Trigger saved Search
		*/
		$scope.doSavedSearch = function(x){
			$scope.searchInput = x;
			$scope.doSearch();
		};


		/*
			Prepare Whisper Message
		*/
        $scope.copyWhisperToClipboard = function(item) {
			var message = item._source.shop.defaultMessage;
			var seller = item._source.shop.lastCharacterName;
			var itemName = item._source.info.fullName;
			var league = item._source.attributes.league;
			var stashTab = item._source.shop.stash.stashName;
			var x = item._source.shop.stash.xLocation;
			var y = item._source.shop.stash.yLocation;

			if (message === undefined) {
				message = '@' + seller + " Hi, I'd like to buy your "
					+ itemName + ' in ' + league
					+ ' (Stash-Tab: "'+ stashTab + '" [x' + x + ',y' + y + '])'
					+ ', my offer is : ';
			}
			return message;
        };

		/*
			Add values to mod description
		*/
		$scope.getItemMods = function(x) {
			var mods = [];

			for (var key in x) {
				var mod = key;

				if( typeof x[key] === 'number' ) {
					mod = mod.replace('#',x[key]);
				}
				else {
					var obj = x[key];
					for (var prop in obj) {
						if(prop == 'avg') continue;
						mod = mod.replace('#',obj[prop]);
					}
				}
				mods.push(mod);
			}
			return mods;
		};

		/*
			Get CSS Classes for item sockets
		*/
		$scope.getSocketClasses = function(x) {
			if(typeof x == "undefined") return [];
			var sockets = [];
			var colors = x.split('-').join('').split('');				
			for (var i = 0; i < colors.length; i++){
				var cssClasses;
				switch (i) {
					case 0 : cssClasses = 'socketLeft'; break;
					case 1 : cssClasses = 'socketRight'; break;
					case 2 : cssClasses = 'socketRight middle'; break;
					case 3 : cssClasses = 'socketLeft middle'; break;
					case 4 : cssClasses = 'socketLeft bottom'; break;
					case 5 : cssClasses = 'socketRight bottom'; break;
				}
				switch (colors[i]) {
					case 'W' : cssClasses += ' socketWhite'; break;
					case 'R' : cssClasses += ' socketRed'; break;
					case 'G' : cssClasses += ' socketGreen'; break;
					case 'B' : cssClasses += ' socketBlue'; break;
				}
				sockets[i] = cssClasses;
			}
			return sockets;
		};

		/*
		 	Get CSS classes for item socket links
		*/
		$scope.getSocketLinkClasses = function(x) {
			if(typeof x == "undefined") return []; 
			var groups = x.split('-');
			var pointer = 0;
			var pos = [];

			for (var i = 0; i < groups.length; i++) {
				var count = groups[i].length - 1;

				try {
					pointer += groups[i - 1].length;
				} catch (err){}

				if(count > 0) {
					for (var j = 0; j < count; j++) {
						var cssClasses;
						switch (pointer+j) {
							case 0 : cssClasses = 'socketLinkCenter'; break;
							case 1 : cssClasses = 'socketLinkRight'; break;
							case 2 : cssClasses = 'socketLinkCenter middle'; break;
							case 3 : cssClasses = 'socketLinkLeft middle'; break;
							case 4 : cssClasses = 'socketLinkCenter bottom'; break;
						}
						pos.push(cssClasses);
					}
				}
			}
			return pos;
		}

		$scope.isEmpty = function (obj) {
			for (var i in obj) if (obj.hasOwnProperty(i)) return false;
			return true;
		};

		$scope.needsILvl = function (item) {
			var type = item.itemType;
			var blacklist = ['Map','Gem','Card','Currency'];

			return blacklist.indexOf(type) == -1;
		};
	}]);


	// Custom filters
	appModule.filter("currencyToCssClass", () => str => {
		var currencyCssClassMap = new Map([
			["Chaos Orb", "chaos-orb"],
			["Exalted Orb", "exalt-orb"]
		]);
		var result = currencyCssClassMap.get(str);
		if(!result) result = str;
		return result;
	});

	appModule.filter("defaultToValue", () => str => {
		var defaultValues = new Map([
			[undefined, "0"]
		]);
		var result = defaultValues.get(str);
		if(!result) result = str;
		return result;
	});

	appModule.filter('isEmpty', [function() {
		return function(object) {
			return angular.equals({}, object);
		}
	}]);

	// Custom Directive
	appModule.directive('myEnter', function () {
		return function (scope, element, attrs) {
			element.bind("keydown keypress", function (event) {
				if(event.which === 13) {
					scope.$apply(function (){
						scope.$eval(attrs.myEnter);
					});

					event.preventDefault();
				}
			});
		};
	});
})();
