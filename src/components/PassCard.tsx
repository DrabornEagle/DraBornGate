import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { CourierPass } from '../types';
import { AnimatedPressable } from './Motion';
import { RacingMotorcycle } from './RacingMotorcycle';
import { TimestampedPrivateImage } from './TimestampedPrivateImage';
import { StatusPill } from './UI';

const tones: Record<CourierPass['platform'], string> = { 'Trendyol Go': '#FF8A4C', Yemeksepeti: '#FF557D', Getir: '#9075FF', DraBornGo: colors.cyan, Diğer: colors.textSoft };
const platformGradients: Record<CourierPass['platform'], readonly [string, string, string]> = {
  'Trendyol Go': ['rgba(102,50,28,.98)', 'rgba(38,42,67,.98)', 'rgba(10,29,47,.98)'],
  Yemeksepeti: ['rgba(105,30,55,.98)', 'rgba(53,35,67,.98)', 'rgba(10,29,47,.98)'],
  Getir: ['rgba(72,55,140,.98)', 'rgba(39,42,90,.98)', 'rgba(10,29,47,.98)'],
  DraBornGo: ['rgba(16,91,128,.98)', 'rgba(42,48,112,.98)', 'rgba(10,29,47,.98)'],
  Diğer: ['rgba(39,65,83,.98)', 'rgba(23,45,67,.98)', 'rgba(10,29,47,.98)'],
};
const colorfulPalettes: ReadonlyArray<{ tone: string; gradient: readonly [string, string, string] }> = [
  { tone: '#37D8FF', gradient: ['rgba(13,86,122,.98)', 'rgba(34,52,115,.98)', 'rgba(8,27,46,.99)'] },
  { tone: '#43E7A2', gradient: ['rgba(20,100,82,.98)', 'rgba(34,58,105,.98)', 'rgba(8,27,46,.99)'] },
  { tone: '#DE55FF', gradient: ['rgba(103,38,124,.98)', 'rgba(49,49,111,.98)', 'rgba(8,27,46,.99)'] },
  { tone: '#FFB35C', gradient: ['rgba(110,66,31,.98)', 'rgba(61,46,105,.98)', 'rgba(8,27,46,.99)'] },
  { tone: '#FF657D', gradient: ['rgba(112,38,63,.98)', 'rgba(47,54,111,.98)', 'rgba(8,27,46,.99)'] },
];

function stableIndex(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = ((hash << 5) - hash + value.charCodeAt(index)) | 0;
  return Math.abs(hash) % colorfulPalettes.length;
}

function MatchCodeButton({ completed, disabled, onPress }: { completed: boolean; disabled: boolean; onPress?: () => void }) {
  const motion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (completed || disabled) { motion.stopAnimation(); motion.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(motion, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(motion, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [completed, disabled, motion]);
  return <Animated.View style={!completed && !disabled ? { transform: [{ scale: motion.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] }) }] } : undefined}>
    <AnimatedPressable onPress={onPress} disabled={disabled}>
      <LinearGradient colors={completed ? ['rgba(67,231,162,.22)', 'rgba(29,94,85,.34)'] : ['rgba(222,85,255,.52)', 'rgba(105,78,255,.58)', 'rgba(55,216,255,.38)']} style={[s.matchButton, disabled && s.matchButtonDisabled]}>
        {!completed ? <Animated.View pointerEvents="none" style={[s.matchSweep, { opacity: motion.interpolate({ inputRange: [0, 1], outputRange: [.08, .35] }), transform: [{ translateX: motion.interpolate({ inputRange: [0, 1], outputRange: [-80, 170] }) }, { rotate: '-18deg' }] }]} /> : null}
        <Ionicons name={completed ? 'checkmark-done' : 'keypad'} size={19} color={completed ? colors.green : colors.white} />
        <Text style={[s.matchButtonText, completed && { color: colors.green }]}>{completed ? 'EŞLEŞTİ' : 'KODU EŞLEŞTİR'}</Text>
      </LinearGradient>
    </AnimatedPressable>
  </Animated.View>;
}

export function PassCard({
  pass,
  onPress,
  compact = false,
  showImage = false,
  imageFullscreen = false,
  showApprovalCode = true,
  securityCodeMode = false,
  onMatchCode,
  colorfulVariant = false,
}: {
  pass: CourierPass;
  onPress?: () => void;
  compact?: boolean;
  showImage?: boolean;
  imageFullscreen?: boolean;
  showApprovalCode?: boolean;
  securityCodeMode?: boolean;
  onMatchCode?: () => void;
  colorfulVariant?: boolean;
}) {
  const palette = colorfulVariant ? colorfulPalettes[stableIndex(pass.id)] : undefined;
  const tone = palette?.tone ?? tones[pass.platform];
  const cardGradient = palette?.gradient ?? platformGradients[pass.platform];
  const codeDisabled = !onMatchCode || !pass.approvalCode || pass.status === 'completed';
  return <AnimatedPressable onPress={onPress} disabled={!onPress}><LinearGradient colors={cardGradient} style={[s.card, { borderColor: `${tone}78` }]}>
    <View style={[s.rail, { backgroundColor: tone }]} />
    {colorfulVariant ? <View pointerEvents="none" style={[s.colorBubble, { backgroundColor: `${tone}18` }]} /> : null}
    <View style={s.top}><View style={s.identity}><View style={[s.avatar, { backgroundColor: `${tone}22`, borderColor: `${tone}60` }]}><RacingMotorcycle color={tone} size={47} /></View><View style={s.copy}><Text style={s.name} numberOfLines={1}>{pass.courierName}</Text><Text style={s.meta} numberOfLines={1}>{pass.platform} • {pass.plate || 'Plaka yok'}</Text></View></View><StatusPill status={pass.status} /></View>
    <View style={s.route}><View style={[s.routeIcon, { backgroundColor: `${tone}18` }]}><Ionicons name="location" size={20} color={tone} /></View><View style={s.copy}><Text style={s.site}>{pass.site}</Text><Text style={s.address}>{pass.gate} • {pass.block}{pass.floor ? ` / Kat ${pass.floor}` : ''} / Daire {pass.apartment}</Text>{pass.customerName ? <Text style={s.customer}>{pass.customerName}{pass.addressText ? ` • ${pass.addressText}` : ''}</Text> : null}</View>{['waiting', 'approved'].includes(pass.status) ? <View style={s.eta}><Text style={s.etaValue}>{pass.etaMinutes}</Text><Text style={s.etaLabel}>DK</Text></View> : null}</View>
    {pass.lastDistanceM != null || pass.airpassSentAt ? <View style={s.air}><Ionicons name="navigate" size={18} color={pass.locationVerified ? colors.green : colors.cyan} /><View style={s.copy}><Text style={[s.airTitle, { color: pass.locationVerified ? colors.green : colors.cyan }]}>{pass.locationVerified ? 'Konum doğrulandı' : 'Akıllı Geçiş konumu'}</Text><Text style={s.airText}>{pass.lastDistanceM != null ? `${Math.round(pass.lastDistanceM)} metre` : 'Mesafe bekleniyor'}{pass.airpassSentAt ? ' • Güvenliğe gönderildi' : ''}</Text></View></View> : null}
    {pass.rejectionReason ? <View style={s.rejection}><Ionicons name="close-circle" size={18} color={colors.red} /><Text style={s.rejectionText}>{pass.rejectionReason}</Text></View> : null}
    {showImage && pass.screenshotUri ? <TimestampedPrivateImage path={pass.screenshotUri} capturedAt={pass.screenshotCapturedAt ?? pass.createdAt} fullscreen={imageFullscreen} /> : null}
    {!compact ? <><View style={s.divider} /><View style={s.bottom}><View style={s.orderWrap}><Text style={s.label}>SİPARİŞ NUMARASI</Text><Text style={s.order}>{pass.orderNumber}</Text><Text style={s.ocr}>{pass.ocrStatus === 'parsed' ? 'OCR + manuel kontrol' : 'Manuel bilgi'}</Text></View>{securityCodeMode ? <View style={s.securityCodeWrap}><Text style={s.securityCodeLabel}>GEÇİŞ KODU</Text><Text style={s.securityCode}>{pass.approvalCode ?? '------'}</Text>{onMatchCode ? <MatchCodeButton completed={pass.status === 'completed'} disabled={codeDisabled} onPress={onMatchCode} /> : null}</View> : showApprovalCode && pass.approvalCode && pass.status !== 'completed' ? <View style={s.codeWrap}><Text style={s.codeLabel}>TEK KULLANIMLIK KOD</Text><Text style={s.code}>{pass.approvalCode}</Text></View> : <View style={s.waiting}><Ionicons name={pass.status === 'completed' ? 'checkmark-done' : 'keypad'} size={18} color={pass.status === 'completed' ? colors.green : colors.textSoft} /><Text style={s.waitingText}>{pass.status === 'completed' ? 'Kod kullanıldı' : showApprovalCode ? 'Kod hazırlanıyor' : 'Kodu eşleştir'}</Text></View>}</View></> : null}
    {pass.isDemo ? <View style={s.demo}><Text style={s.demoText}>DEMO</Text></View> : null}
  </LinearGradient></AnimatedPressable>;
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 14, overflow: 'hidden' }, rail: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 3 }, colorBubble: { position: 'absolute', width: 180, height: 180, borderRadius: 180, right: -75, top: -95 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 59, height: 55, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 16, fontWeight: '900' }, meta: { color: colors.textSoft, fontSize: 12, marginTop: 3, fontWeight: '700' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10 }, routeIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, site: { color: colors.text, fontSize: 14, fontWeight: '900' }, address: { color: colors.textSoft, fontSize: 12, lineHeight: 17, marginTop: 3 }, customer: { color: colors.cyan, fontSize: 10, lineHeight: 15, marginTop: 4 }, eta: { minWidth: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,179,92,.14)', borderWidth: 1, borderColor: 'rgba(255,179,92,.36)', alignItems: 'center', justifyContent: 'center' }, etaValue: { color: colors.orange, fontSize: 18, fontWeight: '900' }, etaLabel: { color: colors.orange, fontSize: 8, fontWeight: '900' },
  air: { minHeight: 47, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10 }, airTitle: { fontSize: 11, fontWeight: '900' }, airText: { color: colors.textSoft, fontSize: 10, marginTop: 2 }, rejection: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,101,125,.36)', backgroundColor: 'rgba(255,101,125,.08)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 }, rejectionText: { flex: 1, color: colors.red, fontSize: 11, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,.10)' }, bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }, orderWrap: { flex: 1 }, label: { color: colors.textMuted, fontSize: 9, fontWeight: '900' }, order: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginTop: 3 }, ocr: { color: colors.cyan, fontSize: 8, fontWeight: '900', marginTop: 4 }, codeWrap: { alignItems: 'flex-end' }, codeLabel: { color: colors.green, fontSize: 8, fontWeight: '900' }, code: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 2, marginTop: 2 }, waiting: { flexDirection: 'row', alignItems: 'center', gap: 6 }, waitingText: { color: colors.textSoft, fontSize: 10, fontWeight: '800', maxWidth: 110, textAlign: 'right' },
  securityCodeWrap: { width: 166, alignItems: 'stretch' }, securityCodeLabel: { color: colors.orange, fontSize: 8, fontWeight: '900', textAlign: 'center', letterSpacing: .7 }, securityCode: { color: colors.text, fontSize: 23, fontWeight: '900', letterSpacing: 4, textAlign: 'center', marginTop: 2 }, matchButton: { minHeight: 46, marginTop: 7, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.32)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8, overflow: 'hidden' }, matchSweep: { position: 'absolute', top: -28, bottom: -28, width: 34, backgroundColor: 'rgba(255,255,255,.65)' }, matchButtonDisabled: { opacity: .65 }, matchButtonText: { color: colors.white, fontSize: 9.5, fontWeight: '900', letterSpacing: .25 },
  demo: { position: 'absolute', right: 10, bottom: 8, backgroundColor: 'rgba(255,179,92,.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }, demoText: { color: colors.orange, fontSize: 7, fontWeight: '900' },
});
