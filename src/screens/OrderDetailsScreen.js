import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Image, TextInput, Dimensions, StatusBar, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MapPin, Phone, MessageSquare, Clock, ChevronRight, User, Star, Package, Shield, Target, Plus, Camera, Send, CheckCircle, ShieldAlert, ChevronLeft, Truck, X, Navigation as NavIcon } from 'lucide-react-native';
import api, { SOCKET_URL } from '../services/api';
import { Surface, Badge, Modal, Portal } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import io from 'socket.io-client';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

const { width } = Dimensions.get('window');

export default function OrderDetailsScreen({ route, navigation }) {
  const { t } = useTranslation();
  const { order: initialOrder } = route.params;
  const [order, setOrder] = useState(initialOrder);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(1);
  };

  useEffect(() => {
    let watchId;
    (async () => {
      try {
        const servicesEnabled = await Location.hasServicesEnabledAsync();
        if (!servicesEnabled) return;

        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
            watchId = await Location.watchPositionAsync({
                accuracy: Location.Accuracy.High,
                distanceInterval: 10,
            }, (loc) => {
                setCurrentLocation(loc.coords);
            });
        }
      } catch (err) {
        console.log('Order details location watch error');
      }
    })();
    return () => {
        if (watchId && watchId.remove) watchId.remove();
    };
  }, []);
  const [otp, setOtp] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState(initialOrder.messages || []);
  const [chatText, setChatText] = useState('');
  const [evidenceImage, setEvidenceImage] = useState(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let interval;
    if (order.status === 'ARRIVED' && order.waitingTimerStartedAt) {
      interval = setInterval(() => setNow(Date.now()), 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [order.status, order.waitingTimerStartedAt]);

  useEffect(() => {
    const socket = io(SOCKET_URL);
    socket.emit('join_order', order._id);

    socket.on('order_updated', (updated) => {
        if (updated._id === order._id) {
            setOrder(updated);
            if (updated.messages) setMessages(updated.messages);
        }
    });

    socket.on('new_message', (msg) => {
        setMessages(prev => [...prev, msg]);
    });

    return () => socket.disconnect();
  }, [order._id]);

  const handleDecline = async () => {
    Alert.alert(
      t('decline_mission', 'Decline Mission'),
      t('decline_desc', 'Are you sure? This will affect your acceptance rate.'),
      [
        { text: t('wait'), style: 'cancel' },
        { text: t('decline'), style: 'destructive', onPress: async () => {
          setLoading(true);
          try {
            await api.put(`/orders/${order._id}/decline`);
            navigation.navigate('DriverHome');
          } catch (e) { Alert.alert('Error', 'Failed to decline'); }
          finally { setLoading(false); }
        }}
      ]
    );
  };

  const handleAccept = async () => {
    Alert.alert(
      t('accept_order', 'Accept Order'),
      t('accept_order_desc', 'Are you sure you want to accept this delivery task?'),
      [
        { text: t('wait', 'Wait'), style: 'cancel' },
        { text: t('accept', 'Accept'), onPress: async () => {
          setLoading(true);
          try {
            const response = await api.put(`/orders/${order._id}/accept`);
            setOrder(response.data.order);
            Alert.alert(t('order_accepted', 'Order Accepted'), t('order_start_msg', 'The delivery process has started.'));
          } catch (error) {
            Alert.alert(t('error'), t('order_accept_error', 'Failed to accept order.'));
          } finally {
            setLoading(false);
          }
        }}
      ]
    );
  };

  const handleUpdateStatus = async (status) => {
    setLoading(true);
    try {
      if (status === 'DELIVERED') {
        const formData = new FormData();
        formData.append('orderId', order._id);
        formData.append('otp', otp);
        if (evidenceImage) {
            formData.append('evidence', {
                uri: evidenceImage,
                name: 'evidence.jpg',
                type: 'image/jpeg'
            });
        }
        const response = await api.post(`/delivery/complete`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        setOrder(response.data.order);
        Alert.alert(t('delivery_complete', 'Delivery Complete'), t('success_msg', 'The package has been delivered successfully.'));
        navigation.navigate('DriverHome');
      } else {
        const response = await api.put(`/orders/${order._id}/status`, { status });
        setOrder(response.data.order);
      }
    } catch (error) {
      Alert.alert(t('error', 'Error'), t('update_failed', 'Failed to update status.'));
    } finally {
      setLoading(false);
    }
  };

  const handleCaptureEvidence = async () => {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return Alert.alert(t('error'), t('camera_permission_denied'));
      
      const result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
      });

      if (!result.canceled) {
          setEvidenceImage(result.assets[0].uri);
      }
  };

  const sendMessage = async () => {
      if (!chatText.trim()) return;
      try {
          await api.post(`/orders/${order._id}/message`, { text: chatText, senderRole: 'driver' });
          setChatText('');
      } catch (e) { Alert.alert(t('comm_error'), t('transmit_failed')); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('order_details', 'Order Details')}</Text>
        
        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' ? (
            <TouchableOpacity 
                onPress={() => setShowChat(true)}
                style={styles.chatHeaderButton}
            >
                <MessageSquare size={20} color="#2563EB" />
                {messages.length > 0 && <View style={styles.chatBadge} />}
            </TouchableOpacity>
        ) : <View style={{ width: 48 }} />}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
        <View style={styles.content}>
            {/* Status Hub */}
            <View style={styles.statusRow}>
                <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>{t(order.status) || order.status}</Text>
                </View>
                {currentLocation && (
                    <View style={styles.liveDistanceContainer}>
                        <Zap size={14} color="#10B981" />
                        <Text style={styles.liveDistanceText}>
                            {order.status === 'PICKED_UP' 
                                ? calculateDistance(currentLocation.latitude, currentLocation.longitude, order.destinationCoords?.lat, order.destinationCoords?.lng)
                                : calculateDistance(currentLocation.latitude, currentLocation.longitude, order.pickupCoords?.lat, order.pickupCoords?.lng)
                            } km remaining
                        </Text>
                    </View>
                )}
                <Text style={styles.orderIdText}>{t('order_id', 'ID:')} {order.orderId?.slice(-10)}</Text>
            </View>

            {/* Delivery Timeline */}
            <View style={styles.timelineContainer}>
                {[
                    { key: 'PENDING', label: t('assigned', 'ASSIGNED') },
                    { key: 'ARRIVED', label: t('arrived', 'ARRIVED') },
                    { key: 'PICKED_UP', label: t('in_transit', 'IN TRANSIT') },
                    { key: 'DELIVERED', label: t('delivered', 'DELIVERED') },
                ].map((step, i) => {
                    const statusOrder = ['PENDING', 'ASSIGNED', 'ARRIVED', 'PICKED_UP', 'DELIVERED'];
                    const currentIdx = statusOrder.indexOf(order.status);
                    const stepIdx = statusOrder.indexOf(step.key);
                    const isCompleted = stepIdx < currentIdx;
                    const isActive = stepIdx === currentIdx;

                    return (
                        <View key={step.key} style={styles.timelineStep}>
                            <View style={[styles.timelineBall, isCompleted && styles.timelineBallDone, isActive && styles.timelineBallActive]}>
                                {isCompleted && <CheckCircle size={12} color="#fff" />}
                            </View>
                            <Text style={[styles.timelineLabel, isActive && styles.timelineLabelActive]}>{step.label}</Text>
                            {i < 3 && <View style={[styles.timelineLine, isCompleted && styles.timelineLineDone]} />}
                        </View>
                    );
                })}
            </View>

            {/* Delivery Route */}
            <View style={styles.pathCard}>
                <View style={styles.pathRow}>
                    <View style={styles.pickupIconBox}>
                        <Target size={18} color="#2563EB" />
                    </View>
                    <View style={styles.pathDetails}>
                        <Text style={styles.pathLabel}>{t('pickup_location', 'PICKUP LOCATION')}</Text>
                        <Text style={styles.pathAddress}>{order.pickup?.address || order.pickup}</Text>
                    </View>
                </View>
                
                <View style={styles.pathDottedLine} />

                <View style={styles.pathRow}>
                    <View style={styles.destIconBox}>
                        <MapPin size={18} color="#EF4444" />
                    </View>
                    <View style={styles.pathDetails}>
                        <Text style={styles.pathLabel}>{t('drop_location', 'DROP LOCATION')}</Text>
                        <Text style={styles.pathAddress}>{order.destination?.address || order.destination}</Text>
                    </View>
                </View>
            </View>

            {/* Customer Details */}
            <View style={styles.clientCard}>
                <View style={styles.clientMain}>
                    <View style={styles.clientAvatarBox}>
                        <User size={28} color="#2563EB" />
                    </View>
                    <View style={styles.clientInfo}>
                        <Text style={styles.clientName}>{order.customerId?.name || t('customer')}</Text>
                        <View style={styles.clientRatingRow}>
                            <Star size={12} color="#fbbf24" fill="#fbbf24" />
                            <Text style={styles.clientRating}>4.9 • {t('top_rated_customer', 'Top Rated Customer')}</Text>
                        </View>
                    </View>
                </View>
                <TouchableOpacity style={styles.callActionButton}>
                    <Phone size={20} color="#2563EB" />
                </TouchableOpacity>
            </View>

            {/* Package Details */}
            <Text style={styles.sectionLabel}>{t('package_details', 'PACKAGE DETAILS')}</Text>
            <View style={styles.payloadCard}>
                <View style={styles.payloadIconBox}>
                    <Package size={28} color="#2563EB" />
                </View>
                <View style={styles.payloadInfo}>
                    <Text style={styles.payloadTitle}>{t(order.packageType || 'Item Delivery')} {t('package', 'Package')}</Text>
                    <Text style={styles.payloadSub}>{order.parcelDescription || t('standard_delivery', 'Standard Delivery')}</Text>
                </View>
            </View>

            {/* Zomato / Apollo Items List */}
            {order.items && order.items.length > 0 && (
                <View style={styles.itemsContainer}>
                    <Text style={styles.sectionLabel}>{t('ordered_items', 'ORDERED ITEMS')}</Text>
                    <View style={styles.itemsCard}>
                        {order.items.map((item, idx) => (
                            <View key={idx} style={styles.itemRow}>
                                <View style={styles.itemQtyBox}>
                                    <Text style={styles.itemQty}>{item.quantity}x</Text>
                                </View>
                                <Text style={styles.itemName}>{item.name}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Waiting Timer Hub */}
            {order.status === 'ARRIVED' && (
                <View style={styles.timerCard}>
                    <View style={styles.timerHeader}>
                        <View>
                            <Text style={styles.timerBadge}>{t('waiting_at_pickup', 'WAITING AT PICKUP')}</Text>
                            <Text style={styles.timerSub}>{t('please_wait_for_customer', 'Please wait for the customer to bring the package.')}</Text>
                        </View>
                        <Clock size={24} color="#D97706" />
                    </View>
                    <Text style={styles.timerValue}>
                        {(() => {
                            if (!order.waitingTimerStartedAt) return "00:00";
                            const diff = Math.floor((now - new Date(order.waitingTimerStartedAt).getTime()) / 1000);
                            const m = Math.max(0, Math.floor(diff / 60));
                            const s = Math.max(0, diff % 60);
                            return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
                        })()}
                    </Text>
                    <View style={styles.timerIconBg}>
                       <ShieldAlert size={120} color="#D97706" />
                    </View>
                </View>
            )}
        </View>
      </ScrollView>

      {/* Action Deck */}
      <View style={styles.footer}>
        {(order.status === 'PENDING' || order.status === 'ASSIGNED') && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity 
                style={[styles.actionButton, { flex: 1, backgroundColor: '#f1f5f9' }]} 
                onPress={handleDecline}
                disabled={loading}
            >
                <X size={20} color="#64748b" />
                <Text style={[styles.actionButtonText, { color: '#64748b' }]}>{t('decline', 'DECLINE')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
                style={[styles.actionButton, { flex: 2 }]} 
                onPress={handleAccept} 
                disabled={loading}
            >
                <LinearGradient
                    colors={['#2563EB', '#1e40af']}
                    style={StyleSheet.absoluteFillObject}
                />
                <Zap size={22} color="#fff" fill="#fff" />
                <Text style={styles.actionButtonText}>{loading ? t('processing', 'PROCESSING') : t('accept_request', 'ACCEPT REQUEST')}</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && order.status !== 'PENDING' && (
            <TouchableOpacity 
                style={styles.navigationLink} 
                onPress={() => navigation.navigate('Map', { order })}
            >
                <View style={styles.navIconBox}>
                    <NavIcon size={18} color="#fff" />
                </View>
                <View style={styles.navInfo}>
                    <Text style={styles.navTitle}>{t('live_navigation', 'Live Navigation')}</Text>
                    <Text style={styles.navSubText}>{t('smart_routing', 'Get the fastest route')}</Text>
                </View>
                <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
        )}

        {order.status === 'PICKED_UP' && (
          <View style={styles.completionSteps}>
            <Text style={styles.stepTitle}>{t('delivery_verification', 'Delivery Verification')}</Text>
            
            <TouchableOpacity 
                style={[styles.cameraUpload, evidenceImage && styles.uploadBoxSuccess]} 
                onPress={handleCaptureEvidence}
            >
                {evidenceImage ? (
                    <Image source={{ uri: evidenceImage }} style={styles.evidencePreview} />
                ) : (
                    <View style={styles.cameraIconBox}>
                        <Camera size={24} color="#94a3b8" />
                    </View>
                )}
                <Text style={styles.cameraText}>{evidenceImage ? t('photo_captured') : t('take_proof_photo')}</Text>
            </TouchableOpacity>

            <TextInput 
              placeholder={t('enter_delivery_pin', 'Enter Delivery PIN')} 
              maxLength={4}
              keyboardType="number-pad"
              value={otp}
              onChangeText={setOtp}
              style={styles.otpInput}
            />

            <TouchableOpacity 
              style={[styles.actionButton, { opacity: otp.length === 4 ? 1 : 0.4, marginTop: 16 }]}
              onPress={() => handleUpdateStatus('DELIVERED')} 
              disabled={loading || otp.length !== 4}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={StyleSheet.absoluteFillObject} />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <CheckCircle size={22} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('complete_delivery', 'Complete Delivery')}</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {order.status === 'ACCEPTED' && (
           <TouchableOpacity 
             style={styles.statusActionButton} 
             onPress={() => handleUpdateStatus('ARRIVED')} 
             disabled={loading}
           >
             <LinearGradient colors={['#3B82F6', '#2563EB']} style={StyleSheet.absoluteFillObject} />
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MapPin size={22} color="#fff" />
                <Text style={styles.actionButtonText}>{t('i_have_arrived', 'I HAVE ARRIVED')}</Text>
             </View>
           </TouchableOpacity>
        )}

        {order.status === 'ARRIVED' && (
           <TouchableOpacity 
             style={[styles.statusActionButton, { marginTop: 16 }]} 
             onPress={() => handleUpdateStatus('PICKED_UP')} 
             disabled={loading}
           >
             <LinearGradient colors={['#10B981', '#059669']} style={StyleSheet.absoluteFillObject} />
             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Truck size={22} color="#fff" />
                <Text style={styles.actionButtonText}>{t('pickup_package', 'PICKUP PACKAGE')}</Text>
             </View>
           </TouchableOpacity>
        )}
      </View>

      <Portal>
          <Modal visible={showChat} onDismiss={() => setShowChat(false)} contentContainerStyle={styles.modalContent}>
              <View style={{ flex: 1 }}>
                  <View style={styles.modalHeader}>
                      <View>
                          <Text style={styles.modalTitle}>{t('customer_chat', 'Customer Chat')}</Text>
                          <Text style={styles.modalSub}>{t('secure_channel', 'Secure messaging channel active')}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setShowChat(false)} style={styles.modalClose}>
                          <X size={20} color="#fff" />
                      </TouchableOpacity>
                  </View>
                  
                  <ScrollView style={styles.chatList} showsVerticalScrollIndicator={false}>
                      {messages.length === 0 ? (
                          <View style={styles.emptyChat}>
                              <MessageSquare size={40} color="#cbd5e1" />
                              <Text style={styles.emptyChatText}>{t('no_messages_yet', 'No messages yet')}</Text>
                          </View>
                      ) : (
                          messages.map((m, i) => (
                              <View key={i} style={[styles.messageBubble, m.senderRole === 'driver' ? styles.driverBubble : styles.clientBubble]}>
                                  <View style={[styles.mBox, m.senderRole === 'driver' ? styles.driverMBox : styles.clientMBox]}>
                                      <Text style={[styles.mText, m.senderRole === 'driver' ? { color: '#fff' } : { color: '#0f172a' }]}>{m.text}</Text>
                                  </View>
                                  <Text style={styles.mTime}>{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                              </View>
                          ))
                      )}
                  </ScrollView>

                  <View style={styles.chatInputRow}>
                      <View style={styles.chatInputBox}>
                          <TextInput 
                            placeholder={t('type_message')} 
                            style={styles.messageInput}
                            value={chatText}
                            onChangeText={setChatText}
                          />
                          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
                              <Send size={18} color="#fff" />
                          </TouchableOpacity>
                      </View>
                  </View>
              </View>
          </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        width: 48,
        height: 48,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0f172a',
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    chatHeaderButton: {
        width: 48,
        height: 48,
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    chatBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#eff6ff',
    },
    content: {
        paddingHorizontal: 24,
        paddingVertical: 32,
    },
    statusRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#eff6ff',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#2563EB',
        marginRight: 8,
    },
    statusText: {
        color: '#2563EB',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    orderIdText: {
        color: '#94a3b8',
        fontWeight: '700',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontStyle: 'italic',
    },
    pathCard: {
        backgroundColor: '#fff',
        borderRadius: 40,
        padding: 32,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        marginBottom: 32,
    },
    pathRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    pickupIconBox: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(37, 99, 235, 0.1)',
    },
    destIconBox: {
        width: 44,
        height: 44,
        borderRadius: 16,
        backgroundColor: '#fef2f2',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.1)',
    },
    pathDetails: {
        flex: 1,
        marginLeft: 20,
    },
    pathLabel: {
        color: '#94a3b8',
        fontWeight: '900',
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 4,
    },
    pathAddress: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 14,
        fontStyle: 'italic',
        lineHeight: 20,
    },
    pathDottedLine: {
        marginLeft: 21,
        marginVertical: 12,
        width: 2,
        height: 40,
        borderLeftWidth: 2,
        borderColor: '#f1f5f9',
        borderStyle: 'dashed',
    },
    clientCard: {
        backgroundColor: '#fff',
        borderRadius: 32,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    clientMain: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clientAvatarBox: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: '#f8fafc',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    clientInfo: {
        marginLeft: 16,
    },
    clientName: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: -0.3,
    },
    clientRatingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    clientRating: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4,
    },
    callActionButton: {
        width: 48,
        height: 48,
        backgroundColor: '#eff6ff',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    sectionLabel: {
        color: '#94a3b8',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 16,
        marginLeft: 16,
    },
    payloadCard: {
        backgroundColor: '#fff',
        borderRadius: 40,
        padding: 24,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    payloadIconBox: {
        width: 56,
        height: 56,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    payloadInfo: {
        flex: 1,
    },
    payloadTitle: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 16,
        fontStyle: 'italic',
    },
    payloadSub: {
        color: '#94a3b8',
        fontWeight: '700',
        fontSize: 10,
        textTransform: 'uppercase',
        marginTop: 4,
    },
    timerCard: {
        backgroundColor: '#fffbeb',
        borderRadius: 40,
        padding: 32,
        borderWidth: 1,
        borderColor: '#fef3c7',
        shadowColor: '#f59e0b',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        marginBottom: 40,
        overflow: 'hidden',
    },
    timerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        zIndex: 10,
    },
    timerBadge: {
        color: '#78350f',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 3,
        fontStyle: 'italic',
    },
    timerSub: {
        color: 'rgba(120, 53, 15, 0.6)',
        fontWeight: '500',
        fontSize: 9,
        textTransform: 'uppercase',
        marginTop: 4,
        letterSpacing: 2,
    },
    timerValue: {
        fontSize: 48,
        fontWeight: '900',
        color: '#78350f',
        letterSpacing: -2,
        fontStyle: 'italic',
        zIndex: 10,
    },
    timerIconBg: {
        position: 'absolute',
        right: -16,
        bottom: -16,
        opacity: 0.05,
    },
    footer: {
        backgroundColor: '#fff',
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 48,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },
    actionButton: {
        height: 72,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 5,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginLeft: 12,
        fontStyle: 'italic',
    },
    mapLinkCard: {
        backgroundColor: '#0f172a',
        height: 80,
        borderRadius: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        marginBottom: 16,
    },
    mapLinkIconBox: {
        width: 40,
        height: 40,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    mapLinkInfo: {
        flex: 1,
        marginLeft: 20,
    },
    mapLinkTitle: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 14,
        textTransform: 'uppercase',
        fontStyle: 'italic',
    },
    mapLinkSub: {
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '700',
        fontSize: 9,
        textTransform: 'uppercase',
        marginTop: 2,
    },
    pickedUpActions: {
        marginBottom: 24,
        gap: 16,
    },
    otpLabel: {
        color: '#94a3b8',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 16,
    },
    cameraUpload: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: '#e2e8f0',
        borderRadius: 40,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    evidencePreview: {
        width: '100%',
        height: 120,
        borderRadius: 20,
        marginBottom: 12,
    },
    cameraIconBox: {
        width: 56,
        height: 56,
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    orderIdText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    liveDistanceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 6,
    },
    liveDistanceText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '900',
        fontStyle: 'italic',
    },
    timelineContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        marginBottom: 32,
        marginTop: 10,
    },
    timelineStep: {
        alignItems: 'center',
        flex: 1,
        position: 'relative',
    },
    timelineBall: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#f1f5f9',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        zIndex: 10,
    },
    timelineBallDone: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    timelineBallActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
        transform: [{ scale: 1.2 }],
    },
    timelineLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: '#cbd5e1',
        marginTop: 8,
        letterSpacing: 1,
    },
    timelineLabelActive: {
        color: '#2563EB',
    },
    timelineLine: {
        position: 'absolute',
        top: 12,
        left: '50%',
        width: '100%',
        height: 2,
        backgroundColor: '#f1f5f9',
        zIndex: 1,
    },
    timelineLineDone: {
        backgroundColor: '#10B981',
    },
    pathCard: {
        backgroundColor: '#fff',
        height: 80,
        borderRadius: 40,
        fontSize: 24,
        fontWeight: '900',
        letterSpacing: 16,
        paddingHorizontal: 32,
        textAlign: 'center',
        borderWidth: 2,
        borderColor: '#f1f5f9',
    },
    statusActionButton: {
        height: 80,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 40,
        overflow: 'hidden',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
    },
    modalContent: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 40,
        height: '75%',
        overflow: 'hidden',
    },
    modalHeader: {
        backgroundColor: '#0f172a',
        padding: 24,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalTitle: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 18,
        fontStyle: 'italic',
    },
    modalSub: {
        color: '#2563EB',
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 2,
    },
    modalClose: {
        width: 40,
        height: 40,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatList: {
        flex: 1,
        padding: 24,
    },
    emptyChat: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyChatText: {
        color: '#94a3b8',
        fontWeight: '700',
        fontSize: 12,
        marginTop: 16,
        fontStyle: 'italic',
    },
    messageBubble: {
        marginBottom: 16,
        maxWidth: '80%',
    },
    driverBubble: {
        alignSelf: 'flex-end',
    },
    clientBubble: {
        alignSelf: 'flex-start',
    },
    mBox: {
        padding: 16,
        borderRadius: 24,
    },
    driverMBox: {
        backgroundColor: '#0f172a',
        borderBottomRightRadius: 0,
    },
    clientMBox: {
        backgroundColor: '#f1f5f9',
        borderBottomLeftRadius: 0,
    },
    mText: {
        fontSize: 14,
        fontWeight: '500',
    },
    navigationLink: {
        backgroundColor: '#0f172a',
        height: 80,
        borderRadius: 40,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        marginBottom: 16,
    },
    navIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    navInfo: {
        flex: 1,
        marginLeft: 16,
    },
    navTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '800',
    },
    navSubText: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        fontWeight: '600',
        marginTop: 2,
    },
    completionSteps: {
        gap: 12,
        marginBottom: 8,
    },
    stepTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginLeft: 16,
        marginBottom: 4,
    },
    otpInput: {
        height: 64,
        backgroundColor: '#fff',
        borderRadius: 20,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
        letterSpacing: 8,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    uploadBoxSuccess: {
        borderColor: '#10B981',
        backgroundColor: '#f0fdf4',
    }
});

