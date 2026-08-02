import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors } from '../theme';
import { AnimatedPressable } from './Motion';
import { EmptyState, Panel, SectionTitle } from './UI';

type Application = { id: string; site_id: string; site_name: string; requested_role: 'security' | 'resident'; full_name: string; email?: string; status: string; admin_note?: string; created_at: string };
type Resident = { membership_id: string; user_id: string; full_name: string; phone: string; block: string; floor: string; apartment: string; address_note: string; is_active: boolean };

export function SiteRoleApplicationsManager() {
  const gate = useGate();
  const [managedIds, setManagedIds] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [items, setItems] = useState<Application[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentQuery, setResidentQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [residentLoading, setResidentLoading] = useState(false);
  const [working, setWorking] = useState('');
  const sites = useMemo(() => gate.sites.filter((site) => managedIds.includes(site.id)), [gate.sites, managedIds]);

  const loadManaged = useCallback(async () => {
    const { data, error } = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
    if (error) throw error;
    const ids = Array.isArray(data) ? data.filter((id): id is string => typeof id === 'string') : [];
    setManagedIds(ids);
    setSiteId((current) => current && ids.includes(current) ? current : ids[0] ?? '');
    return ids;
  }, []);

  const searchResidents = useCallback(async (targetSiteId?: string, query = residentQuery) => {
    const selected = targetSiteId || siteId;
    if (!selected) { setResidents([]); return; }
    setResidentLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_search_site_residents', { p_site_id: selected, p_query: query.trim(), p_limit: 50 });
      if (error) throw error;
      setResidents(Array.isArray(data) ? data as Resident[] : []);
    } catch (caught) {
      Alert.alert('Site sakinleri alınamadı', caught instanceof Error ? caught.message : 'Tekrar deneyin.');
    } finally { setResidentLoading(false); }
  }, [residentQuery, siteId]);

  const load = useCallback(async (target?: string) => {
    setLoading(true);
    try {
      const ids = managedIds.length ? managedIds : await loadManaged();
      const selected = target || siteId || ids[0];
      if (!selected) { setItems([]); setResidents([]); return; }
      const { data, error } = await supabase.rpc('dkd_gate_list_site_role_applications', { p_site_id: selected });
      if (error) throw error;
      setItems(Array.isArray(data) ? data as Application[] : []);
      await searchResidents(selected, '');
    } catch (caught) {
      Alert.alert('Başvurular alınamadı', caught instanceof Error ? caught.message : 'Tekrar deneyin.');
    } finally { setLoading(false); }
  }, [loadManaged, managedIds, searchResidents, siteId]);

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (siteId) void load(siteId); }, [siteId]);

  const decide = (item: Application, status: 'approved' | 'rejected') => Alert.alert(
    status === 'approved' ? 'Başvuruyu onayla' : 'Başvuruyu reddet',
    `${item.full_name} • ${item.requested_role === 'security' ? 'Güvenlik' : 'Site Sakini'}`,
    [{ text: 'Vazgeç', style: 'cancel' }, { text: status === 'approved' ? 'Onayla' : 'Reddet', style: status === 'rejected' ? 'destructive' : 'default', onPress: async () => {
      setWorking(item.id);
      try {
        const { error } = await supabase.rpc('dkd_gate_decide_site_role_application', { p_application_id: item.id, p_status: status, p_admin_note: null });
        if (error) throw error;
        await Promise.all([load(siteId), gate.refresh()]);
      } catch (caught) {
        Alert.alert('İşlem tamamlanamadı', caught instanceof Error ? caught.message : 'Tekrar deneyin.');
      } finally { setWorking(''); }
    } }],
  );

  if (loading && !items.length && !residents.length) return <View style={styles.loading}><ActivityIndicator color={colors.magenta} /><Text style={styles.muted}>Site yönetimi yükleniyor</Text></View>;
  return <View style={styles.container}>
    {sites.length > 1 ? <View style={styles.sites}>{sites.map((site) => <AnimatedPressable key={site.id} onPress={() => { setResidentQuery(''); setSiteId(site.id); }}><View style={[styles.site, siteId === site.id && styles.siteActive]}><Ionicons name="business" size={18} color={siteId === site.id ? colors.magenta : colors.textMuted} /><Text style={[styles.siteText, siteId === site.id && { color: colors.magenta }]}>{site.name}</Text></View></AnimatedPressable>)}</View> : null}

    <SectionTitle title="Site sakini bul" action={`${residents.length} sonuç`} />
    <Text style={styles.searchHint}>Ad soyad, daire, blok veya telefon numarasından herhangi birini yazın.</Text>
    <View style={styles.searchRow}>
      <View style={styles.searchBox}><Ionicons name="search" size={19} color={colors.cyan} /><TextInput value={residentQuery} onChangeText={setResidentQuery} onSubmitEditing={() => void searchResidents()} returnKeyType="search" placeholder="Ad, daire, blok veya telefon" placeholderTextColor={colors.textMuted} style={styles.searchInput} autoCapitalize="words" />{residentQuery ? <AnimatedPressable onPress={() => { setResidentQuery(''); void searchResidents(siteId, ''); }}><Ionicons name="close-circle" size={20} color={colors.textMuted} /></AnimatedPressable> : null}</View>
      <AnimatedPressable onPress={() => void searchResidents()} disabled={residentLoading}><View style={styles.searchButton}>{residentLoading ? <ActivityIndicator size="small" color={colors.white} /> : <Text style={styles.searchButtonText}>ARA</Text>}</View></AnimatedPressable>
    </View>
    {residents.length ? <View style={styles.residentList}>{residents.map((resident) => <Panel key={resident.membership_id} style={styles.residentCard} gradient><View style={styles.residentIcon}><Ionicons name="person" size={22} color={colors.cyan} /></View><View style={styles.copy}><Text style={styles.name}>{resident.full_name}</Text><Text style={styles.address}>Blok {resident.block} • Kat {resident.floor} • Daire {resident.apartment}</Text><Text style={styles.phone}>{resident.phone || 'Telefon numarası kayıtlı değil'}</Text>{resident.address_note ? <Text style={styles.note}>{resident.address_note}</Text> : null}</View><Ionicons name="checkmark-circle" size={20} color={colors.green} /></Panel>)}</View> : residentLoading ? null : <EmptyState icon="search-outline" title="Site sakini bulunamadı" description="Arama bilgisini kontrol edin veya boş aramayla ilk 50 aktif sakini listeleyin." />}

    <SectionTitle title="Güvenlik ve site sakini başvuruları" action={`${items.length} kayıt`} />
    {items.length ? items.map((item) => <Panel key={item.id} style={styles.card} gradient><View style={[styles.icon, { backgroundColor: item.requested_role === 'security' ? 'rgba(67,231,162,.14)' : 'rgba(255,179,92,.14)' }]}><Ionicons name={item.requested_role === 'security' ? 'shield-checkmark' : 'home'} size={24} color={item.requested_role === 'security' ? colors.green : colors.orange} /></View><View style={styles.copy}><Text style={styles.name}>{item.full_name}</Text><Text style={styles.detail}>{item.email || 'E-posta yok'} • {item.requested_role === 'security' ? 'Güvenlik' : 'Site Sakini'}</Text><Text style={styles.status}>{item.status === 'pending' ? 'ONAY BEKLİYOR' : item.status === 'approved' ? 'ONAYLANDI' : 'REDDEDİLDİ'}</Text></View>{item.status === 'pending' ? <View style={styles.actions}><AnimatedPressable onPress={() => decide(item, 'approved')} disabled={working === item.id}><View style={styles.approve}><Ionicons name="checkmark" size={18} color={colors.green} /></View></AnimatedPressable><AnimatedPressable onPress={() => decide(item, 'rejected')} disabled={working === item.id}><View style={styles.reject}><Ionicons name="close" size={18} color={colors.red} /></View></AnimatedPressable></View> : null}</Panel>) : <EmptyState icon="people-outline" title="Bekleyen başvuru yok" description="Güvenlik ve site sakini kayıt başvuruları burada görünür." />}
  </View>;
}

const styles = StyleSheet.create({
  container: { gap: 11 }, loading: { padding: 20, alignItems: 'center', gap: 8 }, muted: { color: colors.textMuted }, sites: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, site: { minHeight: 40, borderRadius: 13, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }, siteActive: { borderColor: colors.magenta, backgroundColor: 'rgba(228,109,255,.08)' }, siteText: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  searchHint: { color: colors.textSoft, fontSize: 10.5, lineHeight: 16 }, searchRow: { flexDirection: 'row', gap: 8 }, searchBox: { flex: 1, minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.06)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }, searchInput: { flex: 1, color: colors.text, fontSize: 12.5, fontWeight: '800' }, searchButton: { width: 58, minHeight: 52, borderRadius: 16, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center' }, searchButtonText: { color: colors.white, fontWeight: '900', fontSize: 11 },
  residentList: { gap: 8 }, residentCard: { flexDirection: 'row', alignItems: 'center', gap: 10 }, residentIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(55,216,255,.10)', alignItems: 'center', justifyContent: 'center' }, address: { color: colors.textSoft, fontSize: 10.5, marginTop: 3 }, phone: { color: colors.cyan, fontSize: 11, fontWeight: '900', marginTop: 4 }, note: { color: colors.textMuted, fontSize: 9.5, marginTop: 3 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10 }, icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 14, fontWeight: '900' }, detail: { color: colors.textSoft, fontSize: 10, marginTop: 3 }, status: { color: colors.cyan, fontSize: 9, fontWeight: '900', marginTop: 5 }, actions: { flexDirection: 'row', gap: 6 }, approve: { width: 39, height: 39, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(67,231,162,.45)', alignItems: 'center', justifyContent: 'center' }, reject: { width: 39, height: 39, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,101,125,.45)', alignItems: 'center', justifyContent: 'center' },
});
