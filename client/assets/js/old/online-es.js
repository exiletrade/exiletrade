// old code used to determine player online status

var ladderPlayerCache;
var ladderAllPlayerCache;
var stashOnlinePlayerCache;

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

function refreshStashOnlinePlayerCache() {
  debugOutput("Loading up online players from the river", 'trace');
  var promise = es.search({
    index: 'index',
    body: buildPlayerStashOnlineElasticJSONRequestBody()
  });
  stashOnlinePlayerCache.put('stashOnlinePlayers', promise);
  return promise;
}

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
}

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
