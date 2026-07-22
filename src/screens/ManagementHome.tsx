import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import { addSiteMember, createGateSite, upsertSiteGate } from '../lib/managementActions';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { RuleAudience, RuleScope } from '../types';

type Tab = 'overview' | 'setup' | 'rules' | 'finance';
type MemberRole = 'security' | 'manager' | 'resident';
type DuesScope = 'site' | 'block' | 'apartment';

export function ManagementHome() {
  const gate = useGate();
  const [tab, setTab] = useState<Tab>('overview');
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const site = gate.sites.find((item) => item.id === selectedSiteId) ?? gate.sites[0];
  const siteId = site?.id ?? '';

  const siteGates = useMemo(
    () => gate.gates.filter((item) => item.siteId === siteId),
    [gate.gates, siteId],
  );
  const siteRules = useMemo(
    () => gate.rules.filter((item) => item.siteId === siteId),
    [gate.rules, siteId],
  );
  const sitePasses = useMemo(
    () => gate.passes.filter((item) => item.siteId === siteId),
    [gate.passes, siteId],
  );
  const siteVisitors = useMemo(
    () => gate.visitors.filter((item) => item.siteId === siteId),
    [gate.visitors, siteId],
  );
  const sitePeriods = useMemo(
    () => gate.duesPeriods.filter((item) => item.siteId === siteId),
    [gate.duesPeriods, siteId],
  );
  const siteCharges = useMemo(
    () => gate.duesCharges.filter((item) => item.siteId === siteId),
    [gate.duesCharges, siteId],
  );
  const siteFinance = useMemo(
    () => gate.financeTransactions.filter((item) => item.siteId === siteId),
    [gate.financeTransactions, siteId],
  );

  const today = new Date().toISOString().slice(0, 10);
  const todayPasses = sitePasses.filter((item) => item.createdAt.startsWith(today));
  const waiting = sitePasses.filter((item) => item.status === 'waiting').length;
  const completed = sitePasses.filter((item) => item.status === 'completed').length;
  const unpaidTotal = siteCharges
    .filter((item) => item.status === 'unpaid')
    .reduce((sum, item) => sum + item.amount, 0);
  const income = siteFinance
    .filter((item) => item.transactionType === 'income')
    .reduce((sum, item) => sum + item.amount, 0);
  const expense = siteFinance
    .filter((item) => item.transactionType === 'expense')
    .reduce((sum, item) => sum + item.amount, 0);

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
  const [airPassEnabled, setAirPassEnabled] = useState(true);

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
  const [duesTitle, setDuesTitle] = useState(
    `${now.toLocaleString('tr-TR', { month: 'long' })} ${now.getFullYear()} Aidatı`,
  );
  const [duesYear, setDuesYear] = useState(String(now.getFullYear()));
  const [duesMonth, setDuesMonth] = useState(String(now.getMonth() + 1));
  const [dueDate, setDueDate] = useState(
    new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString().slice(0, 10),
  );
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

  const perform = async (work: () => Promise<unknown>, success: string) => {
    try {
      await work();
      await gate.refresh();
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
  }, 'Site oluşturuldu. Kapı ve personel ekleyebilirsin.');

  const createGate = () => perform(async () => {
    await upsertSiteGate({
      siteId,
      name: gateName.trim(),
      stage: stage.trim(),
      entryPoint: entryPoint.trim(),
      latitude: gateLatitude ? Number(gateLatitude) : undefined,
      longitude: gateLongitude ? Number(gateLongitude) : undefined,
      airpassEnabled: airPassEnabled,
    });
    setGateName('');
    setStage('');
    setEntryPoint('');
    setGateLatitude('');
    setGateLongitude('');
  }, 'Kapı, etap, giriş noktası ve AirPass konumu kaydedildi.');

  const addMember = () => perform(async () => {
    await addSiteMember({
      siteId,
      email: memberEmail.trim(),
      role: memberRole,
      block: memberRole === 'resident' ? memberBlock.trim() : undefined,
      floor: memberRole === 'resident' ? memberFloor.trim() : undefined,
      apartment: memberRole === 'resident' ? memberApartment.trim() : undefined,
    });
    setMemberEmail('');
  }, 'Kayıtlı DraBornGo/DraBornGate hesabı siteye eklendi.');

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
  }, editingRuleId
    ? 'Yeni kural sürümü yayınlandı; eski sürüm geçmişte korundu.'
    : 'Kural veya duyuru yayınlandı.');

  const createDues = () => perform(async () => {
    await gate.createDuesPeriod({
      siteId,
      title: duesTitle.trim(),
      year: Number(duesYear),
      month: Number(duesMonth),
      dueDate,
      scopeType: duesScope,
      scopeBlock: duesScope !== 'site' ? duesBlock.trim() : undefined,
      scopeApartment: duesScope === 'apartment' ? duesApartment.trim() : undefined,
      amount: Number(duesAmount),
    });
  }, 'Aidat dönemi oluşturuldu ve kapsama uyan dairelere borç işlendi.');

  const togglePayment = (chargeId: string, currentlyPaid: boolean) => perform(
    () => gate.markDuePaid(chargeId, !currentlyPaid, paymentNote.trim()),
    currentlyPaid
      ? 'Ödeme geri alındı ve bağlı tahsilat geliri kaldırıldı.'
      : 'Aidat ödendi olarak işaretlendi ve tahsilat geliri oluşturuldu.',
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
      refreshControl={
        <RefreshControl
          refreshing={gate.refreshing}
          onRefresh={() => void gate.refresh()}
          tintColor={colors.magenta}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.content}
    >
      <FadeInView style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>SİTE YÖNETİM MERKEZİ</Text>
          <Text style={styles.title}>DraBornGate v0.2</Text>
          <Text style={styles.subtitle}>CourierPass • VisitorPass • Kurallar • Aidat/Finans</Text>
        </View>
        <LiveBadge label="CANLI" />
      </FadeInView>

      {gate.sites.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontal}>
          {gate.sites.map((item) => (
            <AnimatedPressable key={item.id} onPress={() => setSelectedSiteId(item.id)}>
              <View style={[styles.siteChoice, siteId === item.id && styles.active]}>
                <Ionicons
                  name={item.isDemo ? 'flask' : 'business'}
                  size={19}
                  color={siteId === item.id ? colors.magenta : colors.textMuted}
                />
                <View>
                  <Text style={styles.siteChoiceTitle}>{item.name}</Text>
                  <Text style={styles.siteChoiceText}>
                    {item.city || 'Şehir yok'}{item.isDemo ? ' • DEMO' : ''}
                  </Text>
                </View>
              </View>
            </AnimatedPressable>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.tabs}>
        {(['overview', 'setup', 'rules', 'finance'] as Tab[]).map((item) => (
          <AnimatedPressable key={item} containerStyle={styles.tabWrap} onPress={() => setTab(item)}>
            <View style={[styles.tab, tab === item && styles.tabActive]}>
              <Ionicons
                name={
                  item === 'overview'
                    ? 'analytics'
                    : item === 'setup'
                      ? 'settings'
                      : item === 'rules'
                        ? 'document-text'
                        : 'wallet'
                }
                size={18}
                color={tab === item ? colors.magenta : colors.textMuted}
              />
              <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
                {item === 'overview' ? 'Özet' : item === 'setup' ? 'Kurulum' : item === 'rules' ? 'Kurallar' : 'Finans'}
              </Text>
            </View>
          </AnimatedPressable>
        ))}
      </View>

      {tab === 'overview' ? (
        <>
          <LinearGradient colors={gradients.management} style={styles.hero}>
            <View>
              <Text style={styles.heroLabel}>BUGÜNKÜ KURYE GİRİŞİ</Text>
              <Text style={styles.heroValue}>{todayPasses.length}</Text>
              <Text style={styles.heroText}>{completed} tamamlanan • {waiting} bekleyen</Text>
            </View>
            <View style={styles.heroIcon}><Ionicons name="analytics" size={40} color={colors.white} /></View>
          </LinearGradient>

          <View style={styles.metrics}>
            <MetricCard label="Aktif kapı" value={String(siteGates.length)} icon="enter" tone={colors.cyan} />
            <MetricCard label="Misafir" value={String(siteVisitors.length)} icon="people" tone={colors.green} />
            <MetricCard label="Aidat borcu" value={`${Math.round(unpaidTotal / 1000)}K`} icon="wallet" tone={colors.orange} />
          </View>

          <SectionTitle title="Günlük kurye giriş kayıtları" action={new Date().toLocaleDateString('tr-TR')} />
          {todayPasses.length ? (
            <View style={styles.list}>
              {todayPasses.map((item) => (
                <Panel key={item.id} style={styles.listRow} gradient>
                  <View style={[styles.listIcon, { backgroundColor: item.status === 'completed' ? 'rgba(67,231,162,.14)' : 'rgba(255,179,92,.14)' }]}>
                    <Ionicons name={item.status === 'completed' ? 'checkmark-done' : 'time'} size={22} color={item.status === 'completed' ? colors.green : colors.orange} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.itemTitle}>{item.courierName} • {item.platform}</Text>
                    <Text style={styles.itemText}>
                      {new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {item.gate} • {item.block}/{item.apartment} • {item.plate}
                    </Text>
                  </View>
                  <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
                </Panel>
              ))}
            </View>
          ) : (
            <EmptyState icon="calendar-outline" title="Bugün kurye kaydı yok" description="Günlük CourierPass hareketleri burada görünür." />
          )}

          <SectionTitle title="Finans dashboard" />
          <Panel gradient>
            <View style={styles.summary}>
              <FinanceSummary label="GELİR" value={income} tone={colors.green} />
              <FinanceSummary label="GİDER" value={expense} tone={colors.red} />
              <FinanceSummary label="BAKİYE" value={income - expense} tone={colors.cyan} />
            </View>
            <View style={styles.switchRowPlain}>
              <View style={styles.copy}>
                <Text style={styles.itemTitle}>Sakinlere gelir-gider özeti</Text>
                <Text style={styles.itemText}>Kapalıysa sakinler hiçbir finans özeti görmez.</Text>
              </View>
              <Switch
                value={site?.financeSummaryVisible ?? false}
                onValueChange={(value) => void perform(
                  () => gate.setFinanceVisibility(siteId, value),
                  value ? 'Finans özeti sakinlere açıldı.' : 'Finans özeti sakinlerden gizlendi.',
                )}
                trackColor={{ false: colors.border, true: colors.green }}
              />
            </View>
          </Panel>
        </>
      ) : null}

      {tab === 'setup' ? (
        <>
          <SectionTitle title="Yeni site oluştur" />
          <Panel style={styles.form} gradient>
            <Field label="Site adı" value={siteName} onChangeText={setSiteName} />
            <Field label="Adres" value={siteAddress} onChangeText={setSiteAddress} />
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
                <View style={styles.row}>
                  <Field label="Etap" value={stage} onChangeText={setStage} />
                  <Field label="Giriş noktası" value={entryPoint} onChangeText={setEntryPoint} />
                </View>
                <View style={styles.row}>
                  <Field label="Kapı enlem" value={gateLatitude} onChangeText={setGateLatitude} keyboardType="decimal-pad" />
                  <Field label="Kapı boylam" value={gateLongitude} onChangeText={setGateLongitude} keyboardType="decimal-pad" />
                </View>
                <View style={styles.switchCard}>
                  <View style={styles.copy}>
                    <Text style={styles.itemTitle}>AirPass açık</Text>
                    <Text style={styles.itemText}>Kurye 30 metreye yaklaştığında konum doğrulanır.</Text>
                  </View>
                  <Switch value={airPassEnabled} onValueChange={setAirPassEnabled} trackColor={{ false: colors.border, true: colors.green }} />
                </View>
                <ActionButton title="KAPIYI KAYDET" icon="enter" onPress={createGate} disabled={!gateName.trim()} />
              </Panel>

              <View style={styles.list}>
                {siteGates.map((item) => (
                  <Panel key={item.id} style={styles.listRow} gradient>
                    <Ionicons name="enter" size={23} color={colors.cyan} />
                    <View style={styles.copy}>
                      <Text style={styles.itemTitle}>{item.name}</Text>
                      <Text style={styles.itemText}>
                        {item.stage || 'Etap yok'} • {item.entryPoint || 'Giriş açıklaması yok'} • {item.latitude != null ? 'GPS kayıtlı' : 'GPS eksik'}
                      </Text>
                    </View>
                    <Text style={[styles.badgeText, { color: item.airpassEnabled ? colors.green : colors.textMuted }]}>
                      {item.airpassEnabled ? 'AIRPASS' : 'KAPALI'}
                    </Text>
                  </Panel>
                ))}
              </View>

              <SectionTitle title="Güvenlik / yönetici / sakin ekle" />
              <Panel style={styles.form} gradient>
                <Field
                  label="DraBornGo / DraBornGate hesap e-postası"
                  value={memberEmail}
                  onChangeText={setMemberEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <View style={styles.chips}>
                  {(['security', 'manager', 'resident'] as MemberRole[]).map((item) => (
                    <ChoiceChip
                      key={item}
                      active={memberRole === item}
                      label={item === 'security' ? 'Güvenlik' : item === 'manager' ? 'Yönetici' : 'Site sakini'}
                      onPress={() => setMemberRole(item)}
                    />
                  ))}
                </View>
                {memberRole === 'resident' ? (
                  <View style={styles.row}>
                    <Field label="Blok" value={memberBlock} onChangeText={setMemberBlock} />
                    <Field label="Kat" value={memberFloor} onChangeText={setMemberFloor} />
                    <Field label="Daire" value={memberApartment} onChangeText={setMemberApartment} />
                  </View>
                ) : null}
                <ActionButton title="HESABI SİTEYE EKLE" icon="person-add" onPress={addMember} disabled={!memberEmail.trim()} />
              </Panel>
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
              <View style={styles.chips}>
                {(['courier', 'visitor', 'all'] as RuleAudience[]).map((item) => (
                  <ChoiceChip
                    key={item}
                    active={ruleAudience === item}
                    label={item === 'courier' ? 'Kurye' : item === 'visitor' ? 'Misafir' : 'Tümü'}
                    onPress={() => setRuleAudience(item)}
                  />
                ))}
              </View>
              <Text style={styles.fieldLabel}>KAPSAM</Text>
              <View style={styles.chips}>
                <ChoiceChip active={ruleScope === 'site'} label="Site geneli" onPress={() => setRuleScope('site')} />
                <ChoiceChip active={ruleScope === 'gate'} label="Kapı / etap" onPress={() => setRuleScope('gate')} />
              </View>
              {ruleScope === 'gate' ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {siteGates.map((item) => (
                    <ChoiceChip key={item.id} active={ruleGateId === item.id} label={item.name} onPress={() => setRuleGateId(item.id)} />
                  ))}
                </ScrollView>
              ) : null}
              <View style={styles.row}>
                <Field label="Başlangıç ISO" value={ruleStart} onChangeText={setRuleStart} />
                <Field label="Bitiş ISO (opsiyonel)" value={ruleEnd} onChangeText={setRuleEnd} />
              </View>
              <View style={styles.switchCard}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>Kritik kural</Text>
                  <Text style={styles.itemText}>Kurye “Okudum, anladım” demeden talep gönderemez.</Text>
                </View>
                <Switch value={ruleCritical} onValueChange={setRuleCritical} trackColor={{ false: colors.border, true: colors.red }} />
              </View>
              <ActionButton
                title={editingRuleId ? 'YENİ SÜRÜMÜ YAYINLA' : 'KURALI YAYINLA'}
                icon="document-text"
                onPress={saveRule}
                disabled={!ruleTitle.trim() || !ruleBody.trim() || (ruleScope === 'gate' && !ruleGateId)}
              />
            </Panel>

            <SectionTitle title="Kural versiyon geçmişi" action={`${siteRules.length} sürüm`} />
            <View style={styles.list}>
              {siteRules.map((item) => (
                <Panel key={item.id} style={styles.ruleRow} gradient>
                  <View style={[styles.ruleIcon, { backgroundColor: item.isCritical ? 'rgba(255,101,125,.14)' : 'rgba(55,216,255,.12)' }]}>
                    <Ionicons name={item.isCritical ? 'alert-circle' : 'information-circle'} size={23} color={item.isCritical ? colors.red : colors.cyan} />
                  </View>
                  <View style={styles.copy}>
                    <Text style={styles.itemTitle}>{item.title} • v{item.version}</Text>
                    <Text style={styles.itemText}>{item.body}</Text>
                    <Text style={styles.ruleMeta}>
                      {item.audience} • {item.scopeType} • {item.isActive ? 'AKTİF' : 'ESKİ SÜRÜM'} • {new Date(item.startsAt).toLocaleDateString('tr-TR')}
                      {item.endsAt ? ` → ${new Date(item.endsAt).toLocaleDateString('tr-TR')}` : ''}
                    </Text>
                  </View>
                  {item.isActive ? (
                    <AnimatedPressable onPress={() => {
                      setEditingRuleId(item.id);
                      setRuleTitle(item.title);
                      setRuleBody(item.body);
                      setRuleAudience(item.audience);
                      setRuleScope(item.scopeType);
                      setRuleGateId(item.gateId ?? '');
                      setRuleCritical(item.isCritical);
                      setRuleStart(item.startsAt);
                      setRuleEnd(item.endsAt ?? '');
                    }}>
                      <View style={styles.editButton}><Ionicons name="create" size={18} color={colors.purple} /></View>
                    </AnimatedPressable>
                  ) : null}
                </Panel>
              ))}
            </View>
          </>
        ) : (
          <EmptyState icon="business-outline" title="Önce site oluştur" description="Kural ve duyuru eklemek için yönetilen bir site gerekir." />
        )
      ) : null}

      {tab === 'finance' ? (
        site ? (
          <>
            <SectionTitle title="Aylık aidat dönemi oluştur" />
            <Panel style={styles.form} gradient>
              <Field label="Dönem başlığı" value={duesTitle} onChangeText={setDuesTitle} />
              <View style={styles.row}>
                <Field label="Yıl" value={duesYear} onChangeText={setDuesYear} keyboardType="numeric" />
                <Field label="Ay" value={duesMonth} onChangeText={setDuesMonth} keyboardType="numeric" />
                <Field label="Son ödeme" value={dueDate} onChangeText={setDueDate} />
              </View>
              <Text style={styles.fieldLabel}>AİDAT KAPSAMI</Text>
              <View style={styles.chips}>
                {(['site', 'block', 'apartment'] as DuesScope[]).map((item) => (
                  <ChoiceChip
                    key={item}
                    active={duesScope === item}
                    label={item === 'site' ? 'Tüm site' : item === 'block' ? 'Blok bazlı' : 'Daireye özel'}
                    onPress={() => setDuesScope(item)}
                  />
                ))}
              </View>
              {duesScope !== 'site' ? (
                <View style={styles.row}>
                  <Field label="Blok" value={duesBlock} onChangeText={setDuesBlock} />
                  {duesScope === 'apartment' ? <Field label="Daire" value={duesApartment} onChangeText={setDuesApartment} /> : null}
                </View>
              ) : null}
              <Field label="Tutar (TL)" value={duesAmount} onChangeText={setDuesAmount} keyboardType="decimal-pad" />
              <ActionButton title="AİDAT DÖNEMİNİ OLUŞTUR" icon="calendar" onPress={createDues} disabled={!duesTitle.trim() || !Number(duesAmount)} />
            </Panel>

            <SectionTitle title="Aidat yönetimi" action={`${sitePeriods.length} dönem`} />
            <Panel style={styles.notePanel} gradient>
              <Field
                label="Manuel ödeme notu"
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder="Örn. Havale ile alındı / Makbuz 124"
              />
              <Text style={styles.noteHelp}>Aşağıdaki “Ödendi” veya “Geri Al” işleminde bu not kullanılır. Android’de ayrı açılır metin kutusuna ihtiyaç yoktur.</Text>
            </Panel>

            {siteCharges.length ? (
              <View style={styles.list}>
                {siteCharges.map((item) => (
                  <Panel key={item.id} style={styles.chargeRow} gradient>
                    <Ionicons name={item.status === 'paid' ? 'checkmark-circle' : 'alert-circle'} size={25} color={item.status === 'paid' ? colors.green : colors.orange} />
                    <View style={styles.copy}>
                      <Text style={styles.itemTitle}>{item.block} / Daire {item.apartment}</Text>
                      <Text style={styles.itemText}>
                        {item.status === 'paid'
                          ? `Ödendi${item.paidAt ? ` • ${new Date(item.paidAt).toLocaleDateString('tr-TR')}` : ''}`
                          : 'Ödenmedi'}
                        {item.paymentNote ? ` • ${item.paymentNote}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.amount, { color: item.status === 'paid' ? colors.green : colors.orange }]}>
                      {item.amount.toLocaleString('tr-TR')} TL
                    </Text>
                    <AnimatedPressable onPress={() => void togglePayment(item.id, item.status === 'paid')}>
                      <View style={styles.paymentButton}>
                        <Text style={styles.paymentButtonText}>{item.status === 'paid' ? 'Geri Al' : 'Ödendi'}</Text>
                      </View>
                    </AnimatedPressable>
                  </Panel>
                ))}
              </View>
            ) : (
              <EmptyState icon="wallet-outline" title="Aidat borcu yok" description="Dönem oluşturulduğunda daire borçları burada görünür." />
            )}

            <SectionTitle title="Gelir / gider kaydı" />
            <Panel style={styles.form} gradient>
              <View style={styles.chips}>
                <ChoiceChip active={financeType === 'income'} label="Gelir" onPress={() => setFinanceType('income')} />
                <ChoiceChip active={financeType === 'expense'} label="Gider" onPress={() => setFinanceType('expense')} />
              </View>
              <View style={styles.row}>
                <Field label="Kategori" value={category} onChangeText={setCategory} />
                <Field label="Tarih" value={financeDate} onChangeText={setFinanceDate} />
              </View>
              <Field label="Açıklama" value={description} onChangeText={setDescription} />
              <Field label="Tutar (TL)" value={financeAmount} onChangeText={setFinanceAmount} keyboardType="decimal-pad" />
              <View style={styles.switchCard}>
                <View style={styles.copy}>
                  <Text style={styles.itemTitle}>Sakin özetinde göster</Text>
                  <Text style={styles.itemText}>Yalnızca site geneli görünürlük de açıksa gösterilir.</Text>
                </View>
                <Switch value={financeVisible} onValueChange={setFinanceVisible} trackColor={{ false: colors.border, true: colors.green }} />
              </View>
              <ActionButton title="FİNANS KAYDINI EKLE" icon="add-circle" onPress={addFinance} disabled={!description.trim() || !Number(financeAmount)} />
            </Panel>

            <SectionTitle title="Gelir-gider hareketleri" />
            <View style={styles.list}>
              {siteFinance.map((item) => (
                <Panel key={item.id} style={styles.listRow} gradient>
                  <Ionicons name={item.transactionType === 'income' ? 'arrow-down-circle' : 'arrow-up-circle'} size={23} color={item.transactionType === 'income' ? colors.green : colors.red} />
                  <View style={styles.copy}>
                    <Text style={styles.itemTitle}>{item.description}</Text>
                    <Text style={styles.itemText}>
                      {item.category} • {new Date(item.transactionDate).toLocaleDateString('tr-TR')} • {item.visibleToResidents ? 'Sakin özetinde' : 'Yönetim özel'}
                    </Text>
                  </View>
                  <Text style={[styles.amount, { color: item.transactionType === 'income' ? colors.green : colors.red }]}>
                    {item.amount.toLocaleString('tr-TR')} TL
                  </Text>
                </Panel>
              ))}
            </View>
          </>
        ) : (
          <EmptyState icon="business-outline" title="Önce site oluştur" description="Aidat ve finans işlemleri siteye bağlıdır." />
        )
      ) : null}
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
        placeholderTextColor={colors.textMuted}
      />
    </View>
  );
}

function ChoiceChip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <AnimatedPressable onPress={onPress}>
      <View style={[styles.chip, active && styles.active]}>
        <Text style={[styles.chipText, active && styles.chipActiveText]}>{label}</Text>
      </View>
    </AnimatedPressable>
  );
}

function ActionButton({ title, icon, onPress, disabled }: { title: string; icon: keyof typeof Ionicons.glyphMap; onPress: () => void; disabled?: boolean }) {
  return (
    <AnimatedPressable onPress={onPress} disabled={disabled}>
      <LinearGradient colors={disabled ? ['#3A4C5D', '#293B4C'] : gradients.primary} style={styles.action}>
        <Ionicons name={icon} size={20} color={colors.white} />
        <Text style={styles.actionText}>{title}</Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

function FinanceSummary({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, { color: tone }]}>{value.toLocaleString('tr-TR')} TL</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { color: colors.magenta, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  title: { color: colors.text, fontSize: 29, fontWeight: '900', marginTop: 4 },
  subtitle: { color: colors.textSoft, fontSize: 12, marginTop: 4 },
  horizontal: { gap: 8, paddingRight: 10 },
  siteChoice: { minWidth: 175, height: 58, borderRadius: 17, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  siteChoiceTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  siteChoiceText: { color: colors.textSoft, fontSize: 9, marginTop: 3 },
  tabs: { flexDirection: 'row', gap: 6 },
  tabWrap: { flex: 1 },
  tab: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 3 },
  tabActive: { borderColor: colors.magenta, backgroundColor: 'rgba(255,90,197,.09)' },
  tabText: { color: colors.textMuted, fontSize: 9, fontWeight: '900' },
  tabTextActive: { color: colors.magenta },
  active: { borderColor: colors.magenta, backgroundColor: 'rgba(255,90,197,.09)' },
  hero: { borderRadius: radius.xl, padding: 21, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { color: 'rgba(255,255,255,.78)', fontSize: 10, fontWeight: '900' },
  heroValue: { color: colors.white, fontSize: 39, fontWeight: '900' },
  heroText: { color: 'rgba(255,255,255,.84)', fontSize: 12 },
  heroIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: 'rgba(255,255,255,.14)', alignItems: 'center', justifyContent: 'center' },
  metrics: { flexDirection: 'row', gap: 8 },
  list: { gap: 9 },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  listIcon: { width: 45, height: 45, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  itemTitle: { color: colors.text, fontSize: 13, fontWeight: '900' },
  itemText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
  statusText: { color: colors.cyan, fontSize: 8, fontWeight: '900' },
  badgeText: { fontSize: 9, fontWeight: '900' },
  summary: { flexDirection: 'row', justifyContent: 'space-between', paddingBottom: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  summaryLabel: { color: colors.textMuted, fontSize: 8, fontWeight: '900' },
  summaryValue: { fontSize: 14, fontWeight: '900', marginTop: 3 },
  switchRowPlain: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  form: { gap: 11 },
  row: { flexDirection: 'row', gap: 7 },
  field: { flex: 1 },
  fieldLabel: { color: colors.textSoft, fontSize: 9, fontWeight: '900', marginBottom: 5 },
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 10, fontSize: 12 },
  multiline: { minHeight: 83, textAlignVertical: 'top', paddingTop: 11 },
  switchCard: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, borderRadius: 15, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10 },
  action: { height: 53, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { color: colors.white, fontSize: 11, fontWeight: '900' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  chip: { minHeight: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  chipText: { color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  chipActiveText: { color: colors.magenta },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  ruleIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ruleMeta: { color: colors.purple, fontSize: 8, fontWeight: '900', marginTop: 5 },
  editButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(139,107,255,.12)', alignItems: 'center', justifyContent: 'center' },
  notePanel: { gap: 6, borderColor: 'rgba(255,179,92,.35)' },
  noteHelp: { color: colors.textSoft, fontSize: 10, lineHeight: 15 },
  chargeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontSize: 12, fontWeight: '900' },
  paymentButton: { minWidth: 56, height: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.green, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 7 },
  paymentButtonText: { color: colors.green, fontSize: 9, fontWeight: '900' },
});
