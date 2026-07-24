import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Alert, Image, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { Panel } from '../components/UI';
import { selectAndReadDeliveryImage } from '../lib/gateMedia';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';

export function CreatePassScreen({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const { user, sites, gates, rules, createPass, acceptRule, loading } = useGate();
  const [siteSearch, setSiteSearch] = useState('');
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '');
  const site = sites.find((item) => item.id === siteId);
  const siteGates = gates.filter((item) => item.siteId === siteId);
  const [gateId, setGateId] = useState(siteGates[0]?.id ?? '');
  const gate = siteGates.find((item) => item.id === gateId);
  const [customerName, setCustomerName] = useState('');
  const [addressText, setAddressText] = useState('');
  const [block, setBlock] = useState('');
  const [floor, setFloor] = useState('');
  const [apartment, setApartment] = useState('');
  const [orderNumber, setOrderNumber] = useState(`DBG-${Math.floor(100000 + Math.random() * 899999)}`);
  const [note, setNote] = useState('');
  const [etaMinutes, setEtaMinutes] = useState('6');
  const [screenshotPath, setScreenshotPath] = useState<string>();
  const [screenshotUri, setScreenshotUri] = useState<string>();
  const [ocrText, setOcrText] = useState('');
  const [ocrPayload, setOcrPayload] = useState<Record<string, unknown>>({});
  const [readingImage, setReadingImage] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  const filteredSites = useMemo(() => {
    const query = siteSearch.trim().toLocaleLowerCase('tr-TR');
    if (!query) return sites;
    return sites.filter((item) => `${item.name} ${item.address ?? ''} ${item.city ?? ''}`.toLocaleLowerCase('tr-TR').includes(query));
  }, [siteSearch, sites]);

  const activeRules = useMemo(
    () => rules.filter((rule) => rule.siteId === siteId && rule.isActive && ['all', 'courier'].includes(rule.audience) && (rule.scopeType === 'site' || !rule.gateId || rule.gateId === gateId)),
    [gateId, rules, siteId],
  );
  const criticalRules = activeRules.filter((rule) => rule.isCritical);
  const rulesVersion = activeRules.length ? Math.max(...activeRules.map((rule) => rule.version)) : undefined;

  const missingFields = useMemo(() => {
    const missing: string[] = [];
    if (!screenshotPath) missing.push('sipariş ekran görüntüsü');
    if (!siteId) missing.push('site');
    if (!(gate?.name || site?.gateNames[0])) missing.push('kapı / giriş noktası');
    if (!customerName.trim()) missing.push('müşteri adı');
    if (!addressText.trim()) missing.push('adres');
    if (!block.trim()) missing.push('blok');
    if (!floor.trim()) missing.push('kat');
    if (!apartment.trim()) missing.push('daire');
    if (!orderNumber.trim()) missing.push('sipariş numarası');
    if (criticalRules.length && !rulesAccepted) missing.push('kritik kural onayı');
    return missing;
  }, [addressText, apartment, block, criticalRules.length, customerName, floor, gate?.name, orderNumber, rulesAccepted, screenshotPath, site?.gateNames, siteId]);

  const valid = missingFields.length === 0;

  const chooseSite = (nextSiteId: string) => {
    const nextGate = gates.find((item) => item.siteId === nextSiteId);
    setSiteId(nextSiteId);
    setGateId(nextGate?.id ?? '');
    setRulesAccepted(false);
  };

  const readScreenshot = async () => {
    if (!user) return;
    setReadingImage(true);
    try {
      const result = await selectAndReadDeliveryImage(user.id);
      if (!result) return;
      setScreenshotPath(result.path);
      setScreenshotUri(result.uri);
      setOcrText(result.rawText);
      setOcrPayload(result.extracted);
      if (result.extracted.customerName) setCustomerName(result.extracted.customerName);
      if (result.extracted.address) setAddressText(result.extracted.address);
      if (result.extracted.block) setBlock(result.extracted.block);
      if (result.extracted.floor) setFloor(result.extracted.floor);
      if (result.extracted.apartment) setApartment(result.extracted.apartment);
      if (result.extracted.orderNumber) setOrderNumber(result.extracted.orderNumber);
      Alert.alert(
        result.rawText ? 'Görsel okuma tamamlandı' : 'Görsel yüklendi',
        result.rawText
          ? 'Okunan bilgiler alanlara aktarıldı. Göndermeden önce kontrol edip düzeltebilirsin.'
          : 'Metin okunamadı; bilgileri elle doldurabilirsin.',
      );
    } catch (error) {
      Alert.alert('Görsel işlenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setReadingImage(false);
    }
  };

  const submit = async () => {
    if (!valid) {
      Alert.alert('Eksik bilgiler var', `Talebi göndermek için şunları tamamla:\n\n• ${missingFields.join('\n• ')}`);
      return;
    }
    try {
      const passId = await createPass({
        siteId,
        gateId: gate?.id,
        gate: gate?.name || site?.gateNames[0] || 'Ana Kapı',
        customerName: customerName.trim(),
        addressText: addressText.trim(),
        block: block.trim(),
        floor: floor.trim(),
        apartment: apartment.trim(),
        orderNumber: orderNumber.trim(),
        note: note.trim(),
        screenshotPath,
        ocrText: ocrText || undefined,
        ocrPayload,
        etaMinutes: Math.max(0, Number(etaMinutes) || 6),
        rulesVersion,
        rulesAccepted: !criticalRules.length || rulesAccepted,
      });
      await Promise.all(criticalRules.map((rule) => acceptRule(rule.id, 'courier', passId)));
      onCreated();
    } catch (error) {
      Alert.alert('Talep gönderilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  };

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <FadeInView style={s.header}>
        <AnimatedPressable onPress={onBack}><View style={s.back}><Ionicons name="arrow-back" size={22} color={colors.text} /></View></AnimatedPressable>
        <View style={s.headerCopy}>
          <Text style={s.title}>Yeni Kurye Geçişi</Text>
          <Text style={s.sub}>Görseli okut, bilgileri düzelt ve güvenliğe gönder</Text>
        </View>
      </FadeInView>

      <FadeInView delay={50}>
        <Panel style={s.uploadPanel} gradient>
          <View style={s.uploadTop}>
            <View style={s.uploadIcon}><Ionicons name="scan" size={28} color={colors.cyan} /></View>
            <View style={s.headerCopy}>
              <Text style={s.panelTitle}>Sipariş ekran görüntüsü</Text>
              <Text style={s.panelText}>Güvenli özel depolama alanına yüklenir; okunan bilgiler gönderilmeden önce elle düzenlenebilir.</Text>
            </View>
          </View>
          {screenshotUri ? <Image source={{ uri: screenshotUri }} style={s.preview} resizeMode="cover" /> : null}
          <AnimatedPressable onPress={() => void readScreenshot()} disabled={readingImage || loading}>
            <LinearGradient colors={gradients.primary} style={s.uploadButton}>
              <Ionicons name={screenshotPath ? 'refresh' : 'images'} size={20} color={colors.white} />
              <Text style={s.uploadButtonText}>{readingImage ? 'GÖRSEL OKUNUYOR...' : screenshotPath ? 'GÖRSELİ DEĞİŞTİR' : 'GÖRSEL SEÇ VE METNİ OKU'}</Text>
            </LinearGradient>
          </AnimatedPressable>
          {screenshotPath ? (
            <View style={s.ocrBadge}>
              <Ionicons name={ocrText ? 'checkmark-circle' : 'create'} size={17} color={ocrText ? colors.green : colors.orange} />
              <Text style={[s.ocrBadgeText, { color: ocrText ? colors.green : colors.orange }]}>{ocrText ? 'Metin okundu • Alanlar düzenlenebilir' : 'Elle düzenleme modu'}</Text>
            </View>
          ) : null}
        </Panel>
      </FadeInView>

      <Text style={s.sectionLabel}>ANLAŞMALI SİTE</Text>
      <TextInput value={siteSearch} onChangeText={setSiteSearch} placeholder="Site adı veya adres ara" placeholderTextColor={colors.textMuted} style={s.search} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}>
        {filteredSites.map((item) => (
          <AnimatedPressable key={item.id} onPress={() => chooseSite(item.id)}>
            <View style={[s.choice, item.id === siteId && s.choiceActive]}>
              <Ionicons name={item.isDemo ? 'flask' : 'business'} size={18} color={item.id === siteId ? colors.cyan : colors.textMuted} />
              <View>
                <Text style={s.choiceTitle}>{item.name}</Text>
                <Text style={s.choiceText}>{item.address ?? item.city ?? 'Adres yok'}{item.isDemo ? ' • ÖRNEK' : ''}</Text>
              </View>
            </View>
          </AnimatedPressable>
        ))}
      </ScrollView>

      <Text style={s.sectionLabel}>KAPI / ETAP / GİRİŞ NOKTASI</Text>
      {siteGates.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontal}>
          {siteGates.map((item) => (
            <AnimatedPressable key={item.id} onPress={() => { setGateId(item.id); setRulesAccepted(false); }}>
              <View style={[s.gateChoice, item.id === gateId && s.choiceActive]}>
                <Ionicons name="enter" size={18} color={item.id === gateId ? colors.green : colors.textMuted} />
                <Text style={s.choiceTitle}>{item.name}</Text>
                <Text style={s.choiceText}>{[item.stage, item.entryPoint].filter(Boolean).join(' • ') || 'Giriş noktası'}</Text>
              </View>
            </AnimatedPressable>
          ))}
        </ScrollView>
      ) : (
        <Panel style={s.warningPanel}>
          <Ionicons name="warning" size={22} color={colors.orange} />
          <Text style={s.warningText}>Bu site için kapı veya giriş noktası tanımlanmamış. Site yönetimi önce Kurulum bölümünden bir giriş noktası eklemeli.</Text>
        </Panel>
      )}

      <Panel style={s.form} gradient>
        <Field label="Müşteri görünen adı" value={customerName} onChangeText={setCustomerName} />
        <Field label="Adres" value={addressText} onChangeText={setAddressText} multiline />
        <View style={s.row}><Field label="Blok" value={block} onChangeText={setBlock} /><Field label="Kat" value={floor} onChangeText={setFloor} /><Field label="Daire" value={apartment} onChangeText={setApartment} /></View>
        <Field label="Sipariş numarası" value={orderNumber} onChangeText={setOrderNumber} />
        <View style={s.row}><Field label="Tahmini dakika" value={etaMinutes} onChangeText={setEtaMinutes} keyboardType="numeric" /><Field label="Kurye notu" value={note} onChangeText={setNote} /></View>
      </Panel>

      <Text style={s.sectionLabel}>SİTE / KAPI KURALLARI</Text>
      {activeRules.length ? (
        <Panel style={s.rulesPanel} gradient>
          {activeRules.map((rule, index) => (
            <View key={rule.id} style={[s.rule, index < activeRules.length - 1 && s.ruleBorder]}>
              <View style={[s.ruleIcon, { backgroundColor: rule.isCritical ? 'rgba(255,101,125,.14)' : 'rgba(55,216,255,.12)' }]}>
                <Ionicons name={rule.isCritical ? 'alert-circle' : 'information-circle'} size={22} color={rule.isCritical ? colors.red : colors.cyan} />
              </View>
              <View style={s.headerCopy}>
                <Text style={s.ruleTitle}>{rule.title} • v{rule.version}</Text>
                <Text style={s.ruleText}>{rule.body}</Text>
                <Text style={s.ruleMeta}>{rule.scopeType === 'gate' ? 'Kapı / etap kuralı' : 'Site geneli'}{rule.isCritical ? ' • KRİTİK' : ''}</Text>
              </View>
            </View>
          ))}
          {criticalRules.length ? (
            <View style={s.acceptRow}>
              <Switch value={rulesAccepted} onValueChange={setRulesAccepted} trackColor={{ false: colors.border, true: colors.green }} thumbColor={colors.white} />
              <View style={s.headerCopy}>
                <Text style={s.acceptTitle}>Okudum, anladım</Text>
                <Text style={s.acceptText}>Kritik kuralları kabul etmeden talep gönderilemez.</Text>
              </View>
            </View>
          ) : null}
        </Panel>
      ) : (
        <Panel><Text style={s.panelText}>Bu site ve kapı için aktif kurye kuralı bulunmuyor. Kural olmadığı için ayrıca onay kutusu gerekmez.</Text></Panel>
      )}

      {!valid ? (
        <View style={s.missingBox}>
          <Ionicons name="information-circle" size={20} color={colors.orange} />
          <Text style={s.missingText}>Eksik: {missingFields.join(', ')}</Text>
        </View>
      ) : null}

      <AnimatedPressable onPress={() => void submit()} disabled={loading}>
        <LinearGradient colors={valid ? gradients.success : ['#5A4B2C', '#354451']} style={s.submit}>
          <Ionicons name="paper-plane" size={21} color={colors.white} />
          <Text style={s.submitText}>{loading ? 'GÖNDERİLİYOR' : 'GEÇİŞ TALEBİMİ GÖNDER'}</Text>
        </LinearGradient>
      </AnimatedPressable>
    </ScrollView>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        style={[s.input, multiline && s.multiline]}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.cyan}
      />
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: 58, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerCopy: { flex: 1 },
  back: { width: 46, height: 46, borderRadius: 16, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 25, fontWeight: '900' },
  sub: { color: colors.textSoft, fontSize: 13, marginTop: 3 },
  sectionLabel: { color: colors.cyan, fontSize: 12, fontWeight: '900', letterSpacing: .7 },
  uploadPanel: { gap: 13, borderColor: 'rgba(55,216,255,.34)' },
  uploadTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  uploadIcon: { width: 52, height: 52, borderRadius: 17, backgroundColor: 'rgba(55,216,255,.12)', alignItems: 'center', justifyContent: 'center' },
  panelTitle: { color: colors.text, fontSize: 17, fontWeight: '900' },
  panelText: { color: colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 3 },
  preview: { width: '100%', height: 170, borderRadius: 17, backgroundColor: colors.surface },
  uploadButton: { height: 52, borderRadius: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  uploadButtonText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  ocrBadge: { minHeight: 38, borderRadius: 13, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 8 },
  ocrBadgeText: { fontSize: 11, fontWeight: '900' },
  search: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, color: colors.text, paddingHorizontal: 13, fontSize: 15, backgroundColor: 'rgba(12,28,45,.72)' },
  horizontal: { gap: 9, paddingRight: 12 },
  choice: { width: 220, minHeight: 72, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  choiceActive: { borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.10)' },
  choiceTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  choiceText: { color: colors.textSoft, fontSize: 11, marginTop: 3 },
  gateChoice: { width: 190, minHeight: 78, borderRadius: 17, borderWidth: 1, borderColor: colors.border, padding: 11, justifyContent: 'center', gap: 4 },
  warningPanel: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderColor: 'rgba(255,179,92,.38)' },
  warningText: { flex: 1, color: colors.textSoft, fontSize: 13, lineHeight: 19 },
  form: { gap: 13 },
  row: { flexDirection: 'row', gap: 8 },
  field: { flex: 1 },
  fieldLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 11, fontSize: 15, fontWeight: '700' },
  multiline: { minHeight: 86, textAlignVertical: 'top', paddingTop: 12 },
  rulesPanel: { gap: 0 },
  rule: { minHeight: 84, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  ruleBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  ruleIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  ruleTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
  ruleText: { color: colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4 },
  ruleMeta: { color: colors.textMuted, fontSize: 10, fontWeight: '900', marginTop: 5 },
  acceptRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  acceptTitle: { color: colors.green, fontSize: 15, fontWeight: '900' },
  acceptText: { color: colors.textSoft, fontSize: 12, marginTop: 3 },
  missingBox: { minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,179,92,.42)', backgroundColor: 'rgba(255,179,92,.08)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 },
  missingText: { flex: 1, color: colors.orange, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  submit: { height: 62, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: '900' },
});
