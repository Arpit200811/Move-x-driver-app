import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, SafeAreaView, StatusBar, StyleSheet, Dimensions } from 'react-native';
import { ChevronLeft, Package, CheckCircle2, XCircle, Clock, Search, Filter, ArrowRight, Zap, History, Globe } from 'lucide-react-native';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
  DELIVERED:  { color: '#10B981', bg: '#ecfdf5', icon: CheckCircle2, key: 'delivered' },
  CANCELLED:  { color: '#EF4444', bg: '#fef2f2', icon: XCircle, key: 'cancelled' },
  ACCEPTED:   { color: '#3B82F6', bg: '#eff6ff', icon: Clock, key: 'ongoing' },
  PICKED_UP:  { color: '#F59E0B', bg: '#fffbeb', icon: Clock, key: 'transit' },
  PENDING:    { color: '#94a3b8', bg: '#f8fafc', icon: Clock, key: 'pending' },
};

export default function DriverOrderHistoryScreen({ navigation }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchHistory(); }, []);

  const fetchHistory = async () => {
    try {
      const ordersRes = await api.get('/orders/available');
      const raw = await AsyncStorage.getItem('movex_user');
      const me = raw ? JSON.parse(raw) : null;
      if (me) {
        const mine = (ordersRes.data.orders || []).filter(o => o.driverId?._id === me._id);
        setOrders(mine.reverse());
      }
    } catch (err) {
      console.log('History error', err.message);
    } finally { 
      setTimeout(() => setLoading(false), 500); 
    }
  };

  const renderItem = ({ item }) => {
    const cfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
    const Icon = cfg.icon;
    
    return (
      <TouchableOpacity 
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetails', { order: item })}
      >
        <View style={styles.cardHeader}>
            <View style={[styles.statusIconBox, { backgroundColor: cfg.bg }]}>
                <Icon size={20} color={cfg.color} />
            </View>
            <View style={styles.headerInfo}>
                <View style={styles.headerTopRow}>
                    <Text style={styles.nodeId}>ID: #{item.orderId?.slice(-8).toUpperCase()}</Text>
                    <Text style={styles.priceText}>${(item.price || 15).toFixed(2)}</Text>
                </View>
                <Text style={styles.packageText}>{t(item.packageType?.toLowerCase()) || t('delivery')} {t('service')}</Text>
            </View>
        </View>

        <View style={styles.addressBox}>
            <Globe size={14} color="#64748b" />
            <Text style={styles.addressText} numberOfLines={1}>
                {item.destination?.address || item.destination || t('address_not_found')}
            </Text>
            <ArrowRight size={14} color="#cbd5e1" />
        </View>

        <View style={styles.cardFooter}>
            <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
                <Text style={[styles.statusBadgeText, { color: cfg.color }]}>{cfg.key.toUpperCase()}</Text>
            </View>
            <View style={styles.dateBox}>
                <Clock size={12} color="#94a3b8" />
                <Text style={styles.dateText}>
                    {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: '2-digit' }) : t('recorded')}
                </Text>
            </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('order_history', 'Order History')}</Text>
            <TouchableOpacity style={styles.headerButton}>
                <Filter size={20} color="#fff" />
            </TouchableOpacity>
        </View>

        <View style={styles.searchBar}>
            <Search size={18} color="#64748b" />
            <Text style={styles.searchPlaceholder}>{t('search_past_deliveries', 'Search past deliveries')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 24 }}>
            {[1,2,3,4].map(i => <SkeletonItem key={i} />)}
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
                <History size={40} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>{t('no_history_found', 'No records found')}</Text>
            <Text style={styles.emptyDesc}>{t('no_previous_orders_desc', 'Your completed shipments will appear here.')}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
                <Zap size={14} color="#3B82F6" />
                <Text style={styles.listHeaderText}>{t('total_records', 'TOTAL COMPLETED')}: {orders.length}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

function SkeletonItem() {
    const opacity = useSharedValue(0.3);
    useEffect(() => {
        opacity.value = withRepeat(withSequence(withTiming(0.6, { duration: 1000 }), withTiming(0.3, { duration: 1000 })), -1, true);
    }, []);
    const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
    return (
        <Animated.View style={[styles.skeletonCard, style]}>
            <View style={{ flexDirection: 'row' }}>
                <View style={styles.skeletonIcon} />
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <View style={styles.skeletonLine} />
                    <View style={[styles.skeletonLine, { width: '40%', marginTop: 8 }]} />
                </View>
            </View>
            <View style={[styles.skeletonLine, { marginTop: 20 }]} />
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { backgroundColor: '#0f172a', paddingHorizontal: 32, paddingTop: 40, paddingBottom: 48, borderBottomLeftRadius: 60, borderBottomRightRadius: 60 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    headerButton: { width: 48, height: 48, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
    searchBar: { backgroundColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 20 },
    searchPlaceholder: { color: '#94a3b8', fontWeight: '600', fontSize: 13, marginLeft: 16 },
    emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
    emptyIconBox: { width: 90, height: 90, backgroundColor: '#f1f5f9', borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    emptyTitle: { color: '#0f172a', fontWeight: '800', fontSize: 20, textAlign: 'center' },
    emptyDesc: { color: '#94a3b8', fontWeight: '500', textAlign: 'center', marginTop: 12, lineHeight: 20 },
    listContent: { padding: 24, paddingBottom: 100 },
    listHeader: { marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
    listHeaderText: { color: '#94a3b8', fontWeight: '800', fontSize: 10, letterSpacing: 1.5, marginLeft: 10 },
    orderCard: { backgroundColor: '#fff', borderRadius: 32, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: '#f1f5f9' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    statusIconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    headerInfo: { marginLeft: 16, flex: 1 },
    headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nodeId: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1 },
    priceText: { color: '#0f172a', fontWeight: '800', fontSize: 18 },
    packageText: { color: '#0f172a', fontWeight: '700', fontSize: 15, marginTop: 2 },
    addressBox: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#f8fafc', padding: 12, borderRadius: 12 },
    addressText: { color: '#64748b', fontWeight: '600', fontSize: 13, marginLeft: 12, flex: 1 },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20 },
    statusBadgeText: { fontWeight: '800', fontSize: 9, letterSpacing: 1 },
    dateBox: { flexDirection: 'row', alignItems: 'center' },
    dateText: { color: '#94a3b8', fontWeight: '700', fontSize: 11, marginLeft: 8 },
    skeletonCard: { backgroundColor: '#e2e8f0', borderRadius: 32, padding: 24, marginBottom: 16, height: 160 },
    skeletonIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#cbd5e1' },
    skeletonLine: { height: 16, backgroundColor: '#cbd5e1', borderRadius: 8 }
});
