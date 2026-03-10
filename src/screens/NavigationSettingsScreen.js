import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet, Image } from 'react-native';
import { ChevronLeft, Navigation as NavIcon, CheckCircle, Map as MapIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';

export default function NavigationSettingsScreen({ navigation }) {
    const { t } = useTranslation();
    const [selectedNav, setSelectedNav] = useState('google');

    useEffect(() => {
        loadNav();
    }, []);

    const loadNav = async () => {
        const saved = await AsyncStorage.getItem('driver_nav_choice');
        if (saved) setSelectedNav(saved);
    };

    const saveNav = async (choice) => {
        setSelectedNav(choice);
        await AsyncStorage.setItem('driver_nav_choice', choice);
    };

    const NavOption = ({ id, name, icon: Icon, desc }) => (
        <TouchableOpacity 
            onPress={() => saveNav(id)}
            style={[styles.optionCard, selectedNav === id && styles.optionSelected]}
        >
            <View style={styles.iconBox}>
                <Icon size={24} color={selectedNav === id ? "#fff" : "rgba(255,255,255,0.4)"} />
            </View>
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
                <Text style={[styles.optionName, selectedNav === id && { color: '#fff' }]}>{name}</Text>
                <Text style={styles.optionDesc}>{desc}</Text>
            </View>
            {selectedNav === id && <CheckCircle size={24} color="#2563EB" fill="#2563EB" opacity={0.3} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('navigation_settings', 'Navigation Data')}</Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.sectionLabel}>Tactical Navigation Engine</Text>
                    <NavOption 
                        id="google" 
                        name="Google Maps" 
                        icon={MapIcon} 
                        desc="Standard precision, real-time traffic data." 
                    />
                    <NavOption 
                        id="waze" 
                        name="Waze Navigation" 
                        icon={NavIcon} 
                        desc="Community-driven tactical traffic alerts." 
                    />
                    <NavOption 
                        id="apple" 
                        name="Apple Maps" 
                        icon={MapIcon} 
                        desc="Native integration with iOS devices." 
                    />
                </View>

                <View style={styles.footerNote}>
                    <Text style={styles.footerText}>Chosen navigation engine will launch automatically upon mission acceptance.</Text>
                </View>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
    backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
    content: { padding: 24 },
    sectionLabel: { color: 'rgba(255,255,255,0.3)', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 24 },
    optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 24, padding: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    optionSelected: { backgroundColor: 'rgba(37, 99, 235, 0.05)', borderColor: 'rgba(37, 99, 235, 0.2)' },
    iconBox: { width: 56, height: 56, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    optionName: { color: 'rgba(255,255,255,0.4)', fontWeight: '900', fontSize: 18, fontStyle: 'italic' },
    optionDesc: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontWeight: '600', marginTop: 4 },
    footerNote: { padding: 40, marginTop: 'auto' },
    footerText: { color: 'rgba(255,255,255,0.2)', fontSize: 12, textAlign: 'center', fontStyle: 'italic', lineHeight: 20 }
});
