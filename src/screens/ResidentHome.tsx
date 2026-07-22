import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { PassCard } from '../components/PassCard';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';

export function ResidentHome({ onOpenProfile }: { onOpenProfile: () => void }) {
  const gate = useGate();
  const resident = gate.residentProfiles.find((x) => x.userId === gate.user?.id && x.isActive);
  const site = gate.sites.find((x) => x.id === resident?.siteId);
  const incoming = gate.passes.filter((x) => x.siteId === resident?.siteId && !['completed', 'rejected', 'cancelled', 'expired'].includes(x.status));
  const visitors = gate.visitors.filter((x) => x.residentUserId === gate.user?.id);
  const charges = gate.duesCharges.filter((x) => x.residentUserId === gate.user?.id);
  const unpaid = charges.filter((x) => x.status === 'unpaid');
  const unread = gate.notifications.filter((x) => !x.readAt);
  const income = gate.financeTransactions.filter((x) => x.transactionType === 'income').reduce((a, b) => a + b.amount, 0);
  const expense = gate.financeTransactions.filter((x) => x.transactionType === 'expense').reduce((a, b) => a + b.amount, 0);
  const debt = useMemo(() => unpaid.reduce((a, b) => a + b.amount, 0), [unpaid]);
  const [siteId, setSiteId] = useState(gate.sites[0]?.id ?? '');
  const [block, setBlock] = useState(''); const [floor, setFloor] = useState(''); const [apartment, setApartment] = useState(''); const [addressNote, setAddressNote] = useState('');
  const [guestName, setGuestName] = useState(''); const [guestPhone, setGuestPhone] = useState(''); const [plate, setPlate] = useState(''); const [note, setNote] = useState('');

  const saveAddress = async () => {
    if (!siteId || !block.trim() || !floor.trim() || !apartment.trim()) return Alert.alert('Eksik bilgi', 'Site, blok, kat ve daire zorunludur.');
    try { await gate.upsertResidentProfile({ siteId, block, floor, apartment, addressNote }); Alert.alert('Kayıt tamamlandı', 'Yalnızca olumlu kurye eşleşmeleri gösterilecek.'); }
    catch (e) { Alert.alert('Kaydedilemedi', e instanceof Error ? e.message : 'Tekrar dene.'); }
  };

  const addVisitor = async () => {
    if (!resident || !guestName.trim()) return Alert.alert('Eksik bilgi', 'Misafir adı soyadı zorunludur.');
    try {
      const result = await gate.createVisitor({ siteId: resident.siteId, guestName, guestPhone, plate, note });
      const rules = gate.rules.filter((x) => x.siteId === resident.siteId && x.scopeType === 'site' && ['all', 'visitor'].includes(x.audience));
      await Promise.all(rules.map((x) => gate.acceptRule(x.id, 'visitor', result.id)));
      setGuestName(''); setGuestPhone(''); setPlate(''); setNote(''); Alert.alert('VisitorPass hazır', `Misafir kodu: ${result.code}`);
    } catch (e) { Alert.alert('Oluşturulamadı', e instanceof Error ? e.message : 'Tekrar dene.'); }
  };

  if (!resident) return <ScrollView contentContainerStyle={s.content}><Header title="Adresini tanımla" sub="Site sakini kaydı" /><Panel style={s.form} gradient><Text style={s.label}>ANLAŞMALI SİTE</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}>{gate.sites.map((x) => <AnimatedPressable key={x.id} onPress={() => setSiteId(x.id)}><View style={[s.choice, siteId === x.id && s.active]}><Ionicons name={x.isDemo ? 'flask' : 'business'} size={18} color={siteId === x.id ? colors.orange : colors.textMuted} /><Text style={s.choiceText}>{x.name}</Text></View></AnimatedPressable>)}</ScrollView><View style={s.row}><Field label="Blok" value={block} onChangeText={setBlock} /><Field label="Kat" value={floor} onChangeText={setFloor} /><Field label="Daire" value={apartment} onChangeText={setApartment} /></View><Field label="Adres açıklaması (opsiyonel)" value={addressNote} onChangeText={setAddressNote} /><Action title="SAKİN KAYDIMI OLUŞTUR" icon="home" onPress={() => void saveAddress()} /></Panel><AnimatedPressable onPress={onOpenProfile}><View style={s.link}><Text style={s.linkText}>Profil ve demo ayarları</Text></View></AnimatedPressable></ScrollView>;

  return <ScrollView refreshControl={<RefreshControl refreshing={gate.refreshing} onRefresh={() => void gate.refresh()} tintColor={colors.orange} />} contentContainerStyle={s.content}>
    <View style={s.header}><View><Text style={s.eyebrow}>SİTE SAKİNİ MERKEZİ</Text><Text style={s.title}>{gate.profile?.fullName.split(' ')[0] || 'Sakin'} 👋</Text><Text style={s.sub}>{site?.name} • {resident.block} / Kat {resident.floor} / Daire {resident.apartment}</Text></View><LiveBadge label="SAKİN" /></View>
    <LinearGradient colors={gradients.management} style={s.hero}><View><Text style={s.heroLabel}>GÜNCEL AİDAT BORCU</Text><Text style={s.heroValue}>{debt.toLocaleString('tr-TR')} TL</Text><Text style={s.heroText}>{unpaid.length} ödenmemiş kayıt</Text></View><Ionicons name="wallet" size={42} color={colors.white} /></LinearGradient>
    <View style={s.metrics}><MetricCard label="Gelen kurye" value={String(incoming.length)} icon="navigate" tone={colors.cyan} /><MetricCard label="Misafir" value={String(visitors.filter((x) => ['waiting', 'approved'].includes(x.status)).length)} icon="people" tone={colors.green} /><MetricCard label="Bildirim" value={String(unread.length)} icon="notifications" tone={colors.orange} /></View>

    <SectionTitle title="Adresime gelen kuryeler" />{incoming.length ? <View style={s.list}>{incoming.map((x) => <PassCard key={x.id} pass={x} />)}</View> : <EmptyState icon="home-outline" title="Aktif kurye yok" description="Sadece adresinizle olumlu eşleşen CourierPass kayıtları burada görünür." />}

    <SectionTitle title="VisitorPass" /><Panel style={s.form} gradient><Field label="Misafir adı soyadı" value={guestName} onChangeText={setGuestName} /><View style={s.row}><Field label="Telefon (opsiyonel)" value={guestPhone} onChangeText={setGuestPhone} /><Field label="Plaka (opsiyonel)" value={plate} onChangeText={setPlate} autoCapitalize="characters" /></View><Field label="Not (opsiyonel)" value={note} onChangeText={setNote} /><Action title="MİSAFİR KODU OLUŞTUR" icon="person-add" onPress={() => void addVisitor()} /></Panel><View style={s.list}>{visitors.slice(0, 5).map((x) => <Panel key={x.id} style={s.item} gradient><Ionicons name="person" size={23} color={colors.green} /><View style={s.copy}><Text style={s.itemTitle}>{x.guestName}</Text><Text style={s.itemSub}>{x.plate || 'Plaka yok'} • {x.status.toUpperCase()}</Text></View><View><Text style={s.codeLabel}>MİSAFİR KODU</Text><Text style={s.code}>{x.visitorCode}</Text></View></Panel>)}</View>

    <SectionTitle title="Aidat ve geçmiş ödemeler" />{charges.length ? <View style={s.list}>{charges.map((x) => <Panel key={x.id} style={s.item} gradient><Ionicons name={x.status === 'paid' ? 'checkmark-circle' : 'alert-circle'} size={25} color={x.status === 'paid' ? colors.green : colors.orange} /><View style={s.copy}><Text style={s.itemTitle}>{x.block} / Daire {x.apartment}</Text><Text style={s.itemSub}>{x.status === 'paid' ? 'Ödendi' : 'Ödenmedi • otomatik hatırlatma açık'}{x.paymentNote ? ` • ${x.paymentNote}` : ''}</Text></View><Text style={[s.money, { color: x.status === 'paid' ? colors.green : colors.orange }]}>{x.amount.toLocaleString('tr-TR')} TL</Text></Panel>)}</View> : <EmptyState icon="wallet-outline" title="Aidat kaydı yok" description="Yönetim aidat dönemi oluşturduğunda burada görünür." />}

    <SectionTitle title="Gelir-gider özeti" />{gate.financeTransactions.length ? <Panel gradient><View style={s.summary}><Summary label="GELİR" value={income} tone={colors.green} /><Summary label="GİDER" value={expense} tone={colors.red} /><Summary label="BAKİYE" value={income - expense} tone={colors.cyan} /></View>{gate.financeTransactions.slice(0, 5).map((x) => <View key={x.id} style={s.finance}><Ionicons name={x.transactionType === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'} size={20} color={x.transactionType === 'income' ? colors.green : colors.red} /><View style={s.copy}><Text style={s.itemTitle}>{x.description}</Text><Text style={s.itemSub}>{x.category} • {x.transactionDate}</Text></View><Text style={{ color: x.transactionType === 'income' ? colors.green : colors.red, fontWeight: '900' }}>{x.amount.toLocaleString('tr-TR')} TL</Text></View>)}</Panel> : <EmptyState icon="eye-off-outline" title="Finans özeti paylaşılmıyor" description="Yönetim görünürlüğü açtığında özet burada görünür." />}

    <SectionTitle title="Bildirimler" />{gate.notifications.length ? <View style={s.list}>{gate.notifications.slice(0, 8).map((x) => <AnimatedPressable key={x.id} onPress={() => !x.readAt && void gate.markNotificationRead(x.id)}><Panel style={[s.item, !x.readAt && s.unread]} gradient><Ionicons name="notifications" size={22} color={!x.readAt ? colors.orange : colors.textMuted} /><View style={s.copy}><Text style={s.itemTitle}>{x.title}</Text><Text style={s.itemSub}>{x.body}</Text></View></Panel></AnimatedPressable>)}</View> : <EmptyState icon="notifications-outline" title="Bildirim yok" description="Kurye, misafir ve aidat hareketleri burada görünür." />}
  </ScrollView>;
}

function Header({ title, sub }: { title: string; sub: string }) { return <FadeInView style={s.header}><View><Text style={s.eyebrow}>SİTE SAKİNİ</Text><Text style={s.title}>{title}</Text><Text style={s.sub}>{sub}</Text></View><LiveBadge label="v0.2" /></FadeInView>; }
function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View style={s.field}><Text style={s.label}>{label}</Text><TextInput {...props} style={s.input} placeholderTextColor={colors.textMuted} /></View>; }
function Action({ title, icon, onPress }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void }) { return <AnimatedPressable onPress={onPress}><LinearGradient colors={gradients.success} style={s.action}><Ionicons name={icon} size={20} color={colors.background} /><Text style={s.actionText}>{title}</Text></LinearGradient></AnimatedPressable>; }
function Summary({ label, value, tone }: { label: string; value: number; tone: string }) { return <View><Text style={s.sumLabel}>{label}</Text><Text style={[s.sumValue, { color: tone }]}>{value.toLocaleString('tr-TR')} TL</Text></View>; }

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 18 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, eyebrow: { color: colors.orange, fontSize: 12, fontWeight: '900', letterSpacing: 1 }, title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 }, sub: { color: colors.textSoft, fontSize: 12, marginTop: 4 }, hero: { borderRadius: radius.xl, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, heroLabel: { color: 'rgba(255,255,255,.75)', fontSize: 10, fontWeight: '900' }, heroValue: { color: colors.white, fontSize: 31, fontWeight: '900', marginTop: 3 }, heroText: { color: 'rgba(255,255,255,.82)', fontSize: 12, marginTop: 3 }, metrics: { flexDirection: 'row', gap: 8 }, form: { gap: 11 }, row: { flexDirection: 'row', gap: 8 }, field: { flex: 1 }, label: { color: colors.textSoft, fontSize: 10, fontWeight: '900', marginBottom: 6 }, input: { height: 49, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 10, fontSize: 13 }, choice: { minWidth: 145, height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, marginRight: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7 }, active: { borderColor: colors.orange, backgroundColor: 'rgba(255,179,92,.1)' }, choiceText: { color: colors.text, fontSize: 12, fontWeight: '900' }, action: { height: 53, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionText: { color: colors.background, fontSize: 12, fontWeight: '900' }, link: { height: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, linkText: { color: colors.cyan, fontSize: 12, fontWeight: '900' }, list: { gap: 9 }, item: { flexDirection: 'row', alignItems: 'center', gap: 10 }, copy: { flex: 1 }, itemTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, itemSub: { color: colors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 3 }, codeLabel: { color: colors.green, fontSize: 8, fontWeight: '900' }, code: { color: colors.text, fontSize: 19, fontWeight: '900', letterSpacing: 1.2 }, money: { fontSize: 13, fontWeight: '900' }, summary: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: colors.border }, sumLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900' }, sumValue: { fontSize: 13, fontWeight: '900', marginTop: 3 }, finance: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 8, borderBottomWidth: 1, borderBottomColor: colors.border }, unread: { borderColor: 'rgba(255,179,92,.45)' },
});
