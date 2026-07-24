import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';
import { Panel } from './UI';

type ManagementApplication = {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  site_name: string;
  site_address: string;
  city: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_note?: string | null;
  created_at: string;
  reviewed_at?: string | null;
};

export function AdminManagementApplications() {
  const gate = useGate();
  const [applications, setApplications] = useState<ManagementApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_admin_list_management_applications');
      if (error) throw error;
      setApplications(Array.isArray(data) ? data as ManagementApplication[] : []);
    } catch (error) {
      Alert.alert('Başvurular alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const decide = (application: ManagementApplication, status: 'approved' | 'rejected') => {
    Alert.alert(
      status === 'approved' ? 'Site yönetimini onayla' : 'Site yönetimini reddet',
      status === 'approved' ? `${application.full_name} için “${application.site_name}” Site Yönetim Paneli açılsın mı?` : `${application.full_name} tarafından gönderilen başvuru reddedilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: status === 'approved' ? 'Onayla' : 'Reddet',
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            setWorkingId(application.id);
            try {
              const { error } = await supabase.rpc('dkd_gate_admin_decide_management_application', {
                p_application_id: application.id,
                p_status: status,
                p_admin_note: status === 'approved' ? 'DraBornGate Admin tarafından onaylandı.' : 'DraBornGate Admin tarafından reddedildi.',
              });
              if (error) throw error;
              await Promise.all([load(), gate.refresh()]);
              Alert.alert(status === 'approved' ? 'Onaylandı' : 'Reddedildi', status === 'approved' ? 'Site başvuru bilgileriyle otomatik oluşturuldu ve yönetim paneli açıldı.' : 'Başvuru reddedildi ve kullanıcıya bildirim oluşturuldu.');
            } catch (error) {
              Alert.alert('İşlem tamamlanamadı', error instanceof Error ? error.message : 'Tekrar dene.');
            } finally {
              setWorkingId(undefined);
            }
          },
        },
      ],
    );
  };

  const remove = (application: ManagementApplication) => Alert.alert(
    'Başvuruyu temizle',
    `${application.full_name} başvuru kaydı listeden tamamen kaldırılsın mı? Onayla oluşturulan site etkilenmez.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Temizle', style: 'destructive', onPress: async () => {
          setWorkingId(application.id);
          try {
            const { error } = await supabase.rpc('dkd_gate_admin_delete_management_application', { p_application_id: application.id });
            if (error) throw error;
            await load();
          } catch (error) {
            Alert.alert('Başvuru temizlenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
          } finally { setWorkingId(undefined); }
        },
      },
    ],
  );

  const clearReviewed = () => Alert.alert(
    'İncelenen başvuruları temizle',
    'Onaylanmış ve reddedilmiş tüm başvuru kayıtları listeden kaldırılsın mı? Bekleyen başvurular ve oluşturulan siteler korunur.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Temizle', style: 'destructive', onPress: async () => {
          setWorkingId('clear');
          try {
            const { data, error } = await supabase.rpc('dkd_gate_admin_clear_reviewed_management_applications');
            if (error) throw error;
            await load();
            Alert.alert('Temizlendi', `${Number(data ?? 0)} incelenmiş başvuru kaldırıldı.`);
          } catch (error) {
            Alert.alert('Temizlenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
          } finally { setWorkingId(undefined); }
        },
      },
    ],
  );

  if (loading) return <Panel style={styles.loading}><ActivityIndicator color={colors.magenta} /><Text style={styles.loadingText}>Site yönetimi başvuruları alınıyor</Text></Panel>;

  return (
    <View style={styles.list}>
      {applications.length ? applications.map((application) => {
        const pending = application.status === 'pending';
        const tone = pending ? colors.orange : application.status === 'approved' ? colors.green : colors.red;
        return (
          <Panel key={application.id} style={[styles.card, { borderColor: `${tone}55` }]} gradient>
            <View style={styles.header}>
              <View style={[styles.icon, { backgroundColor: `${tone}18` }]}><Ionicons name="business" size={24} color={tone} /></View>
              <View style={styles.copy}><Text style={styles.name}>{application.full_name}</Text><Text style={styles.email}>{application.email}</Text></View>
              <View style={[styles.status, { borderColor: `${tone}66`, backgroundColor: `${tone}14` }]}><Text style={[styles.statusText, { color: tone }]}>{pending ? 'BEKLİYOR' : application.status === 'approved' ? 'ONAYLI' : 'REDDEDİLDİ'}</Text></View>
            </View>
            <View style={styles.siteBox}>
              <Text style={styles.siteName}>{application.site_name}</Text>
              <Text style={styles.siteAddress}>{application.site_address} • {application.city}</Text>
              {application.phone ? <Text style={styles.siteAddress}>Telefon: {application.phone}</Text> : null}
              <Text style={styles.date}>Başvuru: {new Date(application.created_at).toLocaleString('tr-TR')}</Text>
            </View>
            {pending ? (
              <View style={styles.actions}>
                <AnimatedPressable containerStyle={styles.actionWrap} onPress={() => decide(application, 'approved')} disabled={workingId === application.id}><View style={[styles.action, styles.approve]}><Ionicons name="checkmark-circle" size={20} color={colors.green} /><Text style={styles.approveText}>ONAYLA</Text></View></AnimatedPressable>
                <AnimatedPressable containerStyle={styles.actionWrap} onPress={() => decide(application, 'rejected')} disabled={workingId === application.id}><View style={[styles.action, styles.reject]}><Ionicons name="close-circle" size={20} color={colors.red} /><Text style={styles.rejectText}>REDDET</Text></View></AnimatedPressable>
              </View>
            ) : null}
            <AnimatedPressable onPress={() => remove(application)} disabled={workingId === application.id}>
              <View style={styles.delete}><Ionicons name="trash" size={18} color={colors.red} /><Text style={styles.deleteText}>BAŞVURU KAYDINI TEMİZLE</Text></View>
            </AnimatedPressable>
          </Panel>
        );
      }) : <Panel style={styles.empty} gradient><Ionicons name="checkmark-done-circle" size={30} color={colors.green} /><Text style={styles.emptyTitle}>İncelenecek başvuru yok</Text><Text style={styles.emptyText}>Yeni Site Yönetimi kayıtları burada görünecek.</Text></Panel>}

      {applications.some((item) => item.status !== 'pending') ? (
        <AnimatedPressable onPress={clearReviewed} disabled={workingId === 'clear'}><View style={styles.clear}><Ionicons name="trash-bin" size={19} color={colors.orange} /><Text style={styles.clearText}>İNCELENENLERİ TOPLU TEMİZLE</Text></View></AnimatedPressable>
      ) : null}
      <AnimatedPressable onPress={() => void load()}><View style={styles.refresh}><Ionicons name="refresh" size={19} color={colors.cyan} /><Text style={styles.refreshText}>BAŞVURULARI YENİLE</Text></View></AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 10 }, loading: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 9 }, loadingText: { color: colors.textSoft, fontSize: 13, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: 23 }, emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 9 }, emptyText: { color: colors.textSoft, fontSize: 13, marginTop: 5 },
  card: { gap: 12 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '900' }, email: { color: colors.textSoft, fontSize: 12, marginTop: 3 }, status: { minHeight: 29, paddingHorizontal: 8, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, statusText: { fontSize: 9, fontWeight: '900' },
  siteBox: { borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 11 }, siteName: { color: colors.text, fontSize: 15, fontWeight: '900' }, siteAddress: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }, date: { color: colors.textMuted, fontSize: 10, marginTop: 7 },
  actions: { flexDirection: 'row', gap: 9 }, actionWrap: { flex: 1 }, action: { height: 48, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, approve: { borderColor: 'rgba(67,231,162,.45)', backgroundColor: 'rgba(67,231,162,.09)' }, reject: { borderColor: 'rgba(255,101,125,.45)', backgroundColor: 'rgba(255,101,125,.09)' }, approveText: { color: colors.green, fontSize: 12, fontWeight: '900' }, rejectText: { color: colors.red, fontSize: 12, fontWeight: '900' },
  delete: { height: 43, borderRadius: 13, borderWidth: 1, borderColor: 'rgba(255,101,125,.32)', backgroundColor: 'rgba(255,101,125,.06)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, deleteText: { color: colors.red, fontSize: 10, fontWeight: '900' },
  clear: { height: 48, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,179,92,.38)', backgroundColor: 'rgba(255,179,92,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, clearText: { color: colors.orange, fontSize: 11, fontWeight: '900' },
  refresh: { height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, refreshText: { color: colors.cyan, fontSize: 12, fontWeight: '900' },
});
