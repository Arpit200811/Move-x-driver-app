import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { ChevronLeft, ShieldCheck, FileText, Scale, ExternalLink } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export default function LegalScreen({ navigation }) {
  const { t } = useTranslation();

  const LegalItem = ({ icon: Icon, title, onPress }) => (
    <TouchableOpacity style={styles.item} onPress={onPress}>
        <View style={styles.iconBox}>
            <Icon size={20} color="#64748b" />
        </View>
        <Text style={styles.itemTitle}>{title}</Text>
        <ExternalLink size={16} color="#cbd5e1" />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('legal_policy', 'Legal & Privacy')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
          <View style={styles.intro}>
              <ShieldCheck size={48} color="#2563EB" />
              <Text style={styles.introTitle}>MoveX Fleet Policy</Text>
              <Text style={styles.introSub}>Review the terms of service, driver conduct guidelines, and data privacy policies.</Text>
          </View>

          <View style={styles.card}>
              <LegalItem icon={FileText} title="Driver Terms of Service" />
              <View style={styles.divider} />
              <ShieldCheck size={20} color="#64748b" style={{ position: 'absolute', left: 20, top: 100 }} />
              <LegalItem icon={ShieldCheck} title="Privacy Policy" />
              <View style={styles.divider} />
              <LegalItem icon={Scale} title="Fleet Compliance" />
              <View style={styles.divider} />
              <LegalItem icon={FileText} title="Safety Guidelines" />
          </View>

          <View style={styles.versionSection}>
              <Text style={styles.copy}>© 2026 MoveX Fleet Operations</Text>
              <Text style={styles.ver}>Version 2.5.4 (Build 778-D)</Text>
          </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    backBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
    intro: { alignItems: 'center', marginVertical: 40 },
    introTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 16 },
    introSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginTop: 12, paddingHorizontal: 20, lineHeight: 22 },
    card: { backgroundColor: '#fff', borderRadius: 24, borderWidth: 1, borderColor: '#f1f5f9', overflow: 'hidden' },
    item: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
    itemTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1e293b' },
    divider: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 76 },
    versionSection: { alignItems: 'center', marginTop: 60, paddingBottom: 40 },
    copy: { fontSize: 12, fontWeight: '700', color: '#94a3b8' },
    ver: { fontSize: 10, color: '#cbd5e1', marginTop: 4, letterSpacing: 1 }
});
