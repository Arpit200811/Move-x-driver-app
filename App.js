import 'react-native-gesture-handler';
import './src/global.css';
import React from 'react';
import { LogBox, View, Text, TouchableOpacity } from 'react-native';

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
import Toast from 'react-native-toast-message';
// import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { registerForPushNotificationsAsync, subscribeToNotifications } from './src/services/notifications';

/*
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN || "https://examplePublicKey@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0,
});
*/

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error('CRASH_REPORT:', error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', padding: 30 }}>
          <Text style={{ color: '#ef4444', fontSize: 24, fontWeight: '900', marginBottom: 20 }}>MISSION CRITICAL ERROR</Text>
          <Text style={{ color: '#94a3b8', fontSize: 14, marginBottom: 30 }}>MoveX has encountered a fatal exception. Please report this to support.</Text>
          <View style={{ backgroundColor: 'rgba(255,0,0,0.1)', padding: 20, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,0,0,0.2)' }}>
            <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{this.state.error?.name}</Text>
            <Text style={{ color: '#fff', fontSize: 12, marginTop: 10 }}>{this.state.error?.message}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => this.setState({ hasError: false })}
            style={{ marginTop: 40, backgroundColor: '#2563EB', height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold' }}>REBOOT SYSTEM</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  React.useEffect(() => {
    // SECURITY: Delay native module initialization to prevent boot-time bridge congestion
    const timer = setTimeout(() => {
        console.log('[BOOT] Initializing Remote Systems...');
        registerForPushNotificationsAsync().catch(err => {
            console.error('[BOOT ERROR] Push Subsystem:', err);
        });
    }, 5000); // 5 second grace period
    
    const sub = subscribeToNotifications();
    return () => { 
        clearTimeout(timer);
        if (sub && sub.remove) sub.remove(); 
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <PaperProvider>
            <NavigationContainer>
              <DriverNavigator />
              <StatusBar style="auto" />
            </NavigationContainer>
            <Toast />
          </PaperProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
