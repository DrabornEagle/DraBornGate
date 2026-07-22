import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, FadeInView, FloatingView, PulseDot } from '../components/Motion';
import { RacingMotorcycle } from '../components/RacingMotorcycle';
import { AppBackground, Panel } from '../components/UI';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { APP_VERSION } from '../config/version';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { signIn, signUp, loading, error } = useGate();
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submit = async () => {
    if (!email.trim() || password.length < 6 || (mode === 'register' && !fullName.trim())) return Alert.alert('Eksik bilgi', 'E-posta, en az 6 karakter şifre ve kayıt için ad soyad gerekli.');
    try {
      if (mode === 'login') await signIn(email, password);
      else {
        const result = await signUp(fullName, email, password);
        if (result.needsEmailConfirmation) Alert.alert('E-postanı doğrula', 'Hesabın oluşturuldu. E-posta doğrulamasından sonra DraBornGate veya DraBornGo üzerinden giriş yapabilirsin.');
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (caught) {
      Alert.alert('İşlem tamamlanamadı', caught instanceof Error ? caught.message : 'Lütfen tekrar dene.');
    }
  };
  return <AppBackground><KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}><FadeInView style={styles.status}><PulseDot color={colors.green} /><Text style={styles.statusText}>DRABORNGO ORTAK HESAP SİSTEMİ</Text></FadeInView><FadeInView delay={60} style={styles.hero}><FloatingView><LinearGradient colors={gradients.courier} style={styles.logo}><RacingMotorcycle color={colors.cyan} accentColor={colors.white} size={92} /></LinearGradient></FloatingView><Text style={styles.title}>DraBornGate</Text><Text style={styles.version}>KURYE × GÜVENLİK • v{APP_VERSION}</Text><Text style={styles.subtitle}>DraBornGo’da kullandığın hesapla giriş yapabilir, burada oluşturduğun hesabı DraBornGo’da kullanabilirsin.</Text></FadeInView><FadeInView delay={130}><Panel style={styles.form} gradient><View style={styles.tabs}>{(['login', 'register'] as Mode[]).map((item) => <AnimatedPressable key={item} containerStyle={styles.tabWrap} onPress={() => setMode(item)}><View style={[styles.tab, mode === item && styles.tabActive]}><Text style={[styles.tabText, mode === item && styles.tabTextActive]}>{item === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</Text></View></AnimatedPressable>)}</View>{mode === 'register' ? <Field icon="person" label="Ad Soyad" value={fullName} onChangeText={setFullName} autoCapitalize="words" /> : null}<Field icon="mail" label="E-posta" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" /><Field icon="lock-closed" label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />{error ? <View style={styles.error}><Ionicons name="warning" size={18} color={colors.red} /><Text style={styles.errorText}>{error}</Text></View> : null}<AnimatedPressable onPress={() => void submit()} disabled={loading}><LinearGradient colors={loading ? ['#395064', '#263A4B'] : gradients.primary} style={styles.button}><Ionicons name={mode === 'login' ? 'log-in' : 'person-add'} size={21} color={colors.white} /><Text style={styles.buttonText}>{loading ? 'İŞLEM YAPILIYOR' : mode === 'login' ? 'ORTAK HESAPLA GİRİŞ YAP' : 'ORTAK HESAP OLUŞTUR'}</Text></LinearGradient></AnimatedPressable></Panel></FadeInView><FadeInView delay={210} style={styles.note}><Ionicons name="shield-checkmark" size={17} color={colors.green} /><Text style={styles.noteText}>DraBornGate verileri ayrı şemada tutulur; yalnızca kullanıcı kimliği DraBornGo ile ortaktır.</Text></FadeInView></ScrollView></KeyboardAvoidingView></AppBackground>;
}

function Field(props: React.ComponentProps<typeof TextInput> & { icon: keyof typeof Ionicons.glyphMap; label: string }) { const { icon, label, ...inputProps } = props; return <View><Text style={styles.label}>{label}</Text><View style={styles.inputWrap}><Ionicons name={icon} size={20} color={colors.cyan} /><TextInput {...inputProps} style={styles.input} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View></View>; }
const styles = StyleSheet.create({ flex: { flex: 1 }, content: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, paddingVertical: 28, gap: 20 }, status: { alignSelf: 'center', height: 36, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: 'rgba(67,231,162,.35)', backgroundColor: 'rgba(67,231,162,.10)', flexDirection: 'row', alignItems: 'center', gap: 8 }, statusText: { color: colors.green, fontSize: 10, fontWeight: '900', letterSpacing: .6 }, hero: { alignItems: 'center' }, logo: { width: 116, height: 102, borderRadius: 34, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.24)' }, title: { color: colors.text, fontSize: 38, fontWeight: '900', marginTop: 15, letterSpacing: -1.2 }, version: { color: colors.cyan, fontSize: 12, fontWeight: '900', marginTop: 4, letterSpacing: 1 }, subtitle: { color: colors.textSoft, textAlign: 'center', fontSize: 14, lineHeight: 21, maxWidth: 350, marginTop: 10, fontWeight: '600' }, form: { gap: 14 }, tabs: { flexDirection: 'row', gap: 8 }, tabWrap: { flex: 1 }, tab: { height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }, tabActive: { backgroundColor: 'rgba(55,216,255,.13)', borderColor: colors.borderStrong }, tabText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' }, tabTextActive: { color: colors.cyan }, label: { color: colors.textSoft, fontSize: 12, fontWeight: '800', marginBottom: 7 }, inputWrap: { height: 54, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.03)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 10 }, input: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' }, button: { height: 58, borderRadius: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 3 }, buttonText: { color: colors.white, fontSize: 13, fontWeight: '900' }, error: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 10, borderRadius: 13, backgroundColor: 'rgba(255,101,125,.10)' }, errorText: { flex: 1, color: colors.red, fontSize: 12, lineHeight: 17, fontWeight: '700' }, note: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 8 }, noteText: { flex: 1, color: colors.textSoft, fontSize: 12, lineHeight: 18 } });
