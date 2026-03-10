import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, StatusBar, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, Shield, Zap, Info, ArrowRight } from 'lucide-react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';

export default function DriverLoginScreen({ navigation }) {
  const { t } = useTranslation();
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');
  const [countryFlag, setCountryFlag] = useState('🇮🇳');
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    (async () => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const bioEnabled = await AsyncStorage.getItem('biometric_enabled');
        if (hasHardware && bioEnabled === 'true') {
            setBioAvailable(true);
        }
    })();
  }, []);

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authorize Driver Login',
        fallbackLabel: 'Enter Passcode',
    });

    if (result.success) {
        const token = await AsyncStorage.getItem('movex_token');
        const user = await AsyncStorage.getItem('movex_user');
        if (token && user) {
            navigation.replace('DriverHome');
        } else {
            Alert.alert('Session Expired', 'Please login with phone first.');
        }
    }
  };

  const countries = [
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+1', flag: '🇺🇸', name: 'USA' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  ];

  const handleLogin = async () => {
    if (!phone) return Alert.alert(t('input_error', 'Input Error'), t('id_required_desc', 'Phone number is required.'));
    
    try {
      const response = await api.post('/auth/login', { 
          phone: `${countryCode}${phone}`, 
          role: 'driver' 
      });
      const { token, user } = response.data;
      
      await SecureStore.setItemAsync('movex_token', token);
      await AsyncStorage.setItem('movex_user', JSON.stringify(user));
      
      navigation.replace('DriverHome');
    } catch (error) {
      const msg = error.response?.data?.message || t('login_failed_desc', 'Authorization failed. Please try again.');
      Alert.alert(t('login_failed', 'Login Failed'), msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#020617', '#0f172a']} style={styles.backgroundGradient}>
      <SafeAreaView style={{ flex: 1 }}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.mainContent}>
            <View style={styles.header}>
                <LinearGradient
                    colors={['#2563EB', '#1e40af']}
                    style={styles.logoContainer}
                >
                    <Truck size={40} color="#fff" />
                </LinearGradient>
                <Text style={styles.title}>{t('driver_portal', 'MoveX Driver')}</Text>
                <Text style={styles.subtitle}>{t('driver_login_desc', 'Sign in to access your driver dashboard and start earning.')}</Text>
            </View>

            <View style={styles.loginCard}>
                <Text style={styles.inputLabel}>{t('phone_number', 'Phone Number')}</Text>
                
                <View style={styles.inputContainer}>
                    <TouchableOpacity 
                        style={styles.countryPicker}
                        onPress={() => setShowPicker(!showPicker)}
                    >
                        <Text style={styles.countryFlag}>{countryFlag}</Text>
                        <Text style={styles.countryCode}>{countryCode}</Text>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TextInput
                        style={styles.input}
                        placeholder={t('phone_placeholder', 'Enter phone number')}
                        placeholderTextColor="#94a3b8"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                    />
                </View>

                {showPicker && (
                    <View style={styles.pickerDropdown}>
                        {countries.map(c => (
                            <TouchableOpacity 
                                key={c.code} 
                                style={styles.pickerItem}
                                onPress={() => {
                                    setCountryCode(c.code);
                                    setCountryFlag(c.flag);
                                    setShowPicker(false);
                                }}
                            >
                                <Text style={styles.pickerFlag}>{c.flag}</Text>
                                <Text style={styles.pickerName}>{c.name}</Text>
                                <Text style={styles.pickerCode}>{c.code}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
             {/* Action Deck */}
            <View style={styles.actionContainer}>
                {bioAvailable && (
                    <TouchableOpacity 
                        onPress={handleBiometricLogin} 
                        style={styles.biometricBtn}
                    >
                        <Shield size={20} color="#2563EB" />
                        <Text style={styles.biometricText}>USE BIOMETRICS</Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                    onPress={handleLogin}
                    disabled={loading}
                    style={styles.loginButton}
                >
  <LinearGradient
                        colors={['#2563EB', '#1e40af']}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>
                            {loading ? (t('signing_in', 'Signing in...')) : (t('sign_in', 'Sign In'))}
                        </Text>
                        {!loading && <ArrowRight size={22} color="#fff" />}
                    </LinearGradient>
                </TouchableOpacity>
            </View>

                <View style={styles.registerContainer}>
                    <Text style={styles.registerText}>{t('already_member', 'New driver?')} </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerButton}>
                        <Text style={styles.registerButtonText}>{t('register_now', 'Register Now')} →</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Shield size={12} color="#64748b" />
                    <Text style={styles.footerText}>{t('secure_connection', 'SECURE CONNECTION')}</Text>
                </View>
            </View>
        </View>
      </KeyboardAvoidingView>
      </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    backgroundGradient: {
        flex: 1,
    },
    mainContent: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 30,
        paddingTop: 60,
        paddingBottom: 40,
        alignItems: 'center',
    },
    logoContainer: {
        width: 100,
        height: 100,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
        elevation: 20,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        letterSpacing: -0.5,
    },
    subtitle: {
        color: '#94a3b8',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 12,
        paddingHorizontal: 30,
        lineHeight: 22,
    },
    loginCard: {
        flex: 1,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        paddingHorizontal: 30,
        paddingTop: 45,
        elevation: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    inputLabel: {
        color: '#64748b',
        fontWeight: '900',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 15,
        marginLeft: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingLeft: 10,
        paddingRight: 20,
        height: 70,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#f1f5f9',
        marginBottom: 20,
        zIndex: 100,
    },
    countryPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: '100%',
    },
    countryFlag: {
        fontSize: 24,
        marginRight: 8,
    },
    countryCode: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 16,
    },
    divider: {
        width: 1.5,
        height: '40%',
        backgroundColor: '#e2e8f0',
        marginHorizontal: 10,
    },
    input: {
        flex: 1,
        color: '#0f172a',
        fontWeight: '700',
        fontSize: 18,
    },
    pickerDropdown: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#f1f5f9',
        marginBottom: 20,
        padding: 10,
        position: 'absolute',
        top: 130,
        left: 30,
        right: 30,
        zIndex: 1000,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    pickerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    pickerFlag: {
        fontSize: 20,
        marginRight: 15,
    },
    pickerName: {
        flex: 1,
        color: '#0f172a',
        fontWeight: '700',
        fontSize: 14,
    },
    pickerCode: {
        color: '#2563EB',
        fontWeight: '900',
        fontSize: 14,
    },
    actionContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
    loginButton: {
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
        marginTop: 10,
        elevation: 10,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    biometricBtn: {
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        borderWidth: 1.5,
        borderColor: 'rgba(37, 99, 235, 0.2)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 16,
    },
    biometricText: {
        color: '#2563EB',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 2,
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginRight: 10,
    },
    registerContainer: {
        marginTop: 35,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    registerText: {
        color: '#64748b',
        fontWeight: '700',
        fontSize: 14,
    },
    registerButton: {
        backgroundColor: '#eff6ff',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
    },
    registerButtonText: {
        color: '#2563EB',
        fontWeight: '800',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    footer: {
        marginTop: 'auto',
        paddingBottom: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.4,
    },
    footerText: {
        color: '#64748b',
        fontWeight: '900',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 8,
    },
});
