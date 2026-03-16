import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  Alert, Image, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet
} from 'react-native';
import { ChevronLeft, ShieldCheck, Clock, CheckCircle2, AlertTriangle, FileText, Camera, Plus } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

export default function KYCVerificationScreen({ navigation }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState('PENDING'); // PENDING, VERIFIED, REJECTED
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const raw = await AsyncStorage.getItem('movex_user');
        if (raw) {
          const user = JSON.parse(raw);
          // status is mapped from user.status (pending, verified/available, rejected)
          const mappedStatus = user.status === 'pending' ? 'PENDING' : 
                               (user.status === 'rejected' ? 'REJECTED' : 'VERIFIED');
          setStatus(mappedStatus);
        }
      } catch (e) {} finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, []);

  const kycSteps = [
    { id: '1', title: 'Identity Verification', status: 'COMPLETED', icon: FileText },
    { id: '2', title: 'Driver License', status: 'UNDER_REVIEW', icon: ShieldCheck },
    { id: '3', title: 'Background Check', status: 'PENDING', icon: Clock },
  ];

  if (loading) return <View style={styles.loading}><ActivityIndicator color="#2563EB" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ChevronLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t('kyc_verification', 'KYC Verification')}</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusIconBox}>
            {status === 'VERIFIED' ? (
              <CheckCircle2 size={48} color="#10B981" />
            ) : status === 'REJECTED' ? (
              <AlertTriangle size={48} color="#EF4444" />
            ) : (
              <Clock size={48} color="#F59E0B" />
            )}
          </View>
          <Text style={styles.statusTitle}>
            {status === 'VERIFIED' ? 'Account Verified' : status === 'REJECTED' ? 'Verification Failed' : 'Verification Pending'}
          </Text>
          <Text style={styles.statusDesc}>
            {status === 'VERIFIED' 
              ? 'Your profile is fully verified. You are ready to accept all types of deliveries.' 
              : 'Our team is currently reviewing your documents. This usually takes 24-48 hours.'}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>{t('verification_steps', 'VERIFICATION STEPS')}</Text>
        <View style={styles.stepsList}>
          {kycSteps.map((step, i) => (
            <View key={step.id} style={styles.stepItem}>
              <View style={[styles.stepIconBox, { backgroundColor: step.status === 'COMPLETED' ? '#ecfdf5' : '#f8fafc' }]}>
                <step.icon size={20} color={step.status === 'COMPLETED' ? '#10B981' : '#64748b'} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={[styles.stepStatus, { color: step.status === 'COMPLETED' ? '#10B981' : '#f59e0b' }]}>
                  {step.status.replace('_', ' ')}
                </Text>
              </View>
              {step.status === 'COMPLETED' ? (
                <CheckCircle2 size={20} color="#10B981" />
              ) : (
                <ActivityIndicator size="small" color="#f59e0b" />
              )}
            </View>
          ))}
        </View>

        {status !== 'VERIFIED' && (
          <TouchableOpacity 
            style={styles.actionBtn}
            onPress={() => navigation.navigate('VehicleDocuments')}
          >
            <LinearGradient colors={['#2563EB', '#1e40af']} style={styles.actionGradient}>
              <Plus size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.actionBtnText}>Update Documents</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.supportBtn} onPress={() => navigation.navigate('SupportHub')}>
          <Text style={styles.supportBtnText}>{t('contact_support', 'Need Help? Contact Support')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' },
  header: { paddingBottom: 40, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  statusCard: { alignItems: 'center', marginTop: 30, paddingHorizontal: 40 },
  statusIconBox: { width: 90, height: 90, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  statusTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 10 },
  statusDesc: { fontSize: 13, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 20 },
  content: { padding: 25 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 1.5, marginBottom: 16 },
  stepsList: { gap: 12 },
  stepItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9' },
  stepIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  stepTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  stepStatus: { fontSize: 11, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' },
  supportBtn: { marginTop: 40, alignItems: 'center', marginBottom: 60 },
  supportBtnText: { color: '#2563EB', fontWeight: '700', fontSize: 14 },
  actionBtn: { height: 64, borderRadius: 20, overflow: 'hidden', marginTop: 32, shadowColor: '#2563EB', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  actionGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});
