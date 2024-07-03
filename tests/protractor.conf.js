module.exports.config = {
  seleniumAddress: 'http://localhost:4444/wd/hub',
  directConnect: true,
  specs: ['tests/e2e/*.js'],
  browserName: 'chrome',
  chromeDriver: '../node_modules/chromedriver/lib/chromedriver/chromedriver'
};
