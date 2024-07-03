'use strict';

var fs = require('fs');
var gulp = require('gulp');
var spawn = require('child_process').spawn;
var gutil = require('gulp-util');
var protractor = require('gulp-protractor').protractor;
var notify = require('gulp-notify');
var gulpif = require('gulp-if');
var shell = require('shelljs');
var desktopNotifications = false;

try {
  desktopNotifications = require('../../../../config').features.desktopNotifications;
} catch(e) {}


var wdmInstalled = false;

gulp.task('protractor-validation', function(cb) {
  shell.exec('npm list -g webdriver-manager -json', function(err, stdout) {
      var input = Object.keys(stdout).length ? JSON.parse(stdout) : {};

      if (Object.keys(input).length && input.dependencies['webdriver-manager']) {
        wdmInstalled = true;
      }

      cb(err.message);
  });
});

gulp.task('protractor-update', ['protractor-validation'], function(cb) {
  if (wdmInstalled) {
    shell.exec('webdriver-manager update', function(err, stdout, stderr) {
        gutil.log(stdout);
        gutil.log(stderr);
    });
  }
  cb();
});

gulp.task('protractor-launch', ['protractor-update'], function() {
  if (wdmInstalled) {

    if (!fs.existsSync('./logs')) {
        fs.mkdirSync('./logs');
    }

    var out = fs.openSync('./logs/webdriver_out.log', 'w'),
        err = fs.openSync('./logs/webdriver_err.log', 'w');
    spawn('webdriver-manager', ['start'], {
      stdio: [ 'ignore', out, err], // piping stdout and stderr to out.log
      detached: true
    }).unref();
  }
});


gulp.task('protractor-test', ['protractor-launch'], function(done) {
  if (wdmInstalled) {
    gulp.src(['./tests/e2e/*.js'])
      .pipe(protractor({
        configFile: 'tests/protractor.conf.js'
      }))
      .on('error', function() {
        this.emit('end');
      })
      .on('end', function() {
        done();
      });
  } else {
    done();
  }

});


gulp.task('e2e', ['protractor-test'], function() {
  if (wdmInstalled) {
    gulp.src('README.md')
      .pipe(gulpif(desktopNotifications, notify({
        title: 'King of App - Module Generator',
        message: 'E2E Test finished!',
        icon: 'https://avatars1.githubusercontent.com/u/7260905?v=3&s=200',
        sound: true
      }
    )));
  } else {
    gutil.log(gutil.colors.yellow('Remember! You have to install webdriver-manager globally.'));
    gutil.log(gutil.colors.red('- Terminal: npm install webdriver-manager -g'));
    gutil.log(gutil.colors.yellow('- More info: http://docs.kingofapp.com/modules/'));
  }

});
