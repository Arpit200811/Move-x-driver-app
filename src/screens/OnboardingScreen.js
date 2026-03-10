import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { ChevronRight, Zap, Target, Shield, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { FadeIn, FadeOut, SlideInRight } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const SLIDES = [
    {
        id: '1',
        title: 'MISSION CONTROL',
        desc: 'Welcome to the most advanced driver telemetry network in the sector.',
        icon: <Target size={80} color="#2563EB" />,
        color: '#2563EB'
    },
    {
        id: '2',
        title: 'LIQUID EARNINGS',
        desc: 'Track every dollar with real-time dynamic ledger and weekly performance charts.',
        icon: <Zap size={80} color="#10B981" />,
        color: '#10B981'
    },
    {
        id: '3',
        title: 'GUARDIAN PROTOCOL',
        desc: 'Built-in SOS systems and emergency telemetry to keep you safe on every mission.',
        icon: <Shield size={80} color="#EF4444" />,
        color: '#EF4444'
    }
];

export default function OnboardingScreen({ navigation }) {
    const [index, setIndex] = useState(0);
    const listRef = useRef(null);

    const handleNext = async () => {
        if (index < SLIDES.length - 1) {
            listRef.current?.scrollToIndex({ index: index + 1 });
            setIndex(index + 1);
        } else {
            await AsyncStorage.setItem('onboarding_complete', 'true');
            navigation.replace('DriverLogin');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#0f172a', '#1e293b']} style={StyleSheet.absoluteFillObject} />

            <FlatList
                ref={listRef}
                data={SLIDES}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                    const i = Math.round(e.nativeEvent.contentOffset.x / width);
                    setIndex(i);
                }}
                renderItem={({ item }) => (
                    <View style={styles.slide}>
                        <Animated.View entering={FadeIn.delay(300)} style={styles.iconBox}>
                            {item.icon}
                        </Animated.View>
                        <Animated.Text entering={SlideInRight.delay(200)} style={styles.title}>{item.title}</Animated.Text>
                        <Animated.Text entering={FadeIn.delay(400)} style={styles.desc}>{item.desc}</Animated.Text>
                    </View>
                )}
                keyExtractor={(item) => item.id}
            />

            <View style={styles.footer}>
                <View style={styles.indicatorRow}>
                    {SLIDES.map((_, i) => (
                        <View 
                            key={i} 
                            style={[styles.dot, { backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.2)', width: i === index ? 30 : 8 }]} 
                        />
                    ))}
                </View>

                <TouchableOpacity onPress={handleNext} style={styles.button}>
                    <LinearGradient
                        colors={index === SLIDES.length - 1 ? ['#10B981', '#059669'] : ['#2563EB', '#1e40af']}
                        style={styles.buttonGradient}
                    >
                        <Text style={styles.buttonText}>
                            {index === SLIDES.length - 1 ? 'START MISSION' : 'CONTINUE'}
                        </Text>
                        <ArrowRight size={20} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a',
    },
    slide: {
        width,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
    },
    iconBox: {
        width: 160,
        height: 160,
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 80,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 60,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        textAlign: 'center',
        letterSpacing: 4,
        fontStyle: 'italic',
    },
    desc: {
        fontSize: 14,
        color: '#94a3b8',
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 24,
        fontWeight: '600',
    },
    footer: {
        paddingHorizontal: 40,
        paddingBottom: 40,
    },
    indicatorRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 40,
        gap: 8,
    },
    dot: {
        height: 4,
        borderRadius: 2,
    },
    button: {
        height: 64,
        borderRadius: 32,
        overflow: 'hidden',
    },
    buttonGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 2,
    }
});
