import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { ChevronLeft, Bell, Wallet, Star, Shield, Info, Trash2, CheckCircle2, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    type: 'earning',
    title: 'Payout Ready',
    message: 'Your weekly earnings of $450.00 have been processed.',
    time: '5 mins ago',
    read: false,
    icon: Wallet,
    color: '#10B981'
  },
  {
    id: '2',
    type: 'performance',
    title: 'New 5-Star Rating',
    message: 'A customer just gave you a 5-star rating for your last delivery.',
    time: '2 hours ago',
    read: false,
    icon: Star,
    color: '#F59E0B'
  },
  {
    id: '3',
    type: 'system',
    title: 'KYC Verified',
    message: 'Your background check is complete. You are now a verified premium driver.',
    time: 'Yesterday',
    read: true,
    icon: Shield,
    color: '#3B82F6'
  },
];

export default function DriverNotificationScreen({ navigation }) {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const renderItem = ({ item }) => {
    const Icon = item.icon;
    return (
      <TouchableOpacity 
        style={[styles.notificationCard, !item.read && styles.unreadCard]}
        onPress={() => item.id}
      >
        <View style={[styles.iconBox, { backgroundColor: item.color + '10' }]}>
            <Icon size={20} color={item.color} />
        </View>
        <View style={styles.contentBox}>
            <View style={styles.headerRow}>
                <Text style={styles.typeText}>{t(item.type)}</Text>
                <Text style={styles.timeText}>{item.time}</Text>
            </View>
            <Text style={[styles.title, !item.read && styles.unreadTitle]}>{item.title}</Text>
            <Text style={styles.message} numberOfLines={2}>{item.message}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('driver_notifications', 'Activity')}</Text>
        <TouchableOpacity onPress={markAllRead}>
            <CheckCircle2 size={24} color="#2563EB" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 24 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
            <View style={styles.emptyContainer}>
                <Bell size={60} color="#e2e8f0" />
                <Text style={styles.emptyTitle}>Quiet day, huh?</Text>
                <Text style={styles.emptySub}>When you get new updates about orders or earnings, they will appear here.</Text>
            </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    notificationCard: { flexDirection: 'row', padding: 20, backgroundColor: '#fff', borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: '#f1f5f9' },
    unreadCard: { borderColor: '#dbeafe', borderLeftWidth: 4, borderLeftColor: '#2563EB' },
    iconBox: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    contentBox: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    typeText: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
    timeText: { fontSize: 10, color: '#94a3b8', fontWeight: '500' },
    title: { fontSize: 15, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
    unreadTitle: { color: '#0f172a' },
    message: { fontSize: 13, color: '#64748b', lineHeight: 18 },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2563EB', marginTop: 12, marginLeft: 8 },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginTop: 24 },
    emptySub: { fontSize: 14, color: '#94a3b8', textAlign: 'center', marginTop: 8, paddingHorizontal: 40, lineHeight: 20 }
});
