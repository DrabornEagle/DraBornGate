import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors } from '../theme';
import { AnimatedPressable } from './Motion';
import { EmptyState, Panel } from './UI';

type Application = { id: string; site_id: string; site_name: string; requested_role: 'security' | 'resident'; full_name: string; email?: string; status: string; admin_note?: string; created_at: string };

export function SiteRoleApplicationsManager() {
  const gate = useGate();
  const [managedIds, setManagedIds] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [items, setItems] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const sites = useMemo(() => gate.sites.filter((site) => managedIds.includes(site.id)), [gate.sites, managedIds]);

  const loadManaged = useCallback(async () => {
    const { data, error } = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
    if (error) throw error;
    const ids = Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string') : [];
    setManagedIds(ids); setSiteId((current) => current && ids.includes(current) ? current : ids[0] ?? '');
    return ids;
  }, []);

  const load = useCallback(async (target?: string) => {
    setLoading(true);
    try {
      const ids = managedIds.length ? managedIds : await loadManaged();
      const selected = target || siteId || ids[0];
      if (!selected) { setItems([]); return; }
      const { data, error } = await supabase.rpc('dkd_gate_list_site_role_applications', { p_site_id: selected });
      if (error) throw error;
      setItems(Array.isArray(data) ? data as Application[] : []);
    } catch (caught) { Alert.alert('Başvurular alınamadı', caught instanceof Error ? caught.message : 'Tekrar dene.'); }
    finally { setLoading(false); }
  }, [loadManaged, managedIds, siteId]);

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (siteId) void load(siteId); }, [siteId]);

  const decide = (item: Application, status: 'approved' | 'rejected') => Alert.alert(status === 'approved' ? 'Başvuruyu onayla' : 'Başvuruyu reddet', `${item.full_name} • ${item.requested_role === 'security' ? 'Güvenlik' : 'Site Sakini'}`, [{ text: 'Vazgeç', style: 'cancel' }, { text: status === 'approved' ? 'Onayla' : 'Reddet', style: status === 'rejected' ? 'destructive' : 'default', onPress: async () => {
    setWorking(item.id);
    try { const { error } = await supabase.rpc('dkd_gate_decide_site_role_application', { p_application_id: item.id, p_status: status, p_admin_note: null }); if (error) throw error; await Promise.all([load(siteId), gate.refresh()]); }
    catch (caught) { Alert.alert('İşlem tamamlanamadı', caught instanceof Error ? caught.message : 'Tekrar dene.'); }
    finally { setWorking(''); }
  }}]);

  if (loading && !items.length) return <View style={styles.loading}><ActivityIndicator color={colors.magenta} /><Text style={styles.muted}>Başvurular yükleniyor</Text></View>;
  return <View style={styles.container}>
    {sites.length > 1 ? <View style={styles.sites}>{sites.map((site) => <AnimatedPressable key={site.id} onPress={() => setSiteId(site.id)}><View style={[styles.site, siteId === site.id && styles.siteActive]}><Ionicons name="business" size={18} color={siteId === site.id ? colors.magenta : colors.textMuted} /><Text style={[styles.siteText, siteId === site.id && { color: colors.magenta }]}>{site.name}</Text></View></AnimatedPressable>)}</View> : null}
    {items.length ? items.map((item) => <Panel key={item.id} style={styles.card} gradient><View style={[styles.icon, { backgroundColor: item.requested_role === 'security' ? 'rgba(67,231,162,.14)' : 'rgba(255,179,92,.14)' }]}><Ionicons name={item.requested_role === 'security' ? 'shield-checkmark' : 'home'} size={24} color={item.requested_role === 'security' ? colors.green : colors.orange} /></View><View style={styles.copy}><Text style={styles.name}>{item.full_name}</Text><Text style={styles.detail}>{item.email || 'E-posta yok'} • {item.requested_role === 'security' ? 'Güvenlik' : 'Site Sakini'}</Text><Text style={styles.status}>{item.status === 'pending' ? 'ONAY BEKLİYOR' : item.status === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ'}</Text></View>{item.status === 'pending' ? <View style={styles.actions}><AnimatedPressable onPress={() => decide(item, 'approved')} disabled={working === item.id}><View style={styles.approve}><Ionicons name="checkmark" size={18} color={colors.green} /></View></AnimatedPressable><AnimatedPressable onPress={() => decide(item, 'rejected')} disabled={working === item.id}><View style={styles.reject}><Ionicons name="close" size={18} color={colors.red} /></View></AnimatedPressable></View> : null}</Panel>) : <EmptyState icon="people-outline" title="Bekleyen başvuru yok" description="Güvenlik ve site sakini kayıt başvuruları burada görünür." />}
  </View>;
}

const styles = StyleSheet.create({ container: { gap: 10 }, loading: { padding: 20, alignItems: 'center', gap: 8 }, muted: { color: colors.textMuted }, sites: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, site: { minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }, siteActive: { borderColor: colors.magenta, backgroundColor: 'rgba(228,109,255,.08)' }, siteText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' }, card: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 14, fontWeight: '900' }, detail: { color: colors.textSoft, fontSize: 10, marginTop: 3 }, status: { color: colors.cyan, fontSize: 9, fontWeight: '900', marginTop: 5 }, actions: { flexDirection: 'row', gap: 6 }, approve: { width: 39, height: 39, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(67,231,162,.45)', alignItems: 'center', justifyContent: 'center' }, reject: { width: 39, height: 39, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,101,125,.45)', alignItems: 'center', justifyContent: 'center' } });
