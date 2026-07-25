import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { GateRecordDetails, GateRecordDetailsModal } from '../components/GateRecordModals';
import { AnimatedPressable, FadeInView, FloatingView, PulseDot } from '../components/Motion';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { CourierPass } from '../types';
import { ManagementHomeV031 } from './ManagementHomeV031';

type ViewMode = 'overview' | 'tools';

export function ManagementHomeV036() {
  const gate = useGate();
  const [mode, setMode] = useState<ViewMode>('overview');
  const [managedIds, setManagedIds] = useState<string[]>([]);
  const [siteId, setSiteId] = useState('');
  const [detail, setDetail] = useState<GateRecordDetails>();
  const [limit, setLimit] = useState(6);

  const loadManagedSites = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
      if (error) throw error;
      const ids = Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : [];
      setManagedIds(ids);
      setSiteId((current) => current && ids.includes(current) ? current : ids[0] ?? '');
    } catch (error) {
      Alert.alert('Site bilgileri alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  }, []);

  useEffect(() => { void loadManagedSites(); }, [loadManagedSites, gate.sites.length]);
  const sites = useMemo(() => gate.sites.filter((item) => managedIds.includes(item.id)), [gate.sites, managedIds]);
  const site = sites.find((item) => item.id === siteId) ?? sites[0];
  const activeSiteId = site?.id ?? '';
  const today = new Date().toISOString().slice(0, 10);
  const todayPasses = useMemo(() => gate.passes.filter((item) => item.siteId === activeSiteId && item.createdAt.startsWith(today)), [activeSiteId, gate.passes, today]);
  const completed = todayPasses.filter((item) => item.status === 'completed').length;
  const arrived = todayPasses.filter((item) => item.status === 'arrived').length;
  const waiting = todayPasses.filter((item) => ['waiting', 'approved'].includes(item.status)).length;
  const visitors = gate.visitors.filter((item) => item.siteId === activeSiteId && item.createdAt.startsWith(today)).length;
  const visible = todayPasses.slice(0, limit);

  const openDetails = (item: CourierPass) => setDetail({
    id: item.id,
    status: item.status,
    courierName: item.courierName,
    platform: item.platform,
    plate: item.plate,
    site: item.site,
    gate: item.gate,
    customerName: item.customerName,
    addressText: item.addressText,
    block: item.block,
    floor: item.floor,
    apartment: item.apartment,
    orderNumber: item.orderNumber,
    createdAt: item.createdAt,
    arrivedAt: item.arrivedAt,
    completedAt: item.completedAt,
    approvalCode: item.approvalCode,
    screenshotUri: item.screenshotUri,
    screenshotCapturedAt: item.screenshotCapturedAt,
    locationVerified: item.locationVerified,
    lastDistanceM: item.lastDistanceM,
  });

  if (mode === 'tools') return <View style={styles.flex}><View style={styles.toolsTop}><AnimatedPressable onPress={() => setMode('overview')}><View style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.cyan} /><Text style={styles.backText}>BÜYÜK ÖZETE DÖN</Text></View></AnimatedPressable></View><ManagementHomeV031 /></View>;

  return <>
    <ScrollView refreshControl={<RefreshControl refreshing={gate.refreshing} onRefresh={() => void Promise.all([gate.refresh(), loadManagedSites()])} tintColor={colors.magenta} />} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView style={styles.header}><View><Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><Text style={styles.title}>DraBornGate v{APP_VERSION}</Text><Text style={styles.subtitle}>Günlük operasyon özeti ve dokunarak açılan büyük kayıt ayrıntıları</Text></View><LiveBadge label="CANLI" /></FadeInView>

      {sites.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{sites.map((item) => <AnimatedPressable key={item.id} onPress={() => { setSiteId(item.id); setLimit(6); }}><View style={[styles.siteChoice, activeSiteId === item.id && styles.siteActive]}><Ionicons name="business" size={24} color={activeSiteId === item.id ? colors.magenta : colors.textMuted} /><View style={styles.copy}><Text style={styles.siteName}>{item.name}</Text><Text style={styles.siteCity}>{item.city || 'Şehir belirtilmedi'}</Text></View>{activeSiteId === item.id ? <Ionicons name="checkmark-circle" size={23} color={colors.magenta} /> : null}</View></AnimatedPressable>)}</ScrollView> : <EmptyState icon="business-outline" title="Yönetilen site bulunamadı" description="Site yönetimi başvurusu onaylandığında site burada görünür." />}

      <LinearGradient colors={gradients.management} style={styles.hero}>
        <View style={styles.heroCopy}><Text style={styles.heroKicker}>BUGÜNKÜ GİRİŞ OPERASYONU</Text><Text style={styles.heroValue}>{todayPasses.length}</Text><Text style={styles.heroText}>{completed} tamamlandı • {arrived} kapıda • {waiting} kod hazır</Text></View>
        <FloatingView style={styles.heroIcon} distance={6}><Ionicons name="analytics" size={44} color={colors.white} /></FloatingView>
      </LinearGradient>

      <View style={styles.metrics}><MetricCard label="Kurye kaydı" value={String(todayPasses.length)} icon="navigate" tone={colors.cyan} /><MetricCard label="Tamamlanan" value={String(completed)} icon="checkmark-done" tone={colors.green} /><MetricCard label="Ziyaretçi" value={String(visitors)} icon="people" tone={colors.orange} /></View>

      <View style={styles.sectionHeader}><View><Text style={styles.sectionTitle}>Günlük kurye giriş kayıtları</Text><Text style={styles.sectionSubtitle}>Kayıt kartına dokun • Büyük ayrıntı ekranını aç</Text></View><Text style={styles.date}>{new Date().toLocaleDateString('tr-TR')}</Text></View>
      {visible.length ? <View style={styles.list}>{visible.map((item, index) => <FadeInView key={item.id} delay={Math.min(index * 40, 240)}><AnimatedPressable onPress={() => openDetails(item)}><Panel style={styles.record} gradient>
        <View style={[styles.recordIcon, { backgroundColor: item.status === 'completed' ? 'rgba(67,231,162,.14)' : item.status === 'arrived' ? 'rgba(55,216,255,.14)' : 'rgba(255,179,92,.14)' }]}><Ionicons name={item.status === 'completed' ? 'checkmark-done' : item.status === 'arrived' ? 'location' : 'time'} size={27} color={item.status === 'completed' ? colors.green : item.status === 'arrived' ? colors.cyan : colors.orange} /></View>
        <View style={styles.copy}><View style={styles.nameRow}><Text style={styles.recordName}>{item.courierName}</Text><View style={styles.status}><PulseDot color={item.status === 'completed' ? colors.green : item.status === 'arrived' ? colors.cyan : colors.orange} size={7} /><Text style={styles.statusText}>{item.status === 'completed' ? 'Tamamlandı' : item.status === 'arrived' ? 'Kapıda' : item.status === 'approved' ? 'İncelendi' : 'Kod hazır'}</Text></View></View><Text style={styles.recordMeta}>{item.platform} • {item.plate || 'Plaka yok'} • {item.gate}</Text><Text style={styles.address}>{item.customerName || 'Müşteri adı yok'} • {item.block} / Kat {item.floor || '-'} / Daire {item.apartment}</Text><Text style={styles.order}>Sipariş: {item.orderNumber} • {new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text></View>
        <View style={styles.open}><Ionicons name="open-outline" size={22} color={colors.cyan} /><Text style={styles.openText}>DETAY</Text></View>
      </Panel></AnimatedPressable></FadeInView>)}</View> : <EmptyState icon="calendar-outline" title="Bugün kurye kaydı yok" description="Gün içinde oluşan kurye geçişleri burada büyük kartlarla görünür." />}
      {visible.length < todayPasses.length ? <AnimatedPressable onPress={() => setLimit((value) => value + 6)}><View style={styles.more}><Ionicons name="chevron-down" size={20} color={colors.cyan} /><Text style={styles.moreText}>6 KAYIT DAHA GÖSTER</Text><Text style={styles.moreCount}>{todayPasses.length - visible.length} kayıt kaldı</Text></View></AnimatedPressable> : null}

      <SectionTitle title="Yönetim araçları" />
      <AnimatedPressable onPress={() => setMode('tools')}><LinearGradient colors={['rgba(222,85,255,.24)', 'rgba(55,216,255,.12)']} style={styles.tools}><View style={styles.toolsIcon}><Ionicons name="settings" size={29} color={colors.magenta} /></View><View style={styles.copy}><Text style={styles.toolsTitle}>Site kurulum, kural, kullanıcı ve finans araçları</Text><Text style={styles.toolsText}>Mevcut ayrıntılı yönetim panelini açarak bütün ayarları yönet.</Text></View><Ionicons name="arrow-forward-circle" size={29} color={colors.cyan} /></LinearGradient></AnimatedPressable>
    </ScrollView>
    <GateRecordDetailsModal record={detail} title="Günlük kurye giriş kaydı" onClose={() => setDetail(undefined)} />
  </>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, toolsTop: { position: 'absolute', left: 17, top: 13, zIndex: 50 }, back: { minHeight: 44, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(6,16,29,.96)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 7 }, backText: { color: colors.cyan, fontSize: 10, fontWeight: '900' },
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 126, gap: 19 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 58 }, eyebrow: { color: colors.magenta, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 4 }, subtitle: { color: colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 4, maxWidth: 315 },
  horizontal: { gap: 9, paddingRight: 8 }, siteChoice: { minWidth: 195, minHeight: 73, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, siteActive: { borderColor: colors.magenta, backgroundColor: 'rgba(222,85,255,.09)' }, copy: { flex: 1 }, siteName: { color: colors.text, fontSize: 17, fontWeight: '900' }, siteCity: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  hero: { minHeight: 151, borderRadius: radius.xl, borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', padding: 20, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' }, heroCopy: { flex: 1 }, heroKicker: { color: 'rgba(255,255,255,.78)', fontSize: 11, fontWeight: '900' }, heroValue: { color: colors.white, fontSize: 48, fontWeight: '900', marginTop: 2 }, heroText: { color: 'rgba(255,255,255,.88)', fontSize: 15, fontWeight: '800', marginTop: 4 }, heroIcon: { width: 82, height: 82, borderRadius: 27, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }, metrics: { flexDirection: 'row', gap: 8 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }, sectionTitle: { color: colors.text, fontSize: 26, lineHeight: 32, fontWeight: '900', maxWidth: 260 }, sectionSubtitle: { color: colors.cyan, fontSize: 12, lineHeight: 17, fontWeight: '800', marginTop: 4 }, date: { color: colors.cyan, fontSize: 14, fontWeight: '900' }, list: { gap: 11 }, record: { minHeight: 128, flexDirection: 'row', alignItems: 'center', gap: 11 }, recordIcon: { width: 57, height: 57, borderRadius: 19, alignItems: 'center', justifyContent: 'center' }, nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, recordName: { color: colors.text, fontSize: 20, fontWeight: '900' }, status: { minHeight: 27, paddingHorizontal: 7, borderRadius: 11, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', gap: 5 }, statusText: { color: colors.textSoft, fontSize: 9, fontWeight: '900' }, recordMeta: { color: colors.textSoft, fontSize: 14, lineHeight: 20, marginTop: 4 }, address: { color: colors.text, fontSize: 15, lineHeight: 21, fontWeight: '800', marginTop: 5 }, order: { color: colors.cyan, fontSize: 12, fontWeight: '900', marginTop: 5 }, open: { width: 47, alignItems: 'center', gap: 4 }, openText: { color: colors.cyan, fontSize: 8, fontWeight: '900' }, more: { minHeight: 58, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, moreText: { color: colors.cyan, fontSize: 11, fontWeight: '900' }, moreCount: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
  tools: { minHeight: 93, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(222,85,255,.38)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 }, toolsIcon: { width: 57, height: 57, borderRadius: 19, backgroundColor: 'rgba(222,85,255,.15)', alignItems: 'center', justifyContent: 'center' }, toolsTitle: { color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '900' }, toolsText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
});
