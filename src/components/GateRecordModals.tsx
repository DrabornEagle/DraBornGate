import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radius, spacing } from '../theme';
import { AnimatedPressable, FloatingView, PulseDot } from './Motion';
import { TimestampedPrivateImage } from './TimestampedPrivateImage';

export type GateRecordDetails = {
  id: string;
  status: string;
  courierName: string;
  platform: string;
  plate?: string;
  site?: string;
  gate: string;
  customerName?: string;
  addressText?: string;
  block: string;
  floor?: string;
  apartment: string;
  orderNumber: string;
  createdAt: string;
  arrivedAt?: string;
  completedAt?: string;
  rejectedAt?: string;
  approvalCode?: string;
  screenshotUri?: string;
  screenshotCapturedAt?: string;
  locationVerified?: boolean;
  lastDistanceM?: number;
};

const dateTime = (value?: string) => value ? new Date(value).toLocaleString('tr-TR') : 'Henüz oluşmadı';
const statusLabel = (status: string) => ({ waiting: 'Kod hazır / bekliyor', approved: 'İncelendi', arrived: 'Kapıda', completed: 'Tamamlandı', rejected: 'Reddedildi', cancelled: 'İptal edildi', expired: 'Süresi doldu' }[status] ?? status);

export function GateRecordDetailsModal({ record, onClose, title = 'Geçiş ayrıntıları' }: { record?: GateRecordDetails; onClose: () => void; title?: string }) {
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!record) return;
    enter.setValue(0);
    Animated.spring(enter, { toValue: 1, damping: 18, stiffness: 155, mass: .8, useNativeDriver: true }).start();
  }, [enter, record?.id]);
  return <Modal visible={Boolean(record)} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      {record ? <Animated.View style={[styles.sheet, { opacity: enter, transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) }, { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [.96, 1] }) }] }]}>
        <LinearGradient colors={gradients.panelColorful} style={styles.sheetGradient}>
          <View style={styles.handle} />
          <View style={styles.modalHeader}>
            <View style={styles.modalIcon}><Ionicons name="shield-checkmark" size={29} color={colors.cyan} /></View>
            <View style={styles.copy}><Text style={styles.kicker}>DRABORNGATE KAYDI</Text><Text style={styles.modalTitle}>{title}</Text><Text style={styles.modalSubtitle}>{statusLabel(record.status)} • {record.gate}</Text></View>
            <AnimatedPressable onPress={onClose}><View style={styles.close}><Ionicons name="close" size={25} color={colors.text} /></View></AnimatedPressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <View style={styles.heroRow}>
              <View style={styles.heroIcon}><Ionicons name="navigate" size={31} color={colors.orange} /></View>
              <View style={styles.copy}><Text style={styles.courier}>{record.courierName}</Text><Text style={styles.platform}>{record.platform} • {record.plate || 'Plaka belirtilmedi'}</Text><Text style={styles.site}>{record.site || 'Site'} • {record.gate}</Text></View>
              <View style={styles.status}><PulseDot color={record.status === 'completed' ? colors.green : record.status === 'arrived' ? colors.cyan : colors.orange} size={8} /><Text style={styles.statusText}>{statusLabel(record.status)}</Text></View>
            </View>

            <View style={styles.addressPanel}>
              <View style={styles.addressHead}><Ionicons name="home" size={24} color={colors.orange} /><Text style={styles.addressTitle}>{record.customerName || 'Müşteri adı belirtilmedi'}</Text></View>
              <Text style={styles.addressMain}>{record.block} / Kat {record.floor || '-'} / Daire {record.apartment}</Text>
              <Text style={styles.addressText}>{record.addressText || 'Adres açıklaması bulunmuyor.'}</Text>
              <View style={styles.orderRow}><Text style={styles.orderLabel}>SİPARİŞ NUMARASI</Text><Text style={styles.order}>{record.orderNumber}</Text></View>
            </View>

            {record.approvalCode ? <LinearGradient colors={['rgba(139,107,255,.28)', 'rgba(55,216,255,.12)']} style={styles.codePanel}><View><Text style={styles.codeLabel}>TEK KULLANIMLIK GEÇİŞ KODU</Text><Text style={styles.codeHint}>Güvenlik, kuryenin söylediği kodla eşleştirir.</Text></View><Text style={styles.code}>{record.approvalCode}</Text></LinearGradient> : null}

            <View style={styles.timeline}>
              <TimelineRow icon="paper-plane" label="Talep oluşturuldu" value={record.createdAt} tone={colors.cyan} />
              <TimelineRow icon="location" label="Kapıya geldi" value={record.arrivedAt} tone={colors.orange} />
              <TimelineRow icon="checkmark-done" label="Giriş tamamlandı" value={record.completedAt} tone={colors.green} />
              {record.rejectedAt ? <TimelineRow icon="close-circle" label="Reddedildi" value={record.rejectedAt} tone={colors.red} /> : null}
            </View>

            {record.locationVerified ? <View style={styles.location}><Ionicons name="navigate-circle" size={25} color={colors.green} /><View style={styles.copy}><Text style={styles.locationTitle}>Konum doğrulandı</Text><Text style={styles.locationText}>{record.lastDistanceM != null ? `${Math.round(record.lastDistanceM)} metre mesafede kaydedildi.` : 'Akıllı Geçiş konumu doğrulandı.'}</Text></View></View> : null}
            {record.screenshotUri ? <View style={styles.imageBlock}><Text style={styles.blockTitle}>Sipariş ekran görüntüsü</Text><TimestampedPrivateImage path={record.screenshotUri} capturedAt={record.screenshotCapturedAt ?? record.createdAt} fullscreen /></View> : null}
          </ScrollView>
        </LinearGradient>
      </Animated.View> : null}
    </View>
  </Modal>;
}

export function ArrivalSuccessModal({ visible, code, gate, onClose }: { visible: boolean; code?: string; gate?: string; onClose: () => void }) {
  const pulse = useRef(new Animated.Value(0)).current;
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!visible) return;
    enter.setValue(0);
    pulse.setValue(0);
    Animated.spring(enter, { toValue: 1, damping: 15, stiffness: 175, mass: .72, useNativeDriver: true }).start();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [enter, pulse, visible]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <View style={styles.arrivalBackdrop}>
      <Animated.View style={[styles.arrivalCard, { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [.82, 1] }) }, { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }] }]}>
        <LinearGradient colors={['#0C7E77', '#2356A5', '#522F96']} style={styles.arrivalGradient}>
          <Animated.View style={[styles.arrivalHalo, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [.16, .36] }), transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [.88, 1.12] }) }] }]} />
          <FloatingView style={styles.arrivalIcon} distance={7}><Ionicons name="location" size={46} color={colors.white} /></FloatingView>
          <Text style={styles.arrivalKicker}>KAPIYA VARIŞ GÜVENLİĞE GÖNDERİLDİ</Text>
          <Text style={styles.arrivalTitle}>Kapıya geldin</Text>
          <Text style={styles.arrivalText}>{gate || 'Seçili kapı'} görevlisi artık kaydını ve kodunu güvenlik ekranında görebilir.</Text>
          <View style={styles.arrivalCodeWrap}><Text style={styles.arrivalCodeLabel}>GÖREVLİYE SÖYLEYECEĞİN KOD</Text><Text style={styles.arrivalCode}>{code || '------'}</Text><Text style={styles.arrivalCodeHint}>Kod yalnızca bir kez kullanılabilir.</Text></View>
          <View style={styles.steps}>
            <Step number="1" text="Güvenlik görevlisine kodu söyle" />
            <Step number="2" text="Görevli kodu sistemde eşleştirsin" />
            <Step number="3" text="Eşleşince geçiş otomatik tamamlansın" />
          </View>
          <AnimatedPressable onPress={onClose}><View style={styles.arrivalButton}><Ionicons name="checkmark-circle" size={23} color={colors.background} /><Text style={styles.arrivalButtonText}>ANLADIM • KODU GÖSTER</Text></View></AnimatedPressable>
        </LinearGradient>
      </Animated.View>
    </View>
  </Modal>;
}

function TimelineRow({ icon, label, value, tone }: { icon: keyof typeof Ionicons.glyphMap; label: string; value?: string; tone: string }) {
  return <View style={styles.timelineRow}><View style={[styles.timelineIcon, { backgroundColor: `${tone}1C`, borderColor: `${tone}55` }]}><Ionicons name={icon} size={20} color={tone} /></View><View style={styles.copy}><Text style={styles.timelineLabel}>{label}</Text><Text style={styles.timelineValue}>{dateTime(value)}</Text></View></View>;
}
function Step({ number, text }: { number: string; text: string }) { return <View style={styles.step}><View style={styles.stepNumber}><Text style={styles.stepNumberText}>{number}</Text></View><Text style={styles.stepText}>{text}</Text></View>; }

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2,8,16,.84)' },
  sheet: { maxHeight: '92%', marginHorizontal: 8, marginBottom: 8, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong },
  sheetGradient: { paddingTop: 10 },
  handle: { width: 58, height: 5, borderRadius: 5, backgroundColor: colors.textMuted, opacity: .6, alignSelf: 'center', marginBottom: 10 },
  modalHeader: { paddingHorizontal: spacing.md, paddingBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  modalIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(55,216,255,.14)', borderWidth: 1, borderColor: 'rgba(55,216,255,.38)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 }, kicker: { color: colors.cyan, fontSize: 10, fontWeight: '900', letterSpacing: .8 }, modalTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 2 }, modalSubtitle: { color: colors.textSoft, fontSize: 13, marginTop: 3 },
  close: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.08)', alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: spacing.md, paddingTop: 2, paddingBottom: 34, gap: 14 },
  heroRow: { minHeight: 86, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(8,25,42,.78)', padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, heroIcon: { width: 56, height: 56, borderRadius: 18, backgroundColor: 'rgba(255,179,92,.14)', alignItems: 'center', justifyContent: 'center' }, courier: { color: colors.text, fontSize: 21, fontWeight: '900' }, platform: { color: colors.textSoft, fontSize: 14, marginTop: 3 }, site: { color: colors.cyan, fontSize: 13, marginTop: 4, fontWeight: '800' }, status: { maxWidth: 100, minHeight: 36, borderRadius: 13, borderWidth: 1, borderColor: colors.borderStrong, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }, statusText: { color: colors.textSoft, fontSize: 10, fontWeight: '900', textAlign: 'center' },
  addressPanel: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,179,92,.34)', backgroundColor: 'rgba(255,179,92,.08)', padding: 15 }, addressHead: { flexDirection: 'row', alignItems: 'center', gap: 9 }, addressTitle: { color: colors.text, fontSize: 19, lineHeight: 25, fontWeight: '900', flex: 1 }, addressMain: { color: colors.orange, fontSize: 17, lineHeight: 24, fontWeight: '900', marginTop: 11 }, addressText: { color: colors.textSoft, fontSize: 15, lineHeight: 22, marginTop: 5 }, orderRow: { marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, orderLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900' }, order: { color: colors.cyan, fontSize: 17, fontWeight: '900' },
  codePanel: { borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(139,107,255,.48)', padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, codeLabel: { color: colors.purple, fontSize: 10, fontWeight: '900' }, codeHint: { color: colors.textSoft, fontSize: 12, marginTop: 4, maxWidth: 190 }, code: { color: colors.text, fontSize: 31, letterSpacing: 4, fontWeight: '900' },
  timeline: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(8,25,42,.72)', padding: 13, gap: 10 }, timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 11 }, timelineIcon: { width: 43, height: 43, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, timelineLabel: { color: colors.textSoft, fontSize: 13, fontWeight: '800' }, timelineValue: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 2 },
  location: { minHeight: 64, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(67,231,162,.35)', backgroundColor: 'rgba(67,231,162,.08)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, locationTitle: { color: colors.green, fontSize: 16, fontWeight: '900' }, locationText: { color: colors.textSoft, fontSize: 13, marginTop: 3 }, imageBlock: { gap: 8 }, blockTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  arrivalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(1,7,14,.88)' }, arrivalCard: { width: '100%', maxWidth: 440, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,.28)' }, arrivalGradient: { padding: 22, alignItems: 'center', overflow: 'hidden' }, arrivalHalo: { position: 'absolute', width: 240, height: 240, borderRadius: 240, top: -100, backgroundColor: colors.white }, arrivalIcon: { width: 88, height: 88, borderRadius: 30, backgroundColor: 'rgba(255,255,255,.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,.30)', alignItems: 'center', justifyContent: 'center' }, arrivalKicker: { color: 'rgba(255,255,255,.76)', fontSize: 10, fontWeight: '900', letterSpacing: .9, marginTop: 17, textAlign: 'center' }, arrivalTitle: { color: colors.white, fontSize: 34, fontWeight: '900', marginTop: 4 }, arrivalText: { color: 'rgba(255,255,255,.87)', fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 7 }, arrivalCodeWrap: { width: '100%', marginTop: 17, borderRadius: 22, backgroundColor: 'rgba(3,13,27,.34)', borderWidth: 1, borderColor: 'rgba(255,255,255,.24)', alignItems: 'center', padding: 16 }, arrivalCodeLabel: { color: 'rgba(255,255,255,.72)', fontSize: 10, fontWeight: '900' }, arrivalCode: { color: colors.white, fontSize: 40, fontWeight: '900', letterSpacing: 7, marginTop: 4 }, arrivalCodeHint: { color: 'rgba(255,255,255,.66)', fontSize: 12, marginTop: 3 }, steps: { width: '100%', gap: 9, marginTop: 17 }, step: { minHeight: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.10)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10 }, stepNumber: { width: 29, height: 29, borderRadius: 10, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' }, stepNumberText: { color: colors.background, fontSize: 13, fontWeight: '900' }, stepText: { flex: 1, color: colors.white, fontSize: 13, fontWeight: '800' }, arrivalButton: { width: '100%', height: 57, borderRadius: 19, backgroundColor: colors.white, marginTop: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, arrivalButtonText: { color: colors.background, fontSize: 13, fontWeight: '900' },
});
