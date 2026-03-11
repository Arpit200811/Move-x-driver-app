import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import DriverLoginScreen from '../screens/DriverLoginScreen';
import DriverHomeScreen from '../screens/DriverHomeScreen';
import OrderDetailsScreen from '../screens/OrderDetailsScreen';
import EarningsScreen from '../screens/EarningsScreen';
import DriverRegisterScreen from '../screens/DriverRegisterScreen';
import DriverProfileScreen from '../screens/DriverProfileScreen';
import DriverOrderHistoryScreen from '../screens/DriverOrderHistoryScreen';
import MapScreen from '../screens/MapScreen';
import ChatScreen from '../screens/ChatScreen';
import DriverStatsScreen from '../screens/DriverStatsScreen';
import RatingHistoryScreen from '../screens/RatingHistoryScreen';
import SupportHubScreen from '../screens/SupportHubScreen';
import NavigationSettingsScreen from '../screens/NavigationSettingsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import VehicleDocumentsScreen from '../screens/VehicleDocumentsScreen';
import DriverNotificationScreen from '../screens/DriverNotificationScreen';
import IncentivesScreen from '../screens/IncentivesScreen';
import LegalScreen from '../screens/LegalScreen';
import KYCVerificationScreen from '../screens/KYCVerificationScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { View, ActivityIndicator, Alert } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';

const Stack = createStackNavigator();

export default function DriverNavigator() {
  const [initialRoute, setInitialRoute] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        // DEFENSIVE CHECK: Ensure native modules don't kill the app on boot
        const onboarded = await AsyncStorage.getItem('onboarding_complete').catch(() => 'true');
        let token = null;
        try {
           token = await SecureStore.getItemAsync('movex_token');
        } catch (e) { console.error('SecureStore unavailable'); }

        if (!onboarded) {
            setInitialRoute('Onboarding');
        } else if (token) {
            // Check for Biometrics but be extremely careful
            const bioEnabled = await AsyncStorage.getItem('biometric_enabled');
            if (bioEnabled === 'true') {
                try {
                    const hasHardware = await LocalAuthentication.hasHardwareAsync();
                    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
                    
                    if (hasHardware && isEnrolled) {
                        const result = await LocalAuthentication.authenticateAsync({
                            promptMessage: 'Authorize Mission Access',
                            fallbackLabel: 'Use System Passcode',
                            disableDeviceFallback: false,
                        });
                        if (result.success) setInitialRoute('DriverHome');
                        else setInitialRoute('DriverLogin');
                    } else {
                        setInitialRoute('DriverHome');
                    }
                } catch (bioErr) {
                    console.error('Biometric Auth Failure during boot:', bioErr);
                    setInitialRoute('DriverHome'); // Fallback to Home if bio fails natively
                }
            } else {
                setInitialRoute('DriverHome');
            }
        } else {
            setInitialRoute('DriverLogin');
        }
      } catch (err) {
        console.error('CRITICAL NAVIGATOR CRASH:', err);
        setInitialRoute('DriverLogin'); // Absolute fallback
      }
    })();
  }, []);

  if (!initialRoute) return (
    <View style={{ flex: 1, backgroundColor: '#0f172a', justifyContent: 'center' }}>
      <ActivityIndicator color="#2563EB" size="large" />
    </View>
  );

  return (
    <Stack.Navigator initialRouteName={initialRoute} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="DriverLogin" component={DriverLoginScreen} />
      <Stack.Screen name="Register" component={DriverRegisterScreen} />
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} />
      <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
      <Stack.Screen name="Earnings" component={EarningsScreen} />
      <Stack.Screen name="DriverProfile" component={DriverProfileScreen} />
      <Stack.Screen name="DriverOrderHistory" component={DriverOrderHistoryScreen} />
      <Stack.Screen name="Map" component={MapScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Stats" component={DriverStatsScreen} />
      <Stack.Screen name="RatingHistory" component={RatingHistoryScreen} />
      <Stack.Screen name="SupportHub" component={SupportHubScreen} />
      <Stack.Screen name="NavigationSettings" component={NavigationSettingsScreen} />
      <Stack.Screen name="KYCVerification" component={KYCVerificationScreen} />
      <Stack.Screen name="VehicleDocuments" component={VehicleDocumentsScreen} />
      <Stack.Screen name="DriverNotifications" component={DriverNotificationScreen} />
      <Stack.Screen name="Incentives" component={IncentivesScreen} />
      <Stack.Screen name="Legal" component={LegalScreen} />
    </Stack.Navigator>
  );
}
