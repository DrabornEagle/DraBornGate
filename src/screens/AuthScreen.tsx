import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { DeliveryPlatformPicker } from '../components/DeliveryPlatformPicker';
import { AnimatedPressable, FadeInView, FloatingView, PulseDot } from '../components/Motion';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import { AppBackground, Panel } from '../components/UI';
import { APP_VERSION } from '../config/version';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { DeliveryPlatform } from '../types';

type Mode = 'login' | 'register';
type RegistrationRole = 'courier' | 'management';

export function AuthScreen() {
  const { signIn, loading, error } = useGate();
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<Mode>('login');
  const [registrationRole, setRegistrationRole] = useState<RegistrationRole>('courier');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [plate, setPlate] = useState('');
  const [platform, setPlatform] = useState<DeliveryPlatform>('DraBornGo');
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [city, setCity] = useState('Antalya');

  const busy = loading || submitting;

  const submit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || password.length < 6) {
      Alert.alert('Eksik bilgi', 'E-posta ve en az 6 karakter şifre gerekli.');
      return;
    }

    if (mode === 'register') {
      const missing: string[] = [];
      if (!fullName.trim()) missing.push('Ad Soyad');
      if (!phone.trim()) missing.push('Telefon');
      if (registrationRole === 'courier' && !plate.trim()) missing.push('Motosiklet plakası');
      if (registrationRole === 'management' && !siteName.trim()) missing.push('Site adı');
      if (registrationRole === 'management' && !siteAddress.trim()) missing.push('Site adresi');
      if (registrationRole === 'management' && !city.trim()) missing.push('Şehir');
      if (missing.length) {
        Alert.alert('Eksik bilgi', `Şu alanları doldur: ${missing.join(', ')}`);
        return;
      }
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await signIn(normalizedEmail, password);
      } else {
        const metadata = registrationRole === 'courier'
          ? {
              full_name: fullName.trim(),
              phone: phone.trim(),
              source_app: 'DraBornGate',
              signup_role: 'courier',
              delivery_platform: platform,
              motorcycle_plate: plate.trim().toUpperCase(),
            }
          : {
              full_name: fullName.trim(),
              phone: phone.trim(),
              source_app: 'DraBornGate',
              signup_role: 'management',
              site_name: siteName.trim(),
              site_address: siteAddress.trim(),
              city: city.trim(),
            };

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: { data: metadata },
        });
        if (signUpError) throw signUpError;

        if (data.session && registrationRole === 'management') {
          const { error: applicationError } = await supabase.rpc('dkd_gate_submit_management_application', {
            p_full_name: fullName.trim(),
            p_phone: phone.trim(),
            p_site_name: siteName.trim(),
            p_site_address: siteAddress.trim(),
            p_city: city.trim(),
          });
          if (applicationError) throw applicationError;
        }

        if (!data.session) {
          Alert.alert(
            'E-postanı doğrula',
            registrationRole === 'management'
              ? 'Hesabın ve Site Yönetimi başvurun oluşturuldu. E-posta doğrulamasından sonra giriş yapabilirsin; panel Admin onayından sonra açılır.'
              : 'Hesabın oluşturuldu. E-posta doğrulamasından sonra DraBornGate veya DraBornGo üzerinden giriş yapabilirsin.',
          );
        } else if (registrationRole === 'management') {
          Alert.alert('Başvuru alındı', 'Site Yönetim Panelin, DraBornGate Admin onayından sonra otomatik açılacak.');
        }
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      Alert.alert('İşlem tamamlanamadı', caught instanceof Error ? caught.message : 'Lütfen tekrar dene.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppBackground>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 20 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <FadeInView style={styles.status}>
            <PulseDot color={colors.green} />
            <Text style={styles.statusText}>DRABORNGO ORTAK HESAP SİSTEMİ</Text>
          </FadeInView>

          <FadeInView delay={60} style={styles.hero}>
            <FloatingView>
              <LinearGradient colors={gradients.courier} style={styles.logo}>
                <RacingMotorcycle color={colors.cyan} accentColor={colors.white} size={92} />
              </LinearGradient>
            </FloatingView>
            <Text style={styles.title}>DraBornGate</Text>
            <Text style={styles.version}>KURYE × GÜVENLİK • v{APP_VERSION}</Text>
            <Text style={styles.subtitle}>
              DraBornGo’da kullandığın hesapla giriş yapabilir, burada oluşturduğun hesabı DraBornGo’da kullanabilirsin.
            </Text>
          </FadeInView>

          <FadeInView delay={130}>
            <Panel style={styles.form} gradient>
              <View style={styles.tabs}>
                {(['login', 'register'] as Mode[]).map((item) => (
                  <AnimatedPressable key={item} containerStyle={styles.tabWrap} onPress={() => setMode(item)}>
                    <View style={[styles.tab, mode === item && styles.tabActive]}>
                      <Text style={[styles.tabText, mode === item && styles.tabTextActive]}>
                        {item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}
                      </Text>
                    </View>
                  </AnimatedPressable>
                ))}
              </View>

              {mode === 'register' ? (
                <>
                  <Text style={styles.groupLabel}>HESAP TÜRÜ</Text>
                  <View style={styles.roleGrid}>
                    <RoleChoice
                      active={registrationRole === 'courier'}
                      icon="bicycle"
                      title="Kurye"
                      text="Geçiş talebi oluştur"
                      tone={colors.cyan}
                      onPress={() => setRegistrationRole('courier')}
                    />
                    <RoleChoice
                      active={registrationRole === 'management'}
                      icon="business"
                      title="Site Yönetimi"
                      text="Admin onayı gerekir"
                      tone={colors.magenta}
                      onPress={() => setRegistrationRole('management')}
                    />
                  </View>
                  <Field icon="person" label="Ad Soyad" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
                  <Field icon="call" label="Telefon" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </>
              ) : null}

              <Field icon="mail" label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
              <Field icon="lock-closed" label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />

              {mode === 'register' && registrationRole === 'courier' ? (
                <>
                  <Field icon="card" label="Motosiklet plakası" value={plate} onChangeText={setPlate} autoCapitalize="characters" />
                  <Text style={styles.groupLabel}>TESLİMAT PLATFORMU / KURUM</Text>
                  <DeliveryPlatformPicker value={platform} onChange={setPlatform} />
                </>
              ) : null}

              {mode === 'register' && registrationRole === 'management' ? (
                <View style={styles.managementFields}>
                  <View style={styles.approvalNote}>
                    <Ionicons name="shield-checkmark" size={21} color={colors.orange} />
                    <Text style={styles.approvalText}>Site bilgileri Admin tarafından incelenir. Onaydan sonra yönetim paneli ve site kaydı otomatik açılır.</Text>
                  </View>
                  <Field icon="business" label="Site / Apartman adı" value={siteName} onChangeText={setSiteName} autoCapitalize="words" />
                  <Field icon="location" label="Site adresi" value={siteAddress} onChangeText={setSiteAddress} multiline />
                  <Field icon="map" label="Şehir" value={city} onChangeText={setCity} autoCapitalize="words" />
                </View>
              ) : null}

              {error ? (
                <View style={styles.error}>
                  <Ionicons name="warning" size={18} color={colors.red} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <AnimatedPressable onPress={() => void submit()} disabled={busy}>
                <LinearGradient colors={busy ? ['#395064', '#263A4B'] : gradients.primary} style={styles.button}>
                  <Ionicons name={mode === 'login' ? 'log-in' : 'person-add'} size={22} color={colors.white} />
                  <Text style={styles.buttonText}>{busy ? 'İşlem yapılıyor' : mode === 'login' ? 'Giriş Yap' : 'Hesap Oluştur'}</Text>
                </LinearGradient>
              </AnimatedPressable>
            </Panel>
          </FadeInView>

          <FadeInView delay={210} style={styles.note}>
            <Ionicons name="shield-checkmark" size={18} color={colors.green} />
            <Text style={styles.noteText}>DraBornGate verileri ayrı şemada tutulur; yalnızca kullanıcı kimliği DraBornGo ile ortaktır.</Text>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </AppBackground>
  );
}

function Field(props: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const { icon, label, multiline, ...inputProps } = props;
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, multiline && styles.inputWrapMultiline]}>
        <Ionicons name={icon} size={21} color={colors.cyan} />
        <TextInput
          {...inputProps}
          multiline={multiline}
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.cyan}
        />
      </View>
    </View>
  );
}

function RoleChoice({ active, icon, title, text, tone, onPress }: { active: boolean; icon: keyof typeof Ionicons.glyphMap; title: string; text: string; tone: string; onPress: () => void }) {
  return (
    <AnimatedPressable containerStyle={styles.roleWrap} onPress={onPress}>
      <View style={[styles.roleCard, active && { borderColor: tone, backgroundColor: `${tone}12` }]}>
        <View style={[styles.roleIcon, { backgroundColor: `${tone}1C` }]}><Ionicons name={icon} size={25} color={tone} /></View>
        <Text style={styles.roleTitle}>{title}</Text>
        <Text style={styles.roleText}>{text}</Text>
        <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={active ? tone : colors.textMuted} />
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: spacing.lg, paddingTop: 28, paddingBottom: 46, gap: 20 },
  status: { alignSelf: 'center', minHeight: 38, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(67,231,162,.35)', backgroundColor: 'rgba(67,231,162,.10)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: colors.green, fontSize: 11, fontWeight: '900', letterSpacing: .6 },
  hero: { alignItems: 'center' },
  logo: { width: 116, height: 102, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.24)' },
  title: { color: colors.text, fontSize: 39, fontWeight: '900', marginTop: 15, letterSpacing: -1.2 },
  version: { color: colors.cyan, fontSize: 13, fontWeight: '900', marginTop: 4, letterSpacing: 1 },
  subtitle: { color: colors.textSoft, textAlign: 'center', fontSize: 15, lineHeight: 23, maxWidth: 360, marginTop: 10, fontWeight: '600' },
  form: { gap: 15 },
  tabs: { flexDirection: 'row', gap: 8 },
  tabWrap: { flex: 1 },
  tab: { height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  tabActive: { backgroundColor: 'rgba(55,216,255,.13)', borderColor: colors.borderStrong },
  tabText: { color: colors.textMuted, fontSize: 14, fontWeight: '800' },
  tabTextActive: { color: colors.cyan },
  groupLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '900', letterSpacing: .6, marginTop: 2 },
  roleGrid: { flexDirection: 'row', gap: 9 },
  roleWrap: { flex: 1 },
  roleCard: { minHeight: 132, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', padding: 10 },
  roleIcon: { width: 47, height: 47, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  roleTitle: { color: colors.text, fontSize: 15, fontWeight: '900', marginTop: 8 },
  roleText: { color: colors.textSoft, fontSize: 10, textAlign: 'center', marginTop: 3, marginBottom: 7 },
  label: { color: colors.textSoft, fontSize: 13, fontWeight: '900', marginBottom: 7 },
  inputWrap: { minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.03)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 },
  inputWrapMultiline: { minHeight: 92, alignItems: 'flex-start', paddingTop: 16 },
  input: { flex: 1, minHeight: 56, color: colors.text, fontSize: 16, fontWeight: '700' },
  inputMultiline: { minHeight: 75, textAlignVertical: 'top', paddingTop: 0 },
  managementFields: { gap: 15 },
  approvalNote: { borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,179,92,.36)', backgroundColor: 'rgba(255,179,92,.08)', padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  approvalText: { flex: 1, color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  button: { height: 61, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 3 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '900' },
  error: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 13, backgroundColor: 'rgba(255,101,125,.10)' },
  errorText: { flex: 1, color: colors.red, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8 },
  noteText: { flex: 1, color: colors.textSoft, fontSize: 13, lineHeight: 19 },
});
