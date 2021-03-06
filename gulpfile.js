'use strict';

// *************************************
//
//   Gulpfile
//
// *************************************
//
// -------------------------------------
// To see available tasks use:
// gulp -T                 Print the task dependency tree
// gulp --tasks-simple     Print a list of gulp task names
// -------------------------------------
//
// -------------------------------------
//   Modules
// -------------------------------------
require('es6-shim');
var _execute = require('child_process').exec;
var gulp = require('gulp');
var concat = require('gulp-concat');
var jshint = require('gulp-jshint');
var markdown = require('gulp-markdown');
var phpunit = require('gulp-phpunit');
var protractor = require('gulp-protractor').protractor;
var webdriverStandalone = require('gulp-protractor').webdriver_standalone;
var webdriverUpdate = require('gulp-protractor').webdriver_update;
var rename = require('gulp-rename');
var replace = require('gulp-replace');
var uglify = require('gulp-uglify');
var gutil = require('gulp-util');
var _template = require('lodash.template');
var Server = require('karma').Server;
var path = require('path');
var stylish = require('jshint-stylish');
var dotnetPublish = require('gulp-dotnet-cli').publish;
var dotnetTest = require('gulp-dotnet-cli').test;
var fs = require('fs');
var del = require('del');

// If using a JSON file for the Google API secrets, uncomment the following line and search for
// "Google API" to find other lines to uncomment further below.

// const secrets_google_api_client_id = require('./secrets/google-api-client-id.json');

// -------------------------------------
//   Global Variables
// -------------------------------------
var srcPatterns = [
  'src/angular-app/**',
  'src/Api/**',
  'src/Site/**',
  'test/**'
];

var phpPatterns = [
  'src/angular-app/**/*.php',
  'src/Api/**/*.php',
  'src/Site/**/*.php',
  'test/**/*.php'
];

// -------------------------------------
//   Task: Lint
// -------------------------------------
gulp.task('lint', function () {
  return gulp.src(srcPatterns)
    .pipe(jshint())
    .pipe(jshint.reporter(stylish));
});

// -------------------------------------
//   Task: Auto-generate language picker asset files
// -------------------------------------
gulp.task('generate-language-picker-assets', function (cb) {
  // Manual prerequisite:
  // copy from libpalaso:palaso-trusty64-master/SIL.WritingSystems/Resources/*.txt
  // into scripts/language picker/
  var options = {
    dryRun: false,
    silent: false,
    cwd: './scripts/language picker/'
  };

  // auto-generated files written to src/angular-app/bellows/js/assets/
  execute(
    './build-json-language-data.py',
    options,
    cb
  );
});

gulp.task('generate-language-picker-assets').description =
  'Update asset files used for language picker';

// -------------------------------------
//   Task: Markdown
// -------------------------------------
gulp.task('markdown', function () {
  return gulp.src('src/angular-app/**/helps/**/*.md')
    .pipe(markdown())
    .pipe(gulp.dest('src/angular-app'));
});

gulp.task('markdown').description = 'Generate helps markdown files';

// region sass

var sassCommand = './node_modules/.bin/node-sass';

gulp.task('sass', gulp.parallel(
  function buildSiteDir(done) {
    execute(sassCommand + ' src/Site/ -o src/Site/ --output-style compressed', null, done);
  },

  function buildAngularAppDir(done) {
    execute(sassCommand  + ' src/angular-app/ -o src/angular-app/ --output-style compressed',
      null, done);
  }
));

gulp.task('sass:watch', function () {
  var debug = process.argv.indexOf('--debug') !== -1;
  if (!debug) console.info('Tip: run with --debug to generate source comments and source maps.');

  var watch = ' --watch --recursive';
  var debugArgs = debug ? ' --source-comments --source-map-embed --source-map-contents' : '';

  var a = sassCommand + ' src/Site -o src/Site' + debugArgs;
  var b = sassCommand + ' src/angular-app -o src/angular-app' + debugArgs;

  return new Promise(function (resolve, reject) {
    execute(b, null, function () {
      execute(b + watch, null, reject);
    });

    execute(a, null, function () {
      execute(a + watch, null, reject);
    });
  });

});

// endregion

//region webpack

function webpack(applicationName, callback, isProduction, isWatch) {
  var watch = isWatch ? ' --watch' : '';
  var env = applicationName ? ' --env.applicationName=' + applicationName : '';
  var prod = isProduction ? ' -p' : '';
  execute('$(npm bin)/webpack' + watch + env + prod + ' --colors',
    { cwd: '.' },
    function (err) {
      if (err) throw new gutil.PluginError('webpack', err);
      callback();
    });
}

// -------------------------------------
//   Task: webpack-lf
// -------------------------------------
gulp.task('webpack-lf', function (cb) {
  webpack('languageforge', cb);
});

// -------------------------------------
//   Task: webpack-lf watch
// -------------------------------------
gulp.task('webpack-lf:watch', function (cb) {
  webpack('languageforge', cb, false, true);
});

// -------------------------------------
//   Task: webpack-sf
// -------------------------------------
gulp.task('webpack-sf', function (cb) {
  webpack('scriptureforge', cb);
});

// -------------------------------------
//   Task: webpack-sf watch
// -------------------------------------
gulp.task('webpack-sf:watch', function (cb) {
  webpack('scriptureforge', cb, false, true);
});

// endregion

//region MongoDB

// -------------------------------------
//   Task: MongoDB: Backup Production
// -------------------------------------
gulp.task('mongodb-backup-prod-db', function (cb) {
  execute(
    'ssh scriptureforge.org \'bash -s\' < scripts/server/mongodb/backupMongoOnServer.sh',
    null,
    cb
  );
});

// -------------------------------------
//   Task: MongoDB: Copy Backup to Local
// -------------------------------------
gulp.task('mongodb-copy-backup-to-local', function (cb) {
  var padLeft = function (i, len, ch) {
    var val = i.toString();
    while (val.length < len)
      val = ch + val;
    return val;
  };

  var formatDateYMD = function (date) {
    return date.getFullYear() + '-' + padLeft(date.getMonth() + 1, 2, '0') + '-' +
        padLeft(date.getDate(), 2, '0');
  };

  var today = formatDateYMD(new Date());
  execute(
    'scp scriptureforge.org:mongodb_backup_' + today + '.tgz /tmp/',
    null,
    cb
  );
});

// -------------------------------------
//   Task: MongoDB: Clean Backup Production
// -------------------------------------
gulp.task('mongodb-cleanup-backup-prod-db', function (cb) {
  // To set the username, edit your ssh config file (~/.ssh/config) and add an entry:
  // Host scriptureforge.org
  //     User jdoe
  execute(
    'ssh scriptureforge.org \'bash -s\' < scripts/server/mongodb/deleteTarFileOnServer.sh',
    null,
    cb
  );
});

// -------------------------------------
//   Task: MongoDB: Restore Mongo on Local
// -------------------------------------
gulp.task('mongodb-restore-local-db', function (cb) {
  execute(
    'scripts/server/mongodb/restoreMongoOnLocal.sh /tmp',
    null,
    cb
  );
});

gulp.task('mongodb-restore-local-db').description =
  'Restore mongodb from a local archive file';

// -------------------------------------
//   Task: MongoDB: Copy Production
// -------------------------------------
gulp.task('mongodb-copy-prod-db',
  gulp.series(
    'mongodb-backup-prod-db',
    'mongodb-copy-backup-to-local',
    gulp.parallel('mongodb-cleanup-backup-prod-db', 'mongodb-restore-local-db')
  )
);
gulp.task('mongodb-copy-prod-db').description =
  'Backup MongoDB on server and restore on local machine';

//endregion

//region Test (PHP, JS, .NET, and E2E)

// -------------------------------------
//   Task: test-php
// -------------------------------------
gulp.task('test-php', function () {
  var src = 'test/php/phpunit.xml';
  var options = {
    dryRun: false,
    debug: false,
    logJunit: 'PhpUnitTests.xml'
  };
  gutil.log("##teamcity[importData type='junit' path='PhpUnitTests.xml']");
  return gulp.src(src)
    .pipe(phpunit('src/vendor/bin/phpunit', options));
});

// -------------------------------------
//   Task: test-php with debugging info
// -------------------------------------
gulp.task('test-php-debug', function () {
  var src = 'test/php/phpunit.xml';
  var options = {
    dryRun: false,
    debug: true
  };
  return gulp.src(src)
    .pipe(phpunit('src/vendor/bin/phpunit', options));
});

// -------------------------------------
//   Task: test-php-coverage
// -------------------------------------
gulp.task('test-php-coverage', function () {
  var src = 'test/php/phpunit.xml';
  var options = {
    dryRun: false,
    debug: false,
    logJunit: 'PhpUnitTests.xml',
    coverageHtml: 'test/CodeCoverage/php/'
  };
  gutil.log("##teamcity[importData type='junit' path='PhpUnitTests.xml']");
  return gulp.src(src)
    .pipe(phpunit('src/vendor/bin/phpunit', options));
});

// -------------------------------------
//   Task: test-php:watch
// -------------------------------------
gulp.task('test-php:watch', function () {
  gulp.watch(phpPatterns, ['test-php']);
});

// -------------------------------------
//   Task: test-php-debug:watch with debugging info
// -------------------------------------
gulp.task('test-php-debug:watch', function () {
  gulp.watch(phpPatterns, ['test-php-debug']);
});

// -------------------------------------
//   Task: test-js
// -------------------------------------
gulp.task('test-js', function (cb) {
  new Server({
    configFile: __dirname + '/test/app/karma.conf.js',
    reporters: 'teamcity'
  }, cb).start();
});

// -------------------------------------
//   Task: test-js:watch
// -------------------------------------
gulp.task('test-js:watch', function (cb) {
  new Server({
    configFile: __dirname + '/test/app/karma.conf.js',
    autoWatch: true,
    singleRun: false
  }, cb).start();
});

// -------------------------------------
//   Task: E2E Test: Webdriver Update
// -------------------------------------
gulp.task('test-e2e-webdriver_update', webdriverUpdate);

// -------------------------------------
//   Task: E2E Test: Webdriver Standalone
// -------------------------------------
gulp.task('test-e2e-webdriver_standalone', webdriverStandalone);

function copy(src, dest) {
  return gulp.src(src)
    .pipe(rename(dest.file))
    .pipe(gulp.dest(dest.path));
}

// -------------------------------------
//   Task: E2E Test: Use Test Config
// -------------------------------------
gulp.task('test-e2e-useTestConfig', function () {
  var src = 'src/config.php.fortest';
  var dest = {
    file: 'config.php',
    path: 'src/' };
  return copy(src, dest);
});

// -------------------------------------
//   Task: E2E Test: Use Live Config
// -------------------------------------
gulp.task('test-e2e-useLiveConfig', function () {
  var src = 'src/config.php.live';
  var dest = {
    file: 'config.php',
    path: 'src/' };
  return copy(src, dest);
});

// -------------------------------------
//   Task: E2E Test: Setup Test Environment
// -------------------------------------
gulp.task('test-e2e-setupTestEnvironment', function (cb) {
  var params = require('yargs')
    .option('webserverHost', {
      demand: true,
      describe: 'hostname (without the protocol) for E2E testing',
      type: 'string' })
    .option('dest', {
      demand: false,
      describe: 'destination of test environment',
      type: 'string' })
    .fail(yargFailure)
    .argv;
  var options = {
    dryRun: false,
    silent: false,
    cwd: getTestCwd(params.dest)
  };
  execute(
    'sudo -u www-data php setupTestEnvironment.php ' + params.webserverHost,
    options,
    cb
  );
});

// -------------------------------------
//   Task: E2E Test: Teardown Test Environment
// -------------------------------------
gulp.task('test-e2e-teardownTestEnvironment', function (cb) {
  var params = require('yargs')
    .option('dest', {
      demand: false,
      describe: 'destination of test environment',
      type: 'string' })
    .fail(yargFailure)
    .argv;
  var options = {
    dryRun: false,
    silent: false,
    cwd: getTestCwd(params.dest)
  };
  execute(
    'sudo -u www-data php teardownTestEnvironment.php',
    options,
    cb
  );
});

// -------------------------------------
//   Task: Test Restart Webserver
// -------------------------------------
gulp.task('test-restart-webserver', function (cb) {
  execute(
    'sudo service apache2 restart',
    null,
    cb
  );
});

// -------------------------------------
//   Task: Remote Restart PHP-FPM
// -------------------------------------
gulp.task('remote-restart-php-fpm', function (cb) {
  var params = require('yargs')
    .option('dest', {
      demand: true,
      type: 'string' })
    .option('uploadCredentials', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;
  var options = {
    credentials: params.uploadCredentials,
    destination: params.dest.slice(0, params.dest.indexOf(':'))
  };

  execute(
    "ssh -i <%= credentials %> <%= destination %> 'service php7.0-fpm restart'",
    options,
    cb
  );
});

// -------------------------------------
//   Task: Local Restart xForge Web API
// -------------------------------------
gulp.task('local-restart-xforge-web-api', function (cb) {
  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .option('dest', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;

  var options = {
    applicationName: params.applicationName,
    suffix: getServiceSuffix(params.dest)
  };
  execute(
    'sudo systemctl restart <%= applicationName %>-web-api<%= suffix %>',
    options,
    cb
  );
});

// -------------------------------------
//   Task: Remote Restart xForge Web API
// -------------------------------------
gulp.task('remote-restart-xforge-web-api', function (cb) {
  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .option('dest', {
      demand: true,
      type: 'string' })
    .option('uploadCredentials', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;

  var options = {
    applicationName: params.applicationName,
    credentials: params.uploadCredentials,
    destination: params.dest.slice(0, params.dest.indexOf(':')),
    suffix: getServiceSuffix(params.dest)
  };

  execute(
    'ssh -i <%= credentials %> <%= destination %>' +
      " 'systemctl restart <%= applicationName %>-web-api<%= suffix %>'",
    options,
    cb
  );
});

// -------------------------------------
//   Task: Local Restart Node Server
// -------------------------------------
gulp.task('local-restart-node-server', function (cb) {
  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .option('dest', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;

  if (params.applicationName === 'languageforge') {
    cb();
    return;
  }

  var options = {
    applicationName: params.applicationName,
    suffix: getServiceSuffix(params.dest)
  };
  execute(
    'sudo systemctl restart <%= applicationName %>-sharedb<%= suffix %>',
    options,
    cb
  );
});

// -------------------------------------
//   Task: Remote Restart Node Server
// -------------------------------------
gulp.task('remote-restart-node-server', function (cb) {
  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .option('dest', {
      demand: true,
      type: 'string' })
    .option('uploadCredentials', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;

  if (params.applicationName === 'languageforge') {
    cb();
    return;
  }

  var options = {
    applicationName: params.applicationName,
    credentials: params.uploadCredentials,
    destination: params.dest.slice(0, params.dest.indexOf(':')),
    suffix: getServiceSuffix(params.dest)
  };

  execute(
    'ssh -i <%= credentials %> <%= destination %>' +
      " 'systemctl restart <%= applicationName %>-sharedb<%= suffix %>'",
    options,
    cb
  );
});

// -------------------------------------
//   Task: E2E Test: Modify Environment
// -------------------------------------
gulp.task('test-e2e-env', function () {
  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .option('dest', {
      demand: false,
      type: 'string' })
    .option('webserverHost', {
      demand: false,
      default: 'languageforge.local',
      type: 'string' })
    .fail(yargFailure)
    .argv;
  var cwd = getTestCwd(params.dest);
  var src = [
    'setupTestEnvironment.php',
    'teardownTestEnvironment.php',
    'e2eTestConfig.php',
    'testConstants.json'];

  // noinspection RegExpRedundantEscape
  return gulp.src(src, { cwd: cwd })

    // e2eTestConfig.php
    .pipe(replace('src/', 'htdocs/'))

    // testConstants.json
    .pipe(replace(
      /(\s*\"siteType\"\s*:\s*\").*$/m,
      '$1' + params.applicationName + '",'))
    .pipe(replace(
      /(\s*\"siteHostname\"\s*:\s*\").*$/m,
      '$1' + params.webserverHost + '",'))
    .pipe(replace(
      /(\s*\"baseUrl\"\s*:\s*\").*$/m,
      '$1http://' + params.webserverHost + '",'))
    .pipe(gulp.dest(cwd));
});

// -------------------------------------
//   Task: E2E Test: Do Test
// -------------------------------------
gulp.task('test-e2e-doTest', function (cb) {
  var params = require('yargs')
    .usage(
      'Usage: $0 test-e2e-doTest --webserverHost [hostname] --specs [testSpecs] ' +
      '--seleniumAddress [address] --verbosity [bool] --conf [filename]')
    .option('webserverHost', {
      demand: true,
      describe: 'hostname (without the protocol) for E2E testing',
      type: 'string' })
    .option('specs', {
      demand: false,
      describe: 'testSpecs are the names of the e2e test specs to run',
      type: 'string' })
    .option('seleniumAddress', {
      demand: false,
      describe: 'address of a running selenium server. default http://default.local:4444/wd/hub',
      type: 'string' })
    .option('verbosity', {
      demand: false,
      describe: 'bool for jasmine reporter verbosity.  true for more detail',
      type: 'boolean' })
    .option('conf', {
      demand: false,
      describe: 'filename of a protractor conf file.  default is protractorConf.js',
      type: 'string' })
    .option('browserStackUser', {
      demand: false,
      describe: 'BrowserStack API username',
      type: 'string' })
    .option('browserStackKey', {
      demand: false,
      describe: 'BrowserStack API key',
      type: 'string' })
    .help('?')
    .alias('?', 'help')
    .example('$0 test-e2e-run --webserverHost languageforge.local',
      'Runs all the E2E tests for languageforge')
    .example('$0 test-e2e-run --webserverHost scriptureforge.local --specs projectSettingsPage',
      'Runs the scriptureforge E2E test for projectSettingsPage')
    .fail(yargFailure)
    .argv;

  var protocol =
    (params.webserverHost === 'jamaicanpsalms.scriptureforge.local') ? 'https://' : 'http://';

  var configFile;
  var isBrowserStack = false;
  var protractorOptions = {
    debug: false,
    args: []
  };

  // Get the browser stack user and password
  if (params.browserStackUser && params.browserStackUser.length > 0) {
    protractorOptions.args.push('--browserstackUser', params.browserStackUser);
    isBrowserStack = true;
  }

  if (params.browserStackKey && params.browserStackKey.length > 0) {
    protractorOptions.args.push('--browserstackKey', params.browserStackKey);
  }

  var webserverHost = params.webserverHost;
  if (isBrowserStack) {
    webserverHost = webserverHost.replace('.local', '.org');
  }

  if (params.conf && params.conf.length > 0) {
    configFile = './test/app/' + params.conf;
  } else {
    if (isBrowserStack) {
      configFile = './test/app/browserStackLFProtractorConf.js';
    } else {
      configFile = './test/app/protractorConf.js';
    }
  }

  // vars for configuring protractor
  protractorOptions.configFile = configFile;
  protractorOptions.args.push('--baseUrl', protocol + webserverHost);

  // Generate list of specs to test (glob format so protractor will test whatever files exist)
  var specString = (params.specs) ? params.specs : '*';
  var specs = ['test/app/allspecs/**/*.e2e-spec.js'];
  if (specString === '*') {
    specs.push('test/app/bellows/**/*-traversal.e2e-spec.js');
    if (params.webserverHost.includes('languageforge')) {
      specs.push('test/app/languageforge/**/*-traversal.e2e-spec.js');
    } else {
      specs.push('test/app/scriptureforge/**/*-traversal.e2e-spec.js');
    }
  }

  specs.push('test/app/bellows/**/' + specString + '.e2e-spec.js');
  if (params.webserverHost.includes('languageforge')) {
    specs.push('test/app/languageforge/**/' + specString + '.e2e-spec.js');
  } else {
    specs.push('test/app/scriptureforge/**/' + specString + '.e2e-spec.js');
  }

  // Get the selenium server address
  if (params.seleniumAddress && params.seleniumAddress.length > 0) {
    protractorOptions.args.push('--seleniumAddress', params.seleniumAddress);
  }

  if (params.verbosity) {
    protractorOptions.args.push('--params.verbosity', 3);
  } else {
    protractorOptions.args.push('--params.verbosity', 0);
  }

  // It's better to pass the specs array of files to test, and not use the --exclude parameter
  console.log('specs: ', specs);
  return gulp.src(specs)
    .pipe(protractor(protractorOptions))
    .on('error', function (e) {
      console.log(e);
      throw e;
    })
    .on('end', cb);
});

// -------------------------------------
//   Task: E2E Test: Clean compiled files
// -------------------------------------
gulp.task('test-e2e-clean', function () {
  return del([
    'test/app/**/*.e2e-spec.js.map',
    'test/app/**/*.e2e-spec.js',
    'test/app/**/shared/*.js.map',
    'test/app/**/shared/*.js'
  ]);
});

// -------------------------------------
//   Task: E2E Test: Compile TS files
// -------------------------------------
gulp.task('test-e2e-compile', function (cb) {
  return execute('node_modules/typescript/bin/tsc -p test/app', null, cb);
});

// -------------------------------------
//   Task: E2E Test: Watch and Compile TS files
// -------------------------------------
gulp.task('test-e2e-compile:watch', function (cb) {
  return execute('node_modules/typescript/bin/tsc -p test/app --watch', null, cb);
});

// -------------------------------------
//   Task: E2E Test: Run
// -------------------------------------
gulp.task('test-e2e-clean-compile',
  gulp.series(
    'test-e2e-clean',
    'test-e2e-compile')
);

// -------------------------------------
//   Task: E2E Test: Teardown for developer
// -------------------------------------
gulp.task('test-e2e-teardownForLocalDev', gulp.series(
  'test-e2e-teardownTestEnvironment',
  'test-e2e-useLiveConfig',
  'test-restart-webserver')
);

// -------------------------------------
//   Task: E2E Test: Run
// -------------------------------------
gulp.task('test-e2e-run',
  gulp.series(
    'test-e2e-clean-compile',
    'test-e2e-useTestConfig',
    'test-restart-webserver',
    'test-e2e-setupTestEnvironment',
    'test-e2e-doTest')
);
gulp.task('test-e2e-run').description = 'Run the E2E test on local developer environment';

gulp.task('test-e2e-local-lf', gulp.series(
    'test-e2e-clean-compile',
    'test-e2e-useTestConfig',
    'test-restart-webserver',
    'test-e2e-setupTestEnvironment',
    'test-e2e-doTest',
    'test-e2e-teardownTestEnvironment',
    'test-e2e-useLiveConfig',
    'test-restart-webserver')
);

// -------------------------------------
//   Task: Run .NET Core unit tests
// -------------------------------------
gulp.task('test-dotnet', function () {
  return gulp.src('**/*.Tests.csproj', { read: false }).pipe(dotnetTest());
});

//endregion

//region build

// -------------------------------------
//   Task: Build Composer
// -------------------------------------
gulp.task('build-composer', function (cb) {
  var options = {
    dryRun: false,
    silent: false,
    cwd: './src'
  };
  execute(
    'composer install',
    options,
    cb
  );
});

// -------------------------------------
//   Task: Build npm front-end
// -------------------------------------
gulp.task('build-npm-front-end', function (cb) {
  var options = {
    dryRun: false,
    silent: false,
    cwd: '.'
  };
  execute(
    'npm install',
    options,
    cb
  );
});

// -------------------------------------
//   Task: Build npm back-end
// -------------------------------------
gulp.task('build-npm-back-end', function (cb) {
  var options = {
    dryRun: false,
    silent: false,
    cwd: 'src/node'
  };
  execute(
    'npm install',
    options,
    cb
  );
});

// -------------------------------------
//   Task: Build Remove test fixtures (directives) in HTML only on live build
// -------------------------------------
gulp.task('build-remove-test-fixtures', function (done) {
  var params = require('yargs')
    .option('dest', {
      demand: false,
      default: 'root@localhost:/var/www/virtual/languageforge.org',
      type: 'string' })
    .fail(yargFailure)
    .argv;
  var base = './src/angular-app';
  var glob = path.join(base, '**/*.html');

  // only on live
  if (!params.dest.includes('/var/www/virtual/') &&
    (params.dest.endsWith('forge.org') || params.dest.endsWith('forge.org/'))) {
    return gulp.src(glob)
      .pipe(replace(/^.*<pui-mock-upload.*$/m, '\n'))
      .pipe(gulp.dest(base));
  } else {
    done();
  }
});

// -------------------------------------
//   Task: Build webpack
// -------------------------------------
gulp.task('build-webpack', function (cb) {
  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .option('doNoCompression', {
      demand: false,
      type: 'boolean' })
    .fail(yargFailure)
    .argv;
  webpack(params.applicationName, cb, !params.doNoCompression);
});

// -------------------------------------
//   Task: Build (Concat and ) Minify
// -------------------------------------
gulp.task('build-minify', function () {
  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .option('doNoCompression', {
      demand: false,
      type: 'boolean' })
    .fail(yargFailure)
    .argv;
  var minifySrc = [
    'src/angular-app/bellows/**/*.js',
    'src/angular-app/container/**/*.js',
    'src/angular-app/' + params.applicationName + '/**/*.js',
    '!src/angular-app/**/*.min.js',
    '!src/angular-app/**/assets/**',
    '!src/angular-app/**/excluded/**',
    '!src/angular-app/**/vendor/**'];
  var minJsFile = params.applicationName + '.min.js';
  var dest = 'src/js/lib/';
  if (params.doNoCompression) {
    return gulp.src(minifySrc)
      .pipe(concat(minJsFile))
      .pipe(gulp.dest(dest));
  } else {
    return gulp.src(minifySrc)
      .pipe(concat(minJsFile))
      .pipe(uglify())
      .pipe(gulp.dest(dest));
  }
});

// -------------------------------------
//   Task: Build Version
// -------------------------------------
gulp.task('build-version', function () {
  var params = require('yargs')
    .option('buildNumber', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;
  console.log('version =', params.buildNumber);
  return gulp.src('src/version.php')
    .pipe(replace(
      /^(define\('VERSION', ').*;$/m,
      '$1' + params.buildNumber + '\');'))
    .pipe(gulp.dest('src'));
});

// -------------------------------------
//   Task: Change Group to www-data
// -------------------------------------
gulp.task('build-changeGroup', function (cb) {
  execute(
    'sudo chgrp -R www-data src; sudo chgrp -R www-data test; sudo chgrp -R www-data artifacts; ' +
    'sudo chmod -R g+w src; sudo chmod -R g+w test; sudo chmod -R g+wx artifacts',
    null,
    cb
  );
});

gulp.task('build-changeGroup').description =
  'Ensure www-data is the group and can write for src, test, and artifacts folder';

// -------------------------------------
//   Task: Build Production Config
// -------------------------------------
gulp.task('build-productionConfig', function () {
  // Pass Google client ID and secret via environment variables so they don't show up in the build
  // logs
  var googleClientId = process.env.GOOGLE_CLIENT_ID;
  var defaultMongodbConnection = 'localhost:27017';
  if (googleClientId === undefined) {
    googleClientId = 'googleClientId';
  }

  var googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (googleClientSecret === undefined) {
    googleClientSecret = 'googleClientSecret';
  }

  var paratextClientId = process.env.PARATEXT_CLIENT_ID;
  if (paratextClientId === undefined) {
    paratextClientId = 'paratextClientId';
  }

  var paratextApiToken = process.env.PARATEXT_API_TOKEN;
  if (paratextApiToken === undefined) {
    paratextApiToken = 'paratextApiToken';
  }

  var jwtKey = process.env.JWT_KEY;
  if (jwtKey === undefined) {
    jwtKey = 'jwtKey';
  }

  var params = require('yargs')
    .option('mongodbConnection', {
      demand: false,
      default: defaultMongodbConnection,
      type: 'string' })
    .option('secret', {
      demand: false,
      default: 'not_a_secret',
      type: 'string' })

    // If using a JSON file for the Google API secrets,
    // uncomment the "default: secrets_google_api_client_id.(name)" lines below.
    .option('googleClientId', {
      demand: false,

      // default: secrets_google_api_client_id.web.client_id,
      default: googleClientId,
      type: 'string' })
    .option('googleClientSecret', {
      demand: false,

      // default: secrets_google_api_client_id.web.client_secret,
      default: googleClientSecret,
      type: 'string' })
    .option('paratextClientId', {
      demand: false,
      default: paratextClientId,
      type: 'string' })
    .option('paratextApiToken', {
      demand: false,
      default: paratextApiToken,
      type: 'string' })
    .option('jwtKey', {
      demand: false,
      default: jwtKey,
      type: 'string' })
    .fail(yargFailure)
    .argv;
  var configSrc = [
    './src/config.php',
    './scripts/scriptsConfig.php',
    './test/php/TestConfig.php'];

  return gulp.src(configSrc, { base: './' })
    .pipe(replace(
      /(define\('ENVIRONMENT', ').*;$/m,
      '$1' + 'production\');'))
    .pipe(replace(
      defaultMongodbConnection,
      params.mongodbConnection))
    .pipe(replace(
      /(define\('REMEMBER_ME_SECRET', ').*;$/m,
      '$1' + params.secret + '\');'))
    .pipe(replace(
      /(define\('GOOGLE_CLIENT_ID', ').*;$/m,
      '$1' + params.googleClientId + '\');'))
    .pipe(replace(
      /(define\('GOOGLE_CLIENT_SECRET', ').*;$/m,
      '$1' + params.googleClientSecret + '\');'))
    .pipe(replace(
      /(define\('PARATEXT_CLIENT_ID', ').*;$/m,
      '$1' + params.paratextClientId + '\');'))
    .pipe(replace(
      /(define\('PARATEXT_API_TOKEN', ').*;$/m,
      '$1' + params.paratextApiToken + '\');'))
    .pipe(replace(
      /(define\('JWT_KEY', ').*;$/m,
      '$1' + params.jwtKey + '\');'))
    .pipe(gulp.dest('./'));
});

// -------------------------------------
//   Task: Build Clear Local Cache
// -------------------------------------
gulp.task('build-clearLocalCache', function (cb) {
  var options = {
    dryRun: false,
    silent: false,
    cwd: 'src/cache/'
  };
  execute(
    'git clean -d -x -f',
    options,
    cb
  );
});

gulp.task('build-clearLocalCache').description =
  'Clear all subdirectories of local cache/';

// -------------------------------------
//   Task: .NET Core publish
// -------------------------------------
gulp.task('build-dotnet-publish', function () {
  del('artifacts/netcore-api/**/*');
  return gulp.src('src/netcore-api/SIL.XForge.WebApi.Server/SIL.XForge.WebApi.Server.csproj',
    { read: false })
      .pipe(dotnetPublish({
        configuration: 'Release',
        runtime: 'linux-x64',
        output: '../../../artifacts/netcore-api'
      }));
});

// -------------------------------------
//   Task: Build .NET Core host config
// -------------------------------------
gulp.task('build-dotnet-host-config', function (cb) {
  var paratextClientId = process.env.PARATEXT_CLIENT_ID;
  if (paratextClientId === undefined) {
    paratextClientId = 'paratextClientId';
  }

  var paratextApiToken = process.env.PARATEXT_API_TOKEN;
  if (paratextApiToken === undefined) {
    paratextApiToken = 'paratextApiToken';
  }

  var jwtKey = process.env.JWT_KEY;
  if (jwtKey === undefined) {
    jwtKey = 'jwtKey';
  }

  var params = require('yargs')
    .option('applicationName', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;

  var jobDatabase = params.applicationName + '_jobs';

  fs.writeFile('artifacts/netcore-api/appsettings.host.json', JSON.stringify({
    Security: {
      JwtKey: jwtKey
    },
    Paratext: {
      ClientId: paratextClientId,
      ClientSecret: paratextApiToken
    },
    DataAccess: {
      JobDatabase: jobDatabase
    }
  }), cb);
});

// -------------------------------------
//   Task: Build .NET Core
// -------------------------------------
gulp.task('build-dotnet',
  gulp.series(
    'build-dotnet-publish',
    'build-dotnet-host-config')
);

// -------------------------------------
//   Task: Build Upload to destination
// -------------------------------------
gulp.task('build-upload', function (cb) {
  var params = require('yargs')
    .option('dest', {
      demand: true,
      type: 'string' })
    .option('uploadCredentials', {
      demand: true,
      type: 'string' })
    .fail(yargFailure)
    .argv;
  var options = {
    dryRun: false,
    silent: false,
    includeFile: 'upload-include.txt',  // read include patterns from FILE
    excludeFile: 'upload-exclude.txt',  // read exclude patterns from FILE
    rsh: '--rsh="ssh -v -i ' + params.uploadCredentials + '"',
    src: 'src/',
    dest: path.join(params.dest, 'htdocs')
  };

  execute(
    'rsync -progzlt --chmod=Dug=rwx,Fug=rw,o-rwx ' +
    '--delete-during --stats --rsync-path="sudo rsync" <%= rsh %> ' +
    '--include-from="<%= includeFile %>" ' +
    '--exclude-from="<%= excludeFile %>" ' +
    '<%= src %> <%= dest %>',
    options,
    cb
  );

  // For E2E tests, upload test dir to destination
  if (params.dest.includes('e2etest')) {
    options.src = 'test/';
    options.dest = path.join(params.dest, '/test');

    execute(
      'rsync -progzlt --chmod=Dug=rwx,Fug=rw,o-rwx ' +
      '--delete-during --stats --rsync-path="sudo rsync" <%= rsh %> ' +
      '<%= src %> <%= dest %> --exclude php',
      options,
      cb
    );
  }

  options.src = 'artifacts/netcore-api/';
  options.dest = path.join(params.dest, '/api2');

  execute(
    'rsync -progzlt --chmod=Dug=rwx,Fug=rwx,o-rwx ' +
    '--delete-during --stats --rsync-path="sudo rsync" <%= rsh %> ' +
    '<%= src %> <%= dest %>',
    options,
    cb
  );
});

// -------------------------------------
//   Task: Build (General)
// -------------------------------------
gulp.task('build',
  gulp.series(
    gulp.parallel(
      'build-composer',
      'build-npm-front-end',
      'build-npm-back-end',
      'build-version',
      'build-productionConfig',
      'build-clearLocalCache',
      'build-remove-test-fixtures',
      'build-dotnet'),
    'sass',
    'build-webpack',
    'build-minify',
    'build-changeGroup')
);

// -------------------------------------
//   Task: Build get dependencies
// -------------------------------------
gulp.task('get-dependencies',
  gulp.parallel(
    'build-composer',
    'build-npm-front-end',
    'build-npm-back-end'
  )
);

// -------------------------------------
//   Task: Developer Build
// -------------------------------------
gulp.task('dev-build',
  gulp.parallel(
    'sass',
    'test-e2e-webdriver_update',
    'test-e2e-clean-compile',
    'build-webpack'
  )
);

// -------------------------------------
//   Task: Developer Get Dependencies and Build
// -------------------------------------
gulp.task('dev-dependencies-and-build',
  gulp.series(
    'get-dependencies',
    'dev-build'
  )
);

// -------------------------------------
//   Task: Build and Upload to destination
// -------------------------------------
gulp.task('build-and-upload',
  gulp.series(
    'build',
    'build-upload',
    'remote-restart-php-fpm',
    'remote-restart-xforge-web-api',
    'remote-restart-node-server')
);

// -------------------------------------
//   Task: Build E2E Target
// -------------------------------------
gulp.task('build-e2e',
  gulp.series(
    'test-e2e-useTestConfig',
    'build',
    'build-upload',
    'local-restart-xforge-web-api',
    'test-e2e-env',
    'test-e2e-setupTestEnvironment',
    'test-e2e-doTest'
  )
);
gulp.task('build-e2e').description =
  'Build and Run E2E tests on CI server';

// -------------------------------------
//   Task: Build, PHP Tests, Upload
// -------------------------------------
gulp.task('build-php',
  gulp.series(
    'build',
    'test-php',

    // 'test-js',
    'test-dotnet',
    'build-upload',
    'test-restart-webserver',
    'local-restart-xforge-web-api',
    'local-restart-node-server')
);
gulp.task('build-php').description =
  'Build and Run PHP tests on CI server; Deploy to dev site';

// -------------------------------------
//   Task: Build PHP Coverage
// -------------------------------------
gulp.task('build-php-coverage',
  gulp.series(
    'build',
    'test-php-coverage')
);

//endregion

// -------------------------------------
//   Task: default (build)
// -------------------------------------
gulp.task('default', gulp.series('build'));

// -------------------------------------
//   Functions
// -------------------------------------
function execute(command, options, callback) {
  if (!options) {
    options = {};
  }

  options.maxBuffer = 1024 * 1000; // byte

  var template = _template(command);
  command = template(options);
  if (!options.silent) {
    gutil.log(gutil.colors.green(command));
  }

  if (!options.dryRun) {
    var process = _execute(command, options, callback || undefined);

    process.stdout.on('data', function (data) {
      gutil.log(data.slice(0, -1)); // remove trailing \n
    });

    process.stderr.on('data', function (data) {
      gutil.log(gutil.colors.yellow(data.slice(0, -1))); // remove trailing \n
    });

  } else {
    callback(null);
  }
}

// Determine the path to test/app from a given destination.
// Truncate the remote prefix of the destination
function getTestCwd(dest) {
  return (dest) ? path.join(dest.replace(/^(.)*:/, ''), 'test/app') : './test/app';
}

// Get systemd service suffix from destination
function getServiceSuffix(dest) {
  var suffix = '';
  var index = dest.indexOf('_');
  if (index !== -1) {
    suffix = dest.substr(index + 1);
    if (suffix.endsWith('/')) {
      suffix = suffix.substr(0, suffix.length - 1);
    }

    suffix = '@' + suffix;
  }

  return suffix;
}

function yargFailure(msg, err, yargs) {
  if (err) {
    // preserve stack
    throw err;
  }

  console.error(msg);
  console.error('You should be doing', yargs.help());
  process.exit(1);
}
