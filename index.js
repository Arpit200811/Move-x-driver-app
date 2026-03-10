// index.js (using require to bypass ESM hoisting issues)
require('./src/polyfills'); 

const { registerRootComponent } = require('expo');
const { default: App } = require('./App');

// Register the root component
registerRootComponent(App);
