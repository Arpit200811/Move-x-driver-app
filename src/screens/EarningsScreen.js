import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, SafeAreaView, StatusBar,
  Alert, Modal, TextInput, StyleSheet, Dimensions, ScrollView
} from 'react-native';
import Svg, { Rect, G, Text as SvgText, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { ChevronLeft, DollarSign, TrendingUp, Package, Zap, Calendar, ArrowUpRight, CreditCard, Clock } from 'lucide-react-native';
import api from '../services/api';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
// Reanimated removed due to crashes

const { width } = Dimensions.get('window');

export default function EarningsScreen({ navigation }) {
  const { t } = useTranslation();
  const [earnings, setEarnings] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payoutModal, setPayoutModal] = useState(false);
  const [payoutMethod, setPayoutMethod] = useState('bank');
  const [bankDetails, setBankDetails] = useState('');
  const [chartData, setChartData] = useState([]);

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1);

  const fetchData = useCallback(async () => {
    try {
      const [earnRes, txRes] = await Promise.all([
        api.get('/orders/driver-earnings'),
        api.get('/wallet/transactions')
      ]);
      setEarnings(earnRes.data.earnings);
      const txs = txRes.data.transactions || [];
      setTransactions(txs);
      
      const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
      const dynamicWeekly = Array(7).fill(0).map((_, i) => ({ day: days[i], amount: 0 }));
      
      const now = new Date();
      txs.forEach(t => {
          const tDate = new Date(t.createdAt);
          const diff = (now - tDate) / (1000 * 60 * 60 * 24);
          if (diff < 7 && t.type === 'EARNING') {
              dynamicWeekly[tDate.getDay()].amount += Math.abs(t.amount);
          }
      });
      setChartData(dynamicWeekly);
    } catch (err) {
      console.log('Finance fetch error', err.message);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setRefreshing(false);
      }, 800);
    }
  }, []);

  useEffect(() => { fetchData(); }, []);

  const MIN_PAYOUT = 50;

  const handlePayoutRequest = async () => {
      const balance = parseFloat(earnings?.walletBalance || 0);
      if (balance < MIN_PAYOUT) return Alert.alert('Threshold Denied', `Minimum payout threshold is $${MIN_PAYOUT}.`);
      setPayoutModal(true);
  };

  const submitPayout = async () => {
      if (!bankDetails) return Alert.alert('Missing Info', 'Please enter your bank or UPI details.');
      try {
          await api.post('/wallet/payout-request', { amount: earnings?.walletBalance });
          Alert.alert('Success', 'Payout initiated. Funds will arrive in 2-3 business days.');
          setPayoutModal(false);
          fetchData();
      } catch (e) {
          Alert.alert('Error', 'Request failed.');
      }
  };

  const renderTransaction = ({ item }) => (
    <View style={styles.transactionCard}>
      <View style={[styles.transactionIconBox, { backgroundColor: item.type === 'EARNING' ? '#F0FDF4' : '#FEF2F2' }]}>
        {item.type === 'EARNING' ? <Package size={20} color="#10B981" /> : <ArrowUpRight size={20} color="#EF4444" />}
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{item.type === 'EARNING' ? 'Task Payout' : 'Withdrawal'}</Text>
        <Text style={styles.transactionDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
      </View>
      <Text style={[styles.transactionAmount, { color: item.amount > 0 ? '#10B981' : '#EF4444' }]}>
        {item.amount > 0 ? '+' : ''}${Math.abs(item.amount).toFixed(2)}
      </Text>
    </View>
  );

  if (loading) return (
    <SafeAreaView style={styles.container}>
        <SkeletonHeader />
        <View style={{ padding: 24 }}>
            <View style={styles.skeletonChartPlaceholder} />
            {[1,2,3].map(i => <SkeletonListItem key={i} />)}
        </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.walletHeader}>
        <View style={styles.headerTop}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                <ChevronLeft size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerStatus}>{t('finance_overview', 'Financial Status')}</Text>
            <TrendingUp size={20} color="#10B981" />
        </View>

        <View style={styles.balanceBox}>
            <Text style={styles.balanceLabel}>{t('account_balance', 'Account Balance')}</Text>
            <View style={styles.balanceRow}>
                <Text style={styles.currencySymbol}>$</Text>
                <Text style={styles.balanceValue}>{earnings?.walletBalance || '0.00'}</Text>
            </View>
        </View>

        <TouchableOpacity style={styles.payoutButton} onPress={handlePayoutRequest}>
            <Text style={styles.payoutText}>REQUEST PAYOUT</Text>
            <ArrowUpRight size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statsCard}>
            <View style={styles.statItemLeft}>
                <Text style={styles.statLabel}>TODAY</Text>
                <Text style={styles.statValue}>+${earnings?.today || '0'}</Text>
            </View>
            <View style={styles.statItemRight}>
                <Text style={styles.statLabel}>TOTAL TASKS</Text>
                <Text style={styles.statValue}>{earnings?.deliveries || 0}</Text>
            </View>
        </View>
      </View>

      <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>WEEKLY ACTIVITY</Text>
              <TrendingUp size={16} color="#10B981" />
          </View>
          <View style={styles.chartFrame}>
            <Svg height="160" width={width - 80}>
                <Defs>
                    <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#2563EB" stopOpacity="1" />
                        <Stop offset="1" stopColor="#1e40af" stopOpacity="0.8" />
                    </SvgGradient>
                </Defs>
                {chartData.map((d, i) => {
                    const barWidth = (width - 100) / 7;
                    const barHeight = (d.amount / maxAmount) * 120;
                    const x = i * barWidth + 10;
                    const y = 130 - barHeight;
                    return (
                        <G key={i}>
                            <Rect x={x} y={y} width={barWidth - 10} height={barHeight} rx="6" fill="url(#barGrad)" />
                            <SvgText x={x + (barWidth - 10) / 2} y="150" fontSize="10" fill="#94a3b8" textAnchor="middle" fontWeight="900">{d.day}</SvgText>
                        </G>
                    );
                })}
            </Svg>
          </View>
      </View>

      <View style={styles.ledgerSection}>
          <Text style={styles.ledgerLabel}>{t('history', 'TRANSACTION HISTORY')}</Text>
          <FlatList
            data={transactions}
            keyExtractor={item => item._id}
            renderItem={renderTransaction}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 50 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
            ListEmptyComponent={
                <View style={styles.emptyContainer}>
                    <Clock size={40} color="#e2e8f0" />
                    <Text style={styles.emptyText}>No activity recorded</Text>
                </View>
            }
          />
      </View>

      <Modal visible={payoutModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <Text style={styles.modalTitle}>Request Payout</Text>
                  <Text style={styles.modalSub}>Transfer your wallet earnings to bank.</Text>
                  <View style={styles.inputBox}>
                      <Text style={styles.inputLabel}>BANK OR UPI DETAILS</Text>
                      <TextInput value={bankDetails} onChangeText={setBankDetails} placeholder="Account Number or ID" style={styles.textInput} />
                  </View>
                  <View style={styles.modalActionRow}>
                      <TouchableOpacity onPress={() => setPayoutModal(false)} style={styles.cancelButton}><Text style={styles.cancelText}>CANCEL</Text></TouchableOpacity>
                      <TouchableOpacity onPress={submitPayout} style={styles.confirmButton}><Text style={styles.confirmText}>CONFIRM</Text></TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>
    </SafeAreaView>
  );
}

function SkeletonHeader() {
    return (
        <View style={styles.skeletonHeaderMain}>
            <View style={[styles.skeletonHeaderLabel, { opacity: 0.3 }]} />
            <View style={[styles.skeletonHeaderValue, { opacity: 0.3 }]} />
        </View>
    );
}

function SkeletonListItem() {
    return (
        <View style={styles.skeletonListCard}>
            <View style={styles.skeletonListIcon} />
            <View style={{ flex: 1, marginLeft: 16 }}>
                <View style={[styles.skeletonListLine, { width: '40%' }]} />
                <View style={[styles.skeletonListLine, { width: '20%', marginTop: 8 }]} />
            </View>
            <View style={[styles.skeletonListLine, { width: 60 }]} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    walletHeader: { paddingHorizontal: 25, paddingTop: 40, paddingBottom: 50, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    headerButton: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    headerStatus: { color: '#fff', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, opacity: 0.6 },
    balanceBox: { marginVertical: 25 },
    balanceLabel: { color: '#fff', opacity: 0.5, fontSize: 12, fontWeight: '800' },
    balanceRow: { flexDirection: 'row', alignItems: 'baseline' },
    currencySymbol: { color: '#fff', fontSize: 24, fontWeight: '900', marginRight: 4, opacity: 0.5 },
    balanceValue: { color: '#fff', fontSize: 56, fontWeight: '900', letterSpacing: -2 },
    payoutButton: { height: 60, backgroundColor: '#2563EB', borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowAlpha: 0.3 },
    payoutText: { color: '#fff', fontWeight: '900', fontSize: 14, letterSpacing: 1.5, marginRight: 12 },
    statsContainer: { paddingHorizontal: 25, marginTop: -30, zIndex: 100 },
    statsCard: { backgroundColor: '#fff', borderRadius: 30, padding: 25, flexDirection: 'row', elevation: 5 },
    statItemLeft: { flex: 1, borderRightWidth: 1, borderRightColor: '#f1f5f9' },
    statItemRight: { flex: 1, paddingLeft: 20 },
    statLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 4 },
    statValue: { fontSize: 22, fontWeight: '900', color: '#0f172a', fontStyle: 'italic' },
    chartSection: { marginHorizontal: 25, marginTop: 24, backgroundColor: '#fff', borderRadius: 32, padding: 24 },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    chartTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', letterSpacing: 2 },
    chartFrame: { alignItems: 'center', justifyContent: 'center' },
    ledgerSection: { flex: 1, paddingHorizontal: 25, marginTop: 25 },
    ledgerLabel: { fontSize: 11, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 15 },
    transactionCard: { backgroundColor: '#fff', borderRadius: 20, padding: 15, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f8fafc' },
    transactionIconBox: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    transactionInfo: { flex: 1 },
    transactionTitle: { fontSize: 13, fontWeight: '800', color: '#0f172a', fontStyle: 'italic' },
    transactionDate: { fontSize: 10, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
    transactionAmount: { fontSize: 16, fontWeight: '900', fontStyle: 'italic' },
    emptyContainer: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#cbd5e1', fontWeight: '800', marginTop: 10, fontSize: 12, textTransform: 'uppercase' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 32, paddingBottom: 48 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8, fontStyle: 'italic' },
    modalSub: { fontSize: 12, fontWeight: '700', color: '#94a3b8', marginBottom: 32 },
    inputBox: { backgroundColor: '#f8fafc', borderRadius: 24, padding: 24, marginBottom: 32 },
    inputLabel: { fontSize: 9, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', marginBottom: 8, letterSpacing: 2 },
    textInput: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    modalActionRow: { flexDirection: 'row', gap: 16 },
    cancelButton: { flex: 1, height: 60, borderRadius: 20, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
    cancelText: { fontSize: 14, fontWeight: '900', color: '#64748b' },
    confirmButton: { flex: 1, height: 60, borderRadius: 20, backgroundColor: '#2563EB', alignItems: 'center', justifyContent: 'center' },
    confirmText: { fontSize: 14, fontWeight: '900', color: '#fff' },
    skeletonHeaderMain: { backgroundColor: '#0f172a', height: 250, borderBottomLeftRadius: 40, borderBottomRightRadius: 40, padding: 25, justifyContent: 'center' },
    skeletonHeaderLabel: { width: 120, height: 20, backgroundColor: '#1e293b', borderRadius: 4 },
    skeletonHeaderValue: { width: 200, height: 60, backgroundColor: '#1e293b', borderRadius: 10, marginTop: 12 },
    skeletonChartPlaceholder: { backgroundColor: '#fff', height: 160, borderRadius: 32, marginBottom: 24 },
    skeletonListCard: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#fff', borderRadius: 20, marginBottom: 12 },
    skeletonListIcon: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#f1f5f9' },
    skeletonListLine: { height: 15, backgroundColor: '#f1f5f9', borderRadius: 4 }
});
