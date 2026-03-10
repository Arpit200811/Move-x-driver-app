try {
  require('react-native-worklets/plugin');
  console.log('Found worklets/plugin!');
} catch (e) {
  console.log('Error:', e.message);
  try {
     const p = require('path').resolve(__dirname, 'node_modules/react-native-worklets/plugin/index.js');
     console.log('Trying absolute:', p);
     require(p);
     console.log('Found absolute!');
  } catch (e2) {
     console.log('Still not found:', e2.message);
  }
}
