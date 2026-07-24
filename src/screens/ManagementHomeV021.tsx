import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { EmptyState, LiveBadge, MetricCard, Panel, SectionTitle } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { addSiteMember, createGateSite, upsertSiteGate } from '../lib/managementActions';
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
  waiting: 'Onay bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  arrived: 'Kapıda',
  completed: 'Tamamlandı',
  cancelled: 'İptal edildi',
  expired: 'Süresi doldu',
};

const memberRoleName = (role: SiteMember['role']) => (
  role === 'owner' ? 'Site sahibi' : role === 'manager' ? 'Yönetici' : role === 'security' ? 'Güvenlik' : 'Site sakini'
);

const audienceName = (audience: RuleAudience) => audience === 'courier' ? 'Kurye' : audience === 'visitor' ? 'Misafir' : 'Tümü';
const scopeName = (scope: RuleScope) => scope === 'gate' ? 'Kapı / etap' : 'Site geneli';

export function ManagementHomeV021() {
  const gate = useGate();
  const [tab, setTab] = useState<Tab>('overview');
  const [managedSiteIds, setManagedSiteIds] = useState<string[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [members, setMembers] = useState<SiteMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const managedSites = useMemo(
    () => gate.sites.filter((item) => managedSiteIds.includes(item.id)),
    [gate.sites, managedSiteIds],
  );
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
    if (!targetSiteId) {
      setMembers([]);
      return;
    }
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

  useEffect(() => {
    void loadManagedSites().catch(() => undefined);
  }, [loadManagedSites, gate.sites.length]);

  useEffect(() => {
    void loadMembers(siteId);
  }, [loadMembers, siteId]);

  const siteGates = useMemo(() => gate.gates.filter((item) => item.siteId === siteId), [gate.gates, siteId]);
  const siteRules = useMemo(() => gate.rules.filter((item) => item.siteId === siteId), [gate.rules, siteId]);
  const sitePasses = useMemo(() => gate.passes.filter((item) => item.siteId === siteId), [gate.passes, siteId]);
  const siteVisitors = useMemo(() => gate.visitors.filter((item) => item.siteId === siteId), [gate.visitors, siteId]);
  const sitePeriods = useMemo(() => gate.duesPeriods.filter((item) => item.siteId === siteId), [gate.duesPeriods, siteId]);
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
  const [city, setCity] = useState('Antalya');
  const [siteLatitude, setSiteLatitude] = useState('');
  const [siteLongitude, setSiteLongitude] = useState('');

  const [gateName, setGateName] = useState('');
  const [stage, setStage] = useState('');
  const [entryPoint, setEntryPoint] = useState('');
  const [gateLatitude, setGateLatitude] = useState('');
  const [gateLongitude, setGateLongitude] = useState('');
  const [smartEntryEnabled, setSmartEntryEnabled] = useState(true);

  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<MemberRole>('security');
  const [memberBlock, setMemberBlock] = useState('');
  const [memberFloor, setMemberFloor] = useState('');
  const [memberApartment, setMemberApartment] = useState('');
  const [editingMemberId, setEditingMemberId] = useState<string>();

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
  const [dueDate, setDueDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString().slice(0, 10));
  const [duesScope, setDuesScope] = useState<DuesScope>('site');
  const [duesBlock, setDuesBlock] = useState('');
  const [duesApartment, setDuesApartment] = useState('');
  const [duesAmount, setDuesAmount] = useState('1500');
  const [paymentNote, setPaymentNote] = useState('');

  const [financeType, setFinanceType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('Bakım');
  const [description, setDescription] = useState('');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeDate, setFinanceDate] = useState(today);
  const [financeVisible, setFinanceVisible] = useState(true);

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

  const createSite = () => perform(async () => {
    const id = await createGateSite({
      name: siteName.trim(),
      address: siteAddress.trim(),
      city: city.trim(),
      latitude: siteLatitude ? Number(siteLatitude) : undefined,
      longitude: siteLongitude ? Number(siteLongitude) : undefined,
    });
    setSelectedSiteId(id);
    setSiteName('');
    setSiteAddress('');
  }, 'Site oluşturuldu. Şimdi kapı ve kullanıcı ekleyebilirsin.', loadManagedSites);

  const createGate = () => perform(async () => {
    await upsertSiteGate({
      siteId,
      name: gateName.trim(),
      stage: stage.trim(),
      entryPoint: entryPoint.trim(),
      latitude: gateLatitude ? Number(gateLatitude) : undefined,
      longitude: gateLongitude ? Number(gateLongitude) : undefined,
      airpassEnabled: smartEntryEnabled,
    });
    setGateName('');
    setStage('');
    setEntryPoint('');
    setGateLatitude('');
    setGateLongitude('');
  }, 'Kapı, etap, giriş noktası ve akıllı geçiş konumu kaydedildi.');

  const resetMemberForm = () => {
    setMemberEmail('');
    setMemberRole('security');
    setMemberBlock('');
    setMemberFloor('');
    setMemberApartment('');
    setEditingMemberId(undefined);
  };

  const saveMember = () => perform(async () => {
    if (editingMemberId) {
      const { error } = await supabase.rpc('dkd_gate_update_site_member', {
        p_membership_id: editingMemberId,
        p_role: memberRole,
        p_block: memberRole === 'resident' ? memberBlock.trim() : null,
        p_floor: memberRole === 'resident' ? memberFloor.trim() : null,
        p_apartment: memberRole === 'resident' ? memberApartment.trim() : null,
      });
      if (error) throw error;
    } else {
      await addSiteMember({
        siteId,
        email: memberEmail.trim(),
        role: memberRole,
        block: memberRole === 'resident' ? memberBlock.trim() : undefined,
        floor: memberRole === 'resident' ? memberFloor.trim() : undefined,
        apartment: memberRole === 'resident' ? memberApartment.trim() : undefined,
      });
    }
    resetMemberForm();
  }, editingMemberId ? 'Site kullanıcısı güncellendi.' : 'Hesap siteye eklendi.', () => loadMembers(siteId));

  const editMember = (member: SiteMember) => {
    if (member.role === 'owner') return;
    setEditingMemberId(member.id);
    setMemberEmail(member.email);
    setMemberRole(member.role);
    setMemberBlock(member.block ?? '');
    setMemberFloor(member.floor ?? '');
    setMemberApartment(member.apartment ?? '');
  };

  const removeMember = (member: SiteMember) => Alert.alert(
    'Site kullanıcısını kaldır',
    `${member.full_name} bu siteden kaldırılsın mı? Hesabı silinmez.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kaldır',
        style: 'destructive',
        onPress: () => void perform(async () => {
          const { error } = await supabase.rpc('dkd_gate_remove_site_member', { p_membership_id: member.id });
          if (error) throw error;
        }, 'Kullanıcı site erişiminden kaldırıldı.', () => loadMembers(siteId)),
      },
    ],
  );

  const saveRule = () => perform(async () => {
    await gate.upsertRule({
      siteId,
      gateId: ruleScope === 'gate' ? ruleGateId : undefined,
      audience: ruleAudience,
      scopeType: ruleScope,
      title: ruleTitle.trim(),
      body: ruleBody.trim(),
      startsAt: ruleStart,
      endsAt: ruleEnd.trim() || undefined,
      isCritical: ruleCritical,
      existingRuleId: editingRuleId,
    });
    setRuleTitle('');
    setRuleBody('');
    setRuleEnd('');
    setEditingRuleId(undefined);
  }, editingRuleId ? 'Yeni kural sürümü yayınlandı; eski sürüm geçmişte korundu.' : 'Kural veya duyuru yayınlandı.');

  const createDues = () => perform(() => gate.createDuesPeriod({
    siteId,
    title: duesTitle.trim(),
    year: Number(duesYear),
    month: Number(duesMonth),
    dueDate,
    scopeType: duesScope,
    scopeBlock: duesScope !== 'site' ? duesBlock.trim() : undefined,
    scopeApartment: duesScope === 'apartment' ? duesApartment.trim() : undefined,
    amount: Number(duesAmount),
  }), 'Aidat dönemi oluşturuldu ve kapsama uyan dairelere borç işlendi.');

  const togglePayment = (chargeId: string, currentlyPaid: boolean) => perform(
    () => gate.markDuePaid(chargeId, !currentlyPaid, paymentNote.trim()),
    currentlyPaid ? 'Ödeme geri alındı ve bağlı tahsilat geliri kaldırıldı.' : 'Aidat ödendi olarak işaretlendi ve tahsilat geliri oluşturuldu.',
  );

  const addFinance = () => perform(async () => {
    await gate.addFinanceTransaction({
      siteId,
      type: financeType,
      category: category.trim(),
      description: description.trim(),
      amount: Number(financeAmount),
      date: financeDate,
      visible: financeVisible,
    });
    setDescription('');
    setFinanceAmount('');
  }, 'Gelir veya gider kaydı eklendi.');

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={gate.refreshing} onRefresh={() => void Promise.all([gate.refresh(), loadManagedSites(), loadMembers(siteId)])} tintColor={colors.magenta} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <FadeInView style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text>
          <Text style={styles.title}>DraBornGate v{APP_VERSION}</Text>
          <Text style={styles.subtitle}>Kurye Geçişi • Ziyaretçi Geçişi • Kurallar • Aidat ve Finans</Text>
        </View>
        <LiveBadge label="CANLI" />
      </FadeInView>

      {managedSites.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {managedSites.map((item) => (
            <AnimatedPressable key={item.id} onPress={() => setSelectedSiteId(item.id)}>
              <View style={[styles.siteChoice, siteId === item.id && styles.active]}>
                <Ionicons name={item.isDemo ? 'flask' : 'business'} size={22} color={siteId === item.id ? colors.magenta : colors.textMuted} />
                <View style={styles.copy}>
                  <Text style={styles.siteChoiceTitle}>{item.name}</Text>
                  <Text style={styles.siteChoiceText}>{item.city || 'Şehir belirtilmedi'}{item.isDemo ? ' • ÖRNEK' : ''}</Text>
                </View>
              </View>
            </AnimatedPressable>
          ))}
        </ScrollView>
      ) : (
        <Panel style={styles.notice} gradient>
          <Ionicons name="information-circle" size={24} color={colors.orange} />
          <Text style={styles.noticeText}>Henüz yönetebildiğin bir site yok. Onay yeni verildiyse ekranı aşağı çekerek yenile.</Text>
        </Panel>
      )}

      <View style={styles.tabs}>
        {(['overview', 'setup', 'rules', 'finance'] as Tab[]).map((item) => (
          <AnimatedPressable key={item} containerStyle={styles.tabWrap} onPress={() => setTab(item)}>
            <View style={[styles.tab, tab === item && styles.tabActive]}>
              <Ionicons
                name={item === 'overview' ? 'analytics' : item === 'setup' ? 'settings' : item === 'rules' ? 'document-text' : 'wallet'}
                size={20}
                color={tab === item ? colors.magenta : colors.textMuted}
              />
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'overview' ? 'Özet' : item === 'setup' ? 'Kurulum' : item === 'rules' ? 'Kurallar' : 'Finans'}</Text>
            </View>
          </AnimatedPressable>
        ))}
      </View>

      {tab === 'overview' ? (
        site ? (
          <>
            <LinearGradient colors={gradients.management} style={styles.hero}>
              <View>
                <Text style={styles.heroLabel}>BUGÜNKÜ KURYE GİRİŞİ</Text>
                <Text style={styles.heroValue}>{todayPasses.length}</Text>
                <Text style={styles.heroText}>{completed} tamamlanan • {waiting} onay bekleyen</Text>
              </View>
              <View style={styles.heroIcon}><Ionicons name="analytics" size={42} color={colors.white} /></View>
            </LinearGradient>

            <View style={styles.metrics}>
              <MetricCard label="Aktif kapı" value={String(siteGates.length)} icon="enter" tone={colors.cyan} />
              <MetricCard label="Misafir" value={String(siteVisitors.length)} icon="people" tone={colors.green} />
              <MetricCard label="Aidat borcu" value={`${Math.round(unpaidTotal / 1000)} B`} icon="wallet" tone={colors.orange} />
            </View>

            <SectionTitle title="Günlük kurye giriş kayıtları" action={new Date().toLocaleDateString('tr-TR')} />
            {todayPasses.length ? (
              <View style={styles.list}>
                {todayPasses.map((item) => (
                  <Panel key={item.id} style={styles.listRow} gradient>
                    <View style={[styles.listIcon, { backgroundColor: item.status === 'completed' ? 'rgba(67,231,162,.14)' : 'rgba(255,179,92,.14)' }]}>
                      <Ionicons name={item.status === 'completed' ? 'checkmark-done' : 'time'} size={23} color={item.status === 'completed' ? colors.green : colors.orange} />
                    </View>
                    <View style={styles.copy}>
                      <Text style={styles.itemTitle}>{item.courierName} • {item.platform}</Text>
                      <Text style={styles.itemText}>{new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {item.gate} • {item.block}/{item.apartment} • {item.plate}</Text>
                    </View>
                    <Text style={styles.statusText}>{statusNames[item.status]}</Text>
                  </Panel>
                ))}
              </View>
            ) : <EmptyState icon="calendar-outline" title="Bugün kurye kaydı yok" description="Günlük kurye geçiş hareketleri burada görünür." />}

            <SectionTitle title="Finans özeti" />
            <Panel gradient>
              <View style={styles.summary}>
                <FinanceSummary label="GELİR" value={income} tone={colors.green} />
                <FinanceSummary label="GİDER" value={expense} tone={colors.red} />
                <FinanceSummary label="BAKİYE" value={income - expense} tone={colors.cyan} />
              </View>
              <View style={styles.switchRowPlain}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>Sakinlere gelir-gider özeti</Text>
                  <Text style={styles.itemText}>Kapalıysa site sakinleri hiçbir finans özeti görmez.</Text>
                </View>
                <Switch value={site.financeSummaryVisible} onValueChange={(value) => void perform(() => gate.setFinanceVisibility(siteId, value), value ? 'Finans özeti sakinlere açıldı.' : 'Finans özeti sakinlerden gizlendi.')} trackColor={{ false: colors.border, true: colors.green }} />
              </View>
            </Panel>
          </>
        ) : <EmptyState icon="business-outline" title="Yönetilen site yok" description="Site Yönetimi başvurusu onaylandığında siten burada görünür." />
      ) : null}

      {tab === 'setup' ? (
        <>
          <SectionTitle title="Yeni site oluştur" />
          <Panel style={styles.form} gradient>
            <Field label="Site adı" value={siteName} onChangeText={setSiteName} />
            <Field label="Adres" value={siteAddress} onChangeText={setSiteAddress} multiline />
            <View style={styles.row}>
              <Field label="Şehir" value={city} onChangeText={setCity} />
              <Field label="Enlem" value={siteLatitude} onChangeText={setSiteLatitude} keyboardType="decimal-pad" />
              <Field label="Boylam" value={siteLongitude} onChangeText={setSiteLongitude} keyboardType="decimal-pad" />
            </View>
            <ActionButton title="SİTE OLUŞTUR" icon="business" onPress={createSite} disabled={!siteName.trim()} />
          </Panel>

          {site ? (
            <>
              <SectionTitle title="Kapı / etap / giriş noktası" />
              <Panel style={styles.form} gradient>
                <Field label="Kapı adı" value={gateName} onChangeText={setGateName} />
                <View style={styles.row}><Field label="Etap" value={stage} onChangeText={setStage} /><Field label="Giriş noktası" value={entryPoint} onChangeText={setEntryPoint} /></View>
                <View style={styles.row}><Field label="Kapı enlemi" value={gateLatitude} onChangeText={setGateLatitude} keyboardType="decimal-pad" /><Field label="Kapı boylamı" value={gateLongitude} onChangeText={setGateLongitude} keyboardType="decimal-pad" /></View>
                <View style={styles.switchCard}>
                  <View style={styles.copy}><Text style={styles.itemTitle}>Akıllı geçiş açık</Text><Text style={styles.itemText}>Kurye kapıya yaklaştığında konumu doğrulanır.</Text></View>
                  <Switch value={smartEntryEnabled} onValueChange={setSmartEntryEnabled} trackColor={{ false: colors.border, true: colors.green }} />
                </View>
                <ActionButton title="KAPIYI KAYDET" icon="enter" onPress={createGate} disabled={!gateName.trim()} />
              </Panel>

              <View style={styles.list}>
                {siteGates.map((item) => (
                  <Panel key={item.id} style={styles.listRow} gradient>
                    <Ionicons name="enter" size={24} color={colors.cyan} />
                    <View style={styles.copy}>
                      <Text style={styles.itemTitle}>{item.name}</Text>
                      <Text style={styles.itemText}>{item.stage || 'Etap belirtilmedi'} • {item.entryPoint || 'Giriş açıklaması yok'} • {item.latitude != null ? 'Konum kayıtlı' : 'Konum eksik'}</Text>
                    </View>
                    <Text style={[styles.badgeText, { color: item.airpassEnabled ? colors.green : colors.textMuted }]}>{item.airpassEnabled ? 'AKILLI GEÇİŞ' : 'KAPALI'}</Text>
                  </Panel>
                ))}
              </View>

              <SectionTitle title={editingMemberId ? 'Site kullanıcısını düzenle' : 'Güvenlik / yönetici / site sakini ekle'} />
              <Panel style={styles.form} gradient>
                <Field label="DraBornGo / DraBornGate hesap e-postası" value={memberEmail} onChangeText={setMemberEmail} autoCapitalize="none" keyboardType="email-address" editable={!editingMemberId} />
                <View style={styles.chips}>
                  {(['security', 'manager', 'resident'] as MemberRole[]).map((item) => <ChoiceChip key={item} active={memberRole === item} label={item === 'security' ? 'Güvenlik' : item === 'manager' ? 'Yönetici' : 'Site sakini'} onPress={() => setMemberRole(item)} />)}
                </View>
                {memberRole === 'resident' ? <View style={styles.row}><Field label="Blok" value={memberBlock} onChangeText={setMemberBlock} /><Field label="Kat" value={memberFloor} onChangeText={setMemberFloor} /><Field label="Daire" value={memberApartment} onChangeText={setMemberApartment} /></View> : null}
                <ActionButton title={editingMemberId ? 'KULLANICIYI GÜNCELLE' : 'HESABI SİTEYE EKLE'} icon={editingMemberId ? 'save' : 'person-add'} onPress={saveMember} disabled={!editingMemberId && !memberEmail.trim()} />
                {editingMemberId ? <AnimatedPressable onPress={resetMemberForm}><View style={styles.cancelEdit}><Text style={styles.cancelEditText}>DÜZENLEMEYİ İPTAL ET</Text></View></AnimatedPressable> : null}
              </Panel>

              <SectionTitle title="Site kullanıcıları" action={`${members.length} kişi`} />
              {membersLoading ? <Panel><Text style={styles.centerText}>Kullanıcılar yükleniyor...</Text></Panel> : members.length ? (
                <View style={styles.list}>
                  {members.map((member) => (
                    <Panel key={member.id} style={styles.memberRow} gradient>
                      <View style={styles.memberIcon}><Ionicons name={member.role === 'resident' ? 'home' : member.role === 'security' ? 'shield' : 'person'} size={23} color={member.role === 'resident' ? colors.orange : member.role === 'security' ? colors.green : colors.magenta} /></View>
                      <View style={styles.copy}>
                        <Text style={styles.itemTitle}>{member.full_name}</Text>
                        <Text style={styles.itemText}>{memberRoleName(member.role)} • {member.email}{member.role === 'resident' ? ` • ${member.block || '-'} / Kat ${member.floor || '-'} / Daire ${member.apartment || '-'}` : ''}</Text>
                      </View>
                      {member.role !== 'owner' ? (
                        <View style={styles.memberActions}>
                          <AnimatedPressable onPress={() => editMember(member)}><View style={styles.smallButton}><Ionicons name="create" size={18} color={colors.cyan} /></View></AnimatedPressable>
                          <AnimatedPressable onPress={() => removeMember(member)}><View style={[styles.smallButton, styles.removeButton]}><Ionicons name="trash" size={18} color={colors.red} /></View></AnimatedPressable>
                        </View>
                      ) : <Text style={styles.ownerBadge}>SAHİP</Text>}
                    </Panel>
                  ))}
                </View>
              ) : <EmptyState icon="people-outline" title="Site kullanıcısı yok" description="Güvenlik personeli ve site sakinlerini e-posta hesaplarıyla ekleyebilirsin." />}
            </>
          ) : null}
        </>
      ) : null}

      {tab === 'rules' ? (
        site ? (
          <>
            <SectionTitle title={editingRuleId ? 'Yeni kural sürümü' : 'Kural / duyuru ekle'} />
            <Panel style={styles.form} gradient>
              <Field label="Başlık" value={ruleTitle} onChangeText={setRuleTitle} />
              <Field label="Kural metni" value={ruleBody} onChangeText={setRuleBody} multiline />
              <Text style={styles.fieldLabel}>KİME GÖSTERİLECEK</Text>
              <View style={styles.chips}>{(['courier', 'visitor', 'all'] as RuleAudience[]).map((item) => <ChoiceChip key={item} active={ruleAudience === item} label={audienceName(item)} onPress={() => setRuleAudience(item)} />)}</View>
              <Text style={styles.fieldLabel}>KAPSAM</Text>
              <View style={styles.chips}><ChoiceChip active={ruleScope === 'site'} label="Site geneli" onPress={() => setRuleScope('site')} /><ChoiceChip active={ruleScope === 'gate'} label="Kapı / etap" onPress={() => setRuleScope('gate')} /></View>
              {ruleScope === 'gate' ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>{siteGates.map((item) => <ChoiceChip key={item.id} active={ruleGateId === item.id} label={item.name} onPress={() => setRuleGateId(item.id)} />)}</ScrollView> : null}
              <View style={styles.row}><Field label="Başlangıç tarihi" value={ruleStart} onChangeText={setRuleStart} /><Field label="Bitiş tarihi (isteğe bağlı)" value={ruleEnd} onChangeText={setRuleEnd} /></View>
              <View style={styles.switchCard}><View style={styles.copy}><Text style={styles.itemTitle}>Kritik kural</Text><Text style={styles.itemText}>Kurye “Okudum, anladım” demeden talep gönderemez.</Text></View><Switch value={ruleCritical} onValueChange={setRuleCritical} trackColor={{ false: colors.border, true: colors.red }} /></View>
              <ActionButton title={editingRuleId ? 'YENİ SÜRÜMÜ YAYINLA' : 'KURALI YAYINLA'} icon="document-text" onPress={saveRule} disabled={!ruleTitle.trim() || !ruleBody.trim() || (ruleScope === 'gate' && !ruleGateId)} />
            </Panel>

            <SectionTitle title="Kural sürüm geçmişi" action={`${siteRules.length} sürüm`} />
            <View style={styles.list}>
              {siteRules.map((item) => (
                <Panel key={item.id} style={styles.ruleRow} gradient>
                  <View style={[styles.ruleIcon, { backgroundColor: item.isCritical ? 'rgba(255,101,125,.14)' : 'rgba(55,216,255,.12)' }]}><Ionicons name={item.isCritical ? 'alert-circle' : 'information-circle'} size={24} color={item.isCritical ? colors.red : colors.cyan} /></View>
                  <View style={styles.copy}>
                    <Text style={styles.itemTitle}>{item.title} • v{item.version}</Text>
                    <Text style={styles.itemText}>{item.body}</Text>
                    <Text style={styles.ruleMeta}>{audienceName(item.audience)} • {scopeName(item.scopeType)} • {item.isActive ? 'AKTİF' : 'ESKİ SÜRÜM'} • {new Date(item.startsAt).toLocaleDateString('tr-TR')}{item.endsAt ? ` → ${new Date(item.endsAt).toLocaleDateString('tr-TR')}` : ''}</Text>
                  </View>
                  {item.isActive ? <AnimatedPressable onPress={() => { setEditingRuleId(item.id); setRuleTitle(item.title); setRuleBody(item.body); setRuleAudience(item.audience); setRuleScope(item.scopeType); setRuleGateId(item.gateId ?? ''); setRuleCritical(item.isCritical); setRuleStart(item.startsAt); setRuleEnd(item.endsAt ?? ''); }}><View style={styles.editButton}><Ionicons name="create" size={19} color={colors.purple} /></View></AnimatedPressable> : null}
                </Panel>
              ))}
            </View>
          </>
        ) : <EmptyState icon="business-outline" title="Önce site oluştur" description="Kural ve duyuru eklemek için yönetilen bir site gerekir." />
      ) : null}

      {tab === 'finance' ? (
        site ? (
          <>
            <SectionTitle title="Aylık aidat dönemi oluştur" />
            <Panel style={styles.form} gradient>
              <Field label="Dönem başlığı" value={duesTitle} onChangeText={setDuesTitle} />
              <View style={styles.row}><Field label="Yıl" value={duesYear} onChangeText={setDuesYear} keyboardType="numeric" /><Field label="Ay" value={duesMonth} onChangeText={setDuesMonth} keyboardType="numeric" /><Field label="Son ödeme" value={dueDate} onChangeText={setDueDate} /></View>
              <Text style={styles.fieldLabel}>AİDAT KAPSAMI</Text>
              <View style={styles.chips}>{(['site', 'block', 'apartment'] as DuesScope[]).map((item) => <ChoiceChip key={item} active={duesScope === item} label={item === 'site' ? 'Tüm site' : item === 'block' ? 'Blok bazlı' : 'Daireye özel'} onPress={() => setDuesScope(item)} />)}</View>
              {duesScope !== 'site' ? <View style={styles.row}><Field label="Blok" value={duesBlock} onChangeText={setDuesBlock} />{duesScope === 'apartment' ? <Field label="Daire" value={duesApartment} onChangeText={setDuesApartment} /> : null}</View> : null}
              <Field label="Tutar (TL)" value={duesAmount} onChangeText={setDuesAmount} keyboardType="decimal-pad" />
              <ActionButton title="AİDAT DÖNEMİNİ OLUŞTUR" icon="calendar" onPress={createDues} disabled={!duesTitle.trim() || !Number(duesAmount)} />
            </Panel>

            <SectionTitle title="Aidat yönetimi" action={`${sitePeriods.length} dönem`} />
            <Panel style={styles.notePanel} gradient><Field label="Elle ödeme notu" value={paymentNote} onChangeText={setPaymentNote} placeholder="Örn. Havale ile alındı / Makbuz 124" /><Text style={styles.noteHelp}>Aşağıdaki “Ödendi” veya “Geri Al” işleminde bu not kullanılır.</Text></Panel>
            {siteCharges.length ? <View style={styles.list}>{siteCharges.map((item) => <Panel key={item.id} style={styles.chargeRow} gradient><Ionicons name={item.status === 'paid' ? 'checkmark-circle' : 'alert-circle'} size={26} color={item.status === 'paid' ? colors.green : colors.orange} /><View style={styles.copy}><Text style={styles.itemTitle}>{item.block} / Daire {item.apartment}</Text><Text style={styles.itemText}>{item.status === 'paid' ? `Ödendi${item.paidAt ? ` • ${new Date(item.paidAt).toLocaleDateString('tr-TR')}` : ''}` : 'Ödenmedi'}{item.paymentNote ? ` • ${item.paymentNote}` : ''}</Text></View><Text style={[styles.amount, { color: item.status === 'paid' ? colors.green : colors.orange }]}>{item.amount.toLocaleString('tr-TR')} TL</Text><AnimatedPressable onPress={() => void togglePayment(item.id, item.status === 'paid')}><View style={styles.paymentButton}><Text style={styles.paymentButtonText}>{item.status === 'paid' ? 'Geri Al' : 'Ödendi'}</Text></View></AnimatedPressable></Panel>)}</View> : <EmptyState icon="wallet-outline" title="Aidat borcu yok" description="Dönem oluşturulduğunda daire borçları burada görünür." />}

            <SectionTitle title="Gelir / gider kaydı" />
            <Panel style={styles.form} gradient>
              <View style={styles.chips}><ChoiceChip active={financeType === 'income'} label="Gelir" onPress={() => setFinanceType('income')} /><ChoiceChip active={financeType === 'expense'} label="Gider" onPress={() => setFinanceType('expense')} /></View>
              <View style={styles.row}><Field label="Kategori" value={category} onChangeText={setCategory} /><Field label="Tarih" value={financeDate} onChangeText={setFinanceDate} /></View>
              <Field label="Açıklama" value={description} onChangeText={setDescription} />
              <Field label="Tutar (TL)" value={financeAmount} onChangeText={setFinanceAmount} keyboardType="decimal-pad" />
              <View style={styles.switchCard}><View style={styles.copy}><Text style={styles.itemTitle}>Sakin özetinde göster</Text><Text style={styles.itemText}>Yalnızca site geneli görünürlük açıksa gösterilir.</Text></View><Switch value={financeVisible} onValueChange={setFinanceVisible} trackColor={{ false: colors.border, true: colors.green }} /></View>
              <ActionButton title="FİNANS KAYDINI EKLE" icon="add-circle" onPress={addFinance} disabled={!description.trim() || !Number(financeAmount)} />
            </Panel>

            <SectionTitle title="Gelir-gider hareketleri" />
            <View style={styles.list}>{siteFinance.map((item) => <Panel key={item.id} style={styles.listRow} gradient><Ionicons name={item.transactionType === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'} size={24} color={item.transactionType === 'income' ? colors.green : colors.red} /><View style={styles.copy}><Text style={styles.itemTitle}>{item.description}</Text><Text style={styles.itemText}>{item.category} • {new Date(item.transactionDate).toLocaleDateString('tr-TR')} • {item.visibleToResidents ? 'Sakin özetinde' : 'Yalnızca yönetimde'}</Text></View><Text style={[styles.amount, { color: item.transactionType === 'income' ? colors.green : colors.red }]}>{item.amount.toLocaleString('tr-TR')} TL</Text></Panel>)}</View>
          </>
        ) : <EmptyState icon="business-outline" title="Önce site oluştur" description="Aidat ve finans işlemleri siteye bağlıdır." />
      ) : null}
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.multiline]} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View>;
}

function ChoiceChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return <AnimatedPressable onPress={onPress}><View style={[styles.chip, active && styles.active]}><Text style={[styles.chipText, active && styles.chipActiveText]}>{label}</Text></View></AnimatedPressable>;
}

function ActionButton({ title, icon, onPress, disabled }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
  return <AnimatedPressable onPress={onPress} disabled={disabled}><LinearGradient colors={disabled ? ['#3A4C5D', '#293B4C'] : gradients.primary} style={styles.action}><Ionicons name={icon} size={21} color={colors.white} /><Text style={styles.actionText}>{title}</Text></LinearGradient></AnimatedPressable>;
}

function FinanceSummary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <View><Text style={styles.summaryLabel}>{label}</Text><Text style={[styles.summaryValue, { color: tone }]}>{value.toLocaleString('tr-TR')} TL</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 13, paddingBottom: 126, gap: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.magenta, fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 32, fontWeight: '900', marginTop: 5 },
  subtitle: { color: colors.textSoft, fontSize: 15, lineHeight: 21, marginTop: 5 },
  horizontal: { gap: 9, paddingRight: 10 },
  siteChoice: { minWidth: 205, minHeight: 74, borderRadius: 18, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  siteChoiceTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  siteChoiceText: { color: colors.textSoft, fontSize: 12, marginTop: 4 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderColor: 'rgba(255,179,92,.35)' },
  noticeText: { flex: 1, color: colors.textSoft, fontSize: 14, lineHeight: 21 },
  tabs: { flexDirection: 'row', gap: 7 },
  tabWrap: { flex: 1 },
  tab: { height: 59, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(255,90,197,.09)' },
  tabText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },
  tabTextActive: { color: colors.magenta },
  active: { borderColor: colors.magenta, backgroundColor: 'rgba(255,90,197,.09)' },
  hero: { borderRadius: radius.xl, padding: 23, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,.82)', fontSize: 12, fontWeight: '900' },
  heroValue: { color: colors.white, fontSize: 42, fontWeight: '900' },
  heroText: { color: 'rgba(255,255,255,.88)', fontSize: 14 },
  heroIcon: { width: 74, height: 74, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', gap: 8 },
  list: { gap: 10 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listIcon: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  itemTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  itemText: { color: colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4 },
  statusText: { color: colors.cyan, fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'right', maxWidth: 75 },
  badgeText: { fontSize: 10, lineHeight: 14, fontWeight: '900', textAlign: 'right', maxWidth: 74 },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryLabel: { color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  summaryValue: { fontSize: 16, fontWeight: '900', marginTop: 4 },
  switchRowPlain: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 13 },
  form: { gap: 13 },
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1 },
  fieldLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  input: { minHeight: 54, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, fontSize: 15, fontWeight: '700' },
  multiline: { minHeight: 92, textAlignVertical: 'top', paddingTop: 12 },
  switchCard: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 11 },
  action: { minHeight: 57, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10 },
  actionText: { color: colors.white, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  chipText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },
  chipActiveText: { color: colors.magenta },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  memberIcon: { width: 47, height: 47, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.04)', alignItems: 'center', justifyContent: 'center' },
  memberActions: { flexDirection: 'row', gap: 6 },
  smallButton: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  removeButton: { borderColor: 'rgba(255,101,125,.38)' },
  ownerBadge: { color: colors.green, fontSize: 10, fontWeight: '900' },
  cancelEdit: { height: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  cancelEditText: { color: colors.textSoft, fontSize: 12, fontWeight: '900' },
  centerText: { color: colors.textSoft, fontSize: 14, textAlign: 'center' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ruleIcon: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ruleMeta: { color: colors.purple, fontSize: 10, lineHeight: 15, fontWeight: '900', marginTop: 6 },
  editButton: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(139,107,255,.12)', alignItems: 'center', justifyContent: 'center' },
  notePanel: { gap: 7, borderColor: 'rgba(255,179,92,.35)' },
  noteHelp: { color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  chargeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontSize: 14, fontWeight: '900' },
  paymentButton: { minWidth: 61, height: 39, borderRadius: 12, borderWidth: 1, borderColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  paymentButtonText: { color: colors.green, fontSize: 11, fontWeight: '900' },
});
