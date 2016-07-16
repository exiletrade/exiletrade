function indexerLeagueToLadder(league) {
  var ladderLeaguesMap = {
    "Prophecy SC": "prophecy",
    "Prophecy HC": "prophecyhc",
    "Standard": "standard",
    "Hardcore": "hardcore"
  };
  return ladderLeaguesMap[league];
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
