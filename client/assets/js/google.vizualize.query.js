var terms = {};
var sampleTerms = [];
// the output from google calls a function 'google.visualization.Query.setResponse()'
// and passes a json data that is not so human-readable.
window.google = {
	'visualization' : {
		'Query' : {
			'setResponse' : function (data) {
				var rows = data.table.rows;
				for(i in rows) {
					var row = rows[i].c;
					var quer = row[1].v;
					var filt = (row[2] !== null && row[2].v !== null) ? row[2].v : "";
					terms[row[0].v] = {
						'query' : quer,
						'filter' : filt
					};
					if (row[3] !== null && row[3].v !== null) {
						sampleTerms.push({sample: row[3].v, query: quer});
					}
					if (row[4] !== null && row[4].v !== null) {
						sampleTerms.push({ sample: row[4].v, query: quer });
					}
				}
			}
		}
	}
};