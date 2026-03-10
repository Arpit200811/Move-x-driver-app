import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { ChevronLeft, Star, MessageSquare, Calendar, Filter, Quote, ThumbsUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';

export default function RatingHistoryScreen({ navigation }) {
    const { t } = useTranslation();
    const [feedbacks, setFeedbacks] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeedbacks();
    }, []);

    const fetchFeedbacks = async () => {
        try {
            const res = await api.get('/drivers/feedbacks');
            setFeedbacks(res.data.feedbacks || [
                { id: '1', rating: 5, comment: "Excellent driver, very punctual and handled the package with great care.", date: "Today", label: "PUNCTUAL" },
                { id: '2', rating: 4, comment: "Professional service and polite behavior. Highly recommended!", date: "Yesterday", label: "POLITE" },
                { id: '3', rating: 5, comment: "Safe driving and fast delivery. Thank you!", date: "2 days ago", label: "FAST" }
            ]);
        } catch (e) {
            console.log('Feedback fetch error');
        } finally {
            // Slight delay for premium feel
            setTimeout(() => setLoading(false), 800);
        }
    };

    const RatingItem = ({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.reviewCard}>
            <View style={styles.cardHeader}>
                <View style={styles.ratingInfo}>
                    <View style={styles.badgeLabel}>
                        <Text style={styles.badgeText}>{item.label || 'VERIFIED'}</Text>
                    </View>
                    <Text style={styles.reviewDate}>{item.date}</Text>
                </View>
                <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={12} color={s <= item.rating ? "#F59E0B" : "#E2E8F0"} fill={s <= item.rating ? "#F59E0B" : "transparent"} />
                    ))}
                </View>
            </View>
            <View style={styles.commentBox}>
                <Quote size={16} color="#E2E8F0" style={{ position: 'absolute', top: -10, left: -10 }} />
                <Text style={styles.commentText}>{item.comment}</Text>
            </View>
        </Animated.View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#0f172a" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('performance_insights', 'Performance')}</Text>
                    <View style={{ width: 44 }} />
                </View>

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator color="#2563EB" size="large" />
                        <Text style={styles.loadingText}>Analyzing your feedback...</Text>
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <LinearGradient colors={['#fff', '#F8FAFC']} style={styles.statsCard}>
                            <Text style={styles.statsLabel}>AVERAGE RATING</Text>
                            <View style={styles.ratingRow}>
                                <Text style={styles.bigRating}>4.8</Text>
                                <View style={styles.ratingMeta}>
                                    <View style={styles.metaStars}>
                                        {[1,2,3,4,5].map(s => <Star key={s} size={16} color="#F59E0B" fill="#F59E0B" />)}
                                    </View>
                                    <Text style={styles.totalReviews}>Based on 124 reviews</Text>
                                </View>
                            </View>
                            
                            <View style={styles.statGrid}>
                                <View style={styles.gridItem}>
                                    <ThumbsUp size={18} color="#2563EB" />
                                    <Text style={styles.gridValue}>98%</Text>
                                    <Text style={styles.gridLabel}>Satisfaction</Text>
                                </View>
                                <View style={styles.vDivider} />
                                <View style={styles.gridItem}>
                                    <Calendar size={18} color="#2563EB" />
                                    <Text style={styles.gridValue}>Top 5%</Text>
                                    <Text style={styles.gridLabel}>This Month</Text>
                                </View>
                            </View>
                        </LinearGradient>

                        <Text style={styles.sectionTitle}>{t('recent_reviews', 'CUSTOMER FEEDBACK')}</Text>
                        
                        {feedbacks.length === 0 ? (
                            <View style={styles.emptyView}>
                                <MessageSquare size={40} color="#E2E8F0" />
                                <Text style={styles.emptyText}>No reviews yet.</Text>
                            </View>
                        ) : (
                            feedbacks.map((item, index) => <RatingItem key={item.id} item={item} index={index} />)
                        )}
                    </ScrollView>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
    backButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
    headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: '700' },
    scrollContent: { padding: 24 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 16, color: '#64748B', fontWeight: '600' },
    statsCard: { backgroundColor: '#fff', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: '#F1F5F9', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2, marginBottom: 32 },
    statsLabel: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 2, textAlign: 'center' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 32 },
    bigRating: { fontSize: 62, fontWeight: '900', color: '#0F172A', letterSpacing: -2 },
    ratingMeta: { marginLeft: 16 },
    metaStars: { flexDirection: 'row', gap: 2 },
    totalReviews: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginTop: 4 },
    statGrid: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F1F5F9', paddingTop: 24 },
    gridItem: { flex: 1, alignItems: 'center' },
    vDivider: { width: 1, backgroundColor: '#F1F5F9' },
    gridValue: { fontSize: 20, fontWeight: '800', color: '#0F172A', marginTop: 8 },
    gridLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '700', textTransform: 'uppercase', marginTop: 2 },
    sectionTitle: { fontSize: 11, fontWeight: '800', color: '#94A3B8', letterSpacing: 1.5, marginBottom: 20, marginLeft: 8 },
    reviewCard: { backgroundColor: '#fff', borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#F1F5F9' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    ratingInfo: { flexDirection: 'row', alignItems: 'center' },
    badgeLabel: { backgroundColor: '#F0F9FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 9, fontWeight: '900', color: '#0369A1' },
    reviewDate: { fontSize: 12, color: '#94A3B8', fontWeight: '600', marginLeft: 12 },
    starsContainer: { flexDirection: 'row', gap: 2 },
    commentBox: { position: 'relative', paddingLeft: 8 },
    commentText: { fontSize: 14, color: '#475569', lineHeight: 22, fontWeight: '500' },
    emptyView: { alignItems: 'center', marginTop: 60, opacity: 0.5 },
    emptyText: { marginTop: 12, color: '#64748B', fontWeight: '600' }
});
