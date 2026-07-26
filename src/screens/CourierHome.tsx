import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Modal, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedPressable, FadeInView, FloatingView } from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { distanceMeters } from '../lib/airpass';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';

type GatePopup = 'arrived' | undefined;

type CourierHomeProps = {
  onCreatePass: () => void;
  onOpenPasses: () => void;
  onOpenSettings: () => void;
};

export function CourierHome({ onCreatePass, onOpenPasses, onOpenSettings }: CourierHomeProps) {
  const {
    user,
    profile,
    courierProfile,
    passes,
    activities,
    sites,
    gates,
    refreshing,
    refresh,
    settings,
    updateAirPass,
    updatePassStatus,
  } = useGate();

  const own = passes.filter((pass) => pass.courierUserId === user?.id);
  const active = own.find((pass) => ['waiting', 'approved', 'arrived'].includes(pass.status));
  const completed = own.filter((pass) => pass.status === 'completed').length;
  const canCreate = sites.length > 0;
  const selectedGate = active
    ? gates.find((item) => item.id === active.gateId)
      ?? gates.find((item) => item.siteId === active.siteId && item.name === active.gate)
    : undefined;

  const [distance, setDistance] = useState<number | undefined>(active?.lastDistanceM);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number }>();
  const [popup, setPopup] = useState<GatePopup>();
  const [working, setWorking] = useState(false);
  const attention = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(attention, { toValue: 1, duration: 1100, useNativeDriver: true }),
      Animated.timing(attention, { toValue: 0, duration: 1100, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [attention]);

  useEffect(() => {
    setDistance(active?.lastDistanceM);
    if (!active) setCoords(undefined);
  }, [active?.id, active?.lastDistanceM]);

  const nearestGate = useMemo(() => {
    if (!coords) return undefined;
    return gates
      .filter((item) => item.latitude != null && item.longitude != null)
      .map((item) => ({
        gate: item,
        distance: distanceMeters(coords, { latitude: item.latitude!, longitude: item.longitude! }),
      }))
      .sort((first, second) => first.distance - second.distance)[0];
  }, [coords, gates]);

  const checkLocationOnce = async () => {
    if (!active || selectedGate?.latitude == null || selectedGate.longitude == null || working) return;
    setWorking(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Konum izni gerekli', 'Konum Kontrolü Yap özelliği konumunu yalnızca bu işlem sırasında bir kez kontrol eder.');
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) throw new Error('Telefonun konum hizmetini açıp yeniden dene.');

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const current = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      const meters = distanceMeters(current, {
        latitude: selectedGate.latitude,
        longitude: selectedGate.longitude,
      });

      setCoords(current);
      setDistance(meters);
      await updateAirPass(active.id, current.latitude, current.longitude, meters, true);
      Alert.alert('Konum güvenliğe gönderildi', `${selectedGate.name} kapısına olan mesafen ${meters} metre olarak bir kez kontrol edildi ve güvenliğe gönderildi.`);
    } catch (error) {
      Alert.alert('Konum kontrolü yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const markArrived = async () => {
    if (!active) return;
    setWorking(true);
    try {
      await updatePassStatus(active.id, 'arrived');
      setPopup('arrived');
    } catch (error) {
      Alert.alert('İşlem yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorking(false);
    }
  };

  const pulse = {
    transform: [{ scale: attention.interpolate({ inputRange: [0, 1], outputRange: [1, 1.018] }) }],
  };

  return (
    <>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refresh()} tintColor={colors.cyan} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.content}
      >
        <FadeInView style={s.header}>
          <View style={s.headerCopy}>
            <View style={s.eyebrowRow}>
              <Text style={s.eyebrow}>KURYE OPERASYONU</Text>
              <LiveBadge label="CANLI" compact />
            </View>
            <Text style={s.title}>{profile?.fullName.split(' ')[0] || 'Kurye'} 👋</Text>
            <Text style={s.subtitle}>{courierProfile?.platform || 'DraBornGo'} • {courierProfile?.plate || 'Plaka eklenmedi'}</Text>
          </View>
        </FadeInView>

        <FadeInView delay={70}>
          <LinearGradient colors={gradients.courier} style={s.hero}>
            <View style={s.heroTop}>
              <FloatingView style={s.motorShell} distance={6}>
                <RacingMotorcycle color={colors.cyan} accentColor={colors.white} size={84} />
              </FloatingView>
              <View style={s.heroCopy}>
                <Text style={s.heroKicker}>Kurye Geçişi + Tek Kullanımlık Kod</Text>
                <Text style={s.heroTitle}>Kod talep anında hazır.</Text>
                <Text style={s.heroText}>Sipariş görselini okut, geçiş talebini gönder; kapıya gelince hazır kodunu güvenliğe söyle.</Text>
              </View>
            </View>
            <AnimatedPressable onPress={canCreate ? onCreatePass : onOpenSettings}>
              <View style={s.button}>
                <Ionicons name={canCreate ? 'paper-plane' : 'settings'} size={21} color={colors.background} />
                <Text style={s.buttonText}>{canCreate ? 'YENİ GEÇİŞ TALEBİ' : 'ÖRNEK VEYA SİTE VERİSİ EKLE'}</Text>
                <Ionicons name="arrow-forward" size={20} color={colors.background} />
              </View>
            </AnimatedPressable>
          </LinearGradient>
        </FadeInView>

        <FadeInView delay={130} style={s.metrics}>
          <MetricCard label="Tamamlanan" value={String(completed)} icon="checkmark-done" tone={colors.green} />
          <MetricCard label="Aktif geçiş" value={active ? '1' : '0'} icon="key" tone={colors.cyan} />
          <MetricCard label="Aktif site" value={String(sites.length)} icon="business" tone={colors.orange} />
        </FadeInView>

        <FadeInView delay={180}>
          <SectionTitle title="Akıllı Geçiş" action={working ? 'KONTROL EDİLİYOR' : active?.airpassSentAt ? 'GÖNDERİLDİ' : 'HAZIR'} />
          {active && selectedGate?.latitude != null && selectedGate.longitude != null ? (
            <Animated.View style={pulse}>
              <LinearGradient colors={['rgba(13,91,126,.98)', 'rgba(54,45,121,.98)', 'rgba(8,28,48,.99)']} style={s.airPanel}>
                <Animated.View
                  pointerEvents="none"
                  style={[
                    s.airAura,
                    {
                      opacity: attention.interpolate({ inputRange: [0, 1], outputRange: [.10, .28] }),
                      transform: [{ scale: attention.interpolate({ inputRange: [0, 1], outputRange: [.85, 1.15] }) }],
                    },
                  ]}
                />
                <View style={s.airTop}>
                  <FloatingView
                    style={[
                      s.airIcon,
                      { backgroundColor: distance != null && distance <= 30 ? 'rgba(67,231,162,.20)' : 'rgba(55,216,255,.17)' },
                    ]}
                    distance={5}
                  >
                    <Ionicons name="navigate" size={31} color={distance != null && distance <= 30 ? colors.green : colors.cyan} />
                  </FloatingView>
                  <View style={s.heroCopy}>
                    <Text style={s.airTitle}>{selectedGate.name}</Text>
                    <Text style={s.airText}>{distance == null ? 'Konum kontrolü bekleniyor' : `${distance} metre kaldı`}</Text>
                    {distance != null && distance <= 30 ? <Text style={s.airMeta}>KONUM DOĞRULANDI • GEÇİŞ HAZIR</Text> : null}
                  </View>
                </View>

                {nearestGate && nearestGate.gate.id !== selectedGate.id ? (
                  <View style={s.nearHint}>
                    <Ionicons name="bulb" size={17} color={colors.orange} />
                    <Text style={s.nearText}>Yakın kapı önerisi: {nearestGate.gate.name} • {nearestGate.distance} m</Text>
                  </View>
                ) : null}

                <AnimatedPressable onPress={() => void checkLocationOnce()} disabled={working}>
                  <LinearGradient
                    colors={working ? ['rgba(105,119,132,.92)', 'rgba(66,78,94,.96)'] : [colors.cyan, colors.purple]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={s.secondaryButton}
                  >
                    <Ionicons name={working ? 'hourglass' : 'locate'} size={22} color={colors.background} />
                    <Text style={s.secondaryText}>{working ? 'KONUM KONTROL EDİLİYOR' : 'KONUM KONTROLÜ YAP'}</Text>
                    {!working ? <Ionicons name="shield-checkmark" size={21} color={colors.background} /> : null}
                  </LinearGradient>
                </AnimatedPressable>

                {['waiting', 'approved'].includes(active.status) ? (
                  <AnimatedPressable onPress={() => void markArrived()} disabled={working}>
                    <LinearGradient
                      colors={[colors.green, colors.cyan, colors.purple]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.arrived}
                    >
                      <Ionicons name="location" size={22} color={colors.background} />
                      <Text style={s.arrivedText}>KAPIYA GELDİM • KODU GÖSTER</Text>
                      <Ionicons name="arrow-forward-circle" size={22} color={colors.background} />
                    </LinearGradient>
                  </AnimatedPressable>
                ) : active.status === 'arrived' ? (
                  <View style={s.codeReady}>
                    <Ionicons name="keypad" size={25} color={colors.purple} />
                    <View style={s.heroCopy}>
                      <Text style={s.codeReadyTitle}>Güvenlik kodunu bekliyor</Text>
                      <Text style={s.codeReadyText}>Tek kullanımlık kod: {active.approvalCode ?? 'Yükleniyor'}</Text>
                    </View>
                  </View>
                ) : null}
              </LinearGradient>
            </Animated.View>
          ) : (
            <EmptyState
              icon="navigate-outline"
              title="Akıllı Geçiş beklemede"
              description={active
                ? 'Seçilen kapının konum koordinatı bulunmuyor.'
                : 'Aktif Kurye Geçişi oluştuğunda tek seferlik konum kontrolü burada açılır.'}
            />
          )}
        </FadeInView>

        <FadeInView delay={220}>
          <SectionTitle title="Aktif Kurye Geçişi" action={own.length ? `${own.length} kayıt` : undefined} />
          {active ? (
            <PassCard pass={active} onPress={onOpenPasses} />
          ) : (
            <EmptyState
              icon="shield-outline"
              title="Aktif geçiş talebin yok"
              description={sites.length
                ? 'Bir sonraki teslimat için yeni geçiş talebi oluşturabilirsin.'
                : 'Henüz erişilebilir site yok. Ayarlardan örnek verileri yükleyebilirsin.'}
            />
          )}
        </FadeInView>

        {settings?.demoDataVersion ? (
          <FadeInView delay={250}>
            <Panel style={s.demoNotice} gradient>
              <Ionicons name="flask" size={24} color={colors.orange} />
              <View style={s.heroCopy}>
                <Text style={s.demoTitle}>Örnek veriler etkin</Text>
                <Text style={s.demoText}>Yüklü örnek veri sürümü: {settings.demoDataVersion}. Gerçek kayıtlar örnek rozeti olmadan görünür.</Text>
              </View>
            </Panel>
          </FadeInView>
        ) : null}

        <FadeInView delay={280}>
          <SectionTitle title="Son hareketler" />
          <Panel gradient>
            {activities.slice(0, 4).length ? activities.slice(0, 4).map((item, index) => (
              <View key={item.id} style={[s.activity, index < Math.min(3, activities.length - 1) && s.activityBorder]}>
                <View style={[s.activityIcon, { backgroundColor: `${index === 0 ? colors.cyan : colors.purple}18` }]}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={index === 0 ? colors.cyan : colors.purple} />
                </View>
                <View style={s.heroCopy}>
                  <Text style={s.activityTitle}>{item.title}</Text>
                  <Text style={s.activityText}>{item.detail}</Text>
                </View>
                <Text style={s.time}>{item.time}</Text>
              </View>
            )) : <Text style={s.emptyText}>Henüz hareket kaydı yok.</Text>}
          </Panel>
        </FadeInView>
      </ScrollView>

      <Modal visible={Boolean(popup)} transparent animationType="fade" onRequestClose={() => !working && setPopup(undefined)}>
        <SafeAreaView style={s.modalOverlay} edges={['top', 'bottom', 'left', 'right']}>
          <LinearGradient colors={['rgba(24,98,81,.99)', 'rgba(19,48,76,.99)', 'rgba(43,35,103,.99)']} style={s.popup}>
            <FloatingView style={s.popupIcon} distance={6}>
              <Ionicons name="checkmark-done" size={46} color={colors.green} />
            </FloatingView>
            <Text style={s.popupKicker}>KAPIYA VARIŞ BİLDİRİLDİ</Text>
            <Text style={s.popupTitle}>Güvenlik Seni Bekliyor</Text>
            <Text style={s.popupText}>Varış kaydın güvenliğe gönderildi. Görevliye {active?.approvalCode ?? '6 haneli'} tek kullanımlık kodunu söyle.</Text>
            <View style={s.popupCode}>
              <Text style={s.popupCodeLabel}>TEK KULLANIMLIK KOD</Text>
              <Text style={s.popupCodeValue}>{active?.approvalCode ?? '------'}</Text>
            </View>
            <View style={s.popupActions}>
              <AnimatedPressable containerStyle={s.popupAction} onPress={() => setPopup(undefined)}>
                <LinearGradient colors={gradients.success} style={s.popupConfirm}>
                  <Text style={s.popupConfirmText}>TAMAM • KODU GÖSTER</Text>
                  <Ionicons name="arrow-forward" size={20} color={colors.background} />
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 21 },
  header: { minHeight: 92, justifyContent: 'center', paddingRight: 72 },
  headerCopy: { flex: 1 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  eyebrow: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 30, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSoft, fontSize: 13, fontWeight: '700', marginTop: 4 },
  hero: { borderRadius: radius.xl, padding: 20, gap: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)', overflow: 'hidden' },
  heroTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  motorShell: { width: 100, height: 76, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1 },
  heroKicker: { color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: '900' },
  heroTitle: { color: colors.white, fontSize: 23, fontWeight: '900', marginTop: 3 },
  heroText: { color: 'rgba(255,255,255,.88)', fontSize: 13, lineHeight: 19, marginTop: 5, fontWeight: '600' },
  button: { height: 56, borderRadius: 19, backgroundColor: colors.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  buttonText: { color: colors.background, fontSize: 13, fontWeight: '900' },
  metrics: { flexDirection: 'row', gap: 9 },
  airPanel: { borderRadius: 26, padding: 18, gap: 14, borderWidth: 1.4, borderColor: 'rgba(55,216,255,.56)', overflow: 'hidden' },
  airAura: { position: 'absolute', width: 210, height: 210, borderRadius: 210, right: -88, top: -105, backgroundColor: colors.cyan },
  airTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  airIcon: { width: 62, height: 62, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.24)' },
  airTitle: { color: colors.white, fontSize: 19, fontWeight: '900' },
  airText: { color: colors.cyan, fontSize: 15, fontWeight: '900', marginTop: 3 },
  airMeta: { color: colors.green, fontSize: 10, fontWeight: '900', marginTop: 5, letterSpacing: .4 },
  nearHint: { minHeight: 42, borderRadius: 15, backgroundColor: 'rgba(255,179,92,.13)', borderWidth: 1, borderColor: 'rgba(255,179,92,.30)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 },
  nearText: { color: colors.orange, fontSize: 11, fontWeight: '800' },
  secondaryButton: { minHeight: 62, borderRadius: 20, borderWidth: 1.5, borderColor: 'rgba(255,255,255,.72)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 },
  secondaryText: { color: colors.background, fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
  arrived: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,.45)' },
  arrivedText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  codeReady: { minHeight: 62, borderRadius: 19, borderWidth: 1, borderColor: 'rgba(139,107,255,.62)', backgroundColor: 'rgba(139,107,255,.16)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  codeReadyTitle: { color: colors.purple, fontSize: 12, fontWeight: '900' },
  codeReadyText: { color: colors.white, fontSize: 15, fontWeight: '900', marginTop: 3 },
  demoNotice: { flexDirection: 'row', alignItems: 'center', gap: 12, borderColor: 'rgba(255,179,92,.36)' },
  demoTitle: { color: colors.orange, fontSize: 15, fontWeight: '900' },
  demoText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
  activity: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  activityIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  activityTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  activityText: { color: colors.textSoft, fontSize: 12, marginTop: 4 },
  time: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
  emptyText: { color: colors.textSoft, fontSize: 14, paddingVertical: 10, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,7,14,.88)', alignItems: 'center', justifyContent: 'center', padding: 18 },
  popup: { width: '100%', maxWidth: 430, borderRadius: 29, borderWidth: 1, borderColor: 'rgba(255,255,255,.28)', padding: 23, alignItems: 'center', overflow: 'hidden' },
  popupIcon: { width: 82, height: 82, borderRadius: 27, backgroundColor: 'rgba(255,255,255,.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,.26)', alignItems: 'center', justifyContent: 'center' },
  popupKicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginTop: 16 },
  popupTitle: { color: colors.white, fontSize: 25, fontWeight: '900', textAlign: 'center', marginTop: 6 },
  popupText: { color: 'rgba(255,255,255,.82)', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 },
  popupCode: { width: '100%', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(67,231,162,.48)', backgroundColor: 'rgba(5,24,34,.72)', alignItems: 'center', padding: 14, marginTop: 17 },
  popupCodeLabel: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  popupCodeValue: { color: colors.white, fontSize: 35, fontWeight: '900', letterSpacing: 7, marginTop: 3 },
  popupActions: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 18 },
  popupAction: { flex: 1 },
  popupConfirm: { minHeight: 55, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  popupConfirmText: { color: colors.background, fontSize: 10, fontWeight: '900', textAlign: 'center' },
});
