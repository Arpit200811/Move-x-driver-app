import 'react-native-gesture-handler';
require('./src/polyfills'); 

import { Alert } from 'react-native';

// Defensive Error Handling to prevent silent crashes
const defaultErrorHandler = global.ErrorUtils?.getGlobalHandler?.() || (() => {});
if (global.ErrorUtils && global.ErrorUtils.setGlobalHandler) {
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    console.log('Global Error Caught:', error);
    if (isFatal) {
      Alert.alert(
        'Unexpected Error',
        `\n${error.name} : ${error.message}\n\nPlease close the app and start again.`,
        [{ text: 'OK' }]
      );
    } else {
      defaultErrorHandler(error, isFatal);
    }
  });
}

const { registerRootComponent } = require('expo');
const { default: App } = require('./App');

// Register the root component
registerRootComponent(App);
