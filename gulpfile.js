"use strict";

// instructions from https://github.com/gulpjs/gulp/blob/master/docs/recipes/browserify-uglify-sourcemap.md

var browserify = require('browserify'),
    gulp = require('gulp'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer'),
    jshint = require('gulp-jshint'),
    sourcemaps = require('gulp-sourcemaps'),
    gutil = require('gulp-util'),
    uglify = require('gulp-uglify'),
    del = require('del');

var paths = {
    scripts: ['./js/*.js', '!./node_modules/**', '!./assets/**'],
    images: './img/*'
};

gulp.task('default', ['watch', 'build']);

gulp.task('clean', function() {
    // You can use multiple globbing patterns as you would with `gulp.src`
    return del(['build']);
});

gulp.task('lint', function () {
    gulp.src(paths.scripts)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));
});

// Rerun the task when a file changes
gulp.task('watch', function() {
    gulp.watch(paths.scripts, ['build']);
});

gulp.task('build', ['clean'], function() {
    // set up the browserify instance on a task basis
    var b = browserify({
        entries: './js/main.js',
        debug: true
    });

    return b.bundle()
        .pipe(source('app.js'))
        .pipe(buffer())
        .pipe(sourcemaps.init({loadMaps: true}))
        // Add transformation tasks to the pipeline here.
        .pipe(uglify())
        .on('error', gutil.log)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./build/'));
});

