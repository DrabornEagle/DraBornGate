import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { Panel, SectionTitle } from '../components/UI';
import { useGateAdmin } from '../hooks/useGateAdmin';
import { supabase } from '../lib/supabase';
import { colors, radius, spacing } from '../theme';
import { ManagementHomeV030 } from './ManagementHomeV030';

type ManagementApplication = {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  site_name: string;
  site_address: string;
  city: string;
  admin_note?: string | null;
  reviewed_at?: string | null;
  created_at: string;
};

export function ManagementAccessGate() {
  const { isAdmin, checkingAdmin } = useGateAdmin();
  const [application, setApplication] = useState<ManagementApplication | null>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_get_my_management_application');
      if (error) throw error;
      setApplication((data ?? null) as ManagementApplication | null);
    } catch {
      setApplication(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (checkingAdmin || loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.magenta} />
        <Text style={styles.loadingTitle}>Yönetim yetkisi kontrol ediliyor</Text>
        <Text style={styles.loadingText}>Başvuru, paket ve site bilgilerin hazırlanıyor.</Text>
      </View>
    );
  }

  if (isAdmin || application?.status === 'approved') return <ManagementHomeV030 />;

  const rejected = application?.status === 'rejected';
  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
      automaticallyAdjustKeyboardInsets
    >
      <FadeInView style={styles.hero}>
        <View style={[styles.icon, rejected && styles.iconRejected]}>
          <Ionicons
            name={rejected ? 'close-circle' : 'hourglass'}
            size={42}
            color={rejected ? colors.red : colors.orange}
          />
        </View>
        <Text style={styles.title}>{rejected ? 'Yönetim başvurusu reddedildi' : 'Yönetim onayı bekleniyor'}</Text>
        <Text style={styles.text}>
          {rejected
            ? 'Site Yönetim Paneli henüz açılamadı. Admin notunu kontrol edip başvuru bilgilerini yeniden düzenleyebilirsin.'
            : 'Site Yönetim Paneli, DraBornGate Admin onayından sonra otomatik olarak açılacak.'}
        </Text>
      </FadeInView>

      <SectionTitle title="Başvuru bilgileri" />
      <Panel style={styles.panel} gradient>
        <Info icon="business" label="Site adı" value={application?.site_name || 'Başvuru kaydı bulunamadı'} />
        <Info icon="location" label="Adres" value={application ? `${application.site_address} • ${application.city}` : 'Profil bölümünden çıkış yapıp yeniden giriş yap.'} />
        <Info
          icon="information-circle"
          label="Durum"
          value={rejected ? 'Reddedildi' : application ? 'Admin incelemesinde' : 'Başvuru oluşturuluyor'}
          tone={rejected ? colors.red : colors.orange}
        />
        {application?.admin_note ? <Info icon="chatbox" label="Admin notu" value={application.admin_note} tone={colors.cyan} /> : null}
      </Panel>

      <AnimatedPressable onPress={() => void load()}>
        <View style={styles.refreshButton}>
          <Ionicons name="refresh" size={21} color={colors.cyan} />
          <Text style={styles.refreshText}>ONAY DURUMUNU YENİLE</Text>
        </View>
      </AnimatedPressable>

      <Panel style={styles.note}>
        <Ionicons name="shield-checkmark" size={24} color={colors.green} />
        <Text style={styles.noteText}>
          Onay sonrasında site kaydı ve Profesyonel deneme paketi otomatik açılır. Güvenlik personelini, yöneticilerini ve site sakinlerini panelden ekleyebilir; v0.3 raporlarını kullanabilirsin.
        </Text>
      </Panel>
    </ScrollView>
  );
}

function Info({ icon, label, value, tone = colors.text }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string; tone?: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={20} color={tone} /></View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, { color: tone }]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  loadingTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 14 },
  loadingText: { color: colors.textSoft, fontSize: 14, marginTop: 6, textAlign: 'center' },
  content: { padding: spacing.md, paddingTop: 22, paddingBottom: 120, gap: 18 },
  hero: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 22 },
  icon: { width: 92, height: 92, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,179,92,.14)', borderWidth: 1, borderColor: 'rgba(255,179,92,.35)' },
  iconRejected: { backgroundColor: 'rgba(255,101,125,.12)', borderColor: 'rgba(255,101,125,.35)' },
  title: { color: colors.text, fontSize: 27, fontWeight: '900', textAlign: 'center', marginTop: 17 },
  text: { color: colors.textSoft, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 8, maxWidth: 370 },
  panel: { gap: 12 },
  infoRow: { minHeight: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 10 },
  infoIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,.04)' },
  infoCopy: { flex: 1 },
  infoLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '900' },
  infoValue: { fontSize: 14, lineHeight: 20, fontWeight: '800', marginTop: 3 },
  refreshButton: { height: 56, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  refreshText: { color: colors.cyan, fontSize: 13, fontWeight: '900' },
  note: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderColor: 'rgba(67,231,162,.32)' },
  noteText: { flex: 1, color: colors.textSoft, fontSize: 13, lineHeight: 20 },
});
