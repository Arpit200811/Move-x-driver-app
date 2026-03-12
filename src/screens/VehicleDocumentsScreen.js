import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Image, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Platform
} from 'react-native';
import { ChevronLeft, FileText, Camera, Check, AlertCircle, Calendar } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../services/api';

export default function VehicleDocumentsScreen({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState({
    registration: { status: 'PENDING', expiry: '---', uri: null },
    insurance: { status: 'PENDING', expiry: '---', uri: null },
    permit: { status: 'PENDING', expiry: '---', uri: null },
  });

  useEffect(() => {
    loadDriverData();
  }, []);

  const loadDriverData = async () => {
    try {
      const userData = await AsyncStorage.getItem('movex_user');
      if (userData) {
        const driver = JSON.parse(userData);
        setDocs({
          registration: { status: driver.kycLicenseUrl ? 'VERIFIED' : 'PENDING', expiry: '2026-12-01', uri: driver.kycLicenseUrl },
          insurance: { status: 'VERIFIED', expiry: '2025-01-15', uri: null },
          permit: { status: driver.kycIdUrl ? 'VERIFIED' : 'PENDING', expiry: '2025-06-20', uri: driver.kycIdUrl },
        });
      }
    } catch (e) {
      console.log('Error loading driver data');
    }
  };

  const handleUpload = async (type) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Error', 'Gallery access required');

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setLoading(true);
      try {
          const localUri = Platform.OS === 'android' ? result.assets[0].uri : result.assets[0].uri.replace('file://', '');
          const filename = result.assets[0].uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const fileType = match ? `image/${match[1]}` : 'image/jpeg';

          const formData = new FormData();
          formData.append('file', { uri: localUri, name: filename, type: fileType });

          const uploadRes = await api.post('/upload/public', formData, {
              headers: { 'Content-Type': 'multipart/form-data' }
          });

          if (uploadRes.data.success) {
              const updateData = type === 'registration' ? { kycLicenseUrl: uploadRes.data.url } : { kycIdUrl: uploadRes.data.url };
              await api.patch('/auth/profile', updateData);
              
              setDocs(prev => ({
                ...prev,
                [type]: { ...prev[type], status: 'VERIFIED', uri: uploadRes.data.url }
              }));
              Alert.alert('Success', 'Document updated successfully!');
          }
      } catch (err) {
          Alert.alert('Error', 'Upload failed. Please try again.');
      } finally {
          setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('vehicle_documents', 'Vehicle Documents')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBanner}>
          <AlertCircle size={20} color="#F59E0B" />
          <Text style={styles.infoBannerText}>
             {t('expiry_warning', 'Please ensure your insurance is updated to avoid any service interruption.')}
          </Text>
        </View>

        <DocumentCard 
            title="Registration Certificate (RC)" 
            status={docs.registration.status} 
            expiry={docs.registration.expiry}
            onUpload={() => handleUpload('registration')}
        />

        <DocumentCard 
            title="Commercial Insurance" 
            status={docs.insurance.status} 
            expiry={docs.insurance.expiry}
            onUpload={() => handleUpload('insurance')}
            isExpired
        />

        <DocumentCard 
            title="Route Permit" 
            status={docs.permit.status} 
            expiry={docs.permit.expiry}
            onUpload={() => handleUpload('permit')}
        />
      </ScrollView>

      <TouchableOpacity style={styles.mainSaveBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.mainSaveBtnText}>{t('done', 'Return to Profile')}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function DocumentCard({ title, status, expiry, onUpload, isExpired }) {
    return (
        <View style={[styles.docCard, isExpired && styles.errorCard]}>
            <View style={styles.docHeader}>
                <View style={[styles.docIconBox, { backgroundColor: isExpired ? '#FEF2F2' : '#F8FAF6' }]}>
                    <FileText size={20} color={isExpired ? '#EF4444' : '#10B981'} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.docTitle}>{title}</Text>
                    <View style={styles.expiryRow}>
                        <Calendar size={12} color="#94a3b8" />
                        <Text style={styles.expiryText}>Expires: {expiry}</Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: status === 'VERIFIED' ? '#ECFDF5' : status === 'EXPIRED' ? '#FEF2F2' : '#FFF7ED' }]}>
                    <Text style={[styles.statusBadgeText, { color: status === 'VERIFIED' ? '#10B981' : status === 'EXPIRED' ? '#EF4444' : '#F59E0B' }]}>
                        {status}
                    </Text>
                </View>
            </View>

            <TouchableOpacity style={styles.uploadBtn} onPress={onUpload}>
                <Camera size={18} color="#2563EB" />
                <Text style={styles.uploadBtnText}>UPDATE DOCUMENT</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  infoBanner: { flexDirection: 'row', backgroundColor: '#FFFBEB', padding: 16, borderRadius: 16, marginBottom: 24, borderWidth: 1, borderColor: '#FEF3C7' },
  infoBannerText: { flex: 1, marginLeft: 12, fontSize: 13, color: '#92400E', fontWeight: '600', lineHeight: 20 },
  docCard: { backgroundColor: '#fff', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#f1f5f9', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  errorCard: { borderColor: '#FECACA', backgroundColor: '#FFF5F5' },
  docHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  docIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  docTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  expiryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  expiryText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  statusBadgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, backgroundColor: '#EFF6FF', borderRadius: 12, borderDash: [5, 5] },
  uploadBtnText: { marginLeft: 10, fontSize: 12, fontWeight: '800', color: '#2563EB', letterSpacing: 1 },
  mainSaveBtn: { position: 'absolute', bottom: 30, left: 20, right: 20, backgroundColor: '#000', height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  mainSaveBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 1 }
});
