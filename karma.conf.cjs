// Karma configuration (the standard Angular one plus coverage thresholds).
//
// The coverage thresholds only apply to `ng test --code-coverage` (what CI runs). They are a
// ratchet set just under the current numbers: raise them whenever coverage goes up, never lower
// them to make a build pass. The project's goal is 80.

// The users are in Honduras (UTC-6) but CI runs in UTC, where a date read as UTC and a date read as
// local time are the same day, so the specs about the local calendar day (reports, date.utils)
// could not fail. Chrome takes its zone from TZ on Linux; on Windows it uses the system zone.
process.env.TZ = 'America/Tegucigalpa';

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage')
    ],
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: {
      dir: require('path').join(__dirname, 'coverage/inv-app'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }],
      check: {
        global: { statements: 63, branches: 47, functions: 54, lines: 63 }
      }
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true
  });
};
