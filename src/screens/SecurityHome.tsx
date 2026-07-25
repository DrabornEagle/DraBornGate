import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Alert, Modal, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { CourierPass, VisitorPass } from '../types';

type Mode = 'courier' | 'visitor';
type PassFilter = 'waiting' | 'approved' | 'arrived' | 'all';

function dkd_extractPassId(dkd_data: unknown) {
  if (typeof dkd_data === 'string') return dkd_data;
  if (Array.isArray(dkd_data)) return dkd_extractPassId(dkd_data[0]);
  if (dkd_data && typeof dkd_data === 'object' && 'id' in dkd_data) return String((dkd_data as { id: unknown }).id ?? '');
  return '';
}

export function SecurityHome() {
  const gate = useGate();
  const [mode, setMode] = useState<Mode>('courier');
  const [filter, setFilter] = useState<PassFilter>('waiting');
  const [gateId, setGateId] = useState('all');
  const [rejecting, setRejecting] = useState<string>();
  const [reason, setReason] = useState('');
  const [courierCode, setCourierCode] = useState('');
  const [matchedPassId, setMatchedPassId] = useState<string>();
  const [searching, setSearching] = useState(false);
  const [visitorCode, setVisitorCode] = useState('');
  const [visitorReason, setVisitorReason] = useState('');
  const [codePass, setCodePass] = useState<CourierPass>();
  const [cardCode, setCardCode] = useState('');
  const [cardCodeError, setCardCodeError] = useState('');
  const [cardCodeWorking, setCardCodeWorking] = useState(false);
  const [successPass, setSuccessPass] = useState<CourierPass>();

  const courierQueue = useMemo(() => gate.passes.filter((pass) => {
    if (gateId !== 'all' && pass.gateId !== gateId) return false;
    if (filter === 'all') return !['completed', 'rejected', 'cancelled', 'expired'].includes(pass.status);
    return pass.status === filter;
  }), [filter, gate.passes, gateId]);
  const matchedPass = matchedPassId ? gate.passes.find((item) => item.id === matchedPassId) : undefined;
  const visitorMatch = gate.visitors.find((item) => item.visitorCode === visitorCode.trim());
  const waiting = gate.passes.filter((item) => item.status === 'waiting').length;
  const arrived = gate.passes.filter((item) => item.status === 'arrived').length;
  const visitorWaiting = gate.visitors.filter((item) => item.status === 'waiting').length;

  const lookupCourier = async () => {
    if (!/^\d{6}$/.test(courierCode)) return Alert.alert('6 haneli kod gerekli', 'Kuryenin verdiği tek kullanımlık kodu girin.');
    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_lookup_courier_by_code', { p_code: courierCode });
      if (error) throw error;
      const id = dkd_extractPassId(data);
      if (!id) { setMatchedPassId(undefined); return Alert.alert('Kurye bulunamadı', 'Kod yanlış, kullanılmış veya kurye henüz “Kapıya Geldim” işlemini yapmamış olabilir.'); }
      await gate.refresh();
      setMatchedPassId(id);
    } catch (error) { Alert.alert('Kod aranamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
    finally { setSearching(false); }
  };

  const completeMatch = async (pass: CourierPass, code: string) => {
    await gate.updatePassStatus(pass.id, 'completed', undefined, code);
    setSuccessPass(pass);
    await gate.refresh();
  };

  const verifyCourier = async () => {
    if (!matchedPass) return;
    try {
      await completeMatch(matchedPass, courierCode);
      setMatchedPassId(undefined);
      setCourierCode('');
    } catch (error) { Alert.alert('Kod doğrulanamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
  };

  const openCardMatcher = (pass: CourierPass) => {
    setCodePass(pass);
    setCardCode('');
    setCardCodeError('');
  };

  const verifyCardCode = async () => {
    if (!codePass) return;
    if (!/^\d{6}$/.test(cardCode)) {
      setCardCodeError('Kuryenin verdiği 6 haneli geçiş kodunu girin.');
      return;
    }
    setCardCodeWorking(true);
    setCardCodeError('');
    try {
      const { data, error } = await supabase.rpc('dkd_gate_lookup_courier_by_code', { p_code: cardCode });
      if (error) throw error;
      const foundId = dkd_extractPassId(data);
      if (!foundId) throw new Error('Kod yanlış, kullanılmış veya kurye henüz kapıya gelmemiş olabilir.');
      if (foundId !== codePass.id) throw new Error('Girilen kod bu kurye kartıyla eşleşmiyor.');
      const completedPass = codePass;
      await completeMatch(completedPass, cardCode);
      setCodePass(undefined);
      setCardCode('');
    } catch (error) {
      setCardCodeError(error instanceof Error ? error.message : 'Kod eşleştirilemedi. Tekrar deneyin.');
    } finally {
      setCardCodeWorking(false);
    }
  };

  const reject = async (pass: CourierPass) => {
    if (!reason.trim()) return Alert.alert('Reddetme sebebi gerekli', 'Kurye bu sebebi kendi ekranında görecek.');
    try { await gate.updatePassStatus(pass.id, 'rejected', reason.trim()); setRejecting(undefined); setReason(''); }
    catch (error) { Alert.alert('Reddedilemedi', error instanceof Error ? error.message : 'Yetki gerekli.'); }
  };

  const decideVisitor = async (visitor: VisitorPass, status: 'approved' | 'rejected' | 'completed') => {
    if (status === 'rejected' && !visitorReason.trim()) return Alert.alert('Reddetme sebebi gerekli');
    try {
      await gate.decideVisitor(visitor.visitorCode, status, visitorReason.trim());
      setVisitorReason(''); if (status === 'completed') setVisitorCode('');
      Alert.alert(status === 'approved' ? 'Misafir onaylandı' : status === 'rejected' ? 'Misafir reddedildi' : 'Misafir girişi tamamlandı');
    } catch (error) { Alert.alert('İşlem yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.'); }
  };

  return <>
    <ScrollView refreshControl={<RefreshControl refreshing={gate.refreshing} onRefresh={() => void gate.refresh()} tintColor={colors.green} />} showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
      <FadeInView style={s.header}><View style={s.headerCopy}><View style={s.eyebrowRow}><Text style={s.eyebrow}>GÜVENLİK OPERASYONU</Text><LiveBadge compact /></View><Text style={s.title}>Kapı geçiş merkezi</Text><Text style={s.sub}>Kurye kodu, ziyaretçi ve denetim işlemleri</Text></View></FadeInView>
      <FadeInView delay={60}><LinearGradient colors={gradients.security} style={s.hero}><View style={s.heroIcon}><Ionicons name="shield-checkmark" size={37} color={colors.white} /></View><View style={s.copy}><Text style={s.heroLabel}>GÜVENLİK DURUMU</Text><Text style={s.heroValue}>AKTİF</Text><Text style={s.heroText}>Kod doğrulama ve giriş işlemleri anında kayıt altına alınır.</Text></View></LinearGradient></FadeInView>
      <FadeInView delay={110} style={s.metrics}><MetricCard label="Kod hazır" value={String(waiting)} icon="keypad" tone={colors.orange} /><MetricCard label="Kapıda" value={String(arrived)} icon="location" tone={colors.cyan} /><MetricCard label="Misafir" value={String(visitorWaiting)} icon="people" tone={colors.green} /></FadeInView>

      <View style={s.modeRow}>{(['courier', 'visitor'] as Mode[]).map((item) => <AnimatedPressable key={item} containerStyle={s.modeWrap} onPress={() => setMode(item)}><View style={[s.mode, mode === item && s.modeActive]}><Ionicons name={item === 'courier' ? 'navigate' : 'people'} size={20} color={mode === item ? colors.green : colors.textMuted} /><Text style={[s.modeText, mode === item && s.modeTextActive]}>{item === 'courier' ? 'Kurye Geçişi' : 'Ziyaretçi Geçişi'}</Text></View></AnimatedPressable>)}</View>

      {mode === 'courier' ? <>
        <SectionTitle title="Kurye koduyla bul" action="TEK KULLANIMLIK" />
        <Panel style={s.lookup} gradient><Text style={s.lookupTitle}>Kuryenin verdiği 6 haneli kod</Text><View style={s.lookupRow}><TextInput value={courierCode} onChangeText={(value) => { setCourierCode(value.replace(/\D/g, '').slice(0, 6)); setMatchedPassId(undefined); }} keyboardType="number-pad" maxLength={6} style={s.codeInput} placeholder="000000" placeholderTextColor={colors.textMuted} /><AnimatedPressable onPress={() => void lookupCourier()} disabled={searching}><View style={s.searchButton}><Ionicons name="search" size={22} color={colors.background} /><Text style={s.searchText}>{searching ? 'ARANIYOR' : 'KURYEYİ BUL'}</Text></View></AnimatedPressable></View></Panel>
        {matchedPass ? <View style={s.match}><PassCard pass={matchedPass} showImage imageFullscreen securityCodeMode onMatchCode={() => openCardMatcher(matchedPass)} /><AnimatedPressable onPress={() => void verifyCourier()}><LinearGradient colors={gradients.success} style={s.verify}><Ionicons name="checkmark-done" size={21} color={colors.background} /><Text style={s.verifyText}>KOD EŞLEŞTİ • GİRİŞ VER</Text></LinearGradient></AnimatedPressable></View> : courierCode.length === 6 ? <EmptyState icon="search" title="Kodu ara" description="Kurye “Kapıya Geldim” dedikten sonra arama düğmesine dokun." /> : null}

        <SectionTitle title="Kapı bazlı kurye kuyruğu" action={`${courierQueue.length} kayıt`} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}><Choice active={gateId === 'all'} label="Tüm kapılar" onPress={() => setGateId('all')} />{gate.gates.map((item) => <Choice key={item.id} active={gateId === item.id} label={item.name} sub={item.stage} onPress={() => setGateId(item.id)} />)}</ScrollView>
        <View style={s.filters}>{(['waiting', 'approved', 'arrived', 'all'] as PassFilter[]).map((item) => <AnimatedPressable key={item} containerStyle={s.filterWrap} onPress={() => setFilter(item)}><View style={[s.filter, filter === item && s.active]}><Text style={[s.filterText, filter === item && s.activeText]}>{item === 'waiting' ? (gateId === 'all' ? 'Kurye Geliyor' : 'Kod Hazır') : item === 'approved' ? 'İncelendi' : item === 'arrived' ? 'Kapıda' : 'Aktif'}</Text></View></AnimatedPressable>)}</View>
        <View style={s.list}>{courierQueue.length ? courierQueue.map((pass) => <View key={pass.id} style={s.passWrap}><PassCard pass={pass} showImage imageFullscreen securityCodeMode onMatchCode={() => openCardMatcher(pass)} />
          {pass.airpassSentAt ? <Panel style={s.airInfo} gradient><Ionicons name="navigate" size={23} color={pass.locationVerified ? colors.green : colors.cyan} /><View style={s.copy}><Text style={s.airTitle}>Akıllı Geçiş güvenliğe gönderildi</Text><Text style={s.airText}>{pass.lastDistanceM != null ? `${Math.round(pass.lastDistanceM)} metre` : 'Mesafe yok'} • {pass.locationVerified ? 'Konum doğrulandı' : '30 metre dışında'}</Text></View></Panel> : null}
          {['waiting', 'approved', 'arrived'].includes(pass.status) ? rejecting === pass.id ? <Panel style={s.rejectPanel}><TextInput value={reason} onChangeText={setReason} placeholder="Reddetme sebebi" placeholderTextColor={colors.textMuted} style={s.input} /><View style={s.actions}><Small title="Vazgeç" tone={colors.textSoft} onPress={() => { setRejecting(undefined); setReason(''); }} /><Small title="Sebebiyle Reddet" tone={colors.red} onPress={() => void reject(pass)} /></View></Panel> : <View style={s.actions}><Small title="Reddet" tone={colors.red} onPress={() => setRejecting(pass.id)} /><View style={s.waitCode}><Ionicons name="keypad" size={19} color={colors.purple} /><Text style={s.waitCodeText}>Karttan kodu eşleştir</Text></View></View> : null}
        </View>) : <EmptyState icon="shield-checkmark" title="Kuyruk temiz" description="Bu kapı ve filtrede erişilebilir kurye geçişi yok." />}</View>
      </> : <>
        <SectionTitle title="Misafir kodu doğrulama" action={`${visitorWaiting} bekleyen`} />
        <Panel style={s.visitorLookup} gradient><Text style={s.lookupTitle}>Misafirin verdiği 6 haneli kod</Text><TextInput value={visitorCode} onChangeText={(value) => setVisitorCode(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} style={s.visitorCode} placeholder="000000" placeholderTextColor={colors.textMuted} /></Panel>
        {visitorCode.length === 6 ? visitorMatch ? <Panel style={s.visitorCard} gradient><View style={s.visitorTop}><View style={s.visitorIcon}><Ionicons name="person" size={27} color={colors.green} /></View><View style={s.copy}><Text style={s.visitorName}>{visitorMatch.guestName}</Text><Text style={s.visitorMeta}>{visitorMatch.guestPhone || 'Telefon yok'} • {visitorMatch.plate || 'Plaka yok'}</Text><Text style={s.visitorMeta}>{visitorMatch.note || 'Not yok'} • {visitorMatch.status.toUpperCase()}</Text></View></View>{visitorMatch.status === 'waiting' ? <><TextInput value={visitorReason} onChangeText={setVisitorReason} placeholder="Ret sebebi (yalnızca reddederken)" placeholderTextColor={colors.textMuted} style={s.input} /><View style={s.actions}><Small title="Reddet" tone={colors.red} onPress={() => void decideVisitor(visitorMatch, 'rejected')} /><Small title="Giriş Verildi" tone={colors.green} onPress={() => void decideVisitor(visitorMatch, 'completed')} /></View></> : visitorMatch.status === 'approved' ? <Small title="Girişi Tamamla" tone={colors.green} onPress={() => void decideVisitor(visitorMatch, 'completed')} /> : null}</Panel> : <EmptyState icon="search" title="Aktif misafir kodu bulunamadı" description="Kod yanlış, tamamlanmış, reddedilmiş veya iptal edilmiş olabilir." /> : <EmptyState icon="keypad-outline" title="Kodu bekliyor" description="Ziyaretçi geçişi bilgilerini görmek için misafirin verdiği 6 haneli kodu girin." />}
      </>}
    </ScrollView>

    <Modal visible={Boolean(codePass)} transparent animationType="fade" onRequestClose={() => !cardCodeWorking && setCodePass(undefined)}>
      <SafeAreaView style={s.modalOverlay} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.codeModal}>
          <View style={s.modalIcon}><Ionicons name="keypad" size={34} color={colors.purple} /></View>
          <Text style={s.modalEyebrow}>GÜVENLİ KOD DOĞRULAMA</Text>
          <Text style={s.modalTitle}>Kodu Eşleştir</Text>
          <Text style={s.modalText}>{codePass?.courierName} tarafından verilen 6 haneli geçiş kodunu girin.</Text>
          <View style={s.passSummary}><Ionicons name="navigate" size={19} color={colors.cyan} /><Text style={s.passSummaryText}>{codePass?.site} • {codePass?.gate} • Daire {codePass?.apartment}</Text></View>
          <TextInput autoFocus value={cardCode} onChangeText={(value) => { setCardCode(value.replace(/\D/g, '').slice(0, 6)); setCardCodeError(''); }} keyboardType="number-pad" maxLength={6} style={[s.modalInput, cardCodeError ? s.modalInputError : null]} placeholder="000000" placeholderTextColor={colors.textMuted} />
          {cardCodeError ? <View style={s.errorBox}><Ionicons name="warning" size={17} color={colors.red} /><Text style={s.errorBoxText}>{cardCodeError}</Text></View> : null}
          <View style={s.modalActions}><AnimatedPressable containerStyle={s.modalActionWrap} disabled={cardCodeWorking} onPress={() => setCodePass(undefined)}><View style={s.cancelButton}><Text style={s.cancelText}>VAZGEÇ</Text></View></AnimatedPressable><AnimatedPressable containerStyle={s.modalActionWrap} disabled={cardCodeWorking} onPress={() => void verifyCardCode()}><LinearGradient colors={gradients.success} style={s.confirmButton}><Ionicons name="checkmark-done" size={21} color={colors.background} /><Text style={s.confirmText}>{cardCodeWorking ? 'EŞLEŞTİRİLİYOR' : 'EŞLEŞTİR'}</Text></LinearGradient></AnimatedPressable></View>
        </View>
      </SafeAreaView>
    </Modal>

    <Modal visible={Boolean(successPass)} transparent animationType="fade" onRequestClose={() => setSuccessPass(undefined)}>
      <SafeAreaView style={s.modalOverlay} edges={['top', 'bottom', 'left', 'right']}>
        <LinearGradient colors={['rgba(20,84,76,.99)', 'rgba(18,45,70,.99)', 'rgba(28,36,87,.99)']} style={s.successModal}>
          <View style={s.successIcon}><Ionicons name="checkmark-done" size={48} color={colors.green} /></View>
          <Text style={s.successKicker}>GÜVENLİ GEÇİŞ ONAYLANDI</Text>
          <Text style={s.successTitle}>Eşleşme Gerçekleşti</Text>
          <Text style={s.successText}>{successPass?.courierName} için kod doğrulandı. Geçiş tamamlandı ve işlem kayıt altına alındı.</Text>
          <View style={s.successDetail}><Ionicons name="business" size={19} color={colors.cyan} /><Text style={s.successDetailText}>{successPass?.site} • {successPass?.gate} • Daire {successPass?.apartment}</Text></View>
          <AnimatedPressable onPress={() => setSuccessPass(undefined)}><View style={s.doneButton}><Text style={s.doneText}>TAMAM</Text><Ionicons name="arrow-forward" size={20} color={colors.background} /></View></AnimatedPressable>
        </LinearGradient>
      </SafeAreaView>
    </Modal>
  </>;
}

function Choice({ active, label, sub, onPress }: { active: boolean; label: string; sub?: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress}><View style={[s.choice, active && s.active]}><Ionicons name="enter" size={17} color={active ? colors.green : colors.textMuted} /><View><Text style={s.choiceTitle}>{label}</Text>{sub ? <Text style={s.choiceSub}>{sub}</Text> : null}</View></View></AnimatedPressable>; }
function Small({ title, tone, onPress }: { title: string; tone: string; onPress: () => void }) { return <AnimatedPressable containerStyle={s.actionWrap} onPress={onPress}><View style={[s.small, { borderColor: `${tone}70`, backgroundColor: `${tone}12` }]}><Text style={[s.smallText, { color: tone }]}>{title}</Text></View></AnimatedPressable>; }

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 19 },
  header: { minHeight: 92, justifyContent: 'center', paddingRight: 72 }, headerCopy: { flex: 1 }, eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' }, eyebrow: { color: colors.green, fontSize: 11, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 5 }, sub: { color: colors.textSoft, fontSize: 12, marginTop: 4 }, copy: { flex: 1 },
  hero: { borderRadius: radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }, heroIcon: { width: 64, height: 64, borderRadius: 21, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' }, heroLabel: { color: 'rgba(255,255,255,.78)', fontSize: 11, fontWeight: '900' }, heroValue: { color: colors.white, fontSize: 30, fontWeight: '900' }, heroText: { color: 'rgba(255,255,255,.84)', fontSize: 12, marginTop: 3 }, metrics: { flexDirection: 'row', gap: 8 },
  modeRow: { flexDirection: 'row', gap: 9 }, modeWrap: { flex: 1 }, mode: { height: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, modeActive: { borderColor: colors.green, backgroundColor: 'rgba(67,231,162,.10)' }, modeText: { color: colors.textMuted, fontSize: 13, fontWeight: '900' }, modeTextActive: { color: colors.green },
  lookup: { gap: 10, borderColor: 'rgba(139,107,255,.45)' }, lookupTitle: { color: colors.text, fontSize: 14, fontWeight: '900', textAlign: 'center' }, lookupRow: { flexDirection: 'row', gap: 8 }, codeInput: { flex: 1, height: 60, borderRadius: 17, borderWidth: 1, borderColor: colors.purple, color: colors.text, fontSize: 25, fontWeight: '900', letterSpacing: 6, textAlign: 'center' }, searchButton: { width: 110, height: 60, borderRadius: 17, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', gap: 2 }, searchText: { color: colors.background, fontSize: 9, fontWeight: '900' }, match: { gap: 9 }, verify: { height: 55, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, verifyText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  horizontal: { gap: 8, paddingRight: 10 }, choice: { minWidth: 135, height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10 }, choiceTitle: { color: colors.text, fontSize: 12, fontWeight: '900' }, choiceSub: { color: colors.textSoft, fontSize: 9, marginTop: 2 },
  filters: { flexDirection: 'row', gap: 7 }, filterWrap: { flex: 1 }, filter: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }, active: { borderColor: colors.green, backgroundColor: 'rgba(67,231,162,.09)' }, filterText: { color: colors.textMuted, fontSize: 9, fontWeight: '900', textAlign: 'center' }, activeText: { color: colors.green }, list: { gap: 15 }, passWrap: { gap: 9 },
  airInfo: { flexDirection: 'row', alignItems: 'center', gap: 9, borderColor: 'rgba(55,216,255,.36)' }, airTitle: { color: colors.cyan, fontSize: 13, fontWeight: '900' }, airText: { color: colors.textSoft, fontSize: 11, marginTop: 3 }, actions: { flexDirection: 'row', gap: 8 }, actionWrap: { flex: 1 }, small: { minHeight: 50, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 }, smallText: { fontSize: 11, fontWeight: '900', textAlign: 'center' }, rejectPanel: { gap: 9, borderColor: 'rgba(255,101,125,.36)' }, input: { height: 49, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 11, fontSize: 13 }, waitCode: { flex: 1, minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(139,107,255,.45)', backgroundColor: 'rgba(139,107,255,.10)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, waitCodeText: { color: colors.purple, fontSize: 10, fontWeight: '900' },
  visitorLookup: { gap: 9 }, visitorCode: { height: 66, borderRadius: 18, borderWidth: 1, borderColor: colors.green, color: colors.text, fontSize: 30, fontWeight: '900', letterSpacing: 8, textAlign: 'center' }, visitorCard: { gap: 12, borderColor: 'rgba(67,231,162,.38)' }, visitorTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, visitorIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(67,231,162,.13)', alignItems: 'center', justifyContent: 'center' }, visitorName: { color: colors.text, fontSize: 17, fontWeight: '900' }, visitorMeta: { color: colors.textSoft, fontSize: 11, marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,8,16,.86)', alignItems: 'center', justifyContent: 'center', padding: 18 }, codeModal: { width: '100%', maxWidth: 430, borderRadius: 28, backgroundColor: 'rgba(11,29,49,.99)', borderWidth: 1, borderColor: 'rgba(139,107,255,.62)', padding: 21, alignItems: 'center', overflow: 'hidden' }, modalIcon: { width: 72, height: 72, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(139,107,255,.55)', backgroundColor: 'rgba(139,107,255,.14)', alignItems: 'center', justifyContent: 'center' }, modalEyebrow: { color: colors.purple, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginTop: 14 }, modalTitle: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 5 }, modalText: { color: colors.textSoft, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 }, passSummary: { width: '100%', minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(55,216,255,.06)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, marginTop: 15 }, passSummaryText: { flex: 1, color: colors.cyan, fontSize: 11, fontWeight: '800' }, modalInput: { width: '100%', height: 72, borderRadius: 19, borderWidth: 2, borderColor: colors.purple, color: colors.text, fontSize: 31, fontWeight: '900', letterSpacing: 9, textAlign: 'center', marginTop: 14, backgroundColor: 'rgba(139,107,255,.08)' }, modalInputError: { borderColor: colors.red, backgroundColor: 'rgba(255,101,125,.08)' }, errorBox: { width: '100%', minHeight: 44, borderRadius: 14, backgroundColor: 'rgba(255,101,125,.10)', borderWidth: 1, borderColor: 'rgba(255,101,125,.4)', flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, marginTop: 10 }, errorBoxText: { flex: 1, color: colors.red, fontSize: 11, fontWeight: '800' }, modalActions: { width: '100%', flexDirection: 'row', gap: 9, marginTop: 16 }, modalActionWrap: { flex: 1 }, cancelButton: { height: 55, borderRadius: 17, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.textSoft, fontSize: 11, fontWeight: '900' }, confirmButton: { height: 55, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, confirmText: { color: colors.background, fontSize: 11, fontWeight: '900' },
  successModal: { width: '100%', maxWidth: 430, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(67,231,162,.55)', padding: 24, alignItems: 'center', overflow: 'hidden' }, successIcon: { width: 88, height: 88, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(67,231,162,.6)', backgroundColor: 'rgba(67,231,162,.12)', alignItems: 'center', justifyContent: 'center' }, successKicker: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 16 }, successTitle: { color: colors.white, fontSize: 28, fontWeight: '900', textAlign: 'center', marginTop: 6 }, successText: { color: 'rgba(255,255,255,.78)', fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 10 }, successDetail: { width: '100%', minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(55,216,255,.35)', backgroundColor: 'rgba(55,216,255,.08)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11, marginTop: 17 }, successDetailText: { flex: 1, color: colors.cyan, fontSize: 11, fontWeight: '800' }, doneButton: { width: 190, height: 55, borderRadius: 18, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 19 }, doneText: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
