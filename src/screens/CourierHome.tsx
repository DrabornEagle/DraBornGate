import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AnimatedPressable, FadeInView, FloatingView } from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { distanceMeters } from '../lib/airpass';
import { showGateNotification } from '../lib/notifications';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';

export function CourierHome({ onCreatePass, onOpenPasses, onOpenSettings }: { onCreatePass: () => void; onOpenPasses: () => void; onOpenSettings: () => void }) {
  const { user, profile, courierProfile, passes, activities, sites, gates, refreshing, refresh, settings, updateAirPass, updatePassStatus } = useGate();
  const own = passes.filter((pass) => pass.courierUserId === user?.id);
  const active = own.find((pass) => ['waiting', 'approved', 'arrived'].includes(pass.status));
  const completed = own.filter((pass) => pass.status === 'completed').length;
  const canCreate = sites.length > 0;
  const selectedGate = active ? gates.find((item) => item.id === active.gateId) ?? gates.find((item) => item.siteId === active.siteId && item.name === active.gate) : undefined;
  const [tracking, setTracking] = useState(false);
  const [distance, setDistance] = useState<number | undefined>(active?.lastDistanceM);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | undefined>(undefined);
  const promptedPass = useRef<string | undefined>(undefined);

  useEffect(() => {
    setDistance(active?.lastDistanceM);
    if (!active) setTracking(false);
  }, [active?.id, active?.lastDistanceM]);

  useEffect(() => {
    if (!tracking || !active || !selectedGate?.latitude || !selectedGate.longitude) return;
    let subscription: Location.LocationSubscription | undefined;
    void (async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setTracking(false);
        Alert.alert('Konum izni gerekli', 'Akıllı Geçiş, kapıya olan mesafeyi yalnızca uygulama açıkken kontrol eder.');
        return;
      }
      subscription = await Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 4, timeInterval: 3000 }, (position) => {
        const current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        const meters = distanceMeters(current, { latitude: selectedGate.latitude!, longitude: selectedGate.longitude! });
        setCoords(current);
        setDistance(meters);
        void updateAirPass(active.id, current.latitude, current.longitude, meters, false).catch(() => undefined);
        if (meters <= 30 && promptedPass.current !== active.id && !active.airpassSentAt) {
          promptedPass.current = active.id;
          void showGateNotification('Akıllı Geçiş hazır', `${selectedGate.name} kapısına ${meters} metre kaldı. Güvenliğe göndermek ister misin?`, { passId: active.id, distance: meters });
          Alert.alert('Kapıya 30 metre kaldı', 'Akıllı Geçiş bilgisi güvenliğe gönderilsin mi?', [
            { text: 'Şimdilik Hayır', style: 'cancel', onPress: () => void updateAirPass(active.id, current.latitude, current.longitude, meters, false) },
            { text: 'Evet, Güvenliğe Gönder', onPress: () => void updateAirPass(active.id, current.latitude, current.longitude, meters, true) },
          ]);
        }
      });
    })();
    return () => subscription?.remove();
  }, [active, selectedGate, tracking, updateAirPass]);

  const nearestGate = useMemo(() => {
    if (!coords) return undefined;
    return gates.filter((item) => item.latitude != null && item.longitude != null).map((item) => ({ gate: item, distance: distanceMeters(coords, { latitude: item.latitude!, longitude: item.longitude! }) })).sort((a, b) => a.distance - b.distance)[0];
  }, [coords, gates]);

  const sendAirPassNow = async () => {
    if (!active || !coords || distance == null) return;
    try {
      await updateAirPass(active.id, coords.latitude, coords.longitude, distance, true);
      Alert.alert('Akıllı Geçiş gönderildi', 'Konum ve kapı mesafesi güvenlik paneline iletildi.');
    } catch (error) {
      Alert.alert('Gönderilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  };

  const markArrived = async () => {
    if (!active) return;
    try {
      await updatePassStatus(active.id, 'arrived');
      Alert.alert('Kapıya geldim', 'Güvenlik paneline varış kaydı gönderildi.');
    } catch (error) {
      Alert.alert('İşlem yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  };

  return <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.cyan} />} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
    <FadeInView style={s.header}><View><Text style={s.eyebrow}>KURYE OPERASYONU</Text><Text style={s.title}>{profile?.fullName.split(' ')[0] || 'Kurye'} 👋</Text><Text style={s.subtitle}>{courierProfile?.platform || 'DraBornGo'} • {courierProfile?.plate || 'Plaka eklenmedi'}</Text></View><LiveBadge label="CANLI" /></FadeInView>
    <FadeInView delay={70}><LinearGradient colors={gradients.courier} style={s.hero}><View style={s.heroTop}><FloatingView style={s.motorShell} distance={6}><RacingMotorcycle color={colors.cyan} accentColor={colors.white} size={84} /></FloatingView><View style={s.heroCopy}><Text style={s.heroKicker}>Kurye Geçişi + Akıllı Geçiş</Text><Text style={s.heroTitle}>Kapıda bekleme yok.</Text><Text style={s.heroText}>Sipariş görselini okut, geçişini gönder ve kapıya 30 metre kala konumunu doğrula.</Text></View></View><AnimatedPressable onPress={canCreate ? onCreatePass : onOpenSettings}><View style={s.button}><Ionicons name={canCreate ? 'paper-plane' : 'settings'} size={21} color={colors.background} /><Text style={s.buttonText}>{canCreate ? 'YENİ GEÇİŞ TALEBİ' : 'ÖRNEK VEYA SİTE VERİSİ EKLE'}</Text><Ionicons name="arrow-forward" size={20} color={colors.background} /></View></AnimatedPressable></LinearGradient></FadeInView>
    <FadeInView delay={130} style={s.metrics}><MetricCard label="Tamamlanan" value={String(completed)} icon="checkmark-done" tone={colors.green} /><MetricCard label="Aktif geçiş" value={active ? '1' : '0'} icon="key" tone={colors.cyan} /><MetricCard label="Aktif site" value={String(sites.length)} icon="business" tone={colors.orange} /></FadeInView>

    <FadeInView delay={180}><SectionTitle title="Akıllı Geçiş" action={tracking ? 'KONUM AKTİF' : 'HAZIR'} />{active && selectedGate?.latitude != null && selectedGate.longitude != null ? <Panel style={s.airPanel} gradient><View style={s.airTop}><View style={[s.airIcon, { backgroundColor: distance != null && distance <= 30 ? 'rgba(67,231,162,.16)' : 'rgba(55,216,255,.13)' }]}><Ionicons name="navigate" size={27} color={distance != null && distance <= 30 ? colors.green : colors.cyan} /></View><View style={s.heroCopy}><Text style={s.airTitle}>{selectedGate.name}</Text><Text style={s.airText}>{distance == null ? 'Mesafe ölçümü başlatılmadı' : `${distance} metre kaldı`}</Text><Text style={s.airMeta}>{distance != null && distance <= 30 ? 'KONUM DOĞRULANDI' : selectedGate.entryPoint || selectedGate.stage || 'Kapı konumu kayıtlı'}</Text></View></View>{nearestGate && nearestGate.gate.id !== selectedGate.id ? <View style={s.nearHint}><Ionicons name="bulb" size={17} color={colors.orange} /><Text style={s.nearText}>Yakın kapı önerisi: {nearestGate.gate.name} • {nearestGate.distance} m</Text></View> : null}<View style={s.airActions}><AnimatedPressable containerStyle={s.actionWrap} onPress={() => setTracking((value) => !value)}><View style={s.secondaryButton}><Ionicons name={tracking ? 'pause' : 'locate'} size={19} color={colors.cyan} /><Text style={s.secondaryText}>{tracking ? 'Takibi Durdur' : 'Konum Kontrolünü Başlat'}</Text></View></AnimatedPressable>{coords && distance != null ? <AnimatedPressable containerStyle={s.actionWrap} onPress={() => void sendAirPassNow()}><View style={s.airSend}><Text style={s.airSendText}>Güvenliğe Gönder</Text></View></AnimatedPressable> : null}</View>{active.status === 'approved' ? <AnimatedPressable onPress={() => void markArrived()}><LinearGradient colors={gradients.success} style={s.arrived}><Ionicons name="location" size={20} color={colors.background} /><Text style={s.arrivedText}>KAPIYA GELDİM</Text></LinearGradient></AnimatedPressable> : null}</Panel> : <EmptyState icon="navigate-outline" title="Akıllı Geçiş beklemede" description={active ? 'Seçilen kapının konum koordinatı bulunmuyor.' : 'Aktif Kurye Geçişi oluştuğunda kapıya yaklaşma kontrolü burada açılır.'} />}</FadeInView>

    <FadeInView delay={220}><SectionTitle title="Aktif Kurye Geçişi" action={own.length ? `${own.length} kayıt` : undefined} />{active ? <PassCard pass={active} onPress={onOpenPasses} /> : <EmptyState icon="shield-outline" title="Aktif geçiş talebin yok" description={sites.length ? 'Bir sonraki teslimat için yeni geçiş talebi oluşturabilirsin.' : 'Henüz erişilebilir site yok. Ayarlardan v0.2.1 örnek verilerini yükleyebilirsin.'} />}</FadeInView>
    {settings?.demoDataVersion ? <FadeInView delay={250}><Panel style={s.demoNotice} gradient><Ionicons name="flask" size={24} color={colors.orange} /><View style={s.heroCopy}><Text style={s.demoTitle}>Örnek veriler etkin</Text><Text style={s.demoText}>Yüklü örnek veri sürümü: {settings.demoDataVersion}. Gerçek kayıtlar örnek rozeti olmadan görünür.</Text></View></Panel></FadeInView> : null}
    <FadeInView delay={280}><SectionTitle title="Son hareketler" /><Panel gradient>{activities.slice(0, 4).length ? activities.slice(0, 4).map((item, index) => <View key={item.id} style={[s.activity, index < Math.min(3, activities.length - 1) && s.activityBorder]}><View style={[s.activityIcon, { backgroundColor: `${index === 0 ? colors.cyan : colors.purple}18` }]}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={index === 0 ? colors.cyan : colors.purple} /></View><View style={s.heroCopy}><Text style={s.activityTitle}>{item.title}</Text><Text style={s.activityText}>{item.detail}</Text></View><Text style={s.time}>{item.time}</Text></View>) : <Text style={s.emptyText}>Henüz hareket kaydı yok.</Text>}</Panel></FadeInView>
  </ScrollView>;
}

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 21 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 4 }, subtitle: { color: colors.textSoft, fontSize: 13, fontWeight: '700', marginTop: 4 },
  hero: { borderRadius: radius.xl, padding: 20, gap: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', overflow: 'hidden' }, heroTop: { flexDirection: 'row', gap: 14, alignItems: 'center' }, motorShell: { width: 100, height: 76, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1 }, heroKicker: { color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: '900' }, heroTitle: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 3 }, heroText: { color: 'rgba(255,255,255,.88)', fontSize: 13, lineHeight: 19, marginTop: 5, fontWeight: '600' },
  button: { height: 56, borderRadius: 19, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, buttonText: { color: colors.background, fontSize: 13, fontWeight: '900' }, metrics: { flexDirection: 'row', gap: 9 },
  airPanel: { gap: 13, borderColor: 'rgba(55,216,255,.38)' }, airTop: { flexDirection: 'row', alignItems: 'center', gap: 11 }, airIcon: { width: 55, height: 55, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, airTitle: { color: colors.text, fontSize: 17, fontWeight: '900' }, airText: { color: colors.cyan, fontSize: 14, fontWeight: '900', marginTop: 3 }, airMeta: { color: colors.green, fontSize: 10, fontWeight: '900', marginTop: 4 }, nearHint: { minHeight: 40, borderRadius: 14, backgroundColor: 'rgba(255,179,92,.10)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 }, nearText: { color: colors.orange, fontSize: 11, fontWeight: '800' }, airActions: { flexDirection: 'row', gap: 8 }, actionWrap: { flex: 1 }, secondaryButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 6 }, secondaryText: { color: colors.cyan, fontSize: 11, fontWeight: '900', textAlign: 'center' }, airSend: { minHeight: 50, borderRadius: 16, backgroundColor: 'rgba(55,216,255,.14)', borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }, airSendText: { color: colors.cyan, fontSize: 11, fontWeight: '900' }, arrived: { height: 52, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, arrivedText: { color: colors.background, fontSize: 13, fontWeight: '900' },
  demoNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(255,179,92,.36)' }, demoTitle: { color: colors.orange, fontSize: 15, fontWeight: '900' }, demoText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }, activity: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 }, activityBorder: { borderBottomWidth: 1, borderBottomColor: colors.border }, activityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, activityTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, activityText: { color: colors.textSoft, fontSize: 12, marginTop: 4 }, time: { color: colors.textMuted, fontSize: 11, fontWeight: '800' }, emptyText: { color: colors.textSoft, fontSize: 14, paddingVertical: 10, textAlign: 'center' },
});
