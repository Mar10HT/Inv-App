// Karma configuration (the standard Angular one plus coverage thresholds).
//
// The coverage thresholds only apply to `ng test --code-coverage` (what CI runs). They are a
// ratchet set just under the current numbers: raise them whenever coverage goes up, never lower
// them to make a build pass. The project's goal is 80.
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
        global: { statements: 79, branches: 64, functions: 74, lines: 80 }
      }
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true
  });
};
