// FOUNDATION FOR APPS TEMPLATE GULPFILE
// -------------------------------------
// This file processes all of the assets in the "client" folder, combines them with the Foundation for Apps assets, and outputs the finished files in the "build" folder as a finished app.

// 1. LIBRARIES
// - - - - - - - - - - - - - - -

var $ = require('gulp-load-plugins')();
var argv = require('yargs').argv;
var gulp = require('gulp');
var rimraf = require('rimraf');
var router = require('front-router');
var sequence = require('run-sequence');

// Check for --production flag
var isProduction = !!(argv.production);
// Check for --demo flag
var isDemo = !!(argv.demo);

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
		'bower_components/angular/angular.min.js',
		'bower_components/angular-animate/angular-animate.min.js',
		'bower_components/angular-ui-router/release/angular-ui-router.min.js',
		'bower_components/angular-scroll/angular-scroll.min.js',
		'bower_components/foundation-apps/js/vendor/**/*.js',
		'bower_components/foundation-apps/js/angular/**/*.js',
		'!bower_components/foundation-apps/js/angular/app.js',
		'bower_components/jquery/dist/jquery.min.js',
		//'bower_components/elasticsearch/elasticsearch.angular.js',
		'node_modules/js-yaml/dist/js-yaml.min.js',
        'node_modules/ngclipboard/dist/ngclipboard.js',
	],
	// These files are for your app's JavaScript
	appJS: [
		'client/assets/js/app.js'
		// 'client/assets/js/blackmarket.js' merged into app.js, as this messes up my workflow with chrome dev tools
	]
}

// 3. TASKS
// - - - - - - - - - - - - - - -

// Cleans the build directory
gulp.task('clean', function (cb) {
	var destination = (isDemo ? './demo' : './build' );
	rimraf(destination, cb);
});

// Copies everything in the client folder except templates, Sass, and JS
gulp.task('copy', function () {
	var destination = (isDemo ? './demo' : './build' );
	return gulp.src(paths.assets, {
		base: './client/'
	})
		.pipe(gulp.dest(destination))
		;
});

// Copies your app's page templates and generates URLs for them
gulp.task('copy:templates', function () {
	var destination = (isDemo ? './demo' : './build' );
	var routerPath = (isDemo ? 'demo' : 'build' );
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
	var destination = (isDemo ? './demo' : './build' );

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
	var destination = (isDemo ? './demo' : './build' );

	// Asset icons
	gulp.src('./client/assets/img/**/*.+(jpg|jpeg|gif|png|svg)')
		.pipe(gulp.dest(destination + '/assets/img/'))
	;

	cb();
});

// Copy Demo Build to production repo
gulp.task('copy:build', function (cb) {
	return;
	if (!isDemo) return;
	var destinationDemo = '../exiletrade/';
	gulp.src('./demo/**/*')
		.pipe(gulp.dest(destinationDemo))
	;

	cb();
});

// Compiles Sass
gulp.task('sass', function () {
	var minifyCss = $.if(isProduction, $.minifyCss());
	var destination = (isDemo ? './demo' : './build' );

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
		.pipe(gulp.dest(destination + '/assets/css/'))
		;
});

// Compiles and copies the Foundation for Apps JavaScript, as well as your app's custom JS
gulp.task('uglify', ['uglify:foundation', 'uglify:app'])

gulp.task('uglify:foundation', function (cb) {
	var destination = (isDemo ? './demo' : './build' );
	var uglify = $.if(isProduction, $.uglify()
		.on('error', function (e) {
			console.log(e);
		}));

	return gulp.src(paths.foundationJS)
		.pipe(uglify)
		.pipe($.concat('foundation.js'))
		.pipe(gulp.dest(destination + '/assets/js/'))
		;
});

gulp.task('uglify:app', function () {
	var destination = (isDemo ? './demo' : './build' );
	var uglify = $.if(isProduction, $.uglify()
		.on('error', function (e) {
			console.log(e);
		}));

	return gulp.src(paths.appJS)
		.pipe(uglify)
		.pipe($.concat('app.js'))
		.pipe(gulp.dest(destination + '/assets/js/'))
		;
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
	sequence('clean', ['copy', 'copy:foundation', 'sass', 'uglify'], 'copy:templates', 'copy:images', cb);
});

// Default task: builds your app, starts a server, and recompiles assets when they change
gulp.task('default', ['server'], function () {
	// Watch Sass
	gulp.watch(['./client/assets/scss/**/*', './scss/**/*'], ['sass']);

	// Watch JavaScript
	gulp.watch(['./client/assets/js/**/*', './js/**/*'], ['uglify:app']);

	// Watch static files
	gulp.watch(['./client/**/*.*', '!./client/templates/**/*.*', '!./client/assets/{scss,js}/**/*.*'], ['copy']);

	// Watch Images
	gulp.watch(['./client/assets/img/**/*', './img/**/*.+(jpg|jpeg|gif|png|svg)'], ['copy:images']);

	// Watch app templates
	gulp.watch(['./client/templates/**/*.html'], ['copy:templates']);
});
