import { Platform } from 'react-native';
import Constants from 'expo-constants';
import api from './api';

// SDK 53+ Isolation: On Android + Expo Go, the library itself crashes upon being loaded.
// We must avoid importing 'expo-notifications' entirely in that environment.
const isExpoGo = Constants.executionEnvironment === 'storeClient';
const isAndroid = Platform.OS === 'android';

// Proxy for Notifications library
let Notifications = null;

if (!(isAndroid && isExpoGo)) {
    try {
        // Dynamically require to avoid crash on module load in SDK 55 + Expo Go
        Notifications = require('expo-notifications');
        
        if (Notifications && Notifications.setNotificationHandler) {
            Notifications.setNotificationHandler({
                handleNotification: async () => ({
                    shouldShowAlert: true,
                    shouldPlaySound: true,
                    shouldSetBadge: false,
                }),
            });
        }
    } catch (e) {
        console.warn('[PUSH ARCHITECTURE] Failed to load expo-notifications module.');
    }
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications || (isAndroid && isExpoGo)) {
    if (isAndroid && isExpoGo) {
       console.warn('[PUSH ARCHITECTURE] Remote notifications are PERMANENTLY disabled in Expo Go on Android (SDK 53+ Architecture). Navigation logic will proceed.');
    }
    return null;
  }

  let token;

  // Push notifications only work on physical devices or builds
  const isDevice = Constants.isDevice;
  if (!isDevice) {
    console.log('[PUSH] Must use physical device for push notifications.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('[PUSH] Permission denied.');
    return null;
  }

  // Final check for token retrieval
  try {
     const projectId = Constants.expoConfig?.extra?.eas?.projectId;
     token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
     console.log('[PUSH TOKEN]:', token);

     await api.post('/auth/push-token', { token });
  } catch (err) {
     console.log('[PUSH ERROR] Token retrieval failed (Common in SDK 53+ Go):', err.message);
  }

  return token;
}
