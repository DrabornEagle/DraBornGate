import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { APP_VERSION, ANDROID_VERSION_CODE } from '../config/version';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { AnimatedPressable } from './Motion';

const dkdSupportTypes = ['Uygulama hatası', 'Geçiş işlemi', 'Paket / abonelik', 'Bildirim sorunu', 'Hesap / profil', 'Diğer'] as const;

export function DkdSupportCenterModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const dkdGate = useGate();
  const [dkdFullName, setDkdFullName] = useState(dkdGate.profile?.fullName ?? '');
  const [dkdEmail, setDkdEmail] = useState(dkdGate.user?.email ?? '');
  const [dkdPlate, setDkdPlate] = useState(dkdGate.courierProfile?.plate ?? '');
  const [dkdSupportType, setDkdSupportType] = useState<(typeof dkdSupportTypes)[number]>('Uygulama hatası');
  const [dkdDetails, setDkdDetails] = useState('');
  const [dkdSending, setDkdSending] = useState(false);
  const [dkdResult, setDkdResult] = useState<{ title: string; message: string; success: boolean }>();

  useEffect(() => {
    if (!visible) return;
    setDkdFullName(dkdGate.profile?.fullName ?? '');
    setDkdEmail(dkdGate.user?.email ?? '');
    setDkdPlate(dkdGate.courierProfile?.plate ?? '');
    setDkdResult(undefined);
  }, [dkdGate.courierProfile?.plate, dkdGate.profile?.fullName, dkdGate.user?.email, visible]);

  const dkdSend = async () => {
    if (dkdFullName.trim().length < 2) return setDkdResult({ success: false, title: 'Ad Soyad gerekli', message: 'Destek ekibinin sana doğru şekilde ulaşabilmesi için adını yaz.' });
    if (!/^\S+@\S+\.\S+$/.test(dkdEmail.trim())) return setDkdResult({ success: false, title: 'E-posta gerekli', message: 'Geçerli bir e-posta adresi yaz.' });
    if (dkdDetails.trim().length < 10) return setDkdResult({ success: false, title: 'Biraz daha ayrıntı gerekli', message: 'Sorunu en az 10 karakterle anlat.' });

    setDkdSending(true);
    setDkdResult(undefined);
    try {
      const dkdResponse = await supabase.functions.invoke('dkd-gate-support-mail', {
        body: {
          fullName: dkdFullName.trim(),
          email: dkdEmail.trim().toLowerCase(),
          plate: dkdPlate.trim().toUpperCase(),
          supportType: dkdSupportType,
          details: dkdDetails.trim(),
          appVersion: APP_VERSION,
          androidVersionCode: ANDROID_VERSION_CODE,
          deviceInfo: { os: Platform.OS, osVersion: Platform.Version },
        },
      });
      if (dkdResponse.error) throw dkdResponse.error;
      if (!dkdResponse.data?.ok) throw new Error(dkdResponse.data?.message || 'Destek talebi gönderilemedi.');
      setDkdResult({
        success: true,
        title: 'Destek talebin gönderildi',
        message: dkdResponse.data?.mailSent
          ? 'Talebin kaydedildi ve support@draborneagle.com adresine e-posta gönderildi.'
          : 'Talebin güvenli destek merkezine kaydedildi. E-posta teslim durumu teknik ekip tarafından kontrol edilecek.',
      });
      setDkdDetails('');
      await dkdGate.refresh();
    } catch (dkdError) {
      setDkdResult({ success: false, title: 'Gönderilemedi', message: dkdError instanceof Error ? dkdError.message : 'Bağlantını kontrol edip tekrar dene.' });
    } finally {
      setDkdSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <KeyboardAvoidingView style={dkdStyles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={dkdStyles.sheet}>
          <LinearGradient colors={gradients.courier} style={dkdStyles.header}>
            <View style={dkdStyles.headerIcon}><Ionicons name="headset" size={27} color={colors.white} /></View>
            <View style={dkdStyles.copy}>
              <Text style={dkdStyles.title}>DraBornGate Destek</Text>
              <Text style={dkdStyles.subtitle}>Sorunu ayrıntılarıyla gönder, talebin doğrudan destek merkezine ulaşsın.</Text>
            </View>
            <AnimatedPressable onPress={onClose}><View style={dkdStyles.close}><Ionicons name="close" size={23} color={colors.white} /></View></AnimatedPressable>
          </LinearGradient>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={dkdStyles.content}>
            <DkdField label="Ad Soyad" value={dkdFullName} onChangeText={setDkdFullName} icon="person" />
            <DkdField label="E-posta" value={dkdEmail} onChangeText={setDkdEmail} icon="mail" keyboardType="email-address" autoCapitalize="none" />
            <DkdField label="Plaka" value={dkdPlate} onChangeText={setDkdPlate} icon="bicycle" autoCapitalize="characters" />

            <Text style={dkdStyles.label}>Destek Türü</Text>
            <View style={dkdStyles.chips}>
              {dkdSupportTypes.map((dkdType) => (
                <AnimatedPressable key={dkdType} onPress={() => setDkdSupportType(dkdType)}>
                  <View style={[dkdStyles.chip, dkdSupportType === dkdType && dkdStyles.chipActive]}>
                    <Text style={[dkdStyles.chipText, dkdSupportType === dkdType && dkdStyles.chipTextActive]}>{dkdType}</Text>
                  </View>
                </AnimatedPressable>
              ))}
            </View>

            <Text style={dkdStyles.label}>Sorunu Anlat</Text>
            <TextInput
              value={dkdDetails}
              onChangeText={setDkdDetails}
              multiline
              textAlignVertical="top"
              placeholder="Ne yaptığını, ne olmasını beklediğini ve gördüğün hatayı yaz..."
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.cyan}
              style={dkdStyles.details}
              maxLength={4000}
            />
            <Text style={dkdStyles.counter}>{dkdDetails.length} / 4000</Text>

            {dkdResult ? (
              <View style={[dkdStyles.result, { borderColor: dkdResult.success ? 'rgba(67,231,162,.45)' : 'rgba(255,101,125,.45)' }]}>
                <Ionicons name={dkdResult.success ? 'checkmark-circle' : 'alert-circle'} size={25} color={dkdResult.success ? colors.green : colors.red} />
                <View style={dkdStyles.copy}><Text style={[dkdStyles.resultTitle, { color: dkdResult.success ? colors.green : colors.red }]}>{dkdResult.title}</Text><Text style={dkdStyles.resultText}>{dkdResult.message}</Text></View>
              </View>
            ) : null}

            <AnimatedPressable onPress={() => void dkdSend()} disabled={dkdSending}>
              <LinearGradient colors={dkdSending ? ['#41505F', '#263646'] : gradients.success} style={dkdStyles.send}>
                {dkdSending ? <ActivityIndicator color={colors.background} /> : <Ionicons name="send" size={21} color={colors.background} />}
                <Text style={dkdStyles.sendText}>{dkdSending ? 'GÖNDERİLİYOR' : 'DESTEK TALEBİNİ GÖNDER'}</Text>
              </LinearGradient>
            </AnimatedPressable>
            <Text style={dkdStyles.version}>DraBornGate v{APP_VERSION} • Android kodu {ANDROID_VERSION_CODE}</Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DkdField({ label, icon, ...props }: React.ComponentProps<typeof TextInput> & { label: string; icon: keyof typeof Ionicons.glyphMap }) {
  return <View><Text style={dkdStyles.label}>{label}</Text><View style={dkdStyles.inputWrap}><Ionicons name={icon} size={19} color={colors.cyan} /><TextInput {...props} style={dkdStyles.input} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View></View>;
}

const dkdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,5,12,.82)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', backgroundColor: '#071321', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: colors.borderStrong, overflow: 'hidden' },
  header: { minHeight: 112, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: 11 },
  headerIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,255,255,.16)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 }, title: { color: colors.white, fontSize: 23, fontWeight: '900' }, subtitle: { color: 'rgba(255,255,255,.76)', fontSize: 12, lineHeight: 18, marginTop: 4 },
  close: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center' },
  content: { padding: spacing.md, paddingBottom: 34, gap: 13 }, label: { color: colors.textSoft, fontSize: 12, fontWeight: '900', marginBottom: 6 },
  inputWrap: { height: 54, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(12,28,45,.76)' },
  input: { flex: 1, color: colors.text, fontSize: 15, fontWeight: '700' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { minHeight: 39, borderRadius: 14, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  chipActive: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.12)' }, chipText: { color: colors.textSoft, fontSize: 11, fontWeight: '800' }, chipTextActive: { color: colors.cyan },
  details: { minHeight: 132, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(12,28,45,.76)', color: colors.text, padding: 13, fontSize: 14, lineHeight: 20 },
  counter: { color: colors.textMuted, fontSize: 10, textAlign: 'right', marginTop: -8 }, result: { borderRadius: 17, borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(10,25,40,.82)' },
  resultTitle: { fontSize: 14, fontWeight: '900' }, resultText: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 3 },
  send: { minHeight: 58, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 }, sendText: { color: colors.background, fontSize: 13, fontWeight: '900' },
  version: { color: colors.textMuted, textAlign: 'center', fontSize: 10 },
});
