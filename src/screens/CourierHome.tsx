import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ArrivalSuccessModal } from '../components/GateRecordModals';
import { AnimatedPressable, FadeInView, FloatingView, PulseDot } from '../components/Motion';
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
  const [activityLimit, setActivityLimit] = useState(5);
  const [arrival, setArrival] = useState<{ code?: string; gate?: string }>();
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
          void showGateNotification('Akıllı Geçiş hazır', `${selectedGate.name} kapısına ${meters} metre kaldı. Güvenliğe göndermek ister misin?`, { passId: active.id, distance: meters, kind: 'airpass_ready' });
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
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Akıllı Geçiş gönderildi', 'Konum ve kapı mesafesi güvenlik paneline iletildi.');
    } catch (error) {
      Alert.alert('Gönderilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  };

  const markArrived = async () => {
    if (!active) return;
    const nextArrival = { code: active.approvalCode, gate: active.gate };
    try {
      await updatePassStatus(active.id, 'arrived');
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setArrival(nextArrival);
    } catch (error) {
      Alert.alert('İşlem yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  };

  const visibleActivities = activities.slice(0, activityLimit);
  const smartTone = distance != null && distance <= 30 ? colors.green : tracking ? colors.cyan : colors.purple;

  return <>
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.cyan} />} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <FadeInView style={s.header}><View><Text style={s.eyebrow}>KURYE OPERASYONU</Text><Text style={s.title}>{profile?.fullName.split(' ')[0] || 'Kurye'} 👋</Text><Text style={s.subtitle}>{courierProfile?.platform || 'DraBornGo'} • {courierProfile?.plate || 'Plaka eklenmedi'}</Text></View><LiveBadge label="CANLI" /></FadeInView>
      <FadeInView delay={70}><LinearGradient colors={gradients.courier} style={s.hero}><View style={s.heroTop}><FloatingView style={s.motorShell} distance={6}><RacingMotorcycle color={colors.cyan} accentColor={colors.white} size={84} /></FloatingView><View style={s.heroCopy}><Text style={s.heroKicker}>Kurye Geçişi + Tek Kullanımlık Kod</Text><Text style={s.heroTitle}>Kod talep anında hazır.</Text><Text style={s.heroText}>Sipariş görselini okut, geçiş talebini gönder; kapıya gelince hazır kodunu güvenliğe söyle.</Text></View></View><AnimatedPressable onPress={canCreate ? onCreatePass : onOpenSettings}><View style={s.button}><Ionicons name={canCreate ? 'paper-plane' : 'settings'} size={21} color={colors.background} /><Text style={s.buttonText}>{canCreate ? 'YENİ GEÇİŞ TALEBİ' : 'ÖRNEK VEYA SİTE VERİSİ EKLE'}</Text><Ionicons name="arrow-forward" size={20} color={colors.background} /></View></AnimatedPressable></LinearGradient></FadeInView>
      <FadeInView delay={130} style={s.metrics}><MetricCard label="Tamamlanan" value={String(completed)} icon="checkmark-done" tone={colors.green} /><MetricCard label="Aktif geçiş" value={active ? '1' : '0'} icon="key" tone={colors.cyan} /><MetricCard label="Aktif site" value={String(sites.length)} icon="business" tone={colors.orange} /></FadeInView>

      <FadeInView delay={180}>
        <SectionTitle title="Akıllı Geçiş" action={active?.status === 'arrived' ? 'KAPIDA' : tracking ? 'KONUM AKTİF' : 'HAZIR'} />
        {active && selectedGate?.latitude != null && selectedGate.longitude != null ? <LinearGradient colors={['rgba(14,83,113,.98)', 'rgba(37,45,104,.98)', 'rgba(24,27,66,.98)']} style={[s.smartCard, { borderColor: `${smartTone}78` }]}>
          <View style={s.smartGlow} />
          <View style={s.smartHeader}>
            <FloatingView style={[s.smartIcon, { backgroundColor: `${smartTone}25`, borderColor: `${smartTone}70` }]} distance={5}><Ionicons name="navigate-circle" size={39} color={smartTone} /></FloatingView>
            <View style={s.heroCopy}><View style={s.smartTitleRow}><Text style={s.smartTitle}>{selectedGate.name}</Text><View style={s.smartLive}><PulseDot color={smartTone} size={7} /><Text style={[s.smartLiveText, { color: smartTone }]}>{distance != null && distance <= 30 ? 'KAPI YAKIN' : tracking ? 'ÖLÇÜLÜYOR' : 'BAŞLATILMADI'}</Text></View></View><Text style={s.smartDistance}>{distance == null ? 'Mesafe ölçümü başlatılmadı' : `${Math.round(distance)} metre kaldı`}</Text><Text style={s.smartMeta}>{distance != null && distance <= 30 ? 'Konum doğrulandı • Güvenliğe gönderebilirsin' : selectedGate.entryPoint || selectedGate.stage || 'Kapı konumu kayıtlı'}</Text></View>
          </View>
          <View style={s.smartSteps}><SmartStep active icon="document-text" label="Talep ve kod hazır" /><View style={s.stepLine} /><SmartStep active={tracking || distance != null} icon="locate" label="Konum kontrolü" /><View style={s.stepLine} /><SmartStep active={active.status === 'arrived'} icon="shield-checkmark" label="Güvenlik doğrulaması" /></View>
          {nearestGate && nearestGate.gate.id !== selectedGate.id ? <View style={s.nearHint}><Ionicons name="bulb" size={19} color={colors.orange} /><Text style={s.nearText}>Daha yakın kapı: {nearestGate.gate.name} • {Math.round(nearestGate.distance)} m</Text></View> : null}
          <View style={s.airActions}><AnimatedPressable containerStyle={s.actionWrap} onPress={() => setTracking((value) => !value)}><View style={[s.secondaryButton, tracking && { borderColor: colors.orange, backgroundColor: 'rgba(255,179,92,.10)' }]}><Ionicons name={tracking ? 'pause' : 'locate'} size={21} color={tracking ? colors.orange : colors.cyan} /><Text style={[s.secondaryText, tracking && { color: colors.orange }]}>{tracking ? 'TAKİBİ DURDUR' : 'KONUMU ÖLÇ'}</Text></View></AnimatedPressable>{coords && distance != null ? <AnimatedPressable containerStyle={s.actionWrap} onPress={() => void sendAirPassNow()}><LinearGradient colors={['#19B8D8', '#4F6DE8']} style={s.airSend}><Ionicons name="send" size={19} color={colors.white} /><Text style={s.airSendText}>GÜVENLİĞE GÖNDER</Text></LinearGradient></AnimatedPressable> : null}</View>
          {['waiting', 'approved'].includes(active.status) ? <AnimatedPressable onPress={() => void markArrived()}><LinearGradient colors={['#43E7A2', '#24C9B9', '#28A8E8']} style={s.arrived}><FloatingView distance={3}><Ionicons name="location" size={26} color={colors.background} /></FloatingView><View><Text style={s.arrivedText}>KAPIYA GELDİM</Text><Text style={s.arrivedSub}>Varışı gönder • Tek kullanımlık kodu aç</Text></View><Ionicons name="arrow-forward-circle" size={27} color={colors.background} /></LinearGradient></AnimatedPressable> : active.status === 'arrived' ? <LinearGradient colors={['rgba(139,107,255,.24)', 'rgba(55,216,255,.10)']} style={s.codeReady}><Ionicons name="keypad" size={29} color={colors.purple} /><View style={s.heroCopy}><Text style={s.codeReadyTitle}>Güvenlik kodunu bekliyor</Text><Text style={s.codeReadyText}>{active.approvalCode ?? 'Yükleniyor'}</Text><Text style={s.codeReadyHelp}>Görevliye kodu söyle; eşleşince geçiş tamamlanır.</Text></View></LinearGradient> : null}
        </LinearGradient> : <EmptyState icon="navigate-outline" title="Akıllı Geçiş beklemede" description={active ? 'Seçilen kapının konum koordinatı bulunmuyor.' : 'Aktif Kurye Geçişi oluştuğunda kapıya yaklaşma kontrolü burada açılır.'} />}
      </FadeInView>

      <FadeInView delay={220}><SectionTitle title="Aktif Kurye Geçişi" action={own.length ? `${own.length} kayıt` : undefined} />{active ? <PassCard pass={active} onPress={onOpenPasses} /> : <EmptyState icon="shield-outline" title="Aktif geçiş talebin yok" description={sites.length ? 'Bir sonraki teslimat için yeni geçiş talebi oluşturabilirsin.' : 'Henüz erişilebilir site yok. Ayarlardan örnek verileri yükleyebilirsin.'} />}</FadeInView>
      {settings?.demoDataVersion ? <FadeInView delay={250}><Panel style={s.demoNotice} gradient><Ionicons name="flask" size={24} color={colors.orange} /><View style={s.heroCopy}><Text style={s.demoTitle}>Örnek veriler etkin</Text><Text style={s.demoText}>Yüklü örnek veri sürümü: {settings.demoDataVersion}. Gerçek kayıtlar örnek rozeti olmadan görünür.</Text></View></Panel></FadeInView> : null}
      <FadeInView delay={280}><SectionTitle title="Son hareketler" action={`${visibleActivities.length}/${activities.length}`} /><Panel gradient>{visibleActivities.length ? visibleActivities.map((item, index) => <View key={item.id} style={[s.activity, index < visibleActivities.length - 1 && s.activityBorder]}><View style={[s.activityIcon, { backgroundColor: `${index === 0 ? colors.cyan : colors.purple}18` }]}><Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={index === 0 ? colors.cyan : colors.purple} /></View><View style={s.heroCopy}><Text style={s.activityTitle}>{item.title}</Text><Text style={s.activityText}>{item.detail}</Text></View><Text style={s.time}>{item.time}</Text></View>) : <Text style={s.emptyText}>Henüz hareket kaydı yok.</Text>}</Panel>{visibleActivities.length < activities.length ? <AnimatedPressable onPress={() => setActivityLimit((value) => value + 5)}><View style={s.more}><Ionicons name="chevron-down" size={20} color={colors.cyan} /><Text style={s.moreText}>5 HAREKET DAHA GÖSTER</Text><Text style={s.moreCount}>{activities.length - visibleActivities.length} kayıt kaldı</Text></View></AnimatedPressable> : null}</FadeInView>
    </ScrollView>
    <ArrivalSuccessModal visible={Boolean(arrival)} code={arrival?.code} gate={arrival?.gate} onClose={() => setArrival(undefined)} />
  </>;
}

function SmartStep({ active, icon, label }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; label: string }) { return <View style={s.smartStep}><View style={[s.smartStepIcon, active && s.smartStepActive]}><Ionicons name={icon} size={17} color={active ? colors.green : colors.textMuted} /></View><Text style={[s.smartStepText, active && { color: colors.text }]}>{label}</Text></View>; }

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 21 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 58 }, eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 4 }, subtitle: { color: colors.textSoft, fontSize: 13, fontWeight: '700', marginTop: 4 },
  hero: { borderRadius: radius.xl, padding: 20, gap: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', overflow: 'hidden' }, heroTop: { flexDirection: 'row', gap: 14, alignItems: 'center' }, motorShell: { width: 100, height: 76, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' }, heroCopy: { flex: 1 }, heroKicker: { color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: '900' }, heroTitle: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 3 }, heroText: { color: 'rgba(255,255,255,.88)', fontSize: 13, lineHeight: 19, marginTop: 5, fontWeight: '600' },
  button: { height: 56, borderRadius: 19, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, buttonText: { color: colors.background, fontSize: 13, fontWeight: '900' }, metrics: { flexDirection: 'row', gap: 9 },
  smartCard: { borderRadius: radius.xl, borderWidth: 1, padding: 16, gap: 15, overflow: 'hidden' }, smartGlow: { position: 'absolute', width: 190, height: 190, borderRadius: 190, right: -80, top: -90, backgroundColor: 'rgba(55,216,255,.10)' }, smartHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 }, smartIcon: { width: 67, height: 67, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, smartTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, smartTitle: { color: colors.text, fontSize: 21, fontWeight: '900' }, smartLive: { minHeight: 27, borderRadius: 11, backgroundColor: 'rgba(255,255,255,.07)', paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 5 }, smartLiveText: { fontSize: 8, fontWeight: '900' }, smartDistance: { color: colors.cyan, fontSize: 18, fontWeight: '900', marginTop: 4 }, smartMeta: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }, smartSteps: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, smartStep: { width: '27%', alignItems: 'center', gap: 5 }, smartStepIcon: { width: 34, height: 34, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.04)', alignItems: 'center', justifyContent: 'center' }, smartStepActive: { borderColor: 'rgba(67,231,162,.48)', backgroundColor: 'rgba(67,231,162,.13)' }, smartStepText: { color: colors.textMuted, fontSize: 9, lineHeight: 13, textAlign: 'center', fontWeight: '800' }, stepLine: { flex: 1, height: 1, backgroundColor: colors.borderStrong, marginTop: 17 },
  nearHint: { minHeight: 43, borderRadius: 14, backgroundColor: 'rgba(255,179,92,.10)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 }, nearText: { color: colors.orange, fontSize: 12, fontWeight: '800' }, airActions: { flexDirection: 'row', gap: 8 }, actionWrap: { flex: 1 }, secondaryButton: { minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 7 }, secondaryText: { color: colors.cyan, fontSize: 11, fontWeight: '900', textAlign: 'center' }, airSend: { minHeight: 52, borderRadius: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, airSendText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  arrived: { minHeight: 67, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 16 }, arrivedText: { color: colors.background, fontSize: 17, fontWeight: '900' }, arrivedSub: { color: 'rgba(3,20,31,.72)', fontSize: 10, fontWeight: '800', marginTop: 2 }, codeReady: { minHeight: 78, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(139,107,255,.46)', flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14 }, codeReadyTitle: { color: colors.purple, fontSize: 13, fontWeight: '900' }, codeReadyText: { color: colors.text, fontSize: 29, letterSpacing: 3, fontWeight: '900', marginTop: 2 }, codeReadyHelp: { color: colors.textSoft, fontSize: 11, marginTop: 2 },
  demoNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(255,179,92,.36)' }, demoTitle: { color: colors.orange, fontSize: 15, fontWeight: '900' }, demoText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }, activity: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10 }, activityBorder: { borderBottomWidth: 1, borderBottomColor: colors.border }, activityIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, activityTitle: { color: colors.text, fontSize: 15, fontWeight: '900' }, activityText: { color: colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 4 }, time: { color: colors.textMuted, fontSize: 11, fontWeight: '800' }, emptyText: { color: colors.textSoft, fontSize: 14, paddingVertical: 10, textAlign: 'center' }, more: { minHeight: 57, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }, moreText: { color: colors.cyan, fontSize: 11, fontWeight: '900' }, moreCount: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
});
