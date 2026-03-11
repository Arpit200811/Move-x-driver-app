import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Image, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { 
    ChevronLeft, User, Phone, Truck, Wifi, WifiOff, MapPin, Edit3, 
    Check, X, Shield, Zap, LogOut, Globe, Circle, Activity, ChevronRight, 
    Navigation as NavIcon, HelpCircle, FileText, BadgeCheck, Bell, MessageSquare 
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import api from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';

const nameSchema = yup.object().shape({
  name: yup.string().required('Name cannot be empty').min(2, 'Name is too short')
});

const { width } = Dimensions.get('window');

export default function DriverProfileScreen({ navigation }) {
  const { t, i18n } = useTranslation();
  const [driver, setDriver] = useState(null);
  const [isOnline, setIsOnline] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(nameSchema),
    defaultValues: { name: '' },
    mode: 'onChange'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const locationInterval = useRef(null);

  useEffect(() => {
    loadDriver();
    return () => { if (locationInterval.current) clearInterval(locationInterval.current); };
  }, []);

  const loadDriver = async () => {
    try {
      const raw = await AsyncStorage.getItem('movex_user');
      if (raw) {
        const u = JSON.parse(raw);
        setDriver(u);
        setIsOnline(u.isOnline || false);
        reset({ name: u.name || '' });
        const bio = await AsyncStorage.getItem('biometric_enabled');
        setBiometricEnabled(bio === 'true');
      }
    } finally { setLoading(false); }
  };

  const handleToggleOnline = async () => {
    try {
      const res = await api.post('/auth/toggle-online');
      const newStatus = res.data.isOnline;
      setIsOnline(newStatus);
      const updated = { ...driver, isOnline: newStatus, status: res.data.status };
      setDriver(updated);
      await AsyncStorage.setItem('movex_user', JSON.stringify(updated));

      if (newStatus) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          locationInterval.current = setInterval(async () => {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            await api.post('/auth/location', { lat: loc.coords.latitude, lng: loc.coords.longitude });
          }, 10000);
          Alert.alert('Online', 'You are now online and ready to receive requests.');
        }
      } else {
        if (locationInterval.current) { clearInterval(locationInterval.current); locationInterval.current = null; }
        Alert.alert('Offline', 'You are now offline.');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update status. Please check your connection.');
    }
  };

  const handleSaveName = async (data) => {
    setSaving(true);
    try {
      const res = await api.put('/auth/profile', { name: data.name.trim() });
      const updated = { ...driver, name: res.data.user.name };
      setDriver(updated);
      await AsyncStorage.setItem('movex_user', JSON.stringify(updated));
      setEditingName(false);
      Toast.show({ type: 'success', text1: 'Success', text2: 'Identity updated successfully' });
    } catch (_) { 
        Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to update identity.' }); 
    }
    finally { setSaving(false); }
  };

  const handleLogout = async () => {
    Alert.alert(t('logout'), 'Disconnect from MoveX network?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: async () => {
        if (locationInterval.current) clearInterval(locationInterval.current);
        await SecureStore.deleteItemAsync('movex_token');
        await AsyncStorage.removeItem('movex_user');
        navigation.reset({ index: 0, routes: [{ name: 'DriverLogin' }] });
      }}
    ]);
  };

  if (loading) return <View style={styles.loadingContainer}><ActivityIndicator color="#2563EB" size="large" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
            <View style={styles.headerTop}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                    <ChevronLeft size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('driver_profile', 'Driver Profile')}</Text>
                <TouchableOpacity style={styles.headerButton} onPress={() => navigation.navigate('DriverNotifications')}>
                    <Bell size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.profileBox}>
                <View style={styles.avatarWrapper}>
                    <View style={styles.avatarOuter}>
                        <Image
                            source={{ uri: driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?._id}` }}
                            style={styles.avatar}
                        />
                    </View>
                    <View style={[styles.statusIndicator, { backgroundColor: isOnline ? '#10B981' : '#64748b' }]} />
                </View>
                
                <View style={styles.nameSection}>
                    {editingName ? (
                        <View style={{ alignItems: 'center' }}>
                            <View style={[styles.editNameRow, errors.name && { borderColor: '#ef4444', borderWidth: 1 }]}>
                                <Controller
                                    control={control}
                                    name="name"
                                    render={({ field: { onChange, onBlur, value } }) => (
                                        <TextInput 
                                            style={styles.nameInput} 
                                            value={value} 
                                            onChangeText={onChange}
                                            onBlur={onBlur}
                                            autoFocus 
                                        />
                                    )}
                                />
                                <TouchableOpacity onPress={handleSubmit(handleSaveName)} disabled={saving} style={styles.saveCheck}>
                                    <Check size={20} color="#10B981" />
                                </TouchableOpacity>
                            </View>
                            {errors.name && <Text style={{ color: '#ef4444', fontSize: 11, marginTop: 4, fontWeight: 'bold' }}>{errors.name.message}</Text>}
                        </View>
                    ) : (
                        <TouchableOpacity onPress={() => setEditingName(true)} style={styles.nameDisplayRow}>
                            <Text style={styles.nameText}>{driver?.name}</Text>
                            <Edit3 size={16} color="rgba(255,255,255,0.4)" style={{ marginLeft: 12 }} />
                        </TouchableOpacity>
                    )}
                    <View style={styles.phoneBadge}>
                        <Text style={styles.phoneBadgeText}>{driver?.phone}</Text>
                    </View>
                </View>
            </View>
        </LinearGradient>

        <View style={styles.mainContent}>
            {/* Status Switch */}
            <TouchableOpacity 
                onPress={handleToggleOnline}
                style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}
            >
                <View style={[styles.statusIconBox, { backgroundColor: isOnline ? '#10B981' : '#f1f5f9' }]}>
                    {isOnline ? <Wifi size={24} color="#fff" /> : <WifiOff size={24} color="#64748b" />}
                </View>
                <View style={styles.statusInfo}>
                    <Text style={[styles.statusTitle, { color: isOnline ? '#065f46' : '#0f172a' }]}>{isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
                    <Text style={styles.statusSub}>{isOnline ? 'Active & Ready' : 'Shift Ended'}</Text>
                </View>
                <Switch
                    value={isOnline}
                    onValueChange={handleToggleOnline}
                    trackColor={{ false: '#e2e8f0', true: '#10B981' }}
                    thumbColor="#fff"
                />
            </TouchableOpacity>

            <Text style={styles.sectionLabel}>{t('performance_analytics', 'PERFORMANCE ANALYTICS')}</Text>
            <View style={styles.performanceRow}>
                <View style={styles.performanceStat}>
                    <Text style={styles.statLabel}>Acceptance</Text>
                    <Text style={styles.statValue}>98.5%</Text>
                </View>
                <View style={[styles.performanceStat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#f1f5f9' }]}>
                    <Text style={styles.statLabel}>Rating</Text>
                    <Text style={[styles.statValue, { color: '#F59E0B' }]}>4.9 ★</Text>
                </View>
                <View style={styles.performanceStat}>
                    <Text style={styles.statLabel}>Cancelled</Text>
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>1.2%</Text>
                </View>
            </View>

            <Text style={styles.sectionLabel}>{t('performance_feedback', 'FEEDBACK & COMPLIANCE')}</Text>
            <View style={styles.infoCard}>
                <TouchableOpacity onPress={() => navigation.navigate('RatingHistory')} style={styles.infoItem}>
                    <View style={styles.infoIconBox}>
                        <MessageSquare size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoItemLabel}>Client Reviews</Text>
                        <Text style={styles.infoItemValue}>Ratings & Feedback</Text>
                    </View>
                    <ChevronRight size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('KYCVerification')} style={styles.infoItem}>
                    <View style={styles.infoIconBox}>
                        <BadgeCheck size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoItemLabel}>Verification Status</Text>
                        <Text style={[styles.infoItemValue, { color: '#F59E0B' }]}>Pending Approval</Text>
                    </View>
                    <ChevronRight size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('VehicleDocuments')} style={styles.infoItem}>
                    <View style={styles.infoIconBox}>
                        <FileText size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoItemLabel}>Vehicle Documents</Text>
                        <Text style={styles.infoItemValue}>Manage RC & Insurance</Text>
                    </View>
                    <ChevronRight size={16} color="#cbd5e1" />
                </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>{t('settings', 'SETTINGS')}</Text>
            <View style={styles.infoCard}>
                <TouchableOpacity onPress={() => navigation.navigate('NavigationSettings')} style={styles.infoItem}>
                    <View style={styles.infoIconBox}>
                        <NavIcon size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoItemLabel}>Navigation</Text>
                        <Text style={styles.infoItemValue}>Preferred Map Engine</Text>
                    </View>
                    <ChevronRight size={16} color="#cbd5e1" />
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('SupportHub')} style={styles.infoItem}>
                    <View style={styles.infoIconBox}>
                        <HelpCircle size={18} color="#2563EB" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.infoItemLabel}>Support Center</Text>
                        <Text style={styles.infoItemValue}>Help & Reporting</Text>
                    </View>
                    <ChevronRight size={16} color="#cbd5e1" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <LogOut size={20} color="#EF4444" />
                <Text style={styles.logoutText}>{t('logout', 'Sign Out')}</Text>
            </TouchableOpacity>

            <View style={styles.versionBox}>
                <Text style={styles.versionText}>MoveX Fleet v2.5.4</Text>
            </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc' },
    header: { paddingTop: 64, paddingBottom: 80, paddingHorizontal: 32, borderBottomLeftRadius: 64, borderBottomRightRadius: 64 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
    headerButton: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', fontStyle: 'italic' },
    profileBox: { alignItems: 'center' },
    avatarWrapper: { position: 'relative' },
    avatarOuter: { padding: 4, borderRadius: 44, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    avatar: { width: 110, height: 110, borderRadius: 40, backgroundColor: '#fff' },
    statusIndicator: { position: 'absolute', bottom: 0, right: 8, width: 32, height: 32, borderRadius: 16, borderWidth: 4, borderColor: '#0f172a' },
    nameSection: { marginTop: 24, alignItems: 'center' },
    editNameRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16 },
    nameInput: { color: '#fff', fontWeight: '900', fontSize: 24, fontStyle: 'italic', minWidth: 150, textAlign: 'center' },
    saveCheck: { marginLeft: 16 },
    nameDisplayRow: { flexDirection: 'row', alignItems: 'center' },
    nameText: { color: '#fff', fontWeight: '900', fontSize: 32, fontStyle: 'italic', letterSpacing: -1 },
    phoneBadge: { marginTop: 8, backgroundColor: 'rgba(37, 99, 235, 0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
    phoneBadgeText: { color: 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 12, letterSpacing: 1 },
    mainContent: { paddingHorizontal: 32, marginTop: -40, marginBottom: 80 },
    statusCard: { flexDirection: 'row', alignItems: 'center', padding: 24, borderRadius: 40, borderWidth: 2, marginBottom: 32, backgroundColor: '#fff' },
    statusCardOnline: { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' },
    statusCardOffline: { borderColor: '#f1f5f9' },
    statusIconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    statusInfo: { flex: 1, marginLeft: 20 },
    statusTitle: { fontWeight: '900', fontSize: 16, fontStyle: 'italic' },
    statusSub: { color: '#94a3b8', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 4 },
    sectionLabel: { color: '#94a3b8', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 16, marginLeft: 16 },
    infoCard: { backgroundColor: '#fff', borderRadius: 40, padding: 8, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 40 },
    infoItem: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    infoIconBox: { width: 40, height: 40, backgroundColor: '#f8fafc', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    infoItemLabel: { color: '#94a3b8', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1.5 },
    infoItemValue: { color: '#0f172a', fontWeight: '900', fontSize: 14, fontStyle: 'italic', marginTop: 2 },
    performanceRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 32, padding: 24, marginBottom: 32, borderWidth: 1, borderColor: '#f1f5f9' },
    performanceStat: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
    statValue: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
    logoutButton: { backgroundColor: '#fff1f2', height: 80, borderRadius: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#ffe4e6', marginBottom: 40 },
    logoutText: { color: '#e11d48', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1.5, fontStyle: 'italic', marginLeft: 16 },
    versionBox: { alignItems: 'center', opacity: 0.2 },
    versionText: { color: '#64748b', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 3 }
});
