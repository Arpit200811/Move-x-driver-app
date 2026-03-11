import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert, SafeAreaView, StatusBar, Linking, StyleSheet } from 'react-native';
import MoveXMap from '../components/MoveXMap';
// Directions removed to avoid billing
import * as Location from 'expo-location';
import { ChevronLeft, Navigation as NavIcon, MapPin, Zap, Globe, Clock, ChevronRight } from 'lucide-react-native';
import api from '../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_API_KEY';

export default function MapScreen({ route, navigation }) {
    const { t } = useTranslation();
    const { order } = route.params;
    const [driverLoc, setDriverLoc] = useState(null);
    const [routeCoords, setRouteCoords] = useState([]);
    const [travelInfo, setTravelInfo] = useState({ distance: '0', duration: '0' });
    const [nextStep, setNextStep] = useState(null);
    const mapRef = useRef(null);

    useEffect(() => {
        let watchId;
        (async () => {
            try {
                const servicesEnabled = await Location.hasServicesEnabledAsync();
                if (!servicesEnabled) {
                    Alert.alert(t('location_error'), t('location_services_disabled', 'Location services are disabled. Please enable them in settings.'));
                    return;
                }

                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    Alert.alert(t('protocol_failure'), t('location_telemetry_required_desc'));
                    return;
                }

                watchId = await Location.watchPositionAsync({
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10
                }, (loc) => {
                    const newLoc = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
                    setDriverLoc(newLoc);
                    fetchRoute(newLoc);
                    api.patch('/drivers/location', { lat: newLoc.latitude, lng: newLoc.longitude }).catch(() => {});
                });
            } catch (err) {
                console.log('Map location error:', err.message);
            }
        })();

        return () => {
            if (watchId && watchId.remove) watchId.remove();
        };
    }, []);

    const isPickedUp = order.status === 'PICKED_UP';
    const destination = isPickedUp ? {
        latitude: order.destCoords?.lat || 28.7041,
        longitude: order.destCoords?.lng || 77.1025
    } : {
        latitude: order.pickupCoords?.lat || 28.6139,
        longitude: order.pickupCoords?.lng || 77.2090
    };

    const destAddress = isPickedUp ? (order.destination?.address || order.destination) : (order.pickup?.address || order.pickup);

    const fetchRoute = async (start) => {
        try {
            const dest = order.status === 'ACCEPTED' ? { lat: order.pickupCoords?.lat, lng: order.pickupCoords?.lng } : { lat: order.destCoords?.lat, lng: order.destCoords?.lng };
            const url = `https://router.project-osrm.org/route/v1/driving/${start.longitude},${start.latitude};${dest.lng},${dest.lat}?overview=full&geometries=geojson`;
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
                setRouteCoords(data.routes[0].geometry.coordinates.map(c => ({ latitude: c[1], longitude: c[0] })));
                setTravelInfo({ distance: (data.routes[0].distance / 1000).toFixed(1), duration: Math.ceil(data.routes[0].duration / 60).toString() });
                
                // OSRM steps are different from Google Maps, this is a simplified approach
                if (data.routes[0].legs && data.routes[0].legs[0] && data.routes[0].legs[0].steps && data.routes[0].legs[0].steps.length > 0) {
                    setNextStep({
                        html_instructions: data.routes[0].legs[0].steps[0].maneuver.instruction,
                        distance: { text: `${(data.routes[0].legs[0].steps[0].distance / 1000).toFixed(1)} km` }
                    });
                }
            }
        } catch (e) {
            console.error("Error fetching route:", e);
        }
    };

    const launchExternalGPS = () => {
        const scheme = Platform.select({ ios: 'maps://0,0?q=', android: 'geo:0,0?q=' });
        const latLng = `${destination.latitude},${destination.longitude}`;
        const label = destAddress;
        const url = Platform.select({
            ios: `${scheme}${label}@${latLng}`,
            android: `${scheme}${latLng}(${label})`
        });
        Linking.openURL(url);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" transparent />
            
            <MoveXMap 
                style={styles.map}
                driverLocation={driverLoc ? { lat: driverLoc.latitude, lng: driverLoc.longitude } : null}
                destination={destination ? { lat: destination.latitude, lng: destination.longitude } : null}
                route={routeCoords}
                markers={[{ latitude: destination.latitude, longitude: destination.longitude }]}
            />

            {/* Turn-By-Turn Instruction HUD */}
            <SafeAreaView style={styles.hudContainer}>
                <View style={styles.hudInner}>
                    {nextStep && (
                        <View style={styles.instructionCard}>
                            <View style={styles.navIconBox}>
                                <NavIcon size={28} color="#2563EB" strokeWidth={3} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.instructionText} numberOfLines={2}>
                                    {nextStep.html_instructions.replace(/<[^>]*>?/gm, '')}
                                </Text>
                                <Text style={styles.distanceText}>
                                    {nextStep.distance.text} • {t('ahead')}
                                </Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.addressCard}>
                        <TouchableOpacity 
                            onPress={() => navigation.goBack()} 
                            style={styles.backButton}
                        >
                            <ChevronLeft size={24} color="#0f172a" />
                        </TouchableOpacity>
                        <View style={styles.addressContent}>
                            <Text style={styles.addressLabel}>
                                {isPickedUp ? t('dropoff') : t('pickup')}
                            </Text>
                            <Text style={styles.addressText} numberOfLines={1}>
                                {destAddress}
                            </Text>
                        </View>
                    </View>
                </View>
            </SafeAreaView>

            {/* Navigation Execution Deck */}
            <View style={styles.deckPosition}>
                <LinearGradient
                    colors={['#0f172a', '#1e293b']}
                    style={styles.deckGradient}
                >
                    <View style={styles.deckHeader}>
                        <View>
                            <View style={styles.etaLabelRow}>
                                <Clock size={12} color="rgba(255,255,255,0.4)" />
                                <Text style={styles.etaLabel}>{t('estimated_t_arrival')}</Text>
                            </View>
                            <Text style={styles.etaText}>
                                {travelInfo.duration} <Text style={{ color: '#2563EB', fontSize: 18 }}>{t('mins')}</Text>
                            </Text>
                            <Text style={styles.remainingText}>{travelInfo.distance} km {t('remaining')}</Text>
                        </View>
                        <View style={styles.zapBox}>
                            <Zap size={24} color="#2563EB" fill="#2563EB" />
                        </View>
                    </View>

                    <View style={styles.deckActions}>
                        <TouchableOpacity onPress={launchExternalGPS} style={styles.externalGpsButton}>
                            <Globe size={18} color="#2563EB" />
                            <Text style={styles.externalGpsText}>{t('external_gps_relay')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={launchExternalGPS} style={styles.goButton}>
                            <ChevronRight size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    
                    <View style={styles.backgroundGlobe}>
                        <Globe size={150} color="#fff" />
                    </View>
                </LinearGradient>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    map: {
        flex: 1,
    },
    destinationMarker: {
        backgroundColor: '#2563EB',
        padding: 12,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        borderWidth: 2,
        borderColor: '#fff',
    },
    hudContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
    hudInner: {
        paddingHorizontal: 24,
        paddingTop: 24,
        gap: 16,
    },
    instructionCard: {
        backgroundColor: '#0f172a',
        borderRadius: 32,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    navIconBox: {
        width: 56,
        height: 56,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        marginRight: 16,
    },
    instructionText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 18,
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    distanceText: {
        color: '#3b82f6',
        fontWeight: '700',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 4,
    },
    addressCard: {
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 32,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
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
    addressContent: {
        flex: 1,
        marginLeft: 16,
        paddingRight: 16,
    },
    addressLabel: {
        fontSize: 10,
        fontWeight: '900',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 2,
        fontStyle: 'italic',
    },
    addressText: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 16,
        fontStyle: 'italic',
        letterSpacing: -0.5,
    },
    deckPosition: {
        position: 'absolute',
        bottom: 40,
        left: 24,
        right: 24,
    },
    deckGradient: {
        borderRadius: 48,
        padding: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.4,
        shadowRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
    },
    deckHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    etaLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    etaLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontWeight: '900',
        fontSize: 10,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginLeft: 8,
    },
    etaText: {
        color: '#fff',
        fontSize: 40,
        fontWeight: '900',
        letterSpacing: -1.5,
        fontStyle: 'italic',
    },
    remainingText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: 9,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginTop: 4,
    },
    zapBox: {
        width: 56,
        height: 56,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    deckActions: {
        flexDirection: 'row',
        gap: 16,
    },
    externalGpsButton: {
        flex: 1,
        backgroundColor: '#fff',
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    externalGpsText: {
        color: '#0f172a',
        fontWeight: '900',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginLeft: 12,
        fontStyle: 'italic',
    },
    goButton: {
        width: 64,
        height: 64,
        backgroundColor: '#2563EB',
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2563EB',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
    },
    backgroundGlobe: {
        position: 'absolute',
        bottom: -40,
        right: 40,
        opacity: 0.05,
    }
});

const mapStyle = [
    {
        "elementType": "geometry",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "elementType": "labels.icon",
        "stylers": [{ "visibility": "off" }]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [{ "color": "#f5f5f5" }]
    },
    {
        "featureType": "administrative.land_parcel",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#bdbdbd" }]
    },
    {
        "featureType": "poi",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [{ "color": "#ffffff" }]
    },
    {
        "featureType": "road.arterial",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#757575" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [{ "color": "#dadada" }]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#616161" }]
    },
    {
        "featureType": "road.local",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    },
    {
        "featureType": "transit.line",
        "elementType": "geometry",
        "stylers": [{ "color": "#e5e5e5" }]
    },
    {
        "featureType": "transit.station",
        "elementType": "geometry",
        "stylers": [{ "color": "#eeeeee" }]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [{ "color": "#c9c9c9" }]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [{ "color": "#9e9e9e" }]
    }
];

