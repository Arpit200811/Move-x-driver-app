import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Vibration, Platform } from 'react-native';
import { Zap, MapPin, Package, Clock, Shield, ChevronRight, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function MissionRequestModal({ visible, mission, onAccept, onDecline }) {
    const { t } = useTranslation();
    const [timer, setTimer] = useState(30);
    const progress = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (visible && mission) {
            setTimer(30);
            progress.setValue(1);
            Vibration.vibrate([0, 500, 200, 500], true);

            Animated.timing(progress, {
                toValue: 0,
                duration: 30000,
                useNativeDriver: false,
            }).start();

            const interval = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        onDecline();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => {
                clearInterval(interval);
                Vibration.cancel();
            };
        }
    }, [visible, mission]);

    if (!visible || !mission) return null;

    const progressWidth = progress.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    return (
        <View style={styles.container}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            
            <View style={styles.content}>
                {/* Visual Header */}
                <LinearGradient
                    colors={['rgba(37, 99, 235, 0.2)', 'transparent']}
                    style={styles.headerGlow}
                />
                
                <View style={styles.topBadge}>
                    <Text style={styles.topBadgeText}>NEW PROTOCOL ASSIGNED</Text>
                </View>

                <View style={styles.timerCircle}>
                    <View style={styles.timerInner}>
                        <Text style={styles.timerText}>{timer}</Text>
                        <Text style={styles.timerLabel}>SEC</Text>
                    </View>
                </View>

                <Text style={styles.missionPrice}>₹{mission.price?.toFixed(2)}</Text>
                <Text style={styles.missionClass}>{mission.serviceClass} Payload</Text>

                {/* Mission Details */}
                <View style={styles.detailsCard}>
                    <View style={styles.cardHeader}>
                        <Package size={20} color="#60a5fa" />
                        <Text style={styles.cardTitle}>{mission.packageType || 'Parcel'} Logistics</Text>
                    </View>

                    <View style={styles.locationRow}>
                        <View style={styles.iconCol}>
                            <View style={styles.dotCurrent} />
                            <View style={styles.vLine} />
                            <View style={styles.dotDest} />
                        </View>
                        <View style={styles.addrCol}>
                            <Text style={styles.addrLabel}>PICKUP</Text>
                            <Text style={styles.addrText} numberOfLines={1}>{mission.pickup?.address || mission.pickup}</Text>
                            <View style={{ height: 16 }} />
                            <Text style={styles.addrLabel}>DESTINATION</Text>
                            <Text style={styles.addrText} numberOfLines={1}>{mission.destination?.address || mission.destination}</Text>
                        </View>
                    </View>

                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Clock size={16} color="#94a3b8" />
                            <Text style={styles.metaText}>6-8 min away</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Shield size={16} color="#10B981" />
                            <Text style={styles.metaText}>Secure Mission</Text>
                        </View>
                    </View>
                </View>

                {/* Action Bar */}
                <View style={styles.actions}>
                    <TouchableOpacity 
                        style={styles.declineBtn} 
                        onPress={onDecline}
                    >
                        <X size={24} color="#f43f5e" />
                    </TouchableOpacity>

                    <TouchableOpacity 
                        style={styles.acceptBtn} 
                        onPress={onAccept}
                    >
                        <LinearGradient
                            colors={['#2563EB', '#1e40af']}
                            style={styles.acceptGradient}
                        >
                            <Text style={styles.acceptText}>ACCEPT MISSION</Text>
                            <Zap size={22} color="#fff" fill="#fff" />
                        </LinearGradient>
                        <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, justifyContent: 'center' },
    content: { flex: 1, padding: 32, alignItems: 'center', justifyContent: 'center' },
    headerGlow: { position: 'absolute', top: 0, width: width, height: height * 0.4 },
    topBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 40, borderWeight: 1, borderColor: 'rgba(255,255,255,0.2)' },
    topBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    timerCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#2563EB' },
    timerInner: { alignItems: 'center' },
    timerText: { color: '#fff', fontSize: 32, fontWeight: '900' },
    timerLabel: { color: '#60a5fa', fontSize: 10, fontWeight: '800' },
    missionPrice: { fontSize: 56, fontWeight: '900', color: '#fff', letterSpacing: -2 },
    missionClass: { fontSize: 14, fontWeight: '700', color: '#60a5fa', textTransform: 'uppercase', letterSpacing: 3, marginTop: 4, marginBottom: 48 },
    detailsCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24, opacity: 0.8 },
    cardTitle: { color: '#fff', fontSize: 14, fontWeight: '800' },
    locationRow: { flexDirection: 'row', gap: 20 },
    iconCol: { alignItems: 'center', paddingVertical: 4 },
    dotCurrent: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563EB' },
    dotDest: { width: 10, height: 10, borderRadius: 2, backgroundColor: '#10B981' },
    vLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 4 },
    addrCol: { flex: 1 },
    addrLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
    addrText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    metaRow: { flexDirection: 'row', marginTop: 32, gap: 24, paddingTop: 24, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    metaText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
    actions: { flexDirection: 'row', marginTop: 48, gap: 16, width: '100%' },
    declineBtn: { width: 80, height: 80, borderRadius: 32, backgroundColor: 'rgba(244, 63, 94, 0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.2)' },
    acceptBtn: { flex: 1, height: 80, borderRadius: 32, overflow: 'hidden', position: 'relative' },
    acceptGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
    acceptText: { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    progressBar: { position: 'absolute', bottom: 0, left: 0, height: 4, backgroundColor: '#60a5fa' }
});

