const fs = require('fs');
const path = require('path');

const dkdRoot = path.join(__dirname, '..');

function dkdRead(dkdRelativePath) {
  return fs.readFileSync(path.join(dkdRoot, dkdRelativePath), 'utf8');
}

function dkdWrite(dkdRelativePath, dkdContent) {
  fs.writeFileSync(path.join(dkdRoot, dkdRelativePath), dkdContent);
}

function dkdReplace(dkdContent, dkdSearch, dkdReplacement, dkdLabel) {
  if (dkdContent.includes(dkdReplacement)) return dkdContent;
  if (!dkdContent.includes(dkdSearch)) throw new Error(`v0.3.12 kaynak güncellemesi uygulanamadı: ${dkdLabel}`);
  return dkdContent.replace(dkdSearch, dkdReplacement);
}

function dkdPatchApp() {
  const dkdFile = 'App.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (dkdContent.includes('DKD_V0312_APP')) return;
  dkdContent = `// DKD_V0312_APP\n${dkdContent}`;
  dkdContent = dkdReplace(dkdContent,
    "  const [showCreatePass, setShowCreatePass] = useState(false);",
    "  const [showCreatePass, setShowCreatePass] = useState(false);\n  const [courierCenterInitialTab, setCourierCenterInitialTab] = useState<'passes' | 'packages'>('passes');",
    'App tab state');
  dkdContent = dkdReplace(dkdContent,
    "  const changeRole = async (selected: UserRole) => { await selectRole(selected); setRole(selected); setRoleInitialized(true); setTab('home'); setShowCreatePass(false); await refresh(); };",
    "  const changeRole = async (selected: UserRole) => { await selectRole(selected); setRole(selected); setRoleInitialized(true); setTab('home'); setShowCreatePass(false); await refresh(); };\n  const openCourierPackages = () => { setCourierCenterInitialTab('packages'); setShowCreatePass(false); setTab('passes'); };\n  const openCourierPasses = () => { setCourierCenterInitialTab('passes'); setShowCreatePass(false); setTab('passes'); };",
    'App open callbacks');
  dkdContent = dkdReplace(dkdContent,
    "    if (showCreatePass && role === 'courier') return <CreatePassScreen onBack={() => setShowCreatePass(false)} onCreated={() => { setShowCreatePass(false); setTab('passes'); void refresh(); }} />;",
    "    if (showCreatePass && role === 'courier') return <CreatePassScreen onBack={() => setShowCreatePass(false)} onOpenPackages={openCourierPackages} onCreated={() => { setShowCreatePass(false); setCourierCenterInitialTab('passes'); setTab('passes'); void refresh(); }} />;",
    'CreatePass props');
  dkdContent = dkdReplace(dkdContent,
    "if (role === 'courier') return <CourierCenterV032 />;",
    "if (role === 'courier') return <CourierCenterV032 initialTab={courierCenterInitialTab} />;",
    'CourierCenter initial tab');
  dkdContent = dkdReplace(dkdContent,
    "if (role === 'courier') return <CourierHome onCreatePass={() => setShowCreatePass(true)} onOpenPasses={() => setTab('passes')} onOpenSettings={() => setTab('profile')} />;",
    "if (role === 'courier') return <CourierHome onCreatePass={() => setShowCreatePass(true)} onOpenPasses={openCourierPasses} onOpenSettings={() => setTab('profile')} />;",
    'CourierHome callbacks');
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchProfile() {
  const dkdFile = 'src/screens/ProfileScreen.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (dkdContent.includes('DKD_V0312_PROFILE')) return;
  dkdContent = `// DKD_V0312_PROFILE\n${dkdContent}`;
  dkdContent = dkdReplace(dkdContent,
    "import { Panel } from '../components/UI';",
    "import { Panel } from '../components/UI';\nimport { DkdSupportCenterModal } from '../components/DkdSupportCenterModal';",
    'Profile support import');
  dkdContent = dkdReplace(dkdContent,
    "  const [uploading, setUploading] = useState(false);",
    "  const [uploading, setUploading] = useState(false);\n  const [dkdSupportOpen, setDkdSupportOpen] = useState(false);",
    'Profile support state');
  dkdContent = dkdReplace(dkdContent,
    "      if (error) throw error; setAvatarPath(path); await gate.refresh();",
    "      if (error) throw error; setAvatarPath(path);\n      await (await import('../lib/supabase')).supabase.rpc('dkd_gate_notify_operation', { dkd_param_operation: 'avatar_updated', dkd_param_title: 'Profil fotoğrafı eklendi', dkd_param_body: 'Yeni profil fotoğrafın başarıyla kaydedildi.', dkd_param_data: {} });\n      await gate.refresh();",
    'Profile avatar notification');
  dkdContent = dkdReplace(dkdContent,
    "  return <ScrollView keyboardShouldPersistTaps=\"handled\"",
    "  return <><ScrollView keyboardShouldPersistTaps=\"handled\"",
    'Profile fragment open');
  const dkdOldHero = "    <FadeInView><LinearGradient colors={heroGradient} style={s.hero}><AnimatedPressable onPress={pickPhoto}><View style={s.avatar}>{avatarPath ? <PrivateImage path={avatarPath} style={s.avatarImage} /> : <Ionicons name={roleIcons[role]} size={39} color={colors.white} />}{uploading ? <View style={s.uploading}><Text style={s.uploadingText}>YÜKLENİYOR</Text></View> : null}</View></AnimatedPressable><Text style={s.name}>{gate.profile?.fullName ?? 'DraBornGate Kullanıcısı'}</Text><Text style={s.role}>{isAdmin ? 'Admin Profil Merkezi' : roleNames[role]} • DraBornGate</Text><Text style={s.photoHint}>Selfie veya cihaz fotoğrafı için dokun</Text></LinearGradient></FadeInView>";
  const dkdNewHero = "    <FadeInView><LinearGradient colors={heroGradient} style={s.hero}><AnimatedPressable onPress={pickPhoto}><View style={s.avatar}>{avatarPath ? <PrivateImage path={avatarPath} style={s.avatarImage} /> : <Ionicons name={roleIcons[role]} size={39} color={colors.white} />}{avatarPath && !uploading ? <View style={s.avatarBadge}><Ionicons name=\"checkmark\" size={15} color={colors.background} /></View> : null}{uploading ? <View style={s.uploading}><Text style={s.uploadingText}>YÜKLENİYOR</Text></View> : null}</View></AnimatedPressable><Text style={s.name}>{gate.profile?.fullName ?? 'DraBornGate Kullanıcısı'}</Text><Text style={s.role}>{isAdmin ? 'Admin Profil Merkezi' : roleNames[role]} • DraBornGate</Text><AnimatedPressable onPress={() => setDkdSupportOpen(true)}><View style={s.supportButton}><Ionicons name=\"headset\" size={18} color={colors.white} /><Text style={s.supportButtonText}>DESTEK</Text><Ionicons name=\"arrow-forward\" size={17} color={colors.white} /></View></AnimatedPressable></LinearGradient></FadeInView>";
  dkdContent = dkdReplace(dkdContent, dkdOldHero, dkdNewHero, 'Profile hero');
  dkdContent = dkdReplace(dkdContent,
    "  </ScrollView>;\n}",
    "  </ScrollView><DkdSupportCenterModal visible={dkdSupportOpen} onClose={() => setDkdSupportOpen(false)} /></>;\n}",
    'Profile support modal');
  dkdContent = dkdReplace(dkdContent,
    "versionText: { color: colors.textMuted, fontSize: 12, marginTop: 5, textAlign: 'center' } });",
    "versionText: { color: colors.textMuted, fontSize: 12, marginTop: 5, textAlign: 'center' }, avatarBadge: { position: 'absolute', right: 4, bottom: 4, width: 25, height: 25, borderRadius: 13, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.white, alignItems: 'center', justifyContent: 'center' }, supportButton: { minWidth: 132, height: 42, marginTop: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,.32)', backgroundColor: 'rgba(4,15,29,.28)', paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, supportButtonText: { color: colors.white, fontSize: 12, fontWeight: '900', letterSpacing: .5 } });",
    'Profile support styles');
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchCreatePass() {
  const dkdFile = 'src/screens/CreatePassScreen.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (dkdContent.includes('DKD_V0312_CREATE_PASS')) return;
  dkdContent = `// DKD_V0312_CREATE_PASS\n${dkdContent}`;
  dkdContent = dkdReplace(dkdContent,
    "import { Panel } from '../components/UI';",
    "import { Panel } from '../components/UI';\nimport { DkdPassRightsRewardModal } from '../components/DkdPassRightsRewardModal';\nimport { useCourierPassRights } from '../hooks/useCourierPassRights';",
    'CreatePass imports');
  dkdContent = dkdReplace(dkdContent,
    "export function CreatePassScreen({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {",
    "export function CreatePassScreen({ onBack, onCreated, onOpenPackages }: { onBack: () => void; onCreated: () => void; onOpenPackages: () => void }) {",
    'CreatePass props');
  dkdContent = dkdReplace(dkdContent,
    "  const { user, sites, gates, rules, createPass, acceptRule, loading } = useGate();",
    "  const { user, sites, gates, rules, createPass, acceptRule, loading } = useGate();\n  const { usage: dkdPassUsage, loading: dkdRightsLoading, refresh: dkdRefreshRights } = useCourierPassRights();\n  const [dkdRightsModal, setDkdRightsModal] = useState(false);",
    'CreatePass rights hook');
  dkdContent = dkdReplace(dkdContent,
    "    try {\n      const passId = await createPass({",
    "    if (dkdRightsLoading) { Alert.alert('Geçiş hakları kontrol ediliyor', 'Bir saniye sonra tekrar dene.'); return; }\n    if (!dkdPassUsage?.unlimited && Number(dkdPassUsage?.remaining ?? 0) <= 0) { setDkdRightsModal(true); return; }\n    try {\n      const passId = await createPass({",
    'CreatePass zero rights check');
  dkdContent = dkdReplace(dkdContent,
    "    } catch (error) {\n      Alert.alert('Talep gönderilemedi', error instanceof Error ? error.message : 'Tekrar dene.');",
    "    } catch (error) {\n      const dkdMessage = error instanceof Error ? error.message : 'Tekrar dene.';\n      if (dkdMessage.includes('DKD_GATE_NO_PASS_RIGHTS')) { setDkdRightsModal(true); return; }\n      Alert.alert('Talep gönderilemedi', dkdMessage);",
    'CreatePass backend rights error');
  dkdContent = dkdReplace(dkdContent,
    "  return (\n    <ScrollView",
    "  return (\n    <>\n    <ScrollView",
    'CreatePass fragment open');
  dkdContent = dkdReplace(dkdContent,
    "      </FadeInView>\n\n      <FadeInView delay={50}>",
    "      </FadeInView>\n\n      <FadeInView delay={35}><View style={s.dkdRightsCard}><View style={s.dkdRightsIcon}><Ionicons name=\"ticket\" size={22} color={colors.cyan} /></View><View style={s.headerCopy}><Text style={s.dkdRightsLabel}>TOPLAM KALAN GEÇİŞ HAKKI</Text><Text style={s.dkdRightsValue}>{dkdPassUsage?.unlimited ? 'Sınırsız' : dkdRightsLoading ? 'Kontrol ediliyor' : String(dkdPassUsage?.remaining ?? 0)}</Text><Text style={s.dkdRightsMeta}>{dkdPassUsage?.unlimited ? 'Profesyonel paket' : `${dkdPassUsage?.plan_remaining ?? 0} paket hakkı • ${dkdPassUsage?.bonus ?? 0} video ödülü`}</Text></View></View></FadeInView>\n\n      <FadeInView delay={50}>",
    'CreatePass rights card');
  dkdContent = dkdReplace(dkdContent,
    "      </AnimatedPressable>\n    </ScrollView>\n  );",
    "      </AnimatedPressable>\n    </ScrollView>\n    <DkdPassRightsRewardModal visible={dkdRightsModal} onClose={() => setDkdRightsModal(false)} onOpenPackages={onOpenPackages} onRewarded={dkdRefreshRights} />\n    </>\n  );",
    'CreatePass reward modal');
  dkdContent = dkdReplace(dkdContent,
    "  submitText: { color: colors.white, fontSize: 14, fontWeight: '900' },\n});",
    "  submitText: { color: colors.white, fontSize: 14, fontWeight: '900' },\n  dkdRightsCard: { minHeight: 82, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(55,216,255,.42)', backgroundColor: 'rgba(8,36,54,.84)', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11 },\n  dkdRightsIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(55,216,255,.13)', alignItems: 'center', justifyContent: 'center' },\n  dkdRightsLabel: { color: colors.textMuted, fontSize: 9, fontWeight: '900', letterSpacing: .8 },\n  dkdRightsValue: { color: colors.cyan, fontSize: 22, fontWeight: '900', marginTop: 2 },\n  dkdRightsMeta: { color: colors.textSoft, fontSize: 10, marginTop: 2 },\n});",
    'CreatePass rights styles');
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchCourierHome() {
  const dkdFile = 'src/screens/CourierHome.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (dkdContent.includes('DKD_V0312_COURIER_HOME')) return;
  dkdContent = `// DKD_V0312_COURIER_HOME\n${dkdContent}`;
  dkdContent = dkdReplace(dkdContent,
    "import { distanceMeters } from '../lib/airpass';",
    "import { distanceMeters } from '../lib/airpass';\nimport { useCourierPassRights } from '../hooks/useCourierPassRights';",
    'CourierHome rights import');
  dkdContent = dkdReplace(dkdContent,
    "  const own = passes.filter((pass) => pass.courierUserId === user?.id);",
    "  const { usage: dkdPassUsage } = useCourierPassRights();\n  const own = passes.filter((pass) => pass.courierUserId === user?.id);",
    'CourierHome rights hook');
  dkdContent = dkdReplace(dkdContent,
    "                <Text style={s.heroTitle}>Kod talep anında hazır.</Text>",
    "                <Text style={s.heroTitle}>{dkdPassUsage?.unlimited ? 'Sınırsız Geçiş Hakkı' : `Toplam ${dkdPassUsage?.remaining ?? 0} Geçiş Hakkın Kaldı`}</Text>",
    'CourierHome hero rights');
  dkdContent = dkdReplace(dkdContent,
    "                <Text style={s.heroText}>Sipariş görselini okut, geçiş talebini gönder; kapıya gelince hazır kodunu güvenliğe söyle.</Text>",
    "                <Text style={s.heroText}>{dkdPassUsage?.unlimited ? 'Profesyonel paketinle geçiş talebi sınırı bulunmuyor.' : `${dkdPassUsage?.plan_remaining ?? 0} paket hakkı ve ${dkdPassUsage?.bonus ?? 0} video ödülü kullanılabilir.`}</Text>",
    'CourierHome hero details');
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchCourierCenter() {
  const dkdFile = 'src/screens/CourierCenterV032.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (dkdContent.includes('DKD_V0312_COURIER_CENTER')) return;
  dkdContent = `// DKD_V0312_COURIER_CENTER\n${dkdContent}`;
  dkdContent = dkdReplace(dkdContent,
    "  usage: { used: number; limit: number };",
    "  usage: { used: number; limit: number; unlimited?: boolean; plan_remaining?: number | null; bonus?: number; remaining?: number | null; total_remaining?: number | null };",
    'CourierCenter usage type');
  dkdContent = dkdReplace(dkdContent,
    "export function CourierCenterV032() {\n  const [tab, setTab] = useState<'passes' | 'packages'>('passes');",
    "export function CourierCenterV032({ initialTab = 'passes' }: { initialTab?: 'passes' | 'packages' }) {\n  const [tab, setTab] = useState<'passes' | 'packages'>(initialTab);",
    'CourierCenter props');
  dkdContent = dkdReplace(dkdContent,
    "  useEffect(() => { void load(); }, []);",
    "  useEffect(() => { void load(); }, []);\n  useEffect(() => { setTab(initialTab); }, [initialTab]);",
    'CourierCenter tab effect');
  dkdContent = dkdReplace(dkdContent,
    "                    <Text style={s.usage}>{center.usage.used} / {center.usage.limit === 0 ? 'Sınırsız' : center.usage.limit} aylık geçiş</Text>",
    "                    <Text style={s.usage}>{center.usage.unlimited ? 'Sınırsız geçiş hakkı' : `${center.usage.remaining ?? 0} toplam hak kaldı`}</Text>",
    'CourierCenter usage title');
  dkdContent = dkdReplace(dkdContent,
    "                    <Text style={s.status}>{center.subscription?.billing_cycle ? `${cycleSuffix(center.subscription.billing_cycle)}lık plan` : 'ücretsiz plan'}</Text>",
    "                    <Text style={s.status}>{center.usage.unlimited ? 'profesyonel paket' : `${center.usage.plan_remaining ?? 0} paket • ${center.usage.bonus ?? 0} ödül`}</Text>",
    'CourierCenter usage status');
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchGateContext() {
  const dkdFile = 'src/store/GateContext.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (dkdContent.includes('DKD_V0312_GATE_CONTEXT')) return;
  dkdContent = `// DKD_V0312_GATE_CONTEXT\n${dkdContent}`;
  dkdContent = dkdReplace(dkdContent,
    "const dateValue = (value: unknown) => stringValue(value, new Date().toISOString());",
    "const dateValue = (value: unknown) => stringValue(value, new Date().toISOString());\nconst dkdOperationMessages: Record<string, { title: string; body: string }> = {\n  dkd_gate_update_profile: { title: 'Profil güncellendi', body: 'Profil bilgilerin başarıyla kaydedildi.' },\n  dkd_gate_upsert_resident_profile: { title: 'Adres kaydedildi', body: 'Site sakini adresin güncellendi.' },\n  dkd_gate_update_airpass: { title: 'Konum işlemi tamamlandı', body: 'Tek seferlik konum kontrolü güvenliğe gönderildi.' },\n  dkd_gate_accept_rule: { title: 'Kural onaylandı', body: 'Site veya kapı kuralı onayın kaydedildi.' },\n  dkd_gate_upsert_rule: { title: 'Kural kaydedildi', body: 'Site veya kapı kuralı başarıyla güncellendi.' },\n  dkd_gate_create_visitor_pass: { title: 'Misafir kodu hazır', body: 'Yeni misafir geçiş talebi oluşturuldu.' },\n  dkd_gate_create_dues_period: { title: 'Aidat dönemi oluşturuldu', body: 'Yeni aidat dönemi ve borç kayıtları hazırlandı.' },\n  dkd_gate_mark_due_paid: { title: 'Aidat durumu güncellendi', body: 'Aidat ödeme kaydı başarıyla değiştirildi.' },\n  dkd_gate_add_finance_transaction: { title: 'Finans hareketi eklendi', body: 'Gelir veya gider kaydı başarıyla oluşturuldu.' },\n  dkd_gate_set_finance_visibility: { title: 'Finans görünürlüğü güncellendi', body: 'Site sakini finans görünümü değiştirildi.' },\n  dkd_gate_load_demo_data: { title: 'Örnek veriler hazır', body: 'DraBornGate örnek verileri yüklendi.' },\n  dkd_gate_delete_demo_data: { title: 'Örnek veriler silindi', body: 'Sana ait örnek kayıtlar kaldırıldı.' },\n};",
    'GateContext operation map');
  dkdContent = dkdReplace(dkdContent,
    "  const rpcRefresh = useCallback(async <T,>(name: string, params?: Record<string, unknown>) => run(async () => { const { data, error: rpcError } = await supabase.rpc(name, params); if (rpcError) throw rpcError; await refresh(); return data as T; }), [refresh, run]);",
    "  const rpcRefresh = useCallback(async <T,>(name: string, params?: Record<string, unknown>) => run(async () => { const { data, error: rpcError } = await supabase.rpc(name, params); if (rpcError) throw rpcError; const dkdMessage = dkdOperationMessages[name]; if (dkdMessage) { await supabase.rpc('dkd_gate_notify_operation', { dkd_param_operation: name, dkd_param_title: dkdMessage.title, dkd_param_body: dkdMessage.body, dkd_param_data: {} }); } await refresh(); return data as T; }), [refresh, run]);",
    'GateContext persistent notifications');
  dkdWrite(dkdFile, dkdContent);
}

function dkdPatchGooglePlayButton() {
  const dkdFile = 'src/components/GooglePlaySubscriptionButton.tsx';
  let dkdContent = dkdRead(dkdFile);
  if (dkdContent.includes('DKD_V0312_PLAY_BILLING')) return;
  dkdContent = `// DKD_V0312_PLAY_BILLING\n${dkdContent}`;
  dkdContent = dkdReplace(dkdContent,
    "import React, { useEffect, useMemo } from 'react';",
    "import React, { useEffect, useMemo, useState } from 'react';",
    'Play Billing useState');
  dkdContent = dkdReplace(dkdContent,
    "  useEffect(() => { if (connected && plan.play_product_id) void fetchProducts({ skus: [plan.play_product_id], type: 'subs' }); }, [connected, fetchProducts, plan.play_product_id]);",
    "  const [dkdQueryAttempt, setDkdQueryAttempt] = useState(0);\n  useEffect(() => { if (connected && plan.play_product_id) void fetchProducts({ skus: [plan.play_product_id], type: 'subs' }); }, [connected, fetchProducts, plan.play_product_id, dkdQueryAttempt]);",
    'Play Billing query retry');
  dkdContent = dkdReplace(dkdContent,
    "    if (!product) return Alert.alert('Google Play ürünü bulunamadı', 'Ürün Play Console’da etkinleştirildikten ve test hesabına yayınlandıktan sonra tekrar dene.');",
    "    if (!connected) return Alert.alert('Google Play bağlantısı kurulamadı', 'Uygulamayı Play Store kapalı test bağlantısından yüklediğini, doğru test hesabıyla giriş yaptığını ve Play Store’un güncel olduğunu kontrol et.');\n    if (!product) return Alert.alert('Google Play ürünü bulunamadı', `Play Console ürününü ve temel planı etkinleştirip kapalı test sürümüne yayınla.\\n\\nÜrün: ${plan.play_product_id}\\nTemel plan: ${basePlanId || 'tanımsız'}`, [{ text: 'KAPAT', style: 'cancel' }, { text: 'TEKRAR SORGULA', onPress: () => setDkdQueryAttempt((dkdValue) => dkdValue + 1) }]);",
    'Play Billing diagnostic alert');
  dkdWrite(dkdFile, dkdContent);
}

function dkdRun() {
  dkdPatchApp();
  dkdPatchProfile();
  dkdPatchCreatePass();
  dkdPatchCourierHome();
  dkdPatchCourierCenter();
  dkdPatchGateContext();
  dkdPatchGooglePlayButton();
  console.log('DraBornGate v0.3.12 kaynak güncellemesi uygulandı.');
}

dkdRun();
