// Karma: padrão do Angular CLI + um launcher headless que funciona em containers/CI (sem sandbox do Chrome).
// Use CHROME_BIN para apontar um Chromium específico (ex.: o do Playwright).
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    jasmineHtmlReporter: { suppressAll: true },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/onde-tem'),
      subdir: '.',
      reporters: [{ type: 'html' }, { type: 'text-summary' }]
    },
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: { base: 'ChromeHeadless', flags: ['--no-sandbox'] }
    },
    restartOnFileChange: true
  });
};
