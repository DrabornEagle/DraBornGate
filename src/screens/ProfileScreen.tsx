import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AdminManagementApplications } from '../components/AdminManagementApplications';
import { DeliveryPlatformPicker } from '../components/DeliveryPlatformPicker';
import { AnimatedPressable, FadeInView } from '../components/Motion';
import { PrivateImage } from '../components/PrivateImage';
import { Panel, SectionTitle } from '../components/UI';
import { ANDROID_VERSION_CODE, APP_VERSION, DEMO_DATA_VERSION } from '../config/version';
import { useGateAdmin } from '../hooks/useGateAdmin';
import { selectAndUploadProfilePhoto } from '../lib/gateMedia';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { DeliveryPlatform, UserRole } from '../types';

const roleNames: Record<UserRole, string> = {
  courier: 'Kurye',
  security: 'Güvenlik',
  management: 'Site Yönetimi',
  resident: 'Site Sakini',
};

export function ProfileScreen({ role, onSwitchRole }: { role: UserRole; onSwitchRole: () => void }) {
  const gate = useGate();
  const { isAdmin, checkingAdmin } = useGateAdmin();
  const [name, setName] = useState(gate.profile?.fullName ?? '');
  const [phone, setPhone] = useState(gate.profile?.phone ?? '');
  const [plate, setPlate] = useState(gate.courierProfile?.plate ?? '');
  const [platform, setPlatform] = useState<DeliveryPlatform>(gate.courierProfile?.platform ?? 'DraBornGo');
  const [avatarPath, setAvatarPath] = useState(gate.profile?.avatarUrl ?? gate.courierProfile?.avatarUrl);
  const [uploading, setUploading] = useState(false);
  const [showSupabaseInfo, setShowSupabaseInfo] = useState(false);

  useEffect(() => {
    setName(gate.profile?.fullName ?? '');
    setPhone(gate.profile?.phone ?? '');
    setPlate(gate.courierProfile?.plate ?? '');
    setPlatform(gate.courierProfile?.platform ?? 'DraBornGo');
    setAvatarPath(gate.profile?.avatarUrl ?? gate.courierProfile?.avatarUrl);
  }, [gate.profile, gate.courierProfile]);

  const pickPhoto = async () => {
    if (!gate.user) return;
    setUploading(true);
    try {
      const path = await selectAndUploadProfilePhoto(gate.user.id);
      if (path) setAvatarPath(path);
    } catch (error) {
      Alert.alert('Fotoğraf yüklenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return Alert.alert('Ad soyad gerekli');
    try {
      await gate.updateProfile({
        fullName: name.trim(),
        phone: phone.trim(),
        preferredRole: role,
        platform,
        plate: plate.trim(),
        avatarUrl: avatarPath,
      });
      Alert.alert('Kaydedildi', 'Profil ve isteğe bağlı fotoğraf güvenli veritabanında güncellendi.');
    } catch (error) {
      Alert.alert('Kaydedilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    }
  };

  const loadDemo = () => Alert.alert(
    gate.settings?.demoDataVersion ? 'Örnek verileri güncelle' : 'Örnek verileri yükle',
    `Mevcut örnek kayıtlar silinip v${DEMO_DATA_VERSION} Kurye Geçişi, Akıllı Geçiş, Ziyaretçi Geçişi, sakin, kural ve finans örnekleri kurulacak. Gerçek kayıtlar korunur.`,
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Devam',
        onPress: async () => {
          try {
            const version = await gate.loadDemoData();
            Alert.alert('Örnek veriler hazır', `Örnek veri sürümü ${version} yüklendi.`);
          } catch (error) {
            Alert.alert('Yüklenemedi', error instanceof Error ? error.message : 'Tekrar dene.');
          }
        },
      },
    ],
  );

  const removeDemo = () => Alert.alert(
    'Örnek verileri sil',
    'Yalnızca size ait örnek site, kapı, kurye, misafir, aidat ve finans kayıtları silinir. Gerçek kayıtlar korunur.',
    [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await gate.deleteDemoData();
            Alert.alert('Silindi', `v${APP_VERSION} örnek kayıtları kaldırıldı.`);
          } catch (error) {
            Alert.alert('Silinemedi', error instanceof Error ? error.message : 'Tekrar dene.');
          }
        },
      },
    ],
  );

  const heroGradient = role === 'courier'
    ? gradients.courier
    : role === 'security'
      ? gradients.security
      : gradients.management;

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.content}
    >
      <FadeInView>
        <LinearGradient colors={heroGradient} style={s.hero}>
          <AnimatedPressable onPress={() => void pickPhoto()}>
            <View style={s.avatar}>
              {avatarPath ? (
                <PrivateImage path={avatarPath} style={s.avatarImage} />
              ) : (
                <Ionicons
                  name={role === 'courier' ? 'speedometer' : role === 'security' ? 'shield' : role === 'resident' ? 'home' : 'business'}
                  size={39}
                  color={colors.white}
                />
              )}
              {uploading ? <View style={s.uploading}><Text style={s.uploadingText}>YÜKLENİYOR</Text></View> : null}
            </View>
          </AnimatedPressable>
          <Text style={s.name}>{gate.profile?.fullName ?? 'DraBornGate Kullanıcısı'}</Text>
          <Text style={s.role}>{roleNames[role]} • ortak DraBornGo hesabı</Text>
          <Text style={s.photoHint}>Profil fotoğrafını değiştirmek için dokun</Text>
        </LinearGradient>
      </FadeInView>

      <FadeInView delay={70}>
        <SectionTitle title="Profil bilgileri" />
        <Panel style={s.form} gradient>
          <Field label="Ad Soyad" value={name} onChangeText={setName} />
          <Field label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          {role === 'courier' ? (
            <>
              <Field label="Motosiklet plakası" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
              <Text style={s.fieldLabel}>Teslimat platformu / kurum</Text>
              <DeliveryPlatformPicker value={platform} onChange={setPlatform} compact />
            </>
          ) : null}
          <AnimatedPressable onPress={() => void save()} disabled={gate.loading}>
            <LinearGradient colors={gradients.primary} style={s.save}>
              <Ionicons name="save" size={21} color={colors.white} />
              <Text style={s.saveText}>PROFİLİ KAYDET</Text>
            </LinearGradient>
          </AnimatedPressable>
        </Panel>
      </FadeInView>

      {role === 'resident' ? (
        <FadeInView delay={110}>
          <SectionTitle title="Site sakini adresleri" />
          {gate.residentProfiles.filter((item) => item.userId === gate.user?.id).length ? (
            <View style={s.menu}>
              {gate.residentProfiles.filter((item) => item.userId === gate.user?.id).map((item) => {
                const site = gate.sites.find((x) => x.id === item.siteId);
                return (
                  <Panel key={item.id} style={s.address} gradient>
                    <Ionicons name="home" size={24} color={colors.orange} />
                    <View style={s.copy}>
                      <Text style={s.menuTitle}>{site?.name ?? 'Site'}</Text>
                      <Text style={s.menuText}>{item.block} • Kat {item.floor} • Daire {item.apartment}{item.addressNote ? ` • ${item.addressNote}` : ''}</Text>
                    </View>
                  </Panel>
                );
              })}
            </View>
          ) : (
            <Panel><Text style={s.demoText}>Ana sayfadan site, blok, kat ve daire kaydını oluşturabilirsin.</Text></Panel>
          )}
        </FadeInView>
      ) : null}

      <FadeInView delay={150}>
        <SectionTitle title="Örnek veri yönetimi" />
        <Panel style={s.demoPanel} gradient>
          <View style={s.demoTop}>
            <View style={s.demoIcon}><Ionicons name="flask" size={26} color={colors.orange} /></View>
            <View style={s.copy}>
              <Text style={s.demoTitle}>{gate.settings?.demoDataVersion ? `Örnek veri v${gate.settings.demoDataVersion} yüklü` : 'Örnek veriler yüklü değil'}</Text>
              <Text style={s.demoText}>Her yeni uygulama sürümünde örnek veri paketi aynı sürüme güncellenir. Gerçek kayıtlar etkilenmez.</Text>
            </View>
          </View>
          <AnimatedPressable onPress={loadDemo}>
            <View style={s.demoButton}>
              <Ionicons name={gate.settings?.demoDataVersion === DEMO_DATA_VERSION ? 'refresh' : 'download'} size={20} color={colors.cyan} />
              <Text style={s.demoButtonText}>
                {gate.settings?.demoDataVersion === DEMO_DATA_VERSION
                  ? 'Örnek verileri yeniden yükle'
                  : gate.settings?.demoDataVersion
                    ? `Örnek verileri v${DEMO_DATA_VERSION} sürümüne güncelle`
                    : 'Örnek verileri yükle'}
              </Text>
            </View>
          </AnimatedPressable>
          {gate.settings?.demoDataVersion ? (
            <AnimatedPressable onPress={removeDemo}>
              <View style={s.deleteButton}>
                <Ionicons name="trash" size={20} color={colors.red} />
                <Text style={s.deleteText}>Örnek verileri sil</Text>
              </View>
            </AnimatedPressable>
          ) : null}
        </Panel>
      </FadeInView>

      {isAdmin ? (
        <FadeInView delay={190}>
          <SectionTitle title="Admin • Site yönetimi başvuruları" />
          <AdminManagementApplications />
        </FadeInView>
      ) : null}

      <FadeInView delay={220}>
        <SectionTitle title="Uygulama" />
        <View style={s.menu}>
          {isAdmin ? (
            <>
              <Menu
                icon="swap-horizontal"
                title="Rol değiştir"
                text="Kurye, güvenlik, site sakini veya yönetim görünümüne geç"
                tone={colors.cyan}
                onPress={onSwitchRole}
              />
              <Menu
                icon="server"
                title="Veritabanı ayrımı"
                text="DraBornGate veri mimarisi ve sürüm bilgileri"
                tone={colors.purple}
                onPress={() => setShowSupabaseInfo((value) => !value)}
              />
            </>
          ) : null}
          <Menu
            icon="log-out"
            title="Çıkış yap"
            text="Ortak oturumu bu cihazdan kapat"
            tone={colors.red}
            onPress={() => void gate.signOut()}
          />
        </View>
      </FadeInView>

      {isAdmin && showSupabaseInfo ? (
        <FadeInView delay={40}>
          <Panel style={s.adminInfo} gradient>
            <Text style={s.adminInfoTitle}>DraBornGate veri ayrımı</Text>
            <Text style={s.adminInfoText}>Şema: draborngate</Text>
            <Text style={s.adminInfoText}>Tablo standardı: dkd_gate_*</Text>
            <Text style={s.adminInfoText}>Ortak bölüm: yalnızca kullanıcı kimliği</Text>
            <Text style={s.adminInfoText}>DraBornGo ana tablolarına dokunulmaz.</Text>
          </Panel>
        </FadeInView>
      ) : null}

      {!checkingAdmin ? (
        <FadeInView delay={270} style={s.version}>
          <Text style={s.versionTitle}>DraBornGate v{APP_VERSION}</Text>
          <Text style={s.versionText}>Android sürüm kodu {ANDROID_VERSION_CODE} • Örnek veri sürümü {gate.release?.demoDataVersion ?? DEMO_DATA_VERSION}</Text>
        </FadeInView>
      ) : null}
    </ScrollView>
  );
}

function Field({ label, ...props }: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput {...props} style={s.input} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} />
    </View>
  );
}

function Menu({ icon, title, text, tone, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string; tone: string; onPress?: () => void }) {
  return (
    <AnimatedPressable onPress={onPress} disabled={!onPress}>
      <Panel style={[s.menuRow, { borderColor: `${tone}45` }]} gradient>
        <View style={[s.menuIcon, { backgroundColor: `${tone}1A` }]}><Ionicons name={icon} size={23} color={tone} /></View>
        <View style={s.copy}>
          <Text style={s.menuTitle}>{title}</Text>
          <Text style={s.menuText}>{text}</Text>
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={21} color={colors.textMuted} /> : null}
      </Panel>
    </AnimatedPressable>
  );
}

const s = StyleSheet.create({
  content: { padding: spacing.md, paddingTop: 12, paddingBottom: 126, gap: 23 },
  hero: { borderRadius: radius.xl, alignItems: 'center', padding: 26, borderWidth: 1, borderColor: 'rgba(255,255,255,.22)' },
  avatar: { width: 88, height: 88, borderRadius: 29, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 88, height: 88, borderRadius: 29 },
  uploading: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(6,16,29,.65)', alignItems: 'center', justifyContent: 'center' },
  uploadingText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  name: { color: colors.white, fontSize: 27, fontWeight: '900', marginTop: 13 },
  role: { color: 'rgba(255,255,255,.87)', fontSize: 15, marginTop: 5, fontWeight: '700' },
  photoHint: { color: 'rgba(255,255,255,.68)', fontSize: 11, marginTop: 6 },
  form: { gap: 14 },
  fieldLabel: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginBottom: 7 },
  input: { minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: colors.border, color: colors.text, paddingHorizontal: 14, fontSize: 16, fontWeight: '700' },
  save: { height: 58, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: colors.white, fontSize: 14, fontWeight: '900' },
  demoPanel: { gap: 11, borderColor: 'rgba(255,179,92,.35)' },
  demoTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  demoIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: 'rgba(255,179,92,.14)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  demoTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  demoText: { color: colors.textSoft, fontSize: 13, lineHeight: 20, marginTop: 3 },
  demoButton: { minHeight: 51, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 },
  demoButtonText: { color: colors.cyan, fontSize: 13, fontWeight: '900', textAlign: 'center' },
  deleteButton: { height: 49, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,101,125,.36)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  deleteText: { color: colors.red, fontSize: 13, fontWeight: '900' },
  menu: { gap: 10 },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  menuIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  menuTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  menuText: { color: colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 3 },
  address: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  adminInfo: { gap: 6, borderColor: 'rgba(139,107,255,.45)' },
  adminInfoTitle: { color: colors.purple, fontSize: 17, fontWeight: '900', marginBottom: 3 },
  adminInfoText: { color: colors.textSoft, fontSize: 13, lineHeight: 19 },
  version: { alignItems: 'center' },
  versionTitle: { color: colors.text, fontSize: 16, fontWeight: '900' },
  versionText: { color: colors.textMuted, fontSize: 12, marginTop: 5 },
});
