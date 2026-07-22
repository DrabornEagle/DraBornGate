import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { PrivateImage } from '../components/PrivateImage';
import { Panel, SectionTitle } from '../components/UI';
import { ANDROID_VERSION_CODE, APP_VERSION, DEMO_DATA_VERSION } from '../config/version';
import { selectAndUploadProfilePhoto } from '../lib/gateMedia';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { DeliveryPlatform, UserRole } from '../types';

const roleNames: Record<UserRole, string> = { courier: 'Kurye', security: 'Güvenlik', management: 'Site Yönetimi', resident: 'Site Sakini' };

export function ProfileScreen({ role, onSwitchRole }: { role: UserRole; onSwitchRole: () => void }) {
  const gate = useGate();
  const [name, setName] = useState(gate.profile?.fullName ?? '');
  const [phone, setPhone] = useState(gate.profile?.phone ?? '');
  const [plate, setPlate] = useState(gate.courierProfile?.plate ?? '');
  const [platform, setPlatform] = useState<DeliveryPlatform>(gate.courierProfile?.platform ?? 'DraBornGo');
  const [avatarPath, setAvatarPath] = useState(gate.profile?.avatarUrl ?? gate.courierProfile?.avatarUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setName(gate.profile?.fullName ?? ''); setPhone(gate.profile?.phone ?? ''); setPlate(gate.courierProfile?.plate ?? ''); setPlatform(gate.courierProfile?.platform ?? 'DraBornGo'); setAvatarPath(gate.profile?.avatarUrl ?? gate.courierProfile?.avatarUrl);
  }, [gate.profile, gate.courierProfile]);

  const pickPhoto = async () => {
    if (!gate.user) return;
    setUploading(true);
    try { const path = await selectAndUploadProfilePhoto(gate.user.id); if (path) setAvatarPath(path); }
    catch (error) { Alert.alert('Fotoğraf yüklenemedi', error instanceof Error ? error.message : 'Tekrar dene.'); }
    finally { setUploading(false); }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Ad soyad gerekli');
    try {
      await gate.updateProfile({ fullName: name.trim(), phone: phone.trim(), preferredRole: role, platform, plate: plate.trim(), avatarUrl: avatarPath });
      Alert.alert('Kaydedildi', 'Profil ve isteğe bağlı fotoğraf Supabase üzerinde güncellendi.');
    } catch (error) { Alert.alert('Kaydedilemedi', error instanceof Error ? error.message : 'Tekrar dene.'); }
  };

  const loadDemo = () => Alert.alert(gate.settings?.demoDataVersion ? 'Demo verilerini güncelle' : 'Demo verilerini yükle', `Mevcut demo kayıtları silinip v${DEMO_DATA_VERSION} CourierPass, AirPass, VisitorPass, sakin, kural ve finans örnekleri kurulacak. Gerçek kayıtlar korunur.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Devam', onPress: async () => { try { const version = await gate.loadDemoData(); Alert.alert('Demo hazır', `Demo veri sürümü ${version} yüklendi.`); } catch (error) { Alert.alert('Yüklenemedi', error instanceof Error ? error.message : 'Tekrar dene.'); } } },
  ]);
  const removeDemo = () => Alert.alert('Demo verilerini sil', 'Yalnızca size ait demo site, kapı, kurye, misafir, aidat ve finans kayıtları silinir. Gerçek kayıtlar korunur.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: async () => { try { await gate.deleteDemoData(); Alert.alert('Silindi', 'v0.2 demo kayıtları kaldırıldı.'); } catch (error) { Alert.alert('Silinemedi', error instanceof Error ? error.message : 'Tekrar dene.'); } } },
  ]);

  const heroGradient = role === 'courier' ? gradients.courier : role === 'security' ? gradients.security : gradients.management;
  return <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
    <FadeInView><LinearGradient colors={heroGradient} style={s.hero}><AnimatedPressable onPress={() => void pickPhoto()}><View style={s.avatar}>{avatarPath ? <PrivateImage path={avatarPath} style={s.avatarImage} /> : <Ionicons name={role === 'courier' ? 'speedometer' : role === 'security' ? 'shield' : role === 'resident' ? 'home' : 'business'} size={39} color={colors.white} />}{uploading ? <View style={s.uploading}><Text style={s.uploadingText}>YÜKLENİYOR</Text></View> : null}</View></AnimatedPressable><Text style={s.name}>{gate.profile?.fullName ?? 'DraBornGate Kullanıcısı'}</Text><Text style={s.role}>{roleNames[role]} • ortak DraBornGo hesabı</Text><Text style={s.photoHint}>Profil fotoğrafını değiştirmek için dokun</Text></LinearGradient></FadeInView>

    <FadeInView delay={70}><SectionTitle title="Profil bilgileri" /><Panel style={s.form} gradient><Field label="Ad Soyad" value={name} onChangeText={setName} /><Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />{role === 'courier' ? <><Field label="Motosiklet plakası" value={plate} onChangeText={setPlate} autoCapitalize="characters" /><Text style={s.fieldLabel}>Teslimat platformu / kurum</Text><View style={s.platforms}>{(['DraBornGo', 'Trendyol Go', 'Yemeksepeti', 'Getir', 'Diğer'] as DeliveryPlatform[]).map((item) => <AnimatedPressable key={item} onPress={() => setPlatform(item)}><View style={[s.platform, platform === item && s.platformActive]}><Text style={[s.platformText, platform === item && s.platformTextActive]}>{item}</Text></View></AnimatedPressable>)}</View></> : null}<AnimatedPressable onPress={() => void save()} disabled={gate.loading}><LinearGradient colors={gradients.primary} style={s.save}><Ionicons name="save" size={20} color={colors.white} /><Text style={s.saveText}>PROFİLİ KAYDET</Text></LinearGradient></AnimatedPressable></Panel></FadeInView>

    {role === 'resident' ? <FadeInView delay={110}><SectionTitle title="Site sakini adresleri" />{gate.residentProfiles.filter((item) => item.userId === gate.user?.id).length ? <View style={s.menu}>{gate.residentProfiles.filter((item) => item.userId === gate.user?.id).map((item) => { const site = gate.sites.find((x) => x.id === item.siteId); return <Panel key={item.id} style={s.address} gradient><Ionicons name="home" size={23} color={colors.orange} /><View style={s.copy}><Text style={s.menuTitle}>{site?.name ?? 'Site'}</Text><Text style={s.menuText}>{item.block} • Kat {item.floor} • Daire {item.apartment}{item.addressNote ? ` • ${item.addressNote}` : ''}</Text></View></Panel>; })}</View> : <Panel><Text style={s.demoText}>Ana sayfadan site, blok, kat ve daire kaydını oluşturabilirsin.</Text></Panel>}</FadeInView> : null}

    <FadeInView delay={150}><SectionTitle title="Demo veri yönetimi" /><Panel style={s.demoPanel} gradient><View style={s.demoTop}><View style={s.demoIcon}><Ionicons name="flask" size={25} color={colors.orange} /></View><View style={s.copy}><Text style={s.demoTitle}>{gate.settings?.demoDataVersion ? `Demo v${gate.settings.demoDataVersion} yüklü` : 'Demo verileri yüklü değil'}</Text><Text style={s.demoText}>Her yeni uygulama sürümünde demo paketi aynı sürüme güncellenir. Gerçek kayıtlar etkilenmez.</Text></View></View><AnimatedPressable onPress={loadDemo}><View style={s.demoButton}><Ionicons name={gate.settings?.demoDataVersion === DEMO_DATA_VERSION ? 'refresh' : 'download'} size={20} color={colors.cyan} /><Text style={s.demoButtonText}>{gate.settings?.demoDataVersion === DEMO_DATA_VERSION ? 'Demo verilerini yeniden yükle' : gate.settings?.demoDataVersion ? `Demo verilerini v${DEMO_DATA_VERSION} sürümüne güncelle` : 'Demo verilerini yükle'}</Text></View></AnimatedPressable>{gate.settings?.demoDataVersion ? <AnimatedPressable onPress={removeDemo}><View style={s.deleteButton}><Ionicons name="trash" size={20} color={colors.red} /><Text style={s.deleteText}>Demo verilerini sil</Text></View></AnimatedPressable> : null}</Panel></FadeInView>

    <FadeInView delay={210}><SectionTitle title="Uygulama" /><View style={s.menu}><Menu icon="swap-horizontal" title="Rol değiştir" text="Kurye, güvenlik, site sakini veya yönetim görünümüne geç" tone={colors.cyan} onPress={onSwitchRole} /><Menu icon="server" title="Supabase ayrımı" text="draborngate şeması • dkd_gate_* tabloları" tone={colors.purple} /><Menu icon="log-out" title="Çıkış yap" text="Ortak oturumu bu cihazdan kapat" tone={colors.red} onPress={() => void gate.signOut()} /></View></FadeInView>
    <FadeInView delay={260} style={s.version}><Text style={s.versionTitle}>DraBornGate v{APP_VERSION}</Text><Text style={s.versionText}>Android versionCode {ANDROID_VERSION_CODE} • Demo {gate.release?.demoDataVersion ?? DEMO_DATA_VERSION}</Text></FadeInView>
  </ScrollView>;
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) { return <View><Text style={s.fieldLabel}>{label}</Text><TextInput {...props} style={s.input} placeholderTextColor={colors.textMuted} /></View>; }
function Menu({ icon, title, text, tone, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; tone: string; onPress?: () => void }) { return <AnimatedPressable onPress={onPress} disabled={!onPress}><Panel style={[s.menuRow, { borderColor: `${tone}45` }]} gradient><View style={[s.menuIcon, { backgroundColor: `${tone}1A` }]}><Ionicons name={icon} size={22} color={tone} /></View><View style={s.copy}><Text style={s.menuTitle}>{title}</Text><Text style={s.menuText}>{text}</Text></View>{onPress ? <Ionicons name="chevron-forward" size={20} color={colors.textMuted} /> : null}</Panel></AnimatedPressable>; }

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 114, gap: 21 }, hero: { borderRadius: radius.xl, alignItems: 'center', padding: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' }, avatar: { width: 84, height: 84, borderRadius: 28, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, avatarImage: { width: 84, height: 84, borderRadius: 28 }, uploading: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(6,16,29,.65)', alignItems: 'center', justifyContent: 'center' }, uploadingText: { color: colors.white, fontSize: 8, fontWeight: '900' }, name: { color: colors.white, fontSize: 24, fontWeight: '900', marginTop: 12 }, role: { color: 'rgba(255,255,255,.84)', fontSize: 13, marginTop: 4, fontWeight: '700' }, photoHint: { color: 'rgba(255,255,255,.62)', fontSize: 9, marginTop: 5 },
  form: { gap: 12 }, fieldLabel: { color: colors.textSoft, fontSize: 10, fontWeight: '900', marginBottom: 6 }, input: { height: 51, borderRadius: 16, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 12, fontSize: 13, fontWeight: '700' }, platforms: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, platform: { height: 38, paddingHorizontal: 10, borderRadius: 13, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, platformActive: { borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.1)' }, platformText: { color: colors.textMuted, fontSize: 10, fontWeight: '900' }, platformTextActive: { color: colors.cyan }, save: { height: 54, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, saveText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  demoPanel: { gap: 10, borderColor: 'rgba(255,179,92,.35)' }, demoTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, demoIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,179,92,.14)', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, demoTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, demoText: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 3 }, demoButton: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 }, demoButtonText: { color: colors.cyan, fontSize: 11, fontWeight: '900', textAlign: 'center' }, deleteButton: { height: 46, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,101,125,.36)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, deleteText: { color: colors.red, fontSize: 11, fontWeight: '900' },
  menu: { gap: 9 }, menuRow: { flexDirection: 'row', alignItems: 'center', gap: 10 }, menuIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, menuTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, menuText: { color: colors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 3 }, address: { flexDirection: 'row', alignItems: 'center', gap: 10 }, version: { alignItems: 'center' }, versionTitle: { color: colors.text, fontSize: 14, fontWeight: '900' }, versionText: { color: colors.textMuted, fontSize: 10, marginTop: 4 },
});
