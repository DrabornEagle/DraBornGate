import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';
import { GateMapPoint, SiteLocationPicker } from './SiteLocationPicker';
import { Panel } from './UI';

type AdminSite = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_active: boolean;
  owner_email: string;
  owner_name: string;
  created_at: string;
};

export function AdminSitesManager() {
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [editing, setEditing] = useState<AdminSite>();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [point, setPoint] = useState<GateMapPoint>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_admin_list_sites');
      if (error) throw error;
      setSites(Array.isArray(data) ? data as AdminSite[] : []);
    } catch (error) {
      Alert.alert('Siteler alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openEdit = (site: AdminSite) => {
    setEditing(site);
    setName(site.name);
    setAddress(site.address ?? '');
    setCity(site.city ?? '');
    setPoint(site.latitude != null && site.longitude != null ? { latitude: Number(site.latitude), longitude: Number(site.longitude) } : undefined);
  };

  const save = async () => {
    if (!editing) return;
    if (!name.trim() || !address.trim()) return Alert.alert('Eksik bilgi', 'Site adı ve adresi gerekli.');
    setWorking(true);
    try {
      const { error } = await supabase.rpc('dkd_gate_update_site', {
        p_site_id: editing.id,
        p_name: name.trim(),
        p_address: address.trim(),
        p_city: city.trim(),
        p_latitude: point?.latitude ?? null,
        p_longitude: point?.longitude ?? null,
      });
      if (error) throw error;
      setEditing(undefined);
      await load();
      Alert.alert('Site güncellendi', 'Ad, adres ve harita konumu kaydedildi.');
    } catch (error) {
      Alert.alert('Site güncellenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const setActive = (site: AdminSite, active: boolean) => Alert.alert(
    active ? 'Siteyi geri aç' : 'Siteyi kaldır',
    active
      ? `${site.name} yeniden aktif edilsin mi?`
      : `${site.name} aktif sistemden kaldırılsın mı? Finans ve denetim kayıtları güvenlik için korunur.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: active ? 'Aktifleştir' : 'Kaldır',
        style: active ? 'default' : 'destructive',
        onPress: async () => {
          setWorking(true);
          try {
            const { error } = await supabase.rpc('dkd_gate_admin_set_site_active', { p_site_id: site.id, p_active: active });
            if (error) throw error;
            await load();
          } catch (error) {
            Alert.alert('İşlem yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
          } finally {
            setWorking(false);
          }
        },
      },
    ],
  );

  if (loading) return <Panel style={styles.loading}><ActivityIndicator color={colors.cyan} /><Text style={styles.help}>Siteler yükleniyor</Text></Panel>;

  return (
    <View style={styles.list}>
      {editing ? (
        <Panel style={styles.form} gradient>
          <View style={styles.formHeader}>
            <View style={styles.copy}><Text style={styles.title}>Siteyi düzenle</Text><Text style={styles.help}>{editing.owner_name} • {editing.owner_email}</Text></View>
            <AnimatedPressable onPress={() => setEditing(undefined)}><View style={styles.iconButton}><Ionicons name="close" size={20} color={colors.red} /></View></AnimatedPressable>
          </View>
          <Field label="Site / Apartman adı" value={name} onChangeText={setName} />
          <Field label="Site adresi" value={address} onChangeText={setAddress} multiline />
          <Field label="Şehir" value={city} onChangeText={setCity} />
          <SiteLocationPicker value={point} address={address} city={city} onChange={setPoint} />
          <AnimatedPressable onPress={() => void save()} disabled={working}>
            <View style={styles.save}><Ionicons name="save" size={20} color={colors.white} /><Text style={styles.saveText}>SİTEYİ GÜNCELLE</Text></View>
          </AnimatedPressable>
        </Panel>
      ) : null}

      {sites.map((site) => (
        <Panel key={site.id} style={[styles.card, !site.is_active && styles.cardPassive]} gradient>
          <View style={styles.icon}><Ionicons name={site.is_active ? 'business' : 'archive'} size={24} color={site.is_active ? colors.magenta : colors.textMuted} /></View>
          <View style={styles.copy}>
            <Text style={styles.title}>{site.name}</Text>
            <Text style={styles.help}>{site.address || 'Adres yok'} • {site.city || 'Şehir yok'}</Text>
            <Text style={styles.meta}>{site.owner_name} • {site.owner_email} • {site.is_active ? 'AKTİF' : 'KALDIRILDI'}</Text>
          </View>
          <View style={styles.actions}>
            <AnimatedPressable onPress={() => openEdit(site)} disabled={working}><View style={styles.iconButton}><Ionicons name="create" size={19} color={colors.cyan} /></View></AnimatedPressable>
            <AnimatedPressable onPress={() => setActive(site, !site.is_active)} disabled={working}><View style={[styles.iconButton, !site.is_active && styles.restore]}><Ionicons name={site.is_active ? 'trash' : 'refresh'} size={19} color={site.is_active ? colors.red : colors.green} /></View></AnimatedPressable>
          </View>
        </Panel>
      ))}

      {!sites.length ? <Panel><Text style={styles.help}>Oluşturulmuş gerçek site bulunamadı.</Text></Panel> : null}
      <AnimatedPressable onPress={() => void load()} disabled={working}>
        <View style={styles.refresh}><Ionicons name="refresh" size={19} color={colors.cyan} /><Text style={styles.refreshText}>SİTELERİ YENİLE</Text></View>
      </AnimatedPressable>
    </View>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View>;
}

const styles = StyleSheet.create({
  list: { gap: 10 },
  loading: { minHeight: 90, alignItems: 'center', justifyContent: 'center', gap: 9 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardPassive: { opacity: .72 },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(228,109,255,.11)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 15, fontWeight: '900' },
  help: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 3 },
  meta: { color: colors.textMuted, fontSize: 9, lineHeight: 14, marginTop: 4, fontWeight: '800' },
  actions: { gap: 6 },
  iconButton: { width: 42, height: 42, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.035)', alignItems: 'center', justifyContent: 'center' },
  restore: { borderColor: 'rgba(67,231,162,.36)', backgroundColor: 'rgba(67,231,162,.08)' },
  refresh: { height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  refreshText: { color: colors.cyan, fontSize: 12, fontWeight: '900' },
  form: { gap: 13 },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { gap: 7 },
  label: { color: colors.textSoft, fontSize: 12, fontWeight: '900' },
  input: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.03)', color: colors.text, paddingHorizontal: 12, fontSize: 15, fontWeight: '700' },
  multiline: { minHeight: 90, paddingTop: 13, textAlignVertical: 'top' },
  save: { height: 56, borderRadius: 17, backgroundColor: colors.magenta, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: colors.white, fontSize: 13, fontWeight: '900' },
});
