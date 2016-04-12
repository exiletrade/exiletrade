// FOUNDATION FOR APPS TEMPLATE GULPFILE
// -------------------------------------
// This file processes all of the assets in the "client" folder, combines them with the Foundation for Apps assets, and outputs the finished files in the "build" folder as a finished app.

// 1. LIBRARIES
// - - - - - - - - - - - - - - -

var $ = require('gulp-load-plugins')();
var argv = require('yargs').argv;
var gulp = require('gulp');
var rimraf = require('rimraf');
var gulpRimraf = require('gulp-rimraf');
var router = require('front-router');
var sequence = require('run-sequence');
var ignore = require('gulp-ignore');
var download = require('download-file');
var replace = require('gulp-replace-task');
var concatenate = require('gulp-concat');
var notify = require('gulp-notify');
var jscs = require('gulp-jscs');
var jshint = require('gulp-jshint');
var git = require('vinyl-git');
var filter = require('gulp-filter');
var args = require('yargs').boolean('p').alias('p', 'partial').argv;

// Check for --production flag
var isProduction = !!(argv.production);
// Check for --demo flag
var isDemo = !!(argv.demo);

var destination = (isDemo ? './demo' : './build' );
var destinationDemo = '../exiletrade.github.io';
var routerPath = (isDemo ? 'demo' : 'build' );


// 2. FILE PATHS
// - - - - - - - - - - - - - - -

var paths = {
	assets: [
		'./client/**/*.*',
		'!./client/templates/**/*.*',
		'!./client/assets/{scss,js}/**/*.*'
	],
	// Sass will check these folders for files when you use @import.
	sass: [
		'client/assets/scss',
		'bower_components/foundation-apps/scss'
	],
	// These files include Foundation for Apps and its dependencies
	foundationJS: [
		'bower_components/fastclick/lib/fastclick.js',
		'bower_components/viewport-units-buggyfill/viewport-units-buggyfill.js',
		'bower_components/tether/tether.min.js',
		'bower_components/hammerjs/hammer.js',
		//'node_modules/clipboard/clipboard.js',
		'bower_components/angular/angular.min.js',
		'bower_components/angular-animate/angular-animate.min.js',
		'bower_components/angular-ui-router/release/angular-ui-router.min.js',
		'bower_components/angular-scroll/angular-scroll.min.js',
		'bower_components/favico.js/favico.js',
		'bower_components/foundation-apps/js/vendor/**/*.js',
		'bower_components/foundation-apps/js/angular/**/*.js',
		'!bower_components/foundation-apps/js/angular/app.js',
		'bower_components/jquery/dist/jquery.min.js',
		//'bower_components/elasticsearch/elasticsearch.angular.js',
		'node_modules/js-yaml/dist/js-yaml.min.js',
		'node_modules/ngclipboard/dist/ngclipboard.js',
		'node_modules/angular-cache/dist/angular-cache.min.js',
		'node_modules/angular-spinner/node_modules/spin.js/spin.js',
		'node_modules/angular-spinner/angular-spinner.js',
		'bower_components/angular-mass-autocomplete/massautocomplete.js'
	],
	// These files are for your app's JavaScript
	appJS: [
		'client/assets/js/affixes.js',
		'client/assets/js/fm.js',
		(isDemo || isProduction) ? '' : 'client/assets/js/debug.js',
		'client/assets/js/app.js'
	],
	spreadsheet_urls : [
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=675822745",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=40738669",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=244311060",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=1965399973",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=1443807460",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=57824604",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=224979895",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=14190859",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=154866940",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=583395837",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=380600191",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=1782931570",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=223573764",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=207179951",
		"https://docs.google.com/spreadsheets/d/1jG2gzYuAukoJtYonlWghbkk9m5W6yGzM21cscpqJ5TU/gviz/tq?tq=SELECT+A,+B,+C,+D,+E&headers=1&gid=1732537543"
	]
};

// 3. TASKS
// - - - - - - - - - - - - - - -

// Cleans the build directory
gulp.task('clean', function (cb) {
	if (!isDemo) {
		rimraf(destination, cb);
	}
	else {
		return gulp.src('../exiletrade.github.io/**/*', {read: false})
			.pipe(ignore('.git/**'))
			.pipe(ignore('.gitignore'))
			.pipe(gulpRimraf({force: true}));

		cb();
	}
});

// Copies everything in the client folder except templates, Sass, and JS
gulp.task('copy', function () {
	return gulp.src(paths.assets, {
		base: './client/'
	})
		.pipe(gulp.dest(destination));
});

// Copy index
gulp.task('copy:index', function (cb) {
	if (isDemo) {
		gulp.src('./client/index.html')
			.pipe(replace({
				  patterns: [
					{
					  match: /https:\/\/docs\.google\.com\/spreadsheets\/.*gid=(\d+)/ig,
					  replacement: './data/speadsheet_gid$1.js'
					}
				  ]
				}))
			.pipe(gulp.dest(destination))
		;
	}
	cb();
});

// Copies your app's page templates and generates URLs for them
gulp.task('copy:templates', function () {
	return gulp.src('./client/templates/**/*.html')
		.pipe(router({
			path: routerPath + '/assets/js/routes.js',
			root: 'client'
		}))
		.pipe(gulp.dest(destination + '/templates'))
		;
});

// Compiles the Foundation for Apps directive partials into a single JavaScript file
gulp.task('copy:foundation', function (cb) {
	gulp.src('bower_components/foundation-apps/js/angular/components/**/*.html')
		.pipe($.ngHtml2js({
			prefix: 'components/',
			moduleName: 'foundation',
			declareModule: false
		}))
		.pipe($.uglify())
		.pipe($.concat('templates.js'))
		.pipe(gulp.dest(destination + '/assets/js'))
	;

	// Iconic SVG icons
	gulp.src('./bower_components/foundation-apps/iconic/**/*')
		.pipe(gulp.dest(destination + '/assets/img/iconic/'))
	;

	cb();
});

// Copy images
gulp.task('copy:images', function (cb) {
	// Asset icons
	gulp.src('./client/assets/img/**/*.+(jpg|jpeg|gif|png|svg)')
		.pipe(gulp.dest(destination + '/assets/img/'))
	;

	cb();
});

// Copy sounds
gulp.task('copy:sound', function (cb) {
	gulp.src('./client/assets/sound/**/*.+(mp3|wmv)')
		.pipe(gulp.dest(destination + '/assets/sound/'))
	;

	cb();
});

// Copy downloads
gulp.task('copy:downloads', function (cb) {
	gulp.src('./client/download/**/*')
		.pipe(gulp.dest(destination + '/download/'))
	;

	cb();
});

// Copy Demo Build to production repo
gulp.task('copy:build', function (cb) {
	if (isDemo) {
		gulp.src([
			'./demo/**/*',
			'LICENSE',
			'README.md',
			'!./demo/**/*.psd',
			'!./demo/**/{logo_assets,logo_assets/*.*}'
		])
		.pipe(gulp.dest(destinationDemo));
	}

	cb();
});

// Compiles Sass
gulp.task('sass', function () {
	var minifyCss = $.if(isDemo, $.minifyCss());

	return gulp.src('client/assets/scss/app.scss')
		.pipe($.sass({
			includePaths: paths.sass,
			outputStyle: (isProduction ? 'compressed' : 'nested'),
			errLogToConsole: true
		}))
		.pipe($.autoprefixer({
			browsers: ['last 2 versions', 'ie 10']
		}))
		.pipe(minifyCss)
		.pipe(gulp.dest(destination + '/assets/css/'));
});

// Compiles and copies the Foundation for Apps JavaScript, as well as your app's custom JS
gulp.task('uglify', ['uglify:foundation', 'uglify:app']);

gulp.task('uglify:foundation', function (cb) {
	var uglify = $.if(isDemo || isProduction, $.uglify()
		.on('error', function (e) {
			console.log(e);
		}));

	return gulp.src(paths.foundationJS)
		.pipe(uglify)
		.pipe($.concat('foundation.js'))
		.pipe(gulp.dest(destination + '/assets/js/'));
});

gulp.task('uglify:app', function () {
	var uglify = $.if(isDemo || isProduction, $.uglify()
		.on('error', function (e) {
			console.log(e);
		}));

	if (isProduction || isDemo) {
		console.log('Removing all console debug output for production build.');
	}
	return gulp.src(paths.appJS)
		.pipe(uglify)
		.pipe($.concat('app.js'))
		.pipe(gulp.dest(destination + '/assets/js/'));
});

// JSCS
gulp.task('jscs', function() {
	gulp.src('./client/assets/js/**/*.js')
		.pipe(jscs())
		.pipe(notify({
			title: 'JSCS',
			message: 'JSCS Passed. Let it fly!'
		}));
});

// js-hint
gulp.task('lint', function(cb) {
	var sources = function(src) {
		var t = !args.partial ? gulp.src(src) : git.staged().pipe(filter(src));
		return t;
	};

	sources('./client/assets/js/**/*.js')
		.pipe(jscs())
		.pipe(jshint())
		.pipe(jshint.reporter('jshint-stylish'))
		//.pipe(jshint.reporter('fail'))  //uncomment to fail on warning/error
		.pipe(notify({
			title: 'JSHint <%= file.relative %>',
			message: 'jscs/JSHint Passed. Let it fly!'
		}));

	cb();
});

// Downloads spreadsheets and concats them
gulp.task('download', function (cb){
	var dataPath = './client/data';
	rimraf(dataPath, cb);

	var j = 0;
	for (var i = 0; i < paths.spreadsheet_urls.length; i++) {
		var gidIdx = paths.spreadsheet_urls[i].indexOf("gid=");
		var urlLen = paths.spreadsheet_urls[i].length;
		var gid = paths.spreadsheet_urls[i].substring(gidIdx + 4, urlLen);

		var options = {
			directory: dataPath,
			filename: "speadsheet_" + gid + ".js"
		};

		download(paths.spreadsheet_urls[i], options, function(err){
			if (err) throw err;
			j++;

			if (j == paths.spreadsheet_urls.length-1){
				console.log('Cleaned Data directory.');
				console.log('Waiting for downloads to be finished...');

				setTimeout(function(){
					console.log('Downloaded Spreadsheets.');

					return gulp.src(['./client/assets/js/google.vizualize.query.js', dataPath+'/*.*'])
						.pipe(concatenate('data.js'), {newLine: ';'})
						.pipe(gulp.dest( destination + '/assets/data/'))
						.pipe(gulp.dest( './client/assets/data/'));
				}, 2000);
			}
		})
	}
});

// Starts a test server, which you can view at http://localhost:8079
gulp.task('server', ['build'], function () {
	gulp.src('./build')
		.pipe($.webserver({
			port: 8079,
			host: 'localhost',
			fallback: 'index.html',
			livereload: true,
			open: true
		}))
	;
});

// Builds your entire app once, without starting a server
gulp.task('build', function (cb) {
	sequence('clean', 'download', ['copy', 'copy:foundation', 'sass', 'uglify'], 'copy:index', 'copy:templates', 'copy:images', 'copy:sound', 'copy:build',  'lint', cb);
});

// Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', ['server'], function () {
	// Watch Sass
	gulp.watch(['./client/assets/scss/**/*', './scss/**/*'], ['sass']);

	// Watch JavaScript
	gulp.watch(['./client/assets/js/**/*', './js/**/*'], ['lint', 'uglify:app']);

	// Watch static files
	gulp.watch(['./client/**/*.*', '!./client/templates/**/*.*', '!./client/assets/{scss,js}/**/*.*'], ['copy']);

	// Watch Images
	gulp.watch(['./client/assets/img/**/*', './img/**/*.+(jpg|jpeg|gif|png|svg)'], ['copy:images']);

	// Watch sound files
	gulp.watch(['./client/assets/sound/**/*', './sound/**/*.+(mp3|wmv)'], ['copy:sound']);

	// Watch app templates
	gulp.watch(['./client/templates/**/*.html'], ['copy:templates']);

	// Watch download folder
	gulp.watch(['./client/download/**/*', './download/**/*'], ['copy:downloads']);
});
