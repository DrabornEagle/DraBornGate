import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { CourierPass, VisitorPass } from '../types';

type Mode = 'courier' | 'visitor';
type PassFilter = 'waiting' | 'approved' | 'arrived' | 'all';

export function SecurityHome() {
  const gate = useGate();
  const [mode, setMode] = useState<Mode>('courier');
  const [filter, setFilter] = useState<PassFilter>('waiting');
  const [gateId, setGateId] = useState<string>('all');
  const [rejecting, setRejecting] = useState<string>();
  const [reason, setReason] = useState('');
  const [codePass, setCodePass] = useState<string>();
  const [entryCode, setEntryCode] = useState('');
  const [visitorCode, setVisitorCode] = useState('');
  const [visitorReason, setVisitorReason] = useState('');

  const visibleGates = gate.gates;
  const courierQueue = useMemo(() => gate.passes.filter((pass) => {
    if (gateId !== 'all' && pass.gateId !== gateId) return false;
    if (filter === 'all') return !['completed', 'rejected', 'cancelled', 'expired'].includes(pass.status);
    return pass.status === filter;
  }), [filter, gate.passes, gateId]);
  const visitorMatch = gate.visitors.find((item) => item.visitorCode === visitorCode.trim());
  const waiting = gate.passes.filter((item) => item.status === 'waiting').length;
  const arrived = gate.passes.filter((item) => item.status === 'arrived').length;
  const visitorWaiting = gate.visitors.filter((item) => item.status === 'waiting').length;

  const approve = async (pass: CourierPass) => {
    try {
      const code = await gate.updatePassStatus(pass.id, 'approved');
      Alert.alert('Giriş onaylandı', `6 haneli yedek kod: ${code}`);
    } catch (error) { Alert.alert('Onaylanamadı', error instanceof Error ? error.message : 'Site yetkisi gerekli.'); }
  };

  const reject = async (pass: CourierPass) => {
    if (!reason.trim()) return Alert.alert('Reddetme sebebi gerekli', 'Kurye bu sebebi kendi ekranında görecek.');
    try { await gate.updatePassStatus(pass.id, 'rejected', reason.trim()); setRejecting(undefined); setReason(''); }
    catch (error) { Alert.alert('Reddedilemedi', error instanceof Error ? error.message : 'Yetki gerekli.'); }
  };

  const complete = async (pass: CourierPass) => {
    if (!/^\d{6}$/.test(entryCode)) return Alert.alert('6 haneli kod gerekli', 'Kurye ekranındaki yedek kodu girin.');
    try { await gate.updatePassStatus(pass.id, 'completed', undefined, entryCode); setCodePass(undefined); setEntryCode(''); Alert.alert('Giriş verildi', 'Kod tek kullanımlık olarak tüketildi ve kayıt tamamlandı.'); }
    catch (error) { Alert.alert('Kod doğrulanamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
  };

  const decideVisitor = async (visitor: VisitorPass, status: 'approved' | 'rejected' | 'completed') => {
    if (status === 'rejected' && !visitorReason.trim()) return Alert.alert('Reddetme sebebi gerekli');
    try {
      await gate.decideVisitor(visitor.visitorCode, status, visitorReason.trim());
      setVisitorReason('');
      if (status === 'completed') setVisitorCode('');
      Alert.alert(status === 'approved' ? 'Misafir onaylandı' : status === 'rejected' ? 'Misafir reddedildi' : 'Misafir girişi tamamlandı');
    } catch (error) { Alert.alert('İşlem yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
  };

  return <ScrollView refreshControl={<RefreshControl refreshing={gate.refreshing} onRefresh={() => void gate.refresh()} tintColor={colors.green} />} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
    <FadeInView style={s.header}><View><Text style={s.eyebrow}>GÜVENLİK OPERASYONU</Text><Text style={s.title}>Kapı geçiş merkezi</Text><Text style={s.sub}>CourierPass + AirPass + VisitorPass</Text></View><LiveBadge /></FadeInView>
    <FadeInView delay={60}><LinearGradient colors={gradients.security} style={s.hero}><View style={s.heroIcon}><Ionicons name="shield-checkmark" size={37} color={colors.white} /></View><View style={s.copy}><Text style={s.heroLabel}>GÜVENLİK DURUMU</Text><Text style={s.heroValue}>AKTİF</Text><Text style={s.heroText}>Kod, ret ve giriş işlemleri denetim kaydına yazılır.</Text></View></LinearGradient></FadeInView>
    <FadeInView delay={110} style={s.metrics}><MetricCard label="Kurye bekliyor" value={String(waiting)} icon="time" tone={colors.orange} /><MetricCard label="Kapıda" value={String(arrived)} icon="location" tone={colors.cyan} /><MetricCard label="Misafir" value={String(visitorWaiting)} icon="people" tone={colors.green} /></FadeInView>

    <View style={s.modeRow}>{(['courier', 'visitor'] as Mode[]).map((item) => <AnimatedPressable key={item} containerStyle={s.modeWrap} onPress={() => setMode(item)}><View style={[s.mode, mode === item && s.modeActive]}><Ionicons name={item === 'courier' ? 'navigate' : 'people'} size={20} color={mode === item ? colors.green : colors.textMuted} /><Text style={[s.modeText, mode === item && s.modeTextActive]}>{item === 'courier' ? 'CourierPass' : 'VisitorPass'}</Text></View></AnimatedPressable>)}</View>

    {mode === 'courier' ? <>
      <SectionTitle title="Kapı bazlı kurye kuyruğu" action={`${courierQueue.length} kayıt`} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}><Choice active={gateId === 'all'} label="Tüm kapılar" onPress={() => setGateId('all')} />{visibleGates.map((item) => <Choice key={item.id} active={gateId === item.id} label={item.name} sub={item.stage} onPress={() => setGateId(item.id)} />)}</ScrollView>
      <View style={s.filters}>{(['waiting', 'approved', 'arrived', 'all'] as PassFilter[]).map((item) => <AnimatedPressable key={item} containerStyle={s.filterWrap} onPress={() => setFilter(item)}><View style={[s.filter, filter === item && s.active]}><Text style={[s.filterText, filter === item && s.activeText]}>{item === 'waiting' ? 'Bekleyen' : item === 'approved' ? 'Onaylı' : item === 'arrived' ? 'Kapıda' : 'Aktif'}</Text></View></AnimatedPressable>)}</View>
      <View style={s.list}>{courierQueue.length ? courierQueue.map((pass) => <View key={pass.id} style={s.passWrap}><PassCard pass={pass} showImage />
        {pass.airpassSentAt ? <Panel style={s.airInfo} gradient><Ionicons name="navigate" size={23} color={pass.locationVerified ? colors.green : colors.cyan} /><View style={s.copy}><Text style={s.airTitle}>AirPass güvenliğe gönderildi</Text><Text style={s.airText}>{pass.lastDistanceM != null ? `${Math.round(pass.lastDistanceM)} metre` : 'Mesafe yok'} • {pass.locationVerified ? 'Konum doğrulandı' : '30 metre dışında'}</Text></View></Panel> : null}
        {pass.status === 'waiting' ? <>{rejecting === pass.id ? <Panel style={s.rejectPanel}><TextInput value={reason} onChangeText={setReason} placeholder="Reddetme sebebi" placeholderTextColor={colors.textMuted} style={s.input} /><View style={s.actions}><Small title="Vazgeç" tone={colors.textSoft} onPress={() => { setRejecting(undefined); setReason(''); }} /><Small title="Sebebiyle Reddet" tone={colors.red} onPress={() => void reject(pass)} /></View></Panel> : <View style={s.actions}><Small title="Reddet" tone={colors.red} onPress={() => setRejecting(pass.id)} /><AnimatedPressable containerStyle={s.actionWrap} onPress={() => void approve(pass)}><LinearGradient colors={gradients.success} style={s.approve}><Text style={s.approveText}>Onayla ve Kod Üret</Text></LinearGradient></AnimatedPressable></View>}</> : null}
        {['approved', 'arrived'].includes(pass.status) ? <>{codePass === pass.id ? <Panel style={s.codePanel}><Text style={s.codeHelp}>Kurye ekranındaki 6 haneli yedek kodu girin.</Text><TextInput value={entryCode} onChangeText={(value) => setEntryCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} style={s.codeInput} placeholder="000000" placeholderTextColor={colors.textMuted} /><View style={s.actions}><Small title="Vazgeç" tone={colors.textSoft} onPress={() => { setCodePass(undefined); setEntryCode(''); }} /><Small title="Kodu Doğrula / Giriş Verildi" tone={colors.green} onPress={() => void complete(pass)} /></View></Panel> : <AnimatedPressable onPress={() => setCodePass(pass.id)}><View style={s.complete}><Ionicons name="keypad" size={20} color={colors.purple} /><Text style={s.completeText}>GİRİŞ VERİLDİ • KOD DOĞRULA</Text></View></AnimatedPressable>}</> : null}
      </View>) : <EmptyState icon="shield-checkmark" title="Kuyruk temiz" description="Bu kapı ve filtrede erişilebilir CourierPass yok." />}</View>
    </> : <>
      <SectionTitle title="Misafir kodu doğrulama" action={`${visitorWaiting} bekleyen`} />
      <Panel style={s.visitorLookup} gradient><Text style={s.lookupTitle}>Misafirin verdiği 6 haneli kod</Text><TextInput value={visitorCode} onChangeText={(value) => setVisitorCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} style={s.visitorCode} placeholder="000000" placeholderTextColor={colors.textMuted} /></Panel>
      {visitorCode.length === 6 ? visitorMatch ? <Panel style={s.visitorCard} gradient><View style={s.visitorTop}><View style={s.visitorIcon}><Ionicons name="person" size={27} color={colors.green} /></View><View style={s.copy}><Text style={s.visitorName}>{visitorMatch.guestName}</Text><Text style={s.visitorMeta}>{visitorMatch.guestPhone || 'Telefon yok'} • {visitorMatch.plate || 'Plaka yok'}</Text><Text style={s.visitorMeta}>{visitorMatch.note || 'Not yok'} • {visitorMatch.status.toUpperCase()}</Text></View></View>{visitorMatch.status === 'waiting' ? <><TextInput value={visitorReason} onChangeText={setVisitorReason} placeholder="Ret sebebi (yalnızca reddederken)" placeholderTextColor={colors.textMuted} style={s.input} /><View style={s.actions}><Small title="Reddet" tone={colors.red} onPress={() => void decideVisitor(visitorMatch, 'rejected')} /><Small title="Giriş Verildi" tone={colors.green} onPress={() => void decideVisitor(visitorMatch, 'completed')} /></View></> : visitorMatch.status === 'approved' ? <Small title="Girişi Tamamla" tone={colors.green} onPress={() => void decideVisitor(visitorMatch, 'completed')} /> : null}</Panel> : <EmptyState icon="search" title="Aktif misafir kodu bulunamadı" description="Kod yanlış, tamamlanmış, reddedilmiş veya iptal edilmiş olabilir." /> : <EmptyState icon="keypad-outline" title="Kodu bekliyor" description="VisitorPass bilgilerini görmek için misafirin verdiği 6 haneli kodu girin." />}
    </>}
  </ScrollView>;
}

function Choice({ active, label, sub, onPress }: { active: boolean; label: string; sub?: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress}><View style={[s.choice, active && s.active]}><Ionicons name="enter" size={17} color={active ? colors.green : colors.textMuted} /><View><Text style={s.choiceTitle}>{label}</Text>{sub ? <Text style={s.choiceSub}>{sub}</Text> : null}</View></View></AnimatedPressable>; }
function Small({ title, tone, onPress }: { title: string; tone: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.actionWrap} onPress={onPress}><View style={[s.small, { borderColor: `${tone}70`, backgroundColor: `${tone}12` }]}><Text style={[s.smallText, { color: tone }]}>{title}</Text></View></AnimatedPressable>; }

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 19 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: colors.green, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 }, sub: { color: colors.textSoft, fontSize: 13, marginTop: 4 }, copy: { flex: 1 },
  hero: { borderRadius: radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }, heroIcon: { width: 64, height: 64, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }, heroLabel: { color: 'rgba(255,255,255,.78)', fontSize: 11, fontWeight: '900' }, heroValue: { color: colors.white, fontSize: 30, fontWeight: '900' }, heroText: { color: 'rgba(255,255,255,.84)', fontSize: 12, marginTop: 3 }, metrics: { flexDirection: 'row', gap: 8 },
  modeRow: { flexDirection: 'row', gap: 9 }, modeWrap: { flex: 1 }, mode: { height: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, modeActive: { borderColor: colors.green, backgroundColor: 'rgba(67,231,162,.10)' }, modeText: { color: colors.textMuted, fontSize: 13, fontWeight: '900' }, modeTextActive: { color: colors.green }, horizontal: { gap: 8, paddingRight: 10 }, choice: { minWidth: 135, height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 }, choiceTitle: { color: colors.text, fontSize: 12, fontWeight: '900' }, choiceSub: { color: colors.textSoft, fontSize: 9, marginTop: 2 },
  filters: { flexDirection: 'row', gap: 7 }, filterWrap: { flex: 1 }, filter: { height: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, active: { borderColor: colors.green, backgroundColor: 'rgba(67,231,162,.09)' }, filterText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' }, activeText: { color: colors.green }, list: { gap: 15 }, passWrap: { gap: 9 },
  airInfo: { flexDirection: 'row', alignItems: 'center', gap: 9, borderColor: 'rgba(55,216,255,.36)' }, airTitle: { color: colors.cyan, fontSize: 13, fontWeight: '900' }, airText: { color: colors.textSoft, fontSize: 11, marginTop: 3 }, actions: { flexDirection: 'row', gap: 8 }, actionWrap: { flex: 1 }, approve: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 }, approveText: { color: colors.background, fontSize: 11, fontWeight: '900', textAlign: 'center' }, small: { minHeight: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 }, smallText: { fontSize: 11, fontWeight: '900', textAlign: 'center' },
  rejectPanel: { gap: 9, borderColor: 'rgba(255,101,125,.36)' }, input: { height: 49, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 11, fontSize: 13 }, complete: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139,107,255,.45)', backgroundColor: 'rgba(139,107,255,.10)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, completeText: { color: colors.purple, fontSize: 12, fontWeight: '900' }, codePanel: { gap: 10, borderColor: 'rgba(139,107,255,.42)' }, codeHelp: { color: colors.textSoft, fontSize: 12, textAlign: 'center' }, codeInput: { height: 60, borderRadius: 17, borderWidth: 1, borderColor: colors.purple, color: colors.text, fontSize: 28, fontWeight: '900', letterSpacing: 7, textAlign: 'center' },
  visitorLookup: { gap: 9 }, lookupTitle: { color: colors.text, fontSize: 15, fontWeight: '900', textAlign: 'center' }, visitorCode: { height: 66, borderRadius: 18, borderWidth: 1, borderColor: colors.green, color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: 8, textAlign: 'center' }, visitorCard: { gap: 12, borderColor: 'rgba(67,231,162,.38)' }, visitorTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, visitorIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(67,231,162,.13)', alignItems: 'center', justifyContent: 'center' }, visitorName: { color: colors.text, fontSize: 17, fontWeight: '900' }, visitorMeta: { color: colors.textSoft, fontSize: 11, marginTop: 4 },
});
