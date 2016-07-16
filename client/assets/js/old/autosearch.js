
		var automatedSearchIntervalFn = function () {
			if ($scope.savedAutomatedSearches && $scope.savedAutomatedSearches.length > 0) {
				util.out('Gonna run counts on automated searches: ' + $scope.savedAutomatedSearches.length, 'trace');
				var countPromises = $scope.savedAutomatedSearches.map(function (search) {
 					var queryString = buildQueryString(search.searchInput + " timestamp" + search.lastSearch);
					search.lastSearch = new Date().getTime();
					var fetchSize = 20;
					var from = 0;
					var promise = doElasticSearch(queryString, from, fetchSize, ["shop.updated"], ["desc"]).then(function (response) {
						$.each(response.hits.hits, function (index, value) {
							itemutil.addCustomFields(value._source);
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

		//automatedSearchIntervalFn();
		//$interval(automatedSearchIntervalFn, 10000); // 10 sec
