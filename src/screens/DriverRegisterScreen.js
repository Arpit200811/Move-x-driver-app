import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, User, Phone, Car, Shield, FileText, Globe, CheckCircle, Zap, ShieldCheck, ArrowRight } from 'lucide-react-native';
import api from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';

export default function DriverRegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    countryCode: '+91',
    countryFlag: '🇮🇳',
    vehicle: '',
    licenseNumber: '',
    kycLicenseUrl: null,
    kycIdUrl: null
  });
  const [loading, setLoading] = useState(false);
  const [licenseUploaded, setLicenseUploaded] = useState(false);
  const [idUploaded, setIdUploaded] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const countries = [
    { code: '+91', flag: '🇮🇳', name: 'India' },
    { code: '+971', flag: '🇦🇪', name: 'UAE' },
    { code: '+1', flag: '🇺🇸', name: 'USA' },
    { code: '+44', flag: '🇬🇧', name: 'UK' },
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia' },
  ];

  const docsUploaded = licenseUploaded && idUploaded;

  const handleRegister = async () => {
    if (!form.name || !form.phone || !form.vehicle) {
      return Alert.alert(t('input_error', 'Input Error'), t('verification_incomplete_desc', 'Please fill in all the required details.'));
    }
    
    if (!docsUploaded) {
        return Alert.alert(t('verification_error', 'Verification Required'), t('id_verification_required_desc', 'Please upload all the required documents for verification.'));
    }

    setLoading(true);
    try {
      const cleanPhone = `${form.countryCode}${form.phone.trim()}`;
      const res = await api.post('/auth/driver-apply', {
        ...form,
        name: form.name.trim(),
        phone: cleanPhone
      });

      console.log('Driver application result:', res.data);

      Alert.alert(
        t('application_submitted', 'Application Submitted'),
        t('application_success_desc', { name: form.name }) || 'Thank you for applying. Our team will review your details and contact you shortly.',
        [{ text: t('done', 'Done'), onPress: () => navigation.navigate('DriverLogin') }]
      );
    } catch (error) {
      console.error("Driver Registration Error Detail:", error?.response?.data || error.message);
      let errMessage = error.response?.data?.message;
      if (!errMessage) {
        if (error.response?.status === 400) errMessage = "Bad Request: Data mismatch or invalid input.";
        else if (error.response?.status === 404) errMessage = "Registration server endpoint not found.";
        else errMessage = error.message || t('submission_error_desc');
      }
      
      Alert.alert(t('submission_failed', 'Submission Failed'), errMessage);
    } finally {
      setLoading(false);
    }
  };

  const pickAndUpload = async (docType) => {
      let permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
          Alert.alert(t('permission_error', 'Permission Error'), t('media_permission_required', 'Storage permission is required to upload documents.'));
          return;
      }

      let pickerResult = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.6,
      });

      if (pickerResult.canceled) return;

      setLoading(true);
      try {
          const localUri = pickerResult.assets[0].uri;
          const filename = localUri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          const formData = new FormData();
          formData.append('file', { uri: localUri, name: filename, type });

          const res = await api.post('/upload/public', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 30000,
          });

          if (res.data.success) {
              if (docType === 'license') {
                  setForm(prev => ({ ...prev, kycLicenseUrl: res.data.url }));
                  setLicenseUploaded(true);
                  Alert.alert(t('license_stored'), t('license_securely_stored_desc'));
              } else {
                  setForm(prev => ({ ...prev, kycIdUrl: res.data.url }));
                  setIdUploaded(true);
                  Alert.alert(t('id_stored'), t('id_securely_stored_desc'));
              }
          } else {
              throw new Error('Server rejected the upload');
          }
      } catch (err) {
          Alert.alert('Upload Error', `Failed to upload ${docType === 'license' ? 'license' : 'ID card'}: ${err.message}`);
      } finally {
          setLoading(false);
      }
  };

  const SectionTitle = ({ title, icon: Icon }) => (
    <View style={styles.sectionTitleContainer}>
        <Icon size={14} color="#64748b" />
        <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#020617', '#0f172a']} style={styles.headerGradient}>
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('driver_registration', 'Drive with MoveX')}</Text>
                <Text style={styles.subtitle}>{t('driver_subtitle', 'Join our network of professional delivery partners.')}</Text>
            </View>

            <View style={styles.formCard}>
                <SectionTitle title={t('personal_details', 'Personal Details')} icon={User} />
                <View style={styles.inputWrapper}>
                    <User size={18} color="#2563EB" />
                    <TextInput
                        style={styles.input}
                        placeholder={t('full_name', 'Full Name')}
                        placeholderTextColor="#94a3b8"
                        value={form.name}
                        onChangeText={(v) => setForm({ ...form, name: v })}
                    />
                </View>

                <View style={styles.phoneRow}>
                    <TouchableOpacity 
                        style={styles.countryPicker}
                        onPress={() => setShowPicker(!showPicker)}
                    >
                        <Text style={styles.countryFlag}>{form.countryFlag}</Text>
                        <Text style={styles.countryCode}>{form.countryCode}</Text>
                    </TouchableOpacity>
                    
                    <View style={styles.phoneInputBox}>
                        <Phone size={18} color="#2563EB" />
                        <TextInput
                            style={styles.input}
                            placeholder={t('phone_number', 'Phone Number')}
                            placeholderTextColor="#94a3b8"
                            keyboardType="phone-pad"
                            value={form.phone}
                            onChangeText={(v) => setForm({ ...form, phone: v })}
                        />
                    </View>
                </View>

                {showPicker && (
                    <View style={styles.pickerDropdown}>
                        {countries.map(c => (
                            <TouchableOpacity 
                                key={c.code} 
                                style={styles.pickerItem}
                                onPress={() => {
                                    setForm({ ...form, countryCode: c.code, countryFlag: c.flag });
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

                <SectionTitle title={t('vehicle_details', 'Vehicle Details')} icon={Car} />
                <View style={[styles.inputWrapper, { marginBottom: 15 }]}>
                    <Car size={18} color="#2563EB" />
                    <TextInput
                        style={styles.input}
                        placeholder={t('vehicle_model', 'Vehicle Model & Year')}
                        placeholderTextColor="#94a3b8"
                        value={form.vehicle}
                        onChangeText={(v) => setForm({ ...form, vehicle: v })}
                    />
                </View>
                <View style={[styles.inputWrapper, { marginBottom: 30 }]}>
                    <FileText size={18} color="#2563EB" />
                    <TextInput
                        style={styles.input}
                        placeholder={t('license_number', 'Driver License Number')}
                        placeholderTextColor="#94a3b8"
                        value={form.licenseNumber}
                        onChangeText={(v) => setForm({ ...form, licenseNumber: v })}
                    />
                </View>

                <SectionTitle title={t('documents_verification', 'Documents & Verification')} icon={Shield} />
                <View style={{ gap: 12, marginBottom: 40 }}>
                    {/* License Upload */}
                    <TouchableOpacity 
                        style={[styles.uploadBox, licenseUploaded && styles.uploadBoxSuccess]}
                        onPress={() => pickAndUpload('license')}
                        disabled={loading || licenseUploaded}
                    >
                        {licenseUploaded ? <ShieldCheck size={22} color="#10B981" /> : <FileText size={22} color="#2563EB" />}
                        <View style={{ marginLeft: 15, flex: 1 }}>
                            <Text style={[styles.uploadText, licenseUploaded && { color: '#10B981' }]}>
                                {licenseUploaded ? '✅ License Uploaded' : 'Upload Driving License'}
                            </Text>
                            <Text style={styles.uploadSubtext}>Required • Max 5MB</Text>
                        </View>
                    </TouchableOpacity>

                    {/* ID Card Upload */}
                    <TouchableOpacity 
                        style={[styles.uploadBox, idUploaded && styles.uploadBoxSuccess]}
                        onPress={() => pickAndUpload('id')}
                        disabled={loading || idUploaded}
                    >
                        {idUploaded ? <ShieldCheck size={22} color="#10B981" /> : <Shield size={22} color="#2563EB" />}
                        <View style={{ marginLeft: 15, flex: 1 }}>
                            <Text style={[styles.uploadText, idUploaded && { color: '#10B981' }]}>
                                {idUploaded ? '✅ ID Card Uploaded' : 'Upload Government ID'}
                            </Text>
                            <Text style={styles.uploadSubtext}>Aadhar / Passport / Voter ID</Text>
                        </View>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.actionButton, (!docsUploaded || loading) && { opacity: 0.5 }]}
                    onPress={handleRegister}
                    disabled={loading || !docsUploaded}
                >
                    <LinearGradient
                        colors={['#2563EB', '#1e40af']}
                        style={styles.actionButtonGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.actionButtonText}>{t('submit_application', 'Submit Application')}</Text>
                                <ArrowRight size={20} color="#fff" />
                            </View>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => navigation.navigate('DriverLogin')}
                  style={{ marginTop: 30, alignItems: 'center', paddingBottom: 40 }}
                >
                  <Text style={styles.backButtonText}>
                    {t('already_member', 'Already have an account?')} <Text style={{ color: '#2563EB' }}>{t('login_cta', 'Sign In')}</Text>
                  </Text>
                </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    headerGradient: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        paddingTop: 60,
        paddingBottom: 40,
        paddingHorizontal: 30,
    },
    logoContainer: {
        width: 70,
        height: 70,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
        elevation: 10,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#fff',
        fontStyle: 'italic',
        letterSpacing: -1,
    },
    subtitle: {
        color: '#94a3b8',
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 10,
        lineHeight: 20,
    },
    formCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderTopLeftRadius: 50,
        borderTopRightRadius: 50,
        paddingHorizontal: 30,
        paddingTop: 45,
        minHeight: 800,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    sectionTitleText: {
        color: '#64748b',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#f1f5f9',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginBottom: 15,
    },
    input: {
        flex: 1,
        marginLeft: 15,
        color: '#0f172a',
        fontWeight: '800',
        fontSize: 16,
        fontStyle: 'italic',
    },
    phoneRow: {
        flexDirection: 'row',
        marginBottom: 15,
        zIndex: 100,
    },
    countryPicker: {
        width: 110,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#f1f5f9',
        paddingHorizontal: 12,
        marginRight: 10,
    },
    countryFlag: {
        fontSize: 22,
        marginRight: 6,
    },
    countryCode: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 14,
    },
    phoneInputBox: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#f1f5f9',
        paddingHorizontal: 20,
    },
    pickerDropdown: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#f1f5f9',
        marginBottom: 20,
        padding: 5,
        position: 'absolute',
        top: 250,
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
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f8fafc',
    },
    pickerFlag: {
        fontSize: 18,
        marginRight: 12,
    },
    pickerName: {
        flex: 1,
        color: '#0f172a',
        fontWeight: '700',
        fontSize: 13,
    },
    pickerCode: {
        color: '#2563EB',
        fontWeight: '900',
        fontSize: 13,
    },
    uploadBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 25,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#e2e8f0',
        backgroundColor: '#f8fafc',
    },
    uploadBoxSuccess: {
        backgroundColor: '#f0fdf4',
        borderColor: '#bbf7d0',
        borderStyle: 'solid',
    },
    uploadText: {
        fontWeight: '900',
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: 1,
        color: '#2563EB',
        fontStyle: 'italic',
    },
    uploadSubtext: {
        fontSize: 10,
        color: '#94a3b8',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    actionButton: {
        height: 75,
        borderRadius: 25,
        overflow: 'hidden',
        marginTop: 20,
        elevation: 8,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    actionButtonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginRight: 10,
        fontStyle: 'italic',
    },
    backButtonText: {
        color: '#94a3b8',
        fontWeight: '900',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontStyle: 'italic',
    }
});


