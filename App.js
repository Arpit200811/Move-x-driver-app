import 'react-native-gesture-handler';
import './src/global.css';
import React from 'react';
import { LogBox } from 'react-native';

// Suppress SDK 53+ Push Notification warnings during Expo Go development
LogBox.ignoreLogs([
  'InteractionManager has been deprecated',
  'Warning: InteractionManager',
  'expo-notifications: Android Push notifications',
  'SafeAreaView has been deprecated',
  'Unable to activate keep awake',
]);
import { NavigationContainer } from '@react-navigation/native';
import './src/i18n';
import './src/services/locationTask';
import DriverNavigator from './src/navigation/DriverNavigator';
import { StatusBar } from 'expo-status-bar';

import { Provider as PaperProvider } from 'react-native-paper';

export default function App() {
  return (
    <PaperProvider>
      <NavigationContainer>
        <DriverNavigator />
        <StatusBar style="auto" />
      </NavigationContainer>
    </PaperProvider>
  );
}
