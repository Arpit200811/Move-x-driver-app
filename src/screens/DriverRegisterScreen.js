import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Truck, User, Phone, Car, Shield, FileText, Globe, CheckCircle, Zap, ShieldCheck, ArrowRight } from 'lucide-react-native';
import api from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import * as ImagePicker from 'expo-image-picker';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Toast from 'react-native-toast-message';

const registerSchema = yup.object().shape({
  name: yup.string().required('Full name is required').min(2, 'Name must be at least 2 characters'),
  phone: yup.string().required('Phone number is required').min(10, 'Phone must be at least 10 digits').matches(/^\d+$/, 'Numeric characters only'),
  vehicle: yup.string().required('Vehicle model & year is required'),
  licenseNumber: yup.string().required('Driver license number is required'),
});

export default function DriverRegisterScreen({ navigation }) {
  const { t } = useTranslation();
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(registerSchema),
    defaultValues: { name: '', phone: '', vehicle: '', licenseNumber: '' },
    mode: 'onChange'
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [countryFlag, setCountryFlag] = useState('🇮🇳');
  const [kycLicenseUrl, setKycLicenseUrl] = useState(null);
  const [kycIdUrl, setKycIdUrl] = useState(null);
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

  const handleRegister = async (data) => {
    require('react-native').Keyboard.dismiss();
    if (!docsUploaded) {
        Toast.show({ type: 'error', text1: String(t('verification_required', 'Verification Required')), text2: 'Please upload all the required documents for verification.' });
        return;
    }

    setLoading(true);
    try {
      const cleanPhone = `${countryCode}${String(data.phone || '').trim()}`;
      const res = await api.post('/auth/driver-apply', {
        ...data,
        name: String(data.name || '').trim(),
        phone: cleanPhone,
        kycLicenseUrl,
        kycIdUrl
      });

      console.log('Driver application result:', res.data);

      Alert.alert(
        String(t('application_submitted', 'Application Submitted')),
        String(t('application_success_desc', { name: data.name }) || 'Thank you for applying. Our team will review your details and contact you shortly.'),
        [{ text: String(t('done', 'Done')), onPress: () => navigation.navigate('DriverLogin') }]
      );
    } catch (error) {
      console.error("Driver Registration Error Detail:", error?.response?.data || error.message);
      let errMessage = error.response?.data?.message;
      if (!errMessage) {
        if (error.response?.status === 400) errMessage = "Bad Request: Data mismatch or invalid input.";
        else if (error.response?.status === 404) errMessage = "Registration server endpoint not found.";
        else errMessage = error.message || t('submission_error_desc');
      }
      
      Alert.alert(String(t('submission_failed', 'Submission Failed')), String(errMessage));
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
          const localUri = Platform.OS === 'android' ? pickerResult.assets[0].uri : pickerResult.assets[0].uri.replace('file://', '');
          const filename = pickerResult.assets[0].uri.split('/').pop();
          const match = /\.(\w+)$/.exec(filename);
          const type = match ? `image/${match[1]}` : 'image/jpeg';

          const formData = new FormData();
          // @ts-ignore
          formData.append('file', {
            uri: Platform.OS === 'android' ? pickerResult.assets[0].uri : pickerResult.assets[0].uri.replace('file://', ''),
            name: filename,
            type
          });

          const res = await api.post('/upload/public', formData, {
              headers: { 
                  'Accept': 'application/json',
                  'Content-Type': 'multipart/form-data',
              },
              timeout: 60000,
          });

          if (res.data.success) {
              if (docType === 'license') {
                  setKycLicenseUrl(res.data.url);
                  setLicenseUploaded(true);
                  Toast.show({ type: 'success', text1: 'Success', text2: 'License uploaded successfully' });
              } else {
                  setKycIdUrl(res.data.url);
                  setIdUploaded(true);
                  Toast.show({ type: 'success', text1: 'Success', text2: 'ID uploaded successfully' });
              }
          } else {
              throw new Error('Server rejected the upload');
          }
      } catch (err) {
          console.error("DEBUG: Upload Error Context:", {
            endpoint: '/upload/public',
            errorMessage: err.message,
            stack: err.stack,
            config: err.config,
            response: err.response?.data
          });
          Toast.show({ type: 'error', text1: 'Upload Error', text2: 'Failed to upload document: ' + err.message });
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
                <View style={[styles.inputWrapper, errors.name && { borderColor: '#ef4444' }]}>
                    <User size={18} color="#2563EB" />
                    <Controller
                        control={control}
                        name="name"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={styles.input}
                                placeholder={t('full_name', 'Full Name')}
                                placeholderTextColor="#94a3b8"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                            />
                        )}
                    />
                </View>
                {errors.name && <Text style={{ color: '#ef4444', fontSize: 11, marginTop: -10, marginBottom: 15, marginLeft: 15, fontWeight: 'bold' }}>{errors.name.message}</Text>}

                <View style={styles.phoneRow}>
                    <TouchableOpacity 
                        style={styles.countryPicker}
                        onPress={() => setShowPicker(!showPicker)}
                    >
                        <Text style={styles.countryFlag}>{countryFlag}</Text>
                        <Text style={styles.countryCode}>{countryCode}</Text>
                    </TouchableOpacity>
                    
                    <View style={[styles.phoneInputBox, errors.phone && { borderColor: '#ef4444' }]}>
                        <Phone size={18} color="#2563EB" />
                        <Controller
                            control={control}
                            name="phone"
                            render={({ field: { onChange, onBlur, value } }) => (
                                <TextInput
                                    style={styles.input}
                                    placeholder={t('phone_number', 'Phone Number')}
                                    placeholderTextColor="#94a3b8"
                                    keyboardType="phone-pad"
                                    value={value}
                                    onChangeText={onChange}
                                    onBlur={onBlur}
                                />
                            )}
                        />
                    </View>
                </View>
                {errors.phone && <Text style={{ color: '#ef4444', fontSize: 11, marginTop: -10, marginBottom: 15, marginLeft: 15, fontWeight: 'bold' }}>{errors.phone.message}</Text>}

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

                <SectionTitle title={t('vehicle_details', 'Vehicle Details')} icon={Car} />
                <View style={[styles.inputWrapper, { marginBottom: 15 }, errors.vehicle && { borderColor: '#ef4444' }]}>
                    <Car size={18} color="#2563EB" />
                    <Controller
                        control={control}
                        name="vehicle"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={styles.input}
                                placeholder={t('vehicle_model', 'Vehicle Model & Year')}
                                placeholderTextColor="#94a3b8"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                            />
                        )}
                    />
                </View>
                {errors.vehicle && <Text style={{ color: '#ef4444', fontSize: 11, marginTop: -10, marginBottom: 15, marginLeft: 15, fontWeight: 'bold' }}>{errors.vehicle.message}</Text>}

                <View style={[styles.inputWrapper, { marginBottom: 30 }, errors.licenseNumber && { borderColor: '#ef4444' }]}>
                    <FileText size={18} color="#2563EB" />
                    <Controller
                        control={control}
                        name="licenseNumber"
                        render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                                style={styles.input}
                                placeholder={t('license_number', 'Driver License Number')}
                                placeholderTextColor="#94a3b8"
                                value={value}
                                onChangeText={onChange}
                                onBlur={onBlur}
                            />
                        )}
                    />
                </View>
                {errors.licenseNumber && <Text style={{ color: '#ef4444', fontSize: 11, marginTop: -25, marginBottom: 25, marginLeft: 15, fontWeight: 'bold' }}>{errors.licenseNumber.message}</Text>}

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
                    onPress={handleSubmit(handleRegister)}
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
                                <Text style={styles.actionButtonText}>{String(t('submit_application', 'Submit Application'))}</Text>
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


