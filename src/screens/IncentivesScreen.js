import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet, ScrollView, Dimensions, ActivityIndicator } from 'react-native';
import { ChevronLeft, Trophy, Target, Zap, TrendingUp, Calendar, ChevronRight, Gift, Shield } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../services/api';

const { width } = Dimensions.get('window');

export default function IncentivesScreen({ navigation }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchIncentives();
  }, []);

  const fetchIncentives = async () => {
    try {
        const res = await api.get('/drivers/incentives');
        setData(res.data.incentives);
    } catch (e) {
        console.log('Incentives fetch error');
    } finally {
        setLoading(false);
    }
  };

  if (loading) return (
      <View style={{ flex: 1, backgroundColor: '#fff', justifyContent: 'center' }}>
          <ActivityIndicator color="#2563EB" size="large" />
      </View>
  );

  const daily = data?.daily || { trips: 0, goal: 12, progress: 0, bonus: 20 };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <LinearGradient colors={['#2563EB', '#1e40af']} style={styles.header}>
        <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('incentives_goals', 'Bonus & Goals')}</Text>
            <View style={{ width: 40 }} />
        </View>

        <View style={styles.heroSection}>
            <Trophy size={48} color="#FBBF24" />
            <Text style={styles.heroTitle}>{daily.progress >= 100 ? 'Goal Achieved!' : 'Tracking Well'}</Text>
            <Text style={styles.heroSub}>You are tracking well towards your daily bonus goal.</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.goalCard}>
              <View style={styles.cardHeader}>
                  <View style={styles.iconBox}>
                      <Target size={24} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 16 }}>
                      <Text style={styles.goalTitle}>Daily Hero Bonus</Text>
                      <Text style={styles.goalSub}>Complete {daily.goal} deliveries today</Text>
                  </View>
                  <Text style={styles.bonusAmt}>+₹{daily.bonus}.00</Text>
              </View>
              
              <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${daily.progress}%` }]} />
                  </View>
                  <View style={styles.progressLabels}>
                      <Text style={styles.progressText}>{daily.trips} of {daily.goal} completed</Text>
                      <Text style={styles.percentText}>{Math.round(daily.progress)}%</Text>
                  </View>
              </View>
          </View>

          <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>WEEKLY CHALLENGES</Text>
          </View>

          {data?.challenges?.map((challenge) => (
            <TouchableOpacity key={challenge.id} style={styles.challengeItem}>
                <LinearGradient colors={challenge.type === 'zap' ? ['#F0F9FF', '#E0F2FE'] : ['#FDF2F8', '#FCE7F3']} style={styles.challengeIcon}>
                    {challenge.type === 'zap' ? <Zap size={20} color="#0284C7" /> : <Shield size={20} color="#DB2777" />}
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDesc}>{challenge.progress}/{challenge.goal} completed</Text>
                </View>
                <View style={styles.rewardBadge}>
                    <Text style={styles.rewardTxt}>₹{challenge.reward}</Text>
                </View>
            </TouchableOpacity>
          ))}

          <View style={styles.milestoneSection}>
              <Text style={styles.sectionTitle}>LIFETIME MILESTONES</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.milestoneScroll}>
                  <MilestoneCard icon={Gift} label="Rookie" sub="10 Trips" completed />
                  <MilestoneCard icon={Shield} label="Guardian" sub="100 Trips" progress="45%" />
                  <MilestoneCard icon={Trophy} label="Elite" sub="500 Trips" locked />
              </ScrollView>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MilestoneCard({ icon: Icon, label, sub, completed, locked, progress }) {
    return (
        <View style={[styles.mCard, locked && { opacity: 0.5 }]}>
            <View style={[styles.mIconBox, completed && { backgroundColor: '#F0FDF4' }]}>
                <Icon size={24} color={completed ? '#10B981' : locked ? '#94A3B8' : '#2563EB'} />
            </View>
            <Text style={styles.mLabel}>{label}</Text>
            <Text style={styles.mSub}>{sub}</Text>
            {progress && (
                <View style={[styles.mProgressBg, { marginTop: 8 }]}>
                    <View style={[styles.mProgressFill, { width: progress }]} />
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { paddingHorizontal: 24, paddingTop: 20, paddingBottom: 60, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    heroSection: { alignItems: 'center', marginTop: 32 },
    heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 16 },
    heroSub: { fontSize: 13, color: '#bfdbfe', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 18 },
    content: { padding: 24 },
    goalCard: { backgroundColor: '#fff', borderRadius: 32, padding: 24, paddingVertical: 32, marginTop: -60, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, elevation: 5, borderWidth: 1, borderColor: '#f1f5f9' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    iconBox: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#f0f7ff', alignItems: 'center', justifyContent: 'center' },
    goalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    goalSub: { fontSize: 13, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    bonusAmt: { fontSize: 18, fontWeight: '900', color: '#10B981' },
    progressContainer: { marginTop: 8 },
    progressBarBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#2563EB' },
    progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
    progressText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
    percentText: { fontSize: 12, fontWeight: '800', color: '#2563EB' },
    sectionHeader: { marginTop: 40, marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94a3b8', letterSpacing: 2 },
    challengeItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    challengeIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    challengeTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
    challengeDesc: { fontSize: 13, color: '#94a3b8', marginTop: 2, fontWeight: '500' },
    rewardBadge: { backgroundColor: '#f0fdf4', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
    rewardTxt: { color: '#10B981', fontWeight: '900', fontSize: 15 },
    milestoneSection: { marginTop: 40 },
    milestoneScroll: { marginTop: 20, marginHorizontal: -24, paddingHorizontal: 24 },
    mCard: { width: 140, backgroundColor: '#fff', borderRadius: 24, padding: 20, marginRight: 16, borderWidth: 1, borderColor: '#f1f5f9', alignItems: 'center' },
    mIconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    mLabel: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    mSub: { fontSize: 12, color: '#94a3b8', marginTop: 2, fontWeight: '600' },
    mProgressBg: { width: '100%', height: 4, backgroundColor: '#f1f5f9', borderRadius: 2, overflow: 'hidden' },
    mProgressFill: { height: '100%', backgroundColor: '#2563EB' }
});
