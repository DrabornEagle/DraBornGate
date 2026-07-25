import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { CourierPass } from '../types';
import { AnimatedPressable } from './Motion';
import { RacingMotorcycle } from './RacingMotorcycle';
import { TimestampedPrivateImage } from './TimestampedPrivateImage';
import { StatusPill } from './UI';

const tones: Record<CourierPass['platform'], string> = { 'Trendyol Go': '#FF8A4C', Yemeksepeti: '#FF557D', Getir: '#9075FF', DraBornGo: colors.cyan, Diğer: colors.textSoft };
const gradients: Record<CourierPass['platform'], readonly [string, string, string]> = {
  'Trendyol Go': ['rgba(102,50,28,.98)', 'rgba(38,42,67,.98)', 'rgba(10,29,47,.98)'],
  Yemeksepeti: ['rgba(105,30,55,.98)', 'rgba(53,35,67,.98)', 'rgba(10,29,47,.98)'],
  Getir: ['rgba(72,55,140,.98)', 'rgba(39,42,90,.98)', 'rgba(10,29,47,.98)'],
  DraBornGo: ['rgba(16,91,128,.98)', 'rgba(42,48,112,.98)', 'rgba(10,29,47,.98)'],
  Diğer: ['rgba(39,65,83,.98)', 'rgba(23,45,67,.98)', 'rgba(10,29,47,.98)'],
};

export function PassCard({
  pass,
  onPress,
  compact = false,
  showImage = false,
  imageFullscreen = false,
  showApprovalCode = true,
  revealApprovalCode = false,
}: {
  pass: CourierPass;
  onPress?: () => void;
  compact?: boolean;
  showImage?: boolean;
  imageFullscreen?: boolean;
  showApprovalCode?: boolean;
  revealApprovalCode?: boolean;
}) {
  const tone = tones[pass.platform];
  const showCode = Boolean(pass.approvalCode && pass.status !== 'completed' && (showApprovalCode || revealApprovalCode));
  return <AnimatedPressable onPress={onPress} disabled={!onPress}><LinearGradient colors={gradients[pass.platform]} style={[s.card, { borderColor: `${tone}70` }]}>
    <View style={[s.rail, { backgroundColor: tone }]} />
    <View style={s.top}><View style={s.identity}><View style={[s.avatar, { backgroundColor: `${tone}22`, borderColor: `${tone}60` }]}><RacingMotorcycle color={tone} size={52} /></View><View style={s.copy}><Text style={s.name} numberOfLines={1}>{pass.courierName}</Text><Text style={s.meta} numberOfLines={1}>{pass.platform} • {pass.plate || 'Plaka yok'}</Text></View></View><StatusPill status={pass.status} /></View>
    <View style={s.route}><View style={s.routeIcon}><Ionicons name="location" size={23} color={tone} /></View><View style={s.copy}><Text style={s.site}>{pass.site}</Text><Text style={s.address}>{pass.gate} • {pass.block}{pass.floor ? ` / Kat ${pass.floor}` : ''} / Daire {pass.apartment}</Text>{pass.customerName ? <Text style={s.customer}>{pass.customerName}{pass.addressText ? ` • ${pass.addressText}` : ''}</Text> : null}</View>{['waiting', 'approved'].includes(pass.status) ? <View style={s.eta}><Text style={s.etaValue}>{pass.etaMinutes}</Text><Text style={s.etaLabel}>DK</Text></View> : null}</View>
    {pass.lastDistanceM != null || pass.airpassSentAt ? <View style={s.air}><Ionicons name="navigate" size={20} color={pass.locationVerified ? colors.green : colors.cyan} /><View style={s.copy}><Text style={[s.airTitle, { color: pass.locationVerified ? colors.green : colors.cyan }]}>{pass.locationVerified ? 'Konum doğrulandı' : 'Akıllı Geçiş konumu'}</Text><Text style={s.airText}>{pass.lastDistanceM != null ? `${Math.round(pass.lastDistanceM)} metre` : 'Mesafe bekleniyor'}{pass.airpassSentAt ? ' • Güvenliğe gönderildi' : ''}</Text></View></View> : null}
    {pass.rejectionReason ? <View style={s.rejection}><Ionicons name="close-circle" size={20} color={colors.red} /><Text style={s.rejectionText}>{pass.rejectionReason}</Text></View> : null}
    {showImage && pass.screenshotUri ? <TimestampedPrivateImage path={pass.screenshotUri} capturedAt={pass.screenshotCapturedAt ?? pass.createdAt} fullscreen={imageFullscreen} /> : null}
    {!compact ? <><View style={s.divider} /><View style={s.bottom}><View style={s.orderWrap}><Text style={s.label}>SİPARİŞ NUMARASI</Text><Text style={s.order}>{pass.orderNumber}</Text><Text style={s.ocr}>{pass.ocrStatus === 'parsed' ? 'OCR + manuel kontrol' : 'Manuel bilgi'}</Text></View>{showCode ? <View style={s.codeWrap}><Text style={[s.codeLabel, revealApprovalCode && !showApprovalCode && { color: colors.orange }]}>{revealApprovalCode && !showApprovalCode ? 'GÜVENLİK DOĞRULAMA KODU' : 'TEK KULLANIMLIK KOD'}</Text><Text style={s.code}>{pass.approvalCode}</Text>{revealApprovalCode && !showApprovalCode ? <Text style={s.codeHelp}>Kodu kuryeden isteyin ve eşleştirin</Text> : null}</View> : <View style={s.waiting}><Ionicons name={pass.status === 'completed' ? 'checkmark-done' : 'keypad'} size={20} color={pass.status === 'completed' ? colors.green : colors.textSoft} /><Text style={s.waitingText}>{pass.status === 'completed' ? 'Kod kullanıldı' : showApprovalCode ? 'Kod hazırlanıyor' : 'Kodu kuryeden isteyin'}</Text></View>}</View></> : null}
    {pass.isDemo ? <View style={s.demo}><Text style={s.demoText}>DEMO</Text></View> : null}
  </LinearGradient></AnimatedPressable>;
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 15, overflow: 'hidden' }, rail: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 4 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 9 }, identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 }, avatar: { width: 65, height: 61, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 20, fontWeight: '900' }, meta: { color: colors.textSoft, fontSize: 14, marginTop: 4, fontWeight: '700' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 11 }, routeIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: 'rgba(55,216,255,.12)', alignItems: 'center', justifyContent: 'center' }, site: { color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '900' }, address: { color: colors.textSoft, fontSize: 15, lineHeight: 21, marginTop: 4 }, customer: { color: colors.cyan, fontSize: 13, lineHeight: 19, marginTop: 5 }, eta: { minWidth: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,179,92,.14)', borderWidth: 1, borderColor: 'rgba(255,179,92,.36)', alignItems: 'center', justifyContent: 'center' }, etaValue: { color: colors.orange, fontSize: 21, fontWeight: '900' }, etaLabel: { color: colors.orange, fontSize: 9, fontWeight: '900' },
  air: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 11 }, airTitle: { fontSize: 14, fontWeight: '900' }, airText: { color: colors.textSoft, fontSize: 12, marginTop: 3 }, rejection: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,101,125,.36)', backgroundColor: 'rgba(255,101,125,.08)', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 11 }, rejectionText: { flex: 1, color: colors.red, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,.10)' }, bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }, orderWrap: { flex: 1 }, label: { color: colors.textMuted, fontSize: 10, fontWeight: '900' }, order: { color: colors.textSoft, fontSize: 16, fontWeight: '900', marginTop: 4 }, ocr: { color: colors.cyan, fontSize: 10, fontWeight: '900', marginTop: 5 }, codeWrap: { alignItems: 'flex-end', maxWidth: '58%' }, codeLabel: { color: colors.green, fontSize: 9, fontWeight: '900', textAlign: 'right' }, code: { color: colors.text, fontSize: 29, fontWeight: '900', letterSpacing: 3, marginTop: 2 }, codeHelp: { color: colors.orange, fontSize: 10, lineHeight: 14, fontWeight: '800', textAlign: 'right', marginTop: 3 }, waiting: { flexDirection: 'row', alignItems: 'center', gap: 7 }, waitingText: { color: colors.textSoft, fontSize: 13, lineHeight: 18, fontWeight: '800', maxWidth: 145, textAlign: 'right' }, demo: { position: 'absolute', right: 10, bottom: 8, backgroundColor: 'rgba(255,179,92,.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }, demoText: { color: colors.orange, fontSize: 7, fontWeight: '900' },
});
