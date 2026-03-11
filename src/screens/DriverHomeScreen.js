import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Image, Dimensions, StatusBar, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Globe, Package, Zap, ChevronRight, Activity, Clock, ShieldAlert, Target, Trophy, MapPin, 
  Settings, User, Star, CreditCard, ChevronLeft, Navigation as NavIcon, Power, Radio, Shield, Layers, History, DollarSign
} from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { SOCKET_URL } from '../services/api';
import { registerForPushNotificationsAsync } from '../services/notifications';
import { Surface, Badge, Button, Modal, Portal, Provider } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import MoveXMap from '../components/MoveXMap';
import * as h3 from 'h3-js';
import { startBackgroundLocationUpdates, stopBackgroundLocationUpdates } from '../services/locationTask';
import Animated, { FadeInUp, FadeInRight, SlideInRight, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence, interpolate, useDerivedValue } from 'react-native-reanimated';
import * as Location from 'expo-location';
import MissionRequestModal from '../components/MissionRequestModal';

const { width, height } = Dimensions.get('window');

const mapStyle = [
    { "elementType": "geometry", "stylers": [{ "color": "#121212" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
    { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
    { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
    { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
    { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
    { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
    { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
    { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
    { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
    { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
    { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
    { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
    { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] },
];

// Move TimerBadge out of main component to ensure correct memoization
const TimerBadge = React.memo(({ isOnline }) => {
  const [seconds, setSeconds] = useState(0);
  const { t } = useTranslation();

  useEffect(() => {
      let timer;
      if (isOnline) {
          timer = setInterval(() => setSeconds(s => s + 1), 1000);
      } else {
          setSeconds(0);
      }
      return () => clearInterval(timer);
  }, [isOnline]);

  if (!isOnline) return null;

  const formatTime = (totalSeconds) => {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const secs = totalSeconds % 60;
      return `${hours > 0 ? hours + ':' : ''}${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
      <View style={styles.timerBadge}>
          <Clock size={12} color="#fbbf24" style={{ marginRight: 6 }} />
          <Text style={styles.timerText}>{formatTime(seconds)}</Text>
      </View>
  );
});

export default function DriverHomeScreen({ navigation }) {
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState('0.00');
  const [driver, setDriver] = useState(null);
  const [heatmap, setHeatmap] = useState([]);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [showShiftSummary, setShowShiftSummary] = useState(false);
  const [shiftStartTime, setShiftStartTime] = useState(null);
  const [incomingMission, setIncomingMission] = useState(null);
  const [showMissionModal, setShowMissionModal] = useState(false);
  const mapRef = useRef(null);

  // Animation pulse for online button
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (driver?.isOnline) {
        pulse.value = withRepeat(
            withTiming(1.1, { duration: 1500 }),
            -1,
            true
        );
    } else {
        pulse.value = withTiming(1);
    }
  }, [driver?.isOnline]);

  const animatedButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
    opacity: driver?.isOnline ? 1 : 0.8
  }));

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in km
    return d.toFixed(1);
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/available');
      if (response.data && response.data.orders) {
          setOrders(response.data.orders);
      }
    } catch (error) {
      console.log('Error fetching orders:', error.message);
    }
  };

  const fetchHeatmap = async () => {
      try {
          const res = await api.get('/drivers/heatmap');
          const processed = res.data.heatmap.map(cell => {
              const boundary = h3.cellToBoundary(cell.hex).map(([lat, lng]) => ({ latitude: lat, longitude: lng }));
              const [lat, lng] = h3.cellToLatLng(cell.hex);
              return { ...cell, boundary, center: { latitude: lat, longitude: lng } };
          });
          setHeatmap(processed);
      } catch (e) { console.log('Heatmap failure'); }
  };

  const fetchEarnings = async () => {
    try {
      const res = await api.get('/orders/driver-earnings');
      setTodayEarnings(res.data.earnings?.today || '0.00');
    } catch (_) {}
  };

  const loadDriver = async () => {
    try {
      const raw = await AsyncStorage.getItem('movex_user');
      if (raw) {
          const parsed = JSON.parse(raw);
          setDriver(parsed);
          if (parsed.isOnline) {
            try {
              // SECURITY: Drastically delayed start (5 seconds) to ensure Dashboard is fully stable
              // and Map WebView has loaded.
              setTimeout(() => {
                  console.log('[DASHBOARD] Stabilizing Telemetry...');
                  startBackgroundLocationUpdates().catch(e => console.error('BG_LOC_CRASH:', e));
              }, 5000);
            } catch (err) {
              console.log('Background task start error');
            }
          }
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync().catch(() => false);
      if (!servicesEnabled) {
        // Only alert if the component is still mounted and driver wants to be online
        return;
      }

      let { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (status === 'granted') {
          try {
            const loc = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            setCurrentLocation(loc.coords);
          } catch (locErr) {
            console.log('Current location fetching error:', locErr.message);
          }
      }
    } catch (error) {
      console.log('Load driver error:', error.message);
    }
  };

  const handleSOS = async () => {
    Alert.alert(
      t('sos_alert_title', 'Emergency SOS'),
      t('sos_alert_message', 'Are you sure you want to trigger an emergency alert? Help will be dispatched to your location.'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('confirm'),
          onPress: async () => {
            try {
              await api.post('/drivers/sos', {
                location: currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null,
              });
              Alert.alert('Success', 'Emergency alert has been triggered.');
            } catch (error) {
              Alert.alert('Error', 'Failed to send SOS.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  useEffect(() => {
    fetchOrders();
    fetchEarnings();
    loadDriver();
    fetchHeatmap();
    // registration moved to App.js only to avoid double initialization crash

    const interval = setInterval(() => {
        fetchHeatmap();
        fetchOrders();
    }, 15000);

    return () => clearInterval(interval);
  }, []);


  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
        fetchOrders();
        fetchEarnings();
        loadDriver();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    let socket;
    try {
        socket = io(SOCKET_URL, {
            timeout: 10000,
            transports: ['websocket'] // Force websocket for stability on Android
        });
        socket.on('new_order', (newOrder) => {
          setOrders(prev => [newOrder, ...prev]);
        });
        socket.on('order_updated', (updatedOrder) => {
          setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
        });
        socket.on('mission_request', (mission) => {
            setIncomingMission(mission);
            setShowMissionModal(true);
        });
    } catch (e) {
        console.error('Socket init error:', e);
    }

    return () => { if (socket) socket.disconnect(); };
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
        setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchOrders(), fetchEarnings(), fetchHeatmap()]);
    setRefreshing(false);
  };

  const handleToggleOnline = async () => {
    try {
      const res = await api.post('/auth/toggle-online');
      const isOnline = res.data.isOnline;
      const updated = { ...driver, isOnline, status: res.data.status };
      setDriver(updated);
      await AsyncStorage.setItem('movex_user', JSON.stringify(updated));
      
      if (isOnline) {
          startBackgroundLocationUpdates();
          setShiftStartTime(Date.now());
      } else {
          stopBackgroundLocationUpdates();
          setShowShiftSummary(true);
      }
    } catch (_) {}
  };

    const handleAcceptMission = async () => {
        try {
            const res = await api.put(`/orders/${incomingMission._id}/accept`);
            setShowMissionModal(false);
            setIncomingMission(null);
            navigation.navigate('OrderDetails', { order: res.data.order });
        } catch (e) {
            Alert.alert(t('error'), t('accept_failed', 'Failed to accept mission. It may have expired.'));
            setShowMissionModal(false);
        }
    };

    const handleDeclineMission = async () => {
        try {
            await api.put(`/orders/${incomingMission._id}/decline`);
        } catch (e) {}
        setShowMissionModal(false);
        setIncomingMission(null);
    };

  const getHeatmapColor = (count, multiplier = 1) => {
      if (multiplier > 1.5) return 'rgba(239, 68, 68, 0.5)';
      if (multiplier > 1.2) return 'rgba(245, 158, 11, 0.5)';
      if (count > 5) return 'rgba(16, 185, 129, 0.4)';
      return 'rgba(37, 99, 235, 0.3)';
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
          {isOffline && (
              <View style={styles.offlineBanner}>
                  <Radio size={14} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.offlineText}>{t('offline_banner', 'OFFLINE - SEARCHING FOR NETWORK')}</Text>
              </View>
          )}

          {driver?.isOnline && (
              <View style={styles.navigationOverlay}>
                  <View style={styles.navCard}>
                      <NavIcon size={24} color="#10B981" />
                      <View style={{ flex: 1, marginLeft: 16 }}>
                          <Text style={styles.navLabel}>{orders.length > 0 ? t('incoming_requests', 'INCOMING REQUESTS') : t('searching_orders', 'SEARCHING...')}</Text>
                          <Text style={styles.navSub}>
                               {orders.length > 0 ? t('pickup_ready', 'New pickup available') : t('stay_online_surge', 'Move towards high-demand areas')}
                          </Text>
                      </View>
                      <View style={styles.navStats}>
                          <Text style={styles.navDistance}>
                              {orders.length > 0 && currentLocation
                                ? calculateDistance(currentLocation.latitude, currentLocation.longitude, orders[0].pickupCoords.lat, orders[0].pickupCoords.lng)
                                : '0.0'
                              }
                          </Text>
                          <Text style={styles.navUnit}>KM</Text>
                      </View>
                  </View>
              </View>
          )}

      <MoveXMap 
        style={StyleSheet.absoluteFillObject}
        driverLocation={currentLocation ? { lat: currentLocation.latitude, lng: currentLocation.longitude } : null}
        polygons={showHeatmap ? heatmap.map(cell => ({
            coordinates: cell.boundary,
            fillColor: getHeatmapColor(cell.count, cell.multiplier),
            strokeColor: "rgba(255,255,255,0.2)",
            strokeWidth: 1
        })) : []}
        markers={orders.map(order => ({
            latitude: order.pickupCoords?.lat || 0,
            longitude: order.pickupCoords?.lng || 0
        }))}
      />

      <SafeAreaView style={styles.overlayContainer}>
          <View style={styles.header}>
              <TouchableOpacity 
                onPress={() => navigation.navigate('DriverProfile')} 
                style={styles.profileButton}
              >
                  <Image source={{ uri: driver?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${driver?._id}` }} style={styles.avatar} />
                  <View style={[styles.statusDot, { backgroundColor: driver?.isOnline ? '#10B981' : '#EF4444' }]} />
              </TouchableOpacity>

                  <TimerBadge isOnline={driver?.isOnline} />

              <View style={styles.headerControls}>
                  <TouchableOpacity onPress={handleSOS} style={[styles.controlButton, { borderColor: '#ef4444' }]}>
                      <Shield size={24} color="#ef4444" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowHeatmap(!showHeatmap)} style={[styles.controlButton, showHeatmap && styles.controlButtonActive]}>
                      <Layers size={24} color={showHeatmap ? "#fff" : "rgba(255,255,255,0.4)"} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => navigation.navigate('DriverOrderHistory')} style={styles.controlButton}>
                      <History size={22} color="#94a3b8" />
                  </TouchableOpacity>
              </View>
          </View>

          <View style={styles.revenueOverlay}>
              <TouchableOpacity onPress={() => navigation.navigate('Earnings')} style={styles.revenueCard}>
                  <View>
                      <Text style={styles.balanceLabel}>{t('today_earnings', 'Today')}</Text>
                      <Text style={styles.earningsText}>${todayEarnings}</Text>
                  </View>
                  <View style={styles.revenueCardRight}>
                        <View style={styles.tierBadge}>
                            <Trophy size={14} color="#fbbf24" style={{ marginRight: 6 }} />
                            <Text style={styles.tierText}>{driver?.tier || 'BRONZE'}</Text>
                        </View>
                        <ChevronRight size={20} color="#94a3b8" />
                  </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate('Incentives')} style={styles.goalSection}>
                  <View style={styles.goalHeader}>
                      <Text style={styles.goalLabel}>{t('daily_goal', 'DAILY GOAL')}</Text>
                      <Text style={styles.goalProgressText}>{driver?.deliveries || 0}/12</Text>
                  </View>
                  <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${Math.min(((driver?.deliveries || 0)/12)*100, 100)}%` }]} />
                  </View>
              </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} />

          <View style={styles.bottomOverlay}>
              <Animated.View style={animatedButtonStyle}>
                <TouchableOpacity 
                    onPress={handleToggleOnline}
                    activeOpacity={0.9}
                    style={[styles.mainActionButton, driver?.isOnline ? styles.btnOnline : styles.btnOffline]}
                >
                    <LinearGradient
                        colors={driver?.isOnline ? ['#10B981', '#059669'] : ['#2563EB', '#1e40af']}
                        style={styles.actionGradient}
                    >
                        <Zap size={28} color="#fff" />
                        <Text style={styles.actionBtnText}>
                            {driver?.isOnline ? (t('active_now', 'ACTIVE')) : (t('go_online', 'GO ONLINE'))}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
          </View>

          <View style={styles.bottomSheet}>
              <View style={styles.bottomSheetContent}>
                  <View style={styles.bottomSheetHandle} />
                  
                  <View style={styles.sheetHeader}>
                      <View style={styles.sheetTitleRow}>
                          <Text style={styles.sheetTitle}>{t('available_requests', 'Delivery Requests')}</Text>
                          <View style={styles.requestCountBadge}>
                              <Text style={styles.requestCountText}>{orders.length}</Text>
                          </View>
                      </View>
                      <TouchableOpacity onPress={onRefresh} style={styles.sheetRefreshButton}>
                          <Activity size={18} color="#2563EB" />
                      </TouchableOpacity>
                  </View>

                  <FlatList
                    data={orders}
                    keyExtractor={(item) => item._id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingHorizontal: 32, paddingBottom: 60 }}
                    renderItem={({ item, index }) => (
                        <Animated.View entering={FadeInRight.delay(index * 100)}>
                            <TouchableOpacity 
                                style={styles.orderCard}
                                onPress={() => navigation.navigate('OrderDetails', { order: item })}
                            >
                                <View style={styles.orderIconBox}>
                                    <Package size={24} color="#2563EB" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.orderHeader}>
                                        <Text style={styles.orderPrice}>${item.price?.toFixed(2)}</Text>
                                        {currentLocation && item.pickupCoords && (
                                            <View style={styles.distanceBadge}>
                                                <MapPin size={10} color="#10B981" />
                                                <Text style={styles.distanceText}>
                                                    {calculateDistance(
                                                        currentLocation.latitude,
                                                        currentLocation.longitude,
                                                        item.pickupCoords.lat,
                                                        item.pickupCoords.lng
                                                    )} km
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.orderAddress} numberOfLines={1}>{item.pickup?.address || item.pickup}</Text>
                                </View>
                                <ChevronRight size={20} color="rgba(0,0,0,0.1)" />
                            </TouchableOpacity>
                        </Animated.View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Globe size={40} color="#e2e8f0" />
                            <Text style={styles.emptyText}>{t('no_orders_found', 'No orders in your area')}</Text>
                        </View>
                    }
                  />
              </View>
          </View>
      </SafeAreaView>

      <Portal>
        <Modal visible={showShiftSummary} onDismiss={() => setShowShiftSummary(false)} contentContainerStyle={styles.summaryModal}>
            <View style={styles.summaryIcon}>
                <Trophy size={40} color="#fff" />
            </View>
            <Text style={styles.summaryTitle}>{t('shift_summary', 'SHIFT SUMMARY')}</Text>
            <Text style={styles.summaryLabel}>PERFORMANCE OVERVIEW</Text>
            <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                    <Clock size={20} color="#60a5fa" />
                    <Text style={styles.summaryVal}>{shiftStartTime ? Math.floor((Date.now() - shiftStartTime) / 60000) : 0}</Text>
                    <Text style={styles.summaryText}>MINUTES</Text>
                </View>
                <View style={styles.summaryCard}>
                    <DollarSign size={20} color="#10B981" />
                    <Text style={styles.summaryVal}>${todayEarnings}</Text>
                    <Text style={styles.summaryText}>EARNED</Text>
                </View>
            </View>
            <TouchableOpacity style={styles.summaryClose} onPress={() => setShowShiftSummary(false)}>
                <Text style={styles.summaryCloseText}>{t('close_summary', 'DONE')}</Text>
            </TouchableOpacity>
        </Modal>
      </Portal>

      <MissionRequestModal 
        visible={showMissionModal}
        mission={incomingMission}
        onAccept={handleAcceptMission}
        onDecline={handleDeclineMission}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    orderMarker: { backgroundColor: '#2563EB', padding: 8, borderRadius: 12, borderWidth: 1.5, borderColor: '#fff' },
    overlayContainer: { flex: 1 },
    header: { paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 20 : 40, flexDirection: 'row', alignItems: 'center' },
    profileButton: { backgroundColor: 'rgba(255,255,255,0.1)', padding: 6, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    avatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#0f172a' },
    statusDot: { position: 'absolute', bottom: -4, right: -4, width: 20, height: 20, borderRadius: 10, borderWidth: 4, borderColor: '#020617' },
    headerControls: { flexDirection: 'row', gap: 12, marginLeft: 'auto' },
    controlButton: { height: 52, width: 52, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)' },
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)', marginLeft: 12 },
    timerText: { color: '#fbbf24', fontWeight: '900', fontSize: 12 },
    controlButtonActive: { backgroundColor: '#2563EB', borderColor: '#60a5fa' },
    revenueOverlay: { paddingHorizontal: 30, marginTop: 24 },
    actionBtnText: { color: '#fff', fontWeight: '900', fontSize: 18, letterSpacing: 1, marginLeft: 16 },
    actionGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
    mainActionButton: { height: 88, borderRadius: 44, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 10 },
    btnOnline: { shadowColor: '#10B981' },
    btnOffline: { shadowColor: '#2563EB' },
    balanceLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
    tierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.2)' },
    bottomSheet: { height: '45%' },
    bottomSheetContent: { backgroundColor: '#fff', borderTopLeftRadius: 40, borderTopRightRadius: 40, flex: 1, paddingTop: 16 },
    bottomSheetHandle: { width: 48, height: 4, backgroundColor: '#e2e8f0', borderRadius: 2, alignSelf: 'center', marginBottom: 24 },
    sheetHeader: { paddingHorizontal: 32, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    sheetTitleRow: { flexDirection: 'row', alignItems: 'center' },
    sheetTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
    requestCountBadge: { backgroundColor: '#2563EB', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, marginLeft: 12 },
    requestCountText: { color: '#fff', fontWeight: '800', fontSize: 10 },
    sheetRefreshButton: { padding: 8, backgroundColor: '#f8fafc', borderRadius: 12 },
    orderCard: { backgroundColor: '#f8fafc', padding: 20, borderRadius: 24, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9' },
    orderIconBox: { width: 48, height: 48, backgroundColor: 'rgba(37, 99, 235, 0.1)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    orderPrice: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    orderAddress: { color: '#64748b', fontSize: 13, fontWeight: '500' },
    distanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    distanceText: { color: '#10B981', fontSize: 10, fontWeight: '700' },
    revenueCard: { backgroundColor: '#1e293b', padding: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    revenueCardRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    earningsText: { fontSize: 28, fontWeight: '800', color: '#fff' },
    tierText: { color: '#fbbf24', fontWeight: '800', fontSize: 10 },
    goalSection: { marginTop: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 12 },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    goalLabel: { color: '#94a3b8', fontSize: 9, fontWeight: '800' },
    goalProgressText: { color: '#fff', fontSize: 11, fontWeight: '800' },
    progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#2563EB' },
    surgeMarker: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: '#EF4444', alignItems: 'center' },
    surgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
    offlineBanner: { position: 'absolute', top: 60, left: 20, right: 20, backgroundColor: '#EF4444', padding: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    offlineText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    navigationOverlay: { position: 'absolute', top: 60, left: 20, right: 20, zIndex: 900 },
    navCard: { backgroundColor: '#0f172a', borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    navLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase' },
    navSub: { fontSize: 14, fontWeight: '600', color: '#fff', marginTop: 2 },
    navStats: { alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    navDistance: { fontSize: 18, fontWeight: '800', color: '#10B981' },
    navUnit: { fontSize: 8, fontWeight: '800', color: '#10B981' },
    bottomOverlay: { paddingHorizontal: 24, marginBottom: 12 },
    emptyContainer: { alignItems: 'center', paddingVertical: 40 },
    emptyText: { color: '#cbd5e1', fontWeight: '700', fontSize: 12, marginTop: 12 },
    summaryModal: { backgroundColor: '#fff', padding: 30, borderRadius: 32, alignItems: 'center', margin: 20 },
    summaryIcon: { backgroundColor: '#10B981', width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center' },
    summaryTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginTop: 16 },
    summaryLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 4 },
    summaryGrid: { flexDirection: 'row', gap: 12, marginTop: 24, width: '100%' },
    summaryCard: { flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 16, alignItems: 'center' },
    summaryVal: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginTop: 8 },
    summaryText: { fontSize: 8, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
    summaryClose: { backgroundColor: '#000', width: '100%', height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
    summaryCloseText: { color: '#fff', fontWeight: '800', fontSize: 14 }
});
