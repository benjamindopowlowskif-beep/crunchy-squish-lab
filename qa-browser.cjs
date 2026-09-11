const { chromium } = require('playwright');

function launchChrome(options = {}) {
  const launchOptions = {
    channel: 'chrome',
    headless: true,
    ...options,
  };

  if (process.env.CHROME_PATH) {
    delete launchOptions.channel;
    launchOptions.executablePath = process.env.CHROME_PATH;
  }

  return chromium.launch(launchOptions);
}

module.exports = { launchChrome };
