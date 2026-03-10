import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Dimensions, TouchableOpacity, SafeAreaView, StatusBar, Image, RefreshControl, StyleSheet } from 'react-native';
import { 
    TrendingUp, Award, Star, Activity, DollarSign, 
    ChevronLeft, Zap, Target, History, Trophy, 
    BarChart3, Loader2, Info, ChevronRight
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import Animated, { FadeInUp, FadeInDown, SlideInRight } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

export default function DriverStatsScreen({ navigation }) {
    const { t } = useTranslation();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchStats = async () => {
        try {
            const res = await api.get('/drivers/stats');
            setStats(res.data.stats);
        } catch (e) {
            console.log('Stats error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchStats();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Loader2 size={40} color="#2563EB" />
            </View>
        );
    }

    const StatCard = ({ title, value, icon: Icon, color, delay }) => (
        <Animated.View entering={FadeInUp.delay(delay)} style={styles.statCardWrapper}>
            <View style={styles.statCardInner}>
                <View style={[styles.statIconBox, { backgroundColor: `${color}20` }]}>
                    <Icon size={20} color={color} />
                </View>
                <Text style={styles.statCardLabel}>{title}</Text>
                <Text style={styles.statCardValue}>{value}</Text>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                        <ChevronLeft size={20} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('analytics_hub')}</Text>
                    <TouchableOpacity style={styles.headerButton}>
                        <Info size={20} color="#fff" opacity={0.3} />
                    </TouchableOpacity>
                </View>

                <ScrollView 
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
                >
                    {/* Tier Progress Widget */}
                    <Animated.View entering={FadeInDown} style={styles.tierContainer}>
                         <LinearGradient 
                            colors={['#1e293b', '#0f172a']} 
                            style={styles.tierGradient}
                         >
                            <View style={styles.tierBlurCircle} />
                            
                            <View style={styles.tierHeader}>
                                <View>
                                    <View style={styles.tierLabelRow}>
                                        <Trophy size={16} color="#fbbf24" fill="#fbbf24" style={{ marginRight: 8 }} />
                                        <Text style={styles.tierLabel}>{t('loyalty_tier')}</Text>
                                    </View>
                                    <Text style={styles.tierValue}>
                                        {stats?.tier?.current}
                                    </Text>
                                </View>
                                <Award size={50} color="#fff" opacity={0.1} strokeWidth={3} />
                            </View>

                            <View style={{ marginBottom: 16 }}>
                                <View style={styles.progressHeader}>
                                    <Text style={styles.progressPercent}>{stats?.tier?.progressPercentage?.toFixed(0)}% to {stats?.tier?.next}</Text>
                                    <Text style={styles.progressPoints}>{stats?.performance?.loyaltyPoints} PTS</Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View 
                                        style={[styles.progressBarFill, { width: `${stats?.tier?.progressPercentage}%` }]} 
                                    />
                                </View>
                            </View>
                            
                            <Text style={styles.tierTerms}>
                                * {stats?.tier?.pointsNeeded} {t('points_to_next_tier')}
                            </Text>
                         </LinearGradient>
                    </Animated.View>

                    {/* Quick Stats Grid */}
                    <View style={styles.statsGrid}>
                        <StatCard 
                            title={t('today_earnings')} 
                            value={`$${stats?.today?.earnings?.toFixed(2)}`} 
                            icon={DollarSign} 
                            color="#10b981" 
                            delay={100} 
                        />
                        <StatCard 
                            title={t('today_trips')} 
                            value={stats?.today?.trips} 
                            icon={Activity} 
                            color="#2563eb" 
                            delay={200} 
                        />
                        <StatCard 
                            title={t('monthly_revenue')} 
                            value={`$${stats?.monthly?.earnings?.toFixed(2)}`} 
                            icon={TrendingUp} 
                            color="#8b5cf6" 
                            delay={300} 
                        />
                        <StatCard 
                            title={t('acceptance_rate')} 
                            value={`${stats?.performance?.acceptanceRate}%`} 
                            icon={Target} 
                            color="#f59e0b" 
                            delay={400} 
                        />
                    </View>

                    {/* Achievement Section */}
                    <Animated.View entering={FadeInUp.delay(500)} style={styles.achievementSection}>
                        <Text style={styles.sectionLabel}>{t('performance_metrics')}</Text>
                        <TouchableOpacity 
                            style={styles.achievementCard}
                            onPress={() => navigation.navigate('RatingHistory')}
                        >
                            <View style={styles.achievementIconBox}>
                                <Star size={24} color="#f59e0b" fill="#f59e0b" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.achievementLabel}>{t('rating_index')}</Text>
                                <Text style={styles.achievementValue}>{stats?.performance?.rating?.toFixed(1)} / 5.0</Text>
                            </View>
                            <ChevronRight size={20} color="#fff" opacity={0.2} />
                        </TouchableOpacity>
                    </Animated.View>

                    {/* Weekly Insight (Conceptual) */}
                    <Animated.View entering={FadeInUp.delay(600)} style={styles.insightCard}>
                         <View style={styles.insightHeader}>
                            <BarChart3 size={20} color="#fff" style={{ marginRight: 12 }} />
                            <Text style={styles.insightTitle}>{t('weekly_optimization')}</Text>
                         </View>
                         <Text style={styles.insightText}>
                             Aapka acceptance rate picchle hafte ke muqable 12% bada hai. Gold tier par pahunchne ke liye agle 10 trips time par complete karein.
                         </Text>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#020617',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#020617',
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        px: 32,
        pt: 16,
        pb: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 32,
    },
    headerButton: {
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    headerTitle: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 18,
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    scrollContent: {
        paddingHorizontal: 32,
        paddingBottom: 60,
    },
    tierContainer: {
        marginBottom: 32,
        marginTop: 16,
    },
    tierGradient: {
        padding: 32,
        borderRadius: 48,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.5,
        shadowRadius: 30,
        position: 'relative',
        overflow: 'hidden',
    },
    tierBlurCircle: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    tierHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
    },
    tierLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tierLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    tierValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: '900',
        fontStyle: 'italic',
        textTransform: 'uppercase',
        letterSpacing: -1,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    progressPercent: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 12,
        fontWeight: '700',
    },
    progressPoints: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: 12,
        fontWeight: '700',
    },
    progressBarBg: {
        height: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    progressBarFill: {
        height: 'full',
        backgroundColor: '#2563EB',
        borderRadius: 6,
    },
    tierTerms: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 9,
        fontWeight: '700',
        fontStyle: 'italic',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statCardWrapper: {
        width: '48%',
        marginBottom: 16,
    },
    statCardInner: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 20,
        borderRadius: 32,
    },
    statIconBox: {
        width: 40,
        height: 40,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    statCardLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
    },
    statCardValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    achievementSection: {
        marginTop: 24,
    },
    sectionLabel: {
        color: 'rgba(255,255,255,0.3)',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 8,
    },
    achievementCard: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        padding: 24,
        borderRadius: 40,
        flexDirection: 'row',
        alignItems: 'center',
    },
    achievementIconBox: {
        width: 56,
        height: 56,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.2)',
        marginRight: 24,
    },
    achievementLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
    },
    achievementValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    insightCard: {
        marginTop: 16,
        backgroundColor: '#2563EB',
        padding: 32,
        borderRadius: 40,
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    insightTitle: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
        fontStyle: 'italic',
    },
    insightText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 12,
        lineHeight: 20,
    }
});

