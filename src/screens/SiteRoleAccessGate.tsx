import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { PropsWithChildren, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { Panel } from '../components/UI';
import { supabase } from '../lib/supabase';
import { colors, gradients, spacing } from '../theme';

type PendingRole = 'security' | 'resident';
type StatusData = { status?: string; site_name?: string; admin_note?: string; has_membership?: boolean };

export function SiteRoleAccessGate({ role, children }: PropsWithChildren<{ role: PendingRole }>) {
  const [data, setData] = useState<StatusData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { const result = await supabase.rpc('dkd_gate_get_my_role_application_status', { p_role: role }); if (result.error) throw result.error; setData((result.data ?? {}) as StatusData); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Başvuru durumu alınamadı.'); }
    finally { setLoading(false); }
  }, [role]);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={role === 'security' ? colors.green : colors.orange} /><Text style={styles.loadingText}>Yetki durumu kontrol ediliyor</Text></View>;
  if (data?.status === 'approved' || data?.has_membership) return <>{children}</>;
  const title = role === 'security' ? 'Güvenlik Paneli' : 'Site Sakini Paneli';
  const pending = data?.status === 'pending';
  const rejected = data?.status === 'rejected';
  return <View style={styles.content}><FadeInView><LinearGradient colors={role === 'security' ? gradients.security : gradients.management} style={styles.hero}><View style={styles.icon}><Ionicons name={role === 'security' ? 'shield-checkmark' : 'home'} size={44} color={colors.white} /></View><Text style={styles.title}>{title}</Text><Text style={styles.site}>{data?.site_name || 'Seçilen site'}</Text></LinearGradient></FadeInView><Panel style={styles.panel} gradient><Ionicons name={pending ? 'time' : rejected ? 'close-circle' : 'information-circle'} size={34} color={pending ? colors.orange : rejected ? colors.red : colors.cyan} /><Text style={styles.panelTitle}>{pending ? 'Site yönetimi onayı bekleniyor' : rejected ? 'Başvuru onaylanmadı' : 'Aktif başvuru bulunamadı'}</Text><Text style={styles.panelText}>{rejected && data?.admin_note ? data.admin_note : pending ? 'Site yönetimi başvurunu onayladığında bu panel otomatik olarak aktif olacak.' : 'Profil bilgilerini kontrol ederek yeniden başvuru yapabilirsin.'}</Text><AnimatedPressable onPress={() => void load()}><View style={styles.refresh}><Ionicons name="refresh" size={19} color={colors.cyan} /><Text style={styles.refreshText}>DURUMU YENİLE</Text></View></AnimatedPressable></Panel>{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}
const styles = StyleSheet.create({ loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }, loadingText: { color: colors.textSoft, fontWeight: '800' }, content: { flex: 1, padding: spacing.lg, justifyContent: 'center', gap: 18 }, hero: { borderRadius: 30, alignItems: 'center', padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }, icon: { width: 86, height: 86, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' }, title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 14 }, site: { color: colors.white, opacity: .78, marginTop: 5, fontWeight: '700' }, panel: { alignItems: 'center', paddingVertical: 28 }, panelTitle: { color: colors.text, fontSize: 20, fontWeight: '900', textAlign: 'center', marginTop: 13 }, panelText: { color: colors.textSoft, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 320 }, refresh: { minHeight: 48, marginTop: 18, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(55,216,255,.4)', backgroundColor: 'rgba(55,216,255,.08)', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 8 }, refreshText: { color: colors.cyan, fontSize: 11, fontWeight: '900' }, error: { color: colors.red, textAlign: 'center', fontSize: 12 } });
