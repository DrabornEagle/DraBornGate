import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { CourierPass } from '../types';
import { AnimatedPressable } from './Motion';
import { PrivateImage } from './PrivateImage';
import { RacingMotorcycle } from './RacingMotorcycle';
import { StatusPill } from './UI';

const tones: Record<CourierPass['platform'], string> = { 'Trendyol Go': '#FF8A4C', Yemeksepeti: '#FF557D', Getir: '#9075FF', DraBornGo: colors.cyan, Diğer: colors.textSoft };
const gradients: Record<CourierPass['platform'], readonly [string, string, string]> = {
  'Trendyol Go': ['rgba(102,50,28,.98)', 'rgba(38,42,67,.98)', 'rgba(10,29,47,.98)'],
  Yemeksepeti: ['rgba(105,30,55,.98)', 'rgba(53,35,67,.98)', 'rgba(10,29,47,.98)'],
  Getir: ['rgba(72,55,140,.98)', 'rgba(39,42,90,.98)', 'rgba(10,29,47,.98)'],
  DraBornGo: ['rgba(16,91,128,.98)', 'rgba(42,48,112,.98)', 'rgba(10,29,47,.98)'],
  Diğer: ['rgba(39,65,83,.98)', 'rgba(23,45,67,.98)', 'rgba(10,29,47,.98)'],
};

export function PassCard({ pass, onPress, compact = false, showImage = false }: { pass: CourierPass; onPress?: () => void; compact?: boolean; showImage?: boolean }) {
  const tone = tones[pass.platform];
  return <AnimatedPressable onPress={onPress} disabled={!onPress}><LinearGradient colors={gradients[pass.platform]} style={[s.card, { borderColor: `${tone}70` }]}>
    <View style={[s.rail, { backgroundColor: tone }]} />
    <View style={s.top}><View style={s.identity}><View style={[s.avatar, { backgroundColor: `${tone}22`, borderColor: `${tone}60` }]}><RacingMotorcycle color={tone} size={47} /></View><View style={s.copy}><Text style={s.name} numberOfLines={1}>{pass.courierName}</Text><Text style={s.meta} numberOfLines={1}>{pass.platform} • {pass.plate || 'Plaka yok'}</Text></View></View><StatusPill status={pass.status} /></View>
    <View style={s.route}><View style={s.routeIcon}><Ionicons name="location" size={20} color={tone} /></View><View style={s.copy}><Text style={s.site}>{pass.site}</Text><Text style={s.address}>{pass.gate} • {pass.block}{pass.floor ? ` / Kat ${pass.floor}` : ''} / Daire {pass.apartment}</Text>{pass.customerName ? <Text style={s.customer}>{pass.customerName}{pass.addressText ? ` • ${pass.addressText}` : ''}</Text> : null}</View>{['waiting', 'approved'].includes(pass.status) ? <View style={s.eta}><Text style={s.etaValue}>{pass.etaMinutes}</Text><Text style={s.etaLabel}>DK</Text></View> : null}</View>
    {pass.lastDistanceM != null || pass.airpassSentAt ? <View style={s.air}><Ionicons name="navigate" size={18} color={pass.locationVerified ? colors.green : colors.cyan} /><View style={s.copy}><Text style={[s.airTitle, { color: pass.locationVerified ? colors.green : colors.cyan }]}>{pass.locationVerified ? 'Konum doğrulandı' : 'AirPass konumu'}</Text><Text style={s.airText}>{pass.lastDistanceM != null ? `${Math.round(pass.lastDistanceM)} metre` : 'Mesafe bekleniyor'}{pass.airpassSentAt ? ' • Güvenliğe gönderildi' : ''}</Text></View></View> : null}
    {pass.rejectionReason ? <View style={s.rejection}><Ionicons name="close-circle" size={18} color={colors.red} /><Text style={s.rejectionText}>{pass.rejectionReason}</Text></View> : null}
    {showImage && pass.screenshotUri ? <PrivateImage path={pass.screenshotUri} style={s.image} /> : null}
    {!compact ? <><View style={s.divider} /><View style={s.bottom}><View><Text style={s.label}>SİPARİŞ NUMARASI</Text><Text style={s.order}>{pass.orderNumber}</Text><Text style={s.ocr}>{pass.ocrStatus === 'parsed' ? 'OCR + manuel kontrol' : 'Manuel bilgi'}</Text></View>{pass.approvalCode ? <View style={s.codeWrap}><Text style={s.codeLabel}>6 HANELİ YEDEK KOD</Text><Text style={s.code}>{pass.approvalCode}</Text></View> : <View style={s.waiting}><Ionicons name="scan" size={18} color={colors.textSoft} /><Text style={s.waitingText}>Kod bekleniyor</Text></View>}</View></> : null}
    {pass.isDemo ? <View style={s.demo}><Text style={s.demoText}>DEMO</Text></View> : null}
  </LinearGradient></AnimatedPressable>;
}

const s = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 14, overflow: 'hidden' }, rail: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 3 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, identity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }, avatar: { width: 59, height: 55, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, name: { color: colors.text, fontSize: 16, fontWeight: '900' }, meta: { color: colors.textSoft, fontSize: 12, marginTop: 3, fontWeight: '700' },
  route: { flexDirection: 'row', alignItems: 'center', gap: 10 }, routeIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(55,216,255,.12)', alignItems: 'center', justifyContent: 'center' }, site: { color: colors.text, fontSize: 14, fontWeight: '900' }, address: { color: colors.textSoft, fontSize: 12, lineHeight: 17, marginTop: 3 }, customer: { color: colors.cyan, fontSize: 10, lineHeight: 15, marginTop: 4 }, eta: { minWidth: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,179,92,.14)', borderWidth: 1, borderColor: 'rgba(255,179,92,.36)', alignItems: 'center', justifyContent: 'center' }, etaValue: { color: colors.orange, fontSize: 18, fontWeight: '900' }, etaLabel: { color: colors.orange, fontSize: 8, fontWeight: '900' },
  air: { minHeight: 47, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 10 }, airTitle: { fontSize: 11, fontWeight: '900' }, airText: { color: colors.textSoft, fontSize: 10, marginTop: 2 }, rejection: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,101,125,.36)', backgroundColor: 'rgba(255,101,125,.08)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10 }, rejectionText: { flex: 1, color: colors.red, fontSize: 11, fontWeight: '800' }, image: { height: 165 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,.10)' }, bottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }, label: { color: colors.textMuted, fontSize: 9, fontWeight: '900' }, order: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginTop: 3 }, ocr: { color: colors.cyan, fontSize: 8, fontWeight: '900', marginTop: 4 }, codeWrap: { alignItems: 'flex-end' }, codeLabel: { color: colors.green, fontSize: 8, fontWeight: '900' }, code: { color: colors.text, fontSize: 22, fontWeight: '900', letterSpacing: 2, marginTop: 2 }, waiting: { flexDirection: 'row', alignItems: 'center', gap: 6 }, waitingText: { color: colors.textSoft, fontSize: 11, fontWeight: '800' }, demo: { position: 'absolute', right: 10, bottom: 8, backgroundColor: 'rgba(255,179,92,.15)', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 3 }, demoText: { color: colors.orange, fontSize: 7, fontWeight: '900' },
});
