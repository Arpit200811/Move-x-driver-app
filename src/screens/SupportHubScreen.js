import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ChevronLeft, Info, Send, MessageCircle, HelpCircle, FileText, Plus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

export default function SupportHubScreen({ navigation }) {
    const { t } = useTranslation();
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            const res = await api.get('/drivers/tickets');
            setTickets(res.data.tickets || []);
        } catch (e) {
            console.log('Ticket fetch error');
        } finally {
            setLoading(false);
        }
    };

    const handleNewTicket = () => {
        Alert.alert("Create Ticket", "Submit a new support request to our help desk.");
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft size={24} color="#fff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('support_center', 'Support Hub')}</Text>
                    <View style={{ width: 40 }} />
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                    <View style={styles.heroSection}>
                        <HelpCircle size={60} color="#2563EB" opacity={0.3} style={{ marginBottom: 16 }} />
                        <Text style={styles.heroTitle}>How can we help today?</Text>
                        <Text style={styles.heroSub}>Our support team is ready to assist you 24/7.</Text>
                    </View>

                    <View style={styles.quickActions}>
                        <TouchableOpacity style={styles.actionCard}>
                            <FileText size={24} color="#2563EB" />
                            <Text style={styles.actionLabel}>Help Articles</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionCard}>
                            <MessageCircle size={24} color="#10B981" />
                            <Text style={styles.actionLabel}>Live Chat</Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.sectionTitle}>Active Tickets</Text>
                    {loading ? (
                        <ActivityIndicator color="#2563EB" style={{ marginTop: 20 }} />
                    ) : (
                        tickets.map(ticket => (
                            <TouchableOpacity key={ticket._id || ticket.id} style={styles.ticketCard}>
                                <View style={styles.ticketIcon}>
                                    <FileText size={20} color="#fff" opacity={0.3} />
                                </View>
                                <View style={{ flex: 1, paddingHorizontal: 16 }}>
                                    <Text style={styles.ticketTitle} numberOfLines={1}>{ticket.title}</Text>
                                    <Text style={styles.ticketDate}>{ticket.date || new Date(ticket.createdAt).toLocaleDateString()}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: ticket.status === 'Resolved' ? '#10B981' : '#2563EB' }]}>
                                    <Text style={styles.statusText}>{ticket.status}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                    {!loading && tickets.length === 0 && (
                        <Text style={styles.emptyText}>No active tickets found.</Text>
                    )}

                    <TouchableOpacity onPress={handleNewTicket} style={styles.newTicketButton}>
                        <LinearGradient colors={['#2563EB', '#1e40af']} style={styles.newTicketGradient}>
                            <Plus size={20} color="#fff" />
                            <Text style={styles.newTicketText}>Open New Ticket</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 20 },
    backButton: { padding: 8, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '900', fontStyle: 'italic' },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    heroSection: { alignItems: 'center', marginVertical: 40 },
    heroTitle: { color: '#fff', fontSize: 28, fontWeight: '900', textAlign: 'center' },
    heroSub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', marginTop: 8 },
    quickActions: { flexDirection: 'row', gap: 16, marginBottom: 40 },
    actionCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    actionLabel: { color: '#fff', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, marginTop: 12 },
    sectionTitle: { color: 'rgba(255,255,255,0.3)', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
    ticketCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, padding: 20, marginBottom: 12 },
    ticketIcon: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    ticketTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
    ticketDate: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '700', marginTop: 4 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    statusText: { color: '#fff', fontWeight: '900', fontSize: 9, textTransform: 'uppercase' },
    newTicketButton: { height: 70, marginTop: 24, borderRadius: 20, overflow: 'hidden' },
    newTicketGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
    newTicketText: { color: '#fff', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', fontStyle: 'italic' }
});
