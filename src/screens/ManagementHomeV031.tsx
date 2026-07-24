import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DateField } from '../components/DateField';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { GateMapPoint, SiteLocationPicker } from '../components/SiteLocationPicker';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { addSiteMember, updateGateSite, upsertSiteGate } from '../lib/managementActions';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { PassStatus, RuleAudience, RuleScope } from '../types';

type Tab = 'overview' | 'setup' | 'rules' | 'finance';
type MemberRole = 'security' | 'manager' | 'resident';
type DuesScope = 'site' | 'block' | 'apartment';

type SiteMember = {
  id: string;
  site_id: string;
  user_id: string;
  email: string;
  full_name: string;
  phone?: string | null;
  role: 'owner' | MemberRole;
  block?: string | null;
  floor?: string | null;
  apartment?: string | null;
  is_active: boolean;
  created_at: string;
};

const statusNames: Record<PassStatus, string> = {
  waiting: 'Onay bekliyor', approved: 'Onaylandı', rejected: 'Reddedildi', arrived: 'Kapıda', completed: 'Tamamlandı', cancelled: 'İptal edildi', expired: 'Süresi doldu',
};
const memberRoleName = (role: SiteMember['role']) => role === 'owner' ? 'Site sahibi' : role === 'manager' ? 'Yönetici' : role === 'security' ? 'Güvenlik' : 'Site sakini';
const audienceName = (audience: RuleAudience) => audience === 'courier' ? 'Kurye' : audience === 'visitor' ? 'Misafir' : 'Tümü';

export function ManagementHomeV031() {
  const gate = useGate();
  const [tab, setTab] = useState<Tab>('overview');
  const [managedSiteIds, setManagedSiteIds] = useState<string[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const managedSites = useMemo(() => gate.sites.filter((item) => managedSiteIds.includes(item.id)), [gate.sites, managedSiteIds]);
  const site = managedSites.find((item) => item.id === selectedSiteId) ?? managedSites[0];
  const siteId = site?.id ?? '';

  const loadManagedSites = useCallback(async () => {
    const { data, error } = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
    if (error) throw error;
    const ids = Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : [];
    setManagedSiteIds(ids);
    setSelectedSiteId((current) => current && ids.includes(current) ? current : ids[0] ?? '');
  }, []);

  const loadMembers = useCallback(async (targetSiteId: string) => {
    if (!targetSiteId) return setMembers([]);
    setMembersLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_list_site_members', { p_site_id: targetSiteId });
      if (error) throw error;
      setMembers(Array.isArray(data) ? data as SiteMember[] : []);
    } catch (error) {
      setMembers([]);
      Alert.alert('Site kullanıcıları alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setMembersLoading(false);
    }
  }, []);

  useEffect(() => { void loadManagedSites().catch(() => undefined); }, [loadManagedSites, gate.sites.length]);
  useEffect(() => { void loadMembers(siteId); }, [loadMembers, siteId]);

  const siteGates = useMemo(() => gate.gates.filter((item) => item.siteId === siteId), [gate.gates, siteId]);
  const siteRules = useMemo(() => gate.rules.filter((item) => item.siteId === siteId), [gate.rules, siteId]);
  const sitePasses = useMemo(() => gate.passes.filter((item) => item.siteId === siteId), [gate.passes, siteId]);
  const siteVisitors = useMemo(() => gate.visitors.filter((item) => item.siteId === siteId), [gate.visitors, siteId]);
  const siteCharges = useMemo(() => gate.duesCharges.filter((item) => item.siteId === siteId), [gate.duesCharges, siteId]);
  const siteFinance = useMemo(() => gate.financeTransactions.filter((item) => item.siteId === siteId), [gate.financeTransactions, siteId]);

  const today = new Date().toISOString().slice(0, 10);
  const todayPasses = sitePasses.filter((item) => item.createdAt.startsWith(today));
  const waiting = sitePasses.filter((item) => item.status === 'waiting').length;
  const completed = sitePasses.filter((item) => item.status === 'completed').length;
  const unpaidTotal = siteCharges.filter((item) => item.status === 'unpaid').reduce((sum, item) => sum + item.amount, 0);
  const income = siteFinance.filter((item) => item.transactionType === 'income').reduce((sum, item) => sum + item.amount, 0);
  const expense = siteFinance.filter((item) => item.transactionType === 'expense').reduce((sum, item) => sum + item.amount, 0);

  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [city, setCity] = useState('');
  const [siteLocation, setSiteLocation] = useState<GateMapPoint>();
  const [gateName, setGateName] = useState('');
  const [stage, setStage] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [smartEntryEnabled, setSmartEntryEnabled] = useState(true);
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('security');
  const [memberBlock, setMemberBlock] = useState('');
  const [memberFloor, setMemberFloor] = useState('');
  const [memberApartment, setMemberApartment] = useState('');
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleBody, setRuleBody] = useState('');
  const [ruleAudience, setRuleAudience] = useState<RuleAudience>('courier');
  const [ruleScope, setRuleScope] = useState<RuleScope>('site');
  const [ruleGateId, setRuleGateId] = useState('');
  const [ruleCritical, setRuleCritical] = useState(false);
  const [ruleStart, setRuleStart] = useState(new Date().toISOString());
  const [ruleEnd, setRuleEnd] = useState('');
  const [editingRuleId, setEditingRuleId] = useState<string>();

  const now = new Date();
  const [duesTitle, setDuesTitle] = useState(`${now.toLocaleString('tr-TR', { month: 'long' })} ${now.getFullYear()} Aidatı`);
  const [duesYear, setDuesYear] = useState(String(now.getFullYear()));
  const [duesMonth, setDuesMonth] = useState(String(now.getMonth() + 1));
  const [dueDate, setDueDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString());
  const [duesScope, setDuesScope] = useState<DuesScope>('site');
  const [duesBlock, setDuesBlock] = useState('');
  const [duesApartment, setDuesApartment] = useState('');
  const [duesAmount, setDuesAmount] = useState('1500');
  const [paymentNote, setPaymentNote] = useState('');
  const [financeType, setFinanceType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Bakım');
  const [description, setDescription] = useState('');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeDate, setFinanceDate] = useState(new Date().toISOString());
  const [financeVisible, setFinanceVisible] = useState(true);

  useEffect(() => {
    if (!site) return;
    setSiteName(site.name);
    setSiteAddress(site.address ?? '');
    setCity(site.city ?? '');
    setSiteLocation(site.latitude != null && site.longitude != null ? { latitude: site.latitude, longitude: site.longitude } : undefined);
  }, [site?.id, site?.name, site?.address, site?.city, site?.latitude, site?.longitude]);

  const perform = async (work: () => Promise<unknown>, success: string, after?: () => Promise<void>) => {
    try {
      await work();
      await gate.refresh();
      if (after) await after();
      Alert.alert('Tamamlandı', success);
    } catch (error) {
      Alert.alert('İşlem yapılamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  };

  const saveSite = () => {
    if (!siteId) return Alert.alert('Site bulunamadı', 'Onaylanan sitenin oluşması için ekranı yenile.');
    if (!siteName.trim() || !siteAddress.trim() || !siteLocation) return Alert.alert('Eksik bilgi', 'Site adı, adresi ve harita pini gerekli.');
    void perform(() => updateGateSite({ siteId, name: siteName.trim(), address: siteAddress.trim(), city: city.trim(), latitude: siteLocation.latitude, longitude: siteLocation.longitude }), 'Site bilgileri ve harita konumu güncellendi.', loadManagedSites);
  };

  const createGate = () => {
    if (!siteId || !gateName.trim()) return Alert.alert('Eksik bilgi', 'Site ve kapı adı gerekli.');
    void perform(async () => {
      await upsertSiteGate({ siteId, name: gateName.trim(), stage: stage.trim(), entryPoint: entryPoint.trim(), latitude: siteLocation?.latitude, longitude: siteLocation?.longitude, airpassEnabled: smartEntryEnabled });
      setGateName(''); setStage(''); setEntryPoint('');
    }, 'Kapı ve akıllı geçiş ayarları kaydedildi.');
  };

  const saveMember = () => {
    if (!siteId || !memberEmail.trim()) return Alert.alert('Eksik bilgi', 'Kayıtlı kullanıcı e-postası gerekli.');
    if (memberRole === 'resident' && (!memberBlock.trim() || !memberFloor.trim() || !memberApartment.trim())) return Alert.alert('Eksik adres', 'Site sakini için blok, kat ve daire gerekli.');
    void perform(async () => {
      await addSiteMember({ siteId, email: memberEmail.trim(), role: memberRole, block: memberRole === 'resident' ? memberBlock.trim() : undefined, floor: memberRole === 'resident' ? memberFloor.trim() : undefined, apartment: memberRole === 'resident' ? memberApartment.trim() : undefined });
      setMemberEmail(''); setMemberBlock(''); setMemberFloor(''); setMemberApartment('');
    }, 'Kullanıcının yeni rolü site hesabına eklendi.', () => loadMembers(siteId));
  };

  const removeMember = (member: SiteMember) => Alert.alert('Site kullanıcısını kaldır', `${member.full_name} için ${memberRoleName(member.role)} rolü kaldırılsın mı? Hesabı ve diğer rolleri korunur.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Kaldır', style: 'destructive', onPress: () => void perform(async () => { const { error } = await supabase.rpc('dkd_gate_remove_site_member', { p_membership_id: member.id }); if (error) throw error; }, 'Rol site hesabından kaldırıldı.', () => loadMembers(siteId)) },
  ]);

  const saveRule = () => {
    if (!siteId || !ruleTitle.trim() || !ruleBody.trim()) return Alert.alert('Eksik bilgi', 'Başlık ve kural metni gerekli.');
    if (ruleScope === 'gate' && !ruleGateId) return Alert.alert('Kapı seç', 'Kapı / etap kapsamı için bir kapı seç.');
    void perform(async () => {
      await gate.upsertRule({ siteId, gateId: ruleScope === 'gate' ? ruleGateId : undefined, audience: ruleAudience, scopeType: ruleScope, title: ruleTitle.trim(), body: ruleBody.trim(), startsAt: ruleStart, endsAt: ruleEnd || undefined, isCritical: ruleCritical, existingRuleId: editingRuleId });
      setRuleTitle(''); setRuleBody(''); setRuleEnd(''); setEditingRuleId(undefined);
    }, editingRuleId ? 'Yeni kural sürümü yayınlandı.' : 'Kural yayınlandı.');
  };

  const editRule = (rule: typeof siteRules[number]) => {
    setEditingRuleId(rule.id); setRuleTitle(rule.title); setRuleBody(rule.body); setRuleAudience(rule.audience); setRuleScope(rule.scopeType); setRuleGateId(rule.gateId ?? ''); setRuleCritical(rule.isCritical); setRuleStart(rule.startsAt); setRuleEnd(rule.endsAt ?? '');
  };

  const createDues = () => void perform(() => gate.createDuesPeriod({ siteId, title: duesTitle.trim(), year: Number(duesYear), month: Number(duesMonth), dueDate: dueDate.slice(0, 10), scopeType: duesScope, scopeBlock: duesScope !== 'site' ? duesBlock.trim() : undefined, scopeApartment: duesScope === 'apartment' ? duesApartment.trim() : undefined, amount: Number(duesAmount) }), 'Aidat dönemi oluşturuldu ve uygun dairelere borç işlendi.');
  const togglePayment = (chargeId: string, paid: boolean) => void perform(() => gate.markDuePaid(chargeId, !paid, paymentNote.trim()), paid ? 'Ödeme geri alındı.' : 'Aidat ödendi olarak işaretlendi.');
  const addFinance = () => void perform(async () => { await gate.addFinanceTransaction({ siteId, type: financeType, category: category.trim(), description: description.trim(), amount: Number(financeAmount), date: financeDate.slice(0, 10), visible: financeVisible }); setDescription(''); setFinanceAmount(''); }, 'Gelir veya gider kaydı eklendi.');

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={gate.refreshing} onRefresh={() => void Promise.all([gate.refresh(), loadManagedSites(), loadMembers(siteId)])} tintColor={colors.magenta} />} keyboardShouldPersistTaps="handled" keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'} automaticallyAdjustKeyboardInsets showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
      <FadeInView style={styles.header}><View style={styles.headerCopy}><Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text><Text style={styles.title}>DraBornGate v{APP_VERSION}</Text><Text style={styles.subtitle}>Kurye Geçişi • Ziyaretçi Geçişi • Kurallar • Aidat ve Finans</Text></View><LiveBadge label="CANLI" /></FadeInView>

      {managedSites.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{managedSites.map((item) => <AnimatedPressable key={item.id} onPress={() => setSelectedSiteId(item.id)}><View style={[styles.siteChoice, siteId === item.id && styles.active]}><Ionicons name={item.isDemo ? 'flask' : 'business'} size={22} color={siteId === item.id ? colors.magenta : colors.textMuted} /><View style={styles.copy}><Text style={styles.siteChoiceTitle}>{item.name}</Text><Text style={styles.siteChoiceText}>{item.city || 'Şehir belirtilmedi'}{item.isDemo ? ' • ÖRNEK' : ''}</Text></View></View></AnimatedPressable>)}</ScrollView> : <Panel style={styles.notice} gradient><Ionicons name="information-circle" size={24} color={colors.orange} /><Text style={styles.noticeText}>Henüz yönetebildiğin bir site yok. Onay yeni verildiyse ekranı aşağı çekerek yenile.</Text></Panel>}

      <View style={styles.tabs}>{(['overview', 'setup', 'rules', 'finance'] as Tab[]).map((item) => <AnimatedPressable key={item} containerStyle={styles.tabWrap} onPress={() => setTab(item)}><View style={[styles.tab, tab === item && styles.tabActive]}><Ionicons name={item === 'overview' ? 'analytics' : item === 'setup' ? 'settings' : item === 'rules' ? 'document-text' : 'wallet'} size={20} color={tab === item ? colors.magenta : colors.textMuted} /><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'overview' ? 'Özet' : item === 'setup' ? 'Kurulum' : item === 'rules' ? 'Kurallar' : 'Finans'}</Text></View></AnimatedPressable>)}</View>

      {tab === 'overview' ? site ? <>
        <LinearGradient colors={gradients.management} style={styles.hero}><View><Text style={styles.heroLabel}>BUGÜNKÜ KURYE GİRİŞİ</Text><Text style={styles.heroValue}>{todayPasses.length}</Text><Text style={styles.heroText}>{completed} tamamlanan • {waiting} onay bekleyen</Text></View><View style={styles.heroIcon}><Ionicons name="analytics" size={42} color={colors.white} /></View></LinearGradient>
        <View style={styles.metrics}><MetricCard label="Aktif kapı" value={String(siteGates.length)} icon="enter" tone={colors.cyan} /><MetricCard label="Misafir" value={String(siteVisitors.length)} icon="people" tone={colors.green} /><MetricCard label="Aidat borcu" value={`${Math.round(unpaidTotal / 1000)} B`} icon="wallet" tone={colors.orange} /></View>
        <SectionTitle title="Günlük kurye giriş kayıtları" action={new Date().toLocaleDateString('tr-TR')} />
        {todayPasses.length ? <View style={styles.list}>{todayPasses.map((item) => <Panel key={item.id} style={styles.listRow} gradient><View style={styles.listIcon}><Ionicons name={item.status === 'completed' ? 'checkmark-done' : 'time'} size={23} color={item.status === 'completed' ? colors.green : colors.orange} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{item.courierName} • {item.platform}</Text><Text style={styles.itemText}>{new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {item.gate} • {item.block}/{item.apartment} • {item.plate}</Text></View><Text style={styles.statusText}>{statusNames[item.status]}</Text></Panel>)}</View> : <EmptyState icon="calendar-outline" title="Bugün kurye kaydı yok" description="Günlük kurye geçiş hareketleri burada görünür." />}
        <SectionTitle title="Finans özeti" /><Panel gradient><View style={styles.summary}><FinanceSummary label="GELİR" value={income} tone={colors.green} /><FinanceSummary label="GİDER" value={expense} tone={colors.red} /><FinanceSummary label="BAKİYE" value={income - expense} tone={colors.cyan} /></View><View style={styles.switchRow}><View style={styles.copy}><Text style={styles.itemTitle}>Sakinlere gelir-gider özeti</Text><Text style={styles.itemText}>Kapalıysa sakinler finans özeti görmez.</Text></View><Switch value={site.financeSummaryVisible} onValueChange={(value) => void perform(() => gate.setFinanceVisibility(siteId, value), value ? 'Finans özeti açıldı.' : 'Finans özeti gizlendi.')} trackColor={{ false: colors.border, true: colors.green }} /></View></Panel>
      </> : <EmptyState icon="business-outline" title="Yönetilen site yok" description="Site Yönetimi başvurusu onaylandığında siten burada görünür." /> : null}

      {tab === 'setup' ? <>
        <SectionTitle title="Oluşan siteyi düzenle" />
        {site ? <Panel style={styles.form} gradient><View style={styles.noticeInline}><Ionicons name="checkmark-circle" size={23} color={colors.green} /><Text style={styles.noticeText}>Site, kayıt sırasında verdiğin bilgilerle otomatik oluşturuldu. Buradan ayrıntıları ve harita pinini güncelle.</Text></View><Field label="Site / Apartman adı" value={siteName} onChangeText={setSiteName} /><Field label="Site adresi" value={siteAddress} onChangeText={setSiteAddress} multiline /><Field label="Şehir" value={city} onChangeText={setCity} /><SiteLocationPicker value={siteLocation} address={siteAddress} city={city} onChange={setSiteLocation} /><ActionButton title="SİTEYİ GÜNCELLE" icon="save" onPress={saveSite} disabled={!siteName.trim() || !siteAddress.trim() || !siteLocation} /></Panel> : <Panel style={styles.notice} gradient><Ionicons name="sync" size={24} color={colors.orange} /><Text style={styles.noticeText}>Onaylanan başvuruya ait site hazırlanıyor. Ekranı aşağı çekerek yenile.</Text></Panel>}
        {site ? <><SectionTitle title="Kapı ve etap" /><Panel style={styles.form} gradient><Field label="Kapı adı" value={gateName} onChangeText={setGateName} /><View style={styles.row}><Field label="Etap / blok" value={stage} onChangeText={setStage} /><Field label="Giriş noktası" value={entryPoint} onChangeText={setEntryPoint} /></View><View style={styles.switchRow}><View style={styles.copy}><Text style={styles.itemTitle}>Akıllı geçiş</Text><Text style={styles.itemText}>Site pinini kapı konumu için başlangıç noktası olarak kullanır.</Text></View><Switch value={smartEntryEnabled} onValueChange={setSmartEntryEnabled} trackColor={{ false: colors.border, true: colors.green }} /></View><ActionButton title="KAPIYI EKLE" icon="enter" onPress={createGate} disabled={!gateName.trim()} /></Panel>
        <SectionTitle title="Site kullanıcıları" action={membersLoading ? 'Yükleniyor' : `${members.length} kişi`} /><Panel style={styles.form} gradient><Field label="Kayıtlı hesap e-postası" value={memberEmail} onChangeText={setMemberEmail} keyboardType="email-address" autoCapitalize="none" /><ChoiceRow values={['security', 'manager', 'resident']} value={memberRole} labels={['Güvenlik', 'Yönetici', 'Site Sakini']} onChange={(value) => setMemberRole(value as MemberRole)} />{memberRole === 'resident' ? <View style={styles.row}><Field label="Blok" value={memberBlock} onChangeText={setMemberBlock} /><Field label="Kat" value={memberFloor} onChangeText={setMemberFloor} /><Field label="Daire" value={memberApartment} onChangeText={setMemberApartment} /></View> : null}<ActionButton title="ROLÜ HESABA EKLE" icon="person-add" onPress={saveMember} disabled={!memberEmail.trim()} /></Panel>
        <View style={styles.list}>{members.map((member) => <Panel key={member.id} style={styles.listRow} gradient><View style={styles.listIcon}><Ionicons name={member.role === 'resident' ? 'home' : member.role === 'security' ? 'shield-checkmark' : 'person'} size={22} color={member.role === 'resident' ? colors.orange : member.role === 'security' ? colors.green : colors.magenta} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{member.full_name}</Text><Text style={styles.itemText}>{memberRoleName(member.role)} • {member.email}{member.role === 'resident' ? ` • ${member.block}/${member.floor}/${member.apartment}` : ''}</Text></View>{member.role !== 'owner' ? <AnimatedPressable onPress={() => removeMember(member)}><Ionicons name="trash" size={21} color={colors.red} /></AnimatedPressable> : null}</Panel>)}</View></> : null}
      </> : null}

      {tab === 'rules' ? <>
        <SectionTitle title={editingRuleId ? 'Yeni kural sürümü' : 'Kural yayınla'} /><Panel style={styles.form} gradient><Field label="Başlık" value={ruleTitle} onChangeText={setRuleTitle} /><Field label="Kural metni" value={ruleBody} onChangeText={setRuleBody} multiline /><Text style={styles.groupLabel}>KİME GÖSTERİLECEK</Text><ChoiceRow values={['courier', 'visitor', 'all']} value={ruleAudience} labels={['Kurye', 'Misafir', 'Tümü']} onChange={(value) => setRuleAudience(value as RuleAudience)} /><Text style={styles.groupLabel}>KAPSAM</Text><ChoiceRow values={['site', 'gate']} value={ruleScope} labels={['Site geneli', 'Kapı / etap']} onChange={(value) => setRuleScope(value as RuleScope)} />{ruleScope === 'gate' ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>{siteGates.map((item) => <AnimatedPressable key={item.id} onPress={() => setRuleGateId(item.id)}><View style={[styles.choice, ruleGateId === item.id && styles.choiceActive]}><Text style={[styles.choiceText, ruleGateId === item.id && styles.choiceTextActive]}>{item.name}</Text></View></AnimatedPressable>)}</ScrollView> : null}<View style={styles.dateStack}><DateField label="Başlangıç tarihi" value={ruleStart} onChange={setRuleStart} /><DateField label="Bitiş tarihi (isteğe bağlı)" value={ruleEnd} onChange={setRuleEnd} optional /></View><View style={styles.switchRow}><View style={styles.copy}><Text style={styles.itemTitle}>Kritik kural</Text><Text style={styles.itemText}>Kurye “Okudum, anladım” demeden talep gönderemez.</Text></View><Switch value={ruleCritical} onValueChange={setRuleCritical} trackColor={{ false: colors.border, true: colors.magenta }} /></View><ActionButton title={editingRuleId ? 'YENİ SÜRÜMÜ YAYINLA' : 'KURALI YAYINLA'} icon="document-text" onPress={saveRule} disabled={!siteId || !ruleTitle.trim() || !ruleBody.trim()} /></Panel>
        <SectionTitle title="Kural sürüm geçmişi" action={`${siteRules.length} sürüm`} />{siteRules.length ? <View style={styles.list}>{siteRules.map((rule) => <AnimatedPressable key={rule.id} onPress={() => editRule(rule)}><Panel style={styles.ruleCard} gradient><View style={styles.ruleTop}><View style={styles.copy}><Text style={styles.itemTitle}>{rule.title}</Text><Text style={styles.itemText}>{audienceName(rule.audience)} • {rule.scopeType === 'gate' ? 'Kapı / etap' : 'Site geneli'} • v{rule.version}</Text></View>{rule.isCritical ? <View style={styles.critical}><Text style={styles.criticalText}>KRİTİK</Text></View> : null}</View><Text style={styles.ruleBody}>{rule.body}</Text><Text style={styles.ruleDate}>{new Date(rule.startsAt).toLocaleDateString('tr-TR')}{rule.endsAt ? ` → ${new Date(rule.endsAt).toLocaleDateString('tr-TR')}` : ' → Süresiz'}</Text></Panel></AnimatedPressable>)}</View> : <EmptyState icon="document-text-outline" title="Kural yok" description="İlk kural veya duyurunu yukarıdan yayınla." />}
      </> : null}

      {tab === 'finance' ? <>
        <SectionTitle title="Aylık aidat oluştur" /><Panel style={styles.form} gradient><Field label="Başlık" value={duesTitle} onChangeText={setDuesTitle} /><View style={styles.row}><Field label="Yıl" value={duesYear} onChangeText={setDuesYear} keyboardType="number-pad" /><Field label="Ay" value={duesMonth} onChangeText={setDuesMonth} keyboardType="number-pad" /><Field label="Tutar (TL)" value={duesAmount} onChangeText={setDuesAmount} keyboardType="decimal-pad" /></View><DateField label="Son ödeme tarihi" value={dueDate} onChange={setDueDate} /><Text style={styles.groupLabel}>KAPSAM</Text><ChoiceRow values={['site', 'block', 'apartment']} value={duesScope} labels={['Site', 'Blok', 'Daire']} onChange={(value) => setDuesScope(value as DuesScope)} />{duesScope !== 'site' ? <View style={styles.row}><Field label="Blok" value={duesBlock} onChangeText={setDuesBlock} />{duesScope === 'apartment' ? <Field label="Daire" value={duesApartment} onChangeText={setDuesApartment} /> : null}</View> : null}<ActionButton title="AİDATI OLUŞTUR" icon="calendar" onPress={createDues} disabled={!siteId || !duesTitle.trim() || !duesAmount} /></Panel>
        <SectionTitle title="Aidat tahsilatları" action={`${siteCharges.length} kayıt`} /><Field label="Ödeme notu (isteğe bağlı)" value={paymentNote} onChangeText={setPaymentNote} />{siteCharges.length ? <View style={styles.list}>{siteCharges.slice(0, 30).map((charge) => <Panel key={charge.id} style={styles.listRow} gradient><View style={styles.copy}><Text style={styles.itemTitle}>{charge.block} • Daire {charge.apartment}</Text><Text style={styles.itemText}>{charge.amount.toLocaleString('tr-TR')} TL • {charge.status === 'paid' ? 'Ödendi' : 'Ödenmedi'}</Text></View><AnimatedPressable onPress={() => togglePayment(charge.id, charge.status === 'paid')}><View style={[styles.payButton, charge.status === 'paid' && styles.paidButton]}><Text style={[styles.payText, charge.status === 'paid' && styles.paidText]}>{charge.status === 'paid' ? 'GERİ AL' : 'ÖDENDİ'}</Text></View></AnimatedPressable></Panel>)}</View> : <EmptyState icon="receipt-outline" title="Aidat kaydı yok" description="Aidat dönemi oluşturduğunda tahsilatlar burada görünür." />}
        <SectionTitle title="Gelir / gider ekle" /><Panel style={styles.form} gradient><ChoiceRow values={['income', 'expense']} value={financeType} labels={['Gelir', 'Gider']} onChange={(value) => setFinanceType(value as 'income' | 'expense')} /><Field label="Kategori" value={category} onChangeText={setCategory} /><Field label="Açıklama" value={description} onChangeText={setDescription} /><Field label="Tutar (TL)" value={financeAmount} onChangeText={setFinanceAmount} keyboardType="decimal-pad" /><DateField label="İşlem tarihi" value={financeDate} onChange={setFinanceDate} /><View style={styles.switchRow}><View style={styles.copy}><Text style={styles.itemTitle}>Sakinlere görünür</Text><Text style={styles.itemText}>Şeffaflık özetine dahil edilir.</Text></View><Switch value={financeVisible} onValueChange={setFinanceVisible} trackColor={{ false: colors.border, true: colors.green }} /></View><ActionButton title="KAYDI EKLE" icon="wallet" onPress={addFinance} disabled={!siteId || !description.trim() || !financeAmount} /></Panel>
        <SectionTitle title="Finans hareketleri" action={`${siteFinance.length} kayıt`} /><View style={styles.list}>{siteFinance.slice(0, 30).map((item) => <Panel key={item.id} style={styles.listRow} gradient><View style={[styles.listIcon, { backgroundColor: item.transactionType === 'income' ? 'rgba(67,231,162,.12)' : 'rgba(255,101,125,.12)' }]}><Ionicons name={item.transactionType === 'income' ? 'arrow-down' : 'arrow-up'} size={22} color={item.transactionType === 'income' ? colors.green : colors.red} /></View><View style={styles.copy}><Text style={styles.itemTitle}>{item.category} • {item.description}</Text><Text style={styles.itemText}>{new Date(item.transactionDate).toLocaleDateString('tr-TR')} • {item.visibleToResidents ? 'Sakinlere açık' : 'Yalnızca yönetim'}</Text></View><Text style={[styles.money, { color: item.transactionType === 'income' ? colors.green : colors.red }]}>{item.transactionType === 'income' ? '+' : '-'}{item.amount.toLocaleString('tr-TR')} TL</Text></Panel>)}</View>
      </> : null}
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View>; }
function ActionButton({ title, icon, onPress, disabled }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) { return <AnimatedPressable onPress={onPress} disabled={disabled}><LinearGradient colors={disabled ? ['#425364', '#304152'] : gradients.primary} style={styles.action}><Ionicons name={icon} size={21} color={colors.white} /><Text style={styles.actionText}>{title}</Text></LinearGradient></AnimatedPressable>; }
function ChoiceRow({ values, value, labels, onChange }: { values: string[]; value: string; labels: string[]; onChange: (value: string) => void }) { return <View style={styles.choices}>{values.map((item, index) => <AnimatedPressable key={item} onPress={() => onChange(item)}><View style={[styles.choice, value === item && styles.choiceActive]}><Text style={[styles.choiceText, value === item && styles.choiceTextActive]}>{labels[index]}</Text></View></AnimatedPressable>)}</View>; }
function FinanceSummary({ label, value, tone }: { label: string; value: number; tone: string }) { return <View style={styles.financeSummary}><Text style={[styles.financeValue, { color: tone }]}>{value.toLocaleString('tr-TR')} TL</Text><Text style={styles.financeLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 126, gap: 18 }, header: { flexDirection: 'row', alignItems: 'center', gap: 10 }, headerCopy: { flex: 1 }, eyebrow: { color: colors.magenta, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 }, title: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 3 }, subtitle: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 }, horizontal: { gap: 8, paddingRight: 16 },
  siteChoice: { width: 210, minHeight: 66, borderRadius: 18, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.025)', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }, active: { borderColor: colors.magenta, backgroundColor: 'rgba(228,109,255,.09)' }, copy: { flex: 1 }, siteChoiceTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, siteChoiceText: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  notice: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 10 }, noticeInline: { borderRadius: 16, borderWidth: 1, borderColor: 'rgba(67,231,162,.32)', backgroundColor: 'rgba(67,231,162,.07)', padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 9 }, noticeText: { flex: 1, color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  tabs: { flexDirection: 'row', gap: 7 }, tabWrap: { flex: 1 }, tab: { minHeight: 64, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 5 }, tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(228,109,255,.08)' }, tabText: { color: colors.textMuted, fontSize: 10, fontWeight: '900' }, tabTextActive: { color: colors.magenta },
  hero: { minHeight: 150, borderRadius: radius.xl, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, heroLabel: { color: 'rgba(255,255,255,.72)', fontSize: 11, fontWeight: '900' }, heroValue: { color: colors.white, fontSize: 54, lineHeight: 58, fontWeight: '900' }, heroText: { color: 'rgba(255,255,255,.82)', fontSize: 12, fontWeight: '700' }, heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' }, metrics: { flexDirection: 'row', gap: 8 },
  form: { gap: 13 }, field: { flex: 1, gap: 7 }, fieldLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '900' }, input: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, color: colors.text, backgroundColor: 'rgba(255,255,255,.025)', paddingHorizontal: 12, fontSize: 14, fontWeight: '700' }, multiline: { minHeight: 104, paddingTop: 13, textAlignVertical: 'top' }, row: { flexDirection: 'row', gap: 8 }, dateStack: { gap: 10 }, groupLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '900', letterSpacing: .5 },
  switchRow: { minHeight: 67, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 9 }, action: { height: 57, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, actionText: { color: colors.white, fontSize: 13, fontWeight: '900' }, choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' }, choiceActive: { borderColor: colors.magenta, backgroundColor: 'rgba(228,109,255,.10)' }, choiceText: { color: colors.textMuted, fontSize: 11, fontWeight: '900' }, choiceTextActive: { color: colors.magenta },
  list: { gap: 8 }, listRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, listIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,179,92,.12)', alignItems: 'center', justifyContent: 'center' }, itemTitle: { color: colors.text, fontSize: 13, fontWeight: '900' }, itemText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 }, statusText: { color: colors.orange, fontSize: 9, fontWeight: '900' }, ruleCard: { gap: 8 }, ruleTop: { flexDirection: 'row', alignItems: 'center', gap: 8 }, critical: { borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(255,101,125,.42)', backgroundColor: 'rgba(255,101,125,.09)', paddingHorizontal: 8, paddingVertical: 5 }, criticalText: { color: colors.red, fontSize: 8, fontWeight: '900' }, ruleBody: { color: colors.textSoft, fontSize: 12, lineHeight: 19 }, ruleDate: { color: colors.cyan, fontSize: 10, fontWeight: '800' },
  summary: { flexDirection: 'row', gap: 7, marginBottom: 11 }, financeSummary: { flex: 1, minHeight: 72, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, financeValue: { fontSize: 13, fontWeight: '900' }, financeLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900', marginTop: 4 }, payButton: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(67,231,162,.38)', backgroundColor: 'rgba(67,231,162,.08)', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }, paidButton: { borderColor: 'rgba(255,179,92,.38)', backgroundColor: 'rgba(255,179,92,.08)' }, payText: { color: colors.green, fontSize: 9, fontWeight: '900' }, paidText: { color: colors.orange }, money: { fontSize: 11, fontWeight: '900', textAlign: 'right' },
});
