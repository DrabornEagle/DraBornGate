import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  AnimatedMotorcycle,
  AnimatedPressable,
  FadeInView,
  FloatingView,
  PulseDot,
} from '../components/Motion';
import { Panel } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, gradients, radius, spacing } from '../theme';
import { DeliveryPlatform } from '../types';

const platforms: DeliveryPlatform[] = [
  'DraBornGo',
  'Trendyol Go',
  'Yemeksepeti',
  'Getir',
  'Diğer',
];

export function CreatePassScreen({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: () => void;
}) {
  const { createPass } = useDemo();
  const [platform, setPlatform] = useState<DeliveryPlatform>('DraBornGo');
  const [site, setSite] = useState('DraBorn Marina Evleri');
  const [gate, setGate] = useState('A Kapısı');
  const [block, setBlock] = useState('B Blok');
  const [apartment, setApartment] = useState('18');
  const [orderNumber, setOrderNumber] = useState(
    `DBG-${Math.floor(100000 + Math.random() * 899999)}`,
  );
  const [note, setNote] = useState('Temassız teslimat');
  const [imageUri, setImageUri] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);

  const valid = useMemo(
    () =>
      Boolean(
        site.trim() &&
          gate.trim() &&
          block.trim() &&
          apartment.trim() &&
          orderNumber.trim(),
      ),
    [site, gate, block, apartment, orderNumber],
  );

  const scan = async (uri?: string) => {
    if (uri) setImageUri(uri);
    setScanning(true);
    setScanned(false);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setPlatform('DraBornGo');
    setSite('DraBorn Marina Evleri');
    setGate('A Kapısı');
    setBlock('B Blok');
    setApartment('18');
    setOrderNumber(`DBG-${Math.floor(100000 + Math.random() * 899999)}`);
    setScanning(false);
    setScanned(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return Alert.alert(
        'Galeri izni gerekli',
        'Sipariş ekran görüntüsünü seçmek için galeri izni ver.',
      );
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await scan(result.assets[0].uri);
    }
  };

  const submit = () => {
    if (!valid) {
      return Alert.alert(
        'Eksik bilgi',
        'Site, kapı, blok, daire ve sipariş numarasını doldur.',
      );
    }
    createPass({
      platform,
      site: site.trim(),
      gate: gate.trim(),
      block: block.trim(),
      apartment: apartment.trim(),
      orderNumber: orderNumber.trim(),
      note: note.trim(),
      screenshotUri: imageUri,
    });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreated();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
      >
        <FadeInView style={styles.header}>
          <AnimatedPressable onPress={onBack}>
            <View style={styles.back}>
              <Ionicons name="arrow-back" size={23} color={colors.text} />
            </View>
          </AnimatedPressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Yeni CourierPass</Text>
            <Text style={styles.subtitle}>Sipariş bilgilerini tara ve güvenliğe gönder</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepText}>v0.1</Text>
          </View>
        </FadeInView>

        <FadeInView delay={80}>
          <Text style={styles.label}>SİPARİŞ EKRAN GÖRÜNTÜSÜ</Text>
          <Panel style={styles.scanPanel} gradient>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.preview} />
            ) : (
              <FloatingView style={styles.scanIcon} distance={6} duration={1600}>
                {scanning ? (
                  <PulseDot color={colors.cyan} size={22} />
                ) : (
                  <AnimatedMotorcycle color={colors.cyan} size={49} />
                )}
              </FloatingView>
            )}
            <Text style={styles.scanTitle}>
              {scanning
                ? 'Sipariş analiz ediliyor...'
                : scanned
                  ? 'Demo analiz tamamlandı'
                  : 'Sipariş ekranını tara'}
            </Text>
            <Text style={styles.scanText}>
              Demo OCR; site, blok, daire ve sipariş numarasını örnek verilerle doldurur.
            </Text>
            <View style={styles.scanActions}>
              <AnimatedPressable containerStyle={styles.actionWrap} onPress={pickImage}>
                <View style={styles.outlineButton}>
                  <Ionicons name="images" size={20} color={colors.cyan} />
                  <Text style={styles.outlineText}>Galeriden seç</Text>
                </View>
              </AnimatedPressable>
              <AnimatedPressable
                containerStyle={styles.actionWrap}
                onPress={() => void scan()}
                disabled={scanning}
              >
                <LinearGradient colors={gradients.primary} style={styles.demoButton}>
                  {scanning ? (
                    <PulseDot color={colors.white} />
                  ) : (
                    <Ionicons name="sparkles" size={20} color={colors.white} />
                  )}
                  <Text style={styles.demoText}>{scanning ? 'Taranıyor' : 'Demo Tara'}</Text>
                </LinearGradient>
              </AnimatedPressable>
            </View>
          </Panel>
        </FadeInView>

        <FadeInView delay={150}>
          <Text style={styles.label}>TESLİMAT PLATFORMU</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {platforms.map((item) => (
              <AnimatedPressable key={item} onPress={() => setPlatform(item)}>
                <LinearGradient
                  colors={
                    platform === item
                      ? ['rgba(30,115,157,.9)', 'rgba(89,67,173,.9)']
                      : ['rgba(13,32,51,.96)', 'rgba(13,32,51,.96)']
                  }
                  style={[styles.chip, platform === item && styles.chipActive]}
                >
                  <Ionicons
                    name={platform === item ? 'checkmark-circle' : 'ellipse-outline'}
                    size={18}
                    color={platform === item ? colors.white : colors.textMuted}
                  />
                  <Text style={[styles.chipText, platform === item && styles.chipTextActive]}>
                    {item}
                  </Text>
                </LinearGradient>
              </AnimatedPressable>
            ))}
          </ScrollView>
        </FadeInView>

        <FadeInView delay={220}>
          <Text style={styles.label}>GEÇİŞ BİLGİLERİ</Text>
          <Panel style={styles.form} gradient>
            <Field
              icon="business"
              label="Site / Rezidans"
              value={site}
              onChangeText={setSite}
            />
            <View style={styles.row}>
              <Field
                style={styles.half}
                icon="enter"
                label="Kapı"
                value={gate}
                onChangeText={setGate}
              />
              <Field
                style={styles.half}
                icon="grid"
                label="Blok"
                value={block}
                onChangeText={setBlock}
              />
            </View>
            <View style={styles.row}>
              <Field
                style={styles.half}
                icon="home"
                label="Daire"
                value={apartment}
                onChangeText={setApartment}
                keyboardType="number-pad"
              />
              <Field
                style={styles.half}
                icon="receipt"
                label="Sipariş No"
                value={orderNumber}
                onChangeText={setOrderNumber}
              />
            </View>
            <Field
              icon="chatbox-ellipses"
              label="Kurye notu"
              value={note}
              onChangeText={setNote}
              multiline
            />
          </Panel>
        </FadeInView>

        <FadeInView delay={290} style={styles.privacy}>
          <Ionicons name="lock-closed" size={18} color={colors.green} />
          <Text style={styles.privacyText}>
            Demo bilgiler yalnızca bu cihazda saklanır; sunucuya gönderilmez.
          </Text>
        </FadeInView>

        <FadeInView delay={340}>
          <AnimatedPressable onPress={submit} disabled={!valid}>
            <LinearGradient
              colors={valid ? gradients.success : ['#34485A', '#263A4B']}
              style={styles.submit}
            >
              <Ionicons name="paper-plane" size={22} color={colors.background} />
              <Text style={styles.submitText}>GÜVENLİĞE GÖNDER</Text>
              <Ionicons name="arrow-forward" size={21} color={colors.background} />
            </LinearGradient>
          </AnimatedPressable>
        </FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  icon,
  label,
  style,
  multiline,
  ...props
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  style?: object;
  multiline?: boolean;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
}) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, multiline && styles.inputMulti]}>
        <Ionicons name={icon} size={19} color={colors.cyan} />
        <TextInput
          {...props}
          multiline={multiline}
          style={[styles.input, multiline && styles.inputTextMulti]}
          placeholderTextColor={colors.textMuted}
          selectionColor={colors.cyan}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: 44, gap: 22 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: {
    width: 48,
    height: 48,
    borderRadius: 17,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: { flex: 1 },
  title: { color: colors.text, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.textSoft, fontSize: 13, lineHeight: 18, marginTop: 4 },
  step: {
    paddingHorizontal: 11,
    height: 33,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(55,216,255,.12)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { color: colors.cyan, fontSize: 11, fontWeight: '900' },
  label: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.9,
    marginBottom: 9,
  },
  scanPanel: { alignItems: 'center', gap: 12 },
  scanIcon: {
    width: 100,
    height: 100,
    borderRadius: 31,
    backgroundColor: 'rgba(55,216,255,.13)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: { width: '100%', height: 165, borderRadius: radius.md },
  scanTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  scanText: {
    color: colors.textSoft,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  scanActions: { width: '100%', flexDirection: 'row', gap: 10 },
  actionWrap: { flex: 1 },
  outlineButton: {
    height: 52,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: 'rgba(55,216,255,.06)',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlineText: { color: colors.cyan, fontSize: 13, fontWeight: '900' },
  demoButton: {
    height: 52,
    borderRadius: 17,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  demoText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  chips: { gap: 9, paddingRight: 14 },
  chip: {
    height: 45,
    paddingHorizontal: 14,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  chipActive: { borderColor: colors.borderStrong },
  chipText: { color: colors.textSoft, fontSize: 13, fontWeight: '800' },
  chipTextActive: { color: colors.white },
  form: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  field: { flex: 1 },
  fieldLabel: { color: colors.textSoft, fontSize: 12, fontWeight: '800', marginBottom: 7 },
  inputWrap: {
    minHeight: 54,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,.035)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
  },
  inputMulti: { minHeight: 82, alignItems: 'flex-start', paddingTop: 15 },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    paddingVertical: 0,
  },
  inputTextMulti: { minHeight: 50, textAlignVertical: 'top' },
  privacy: { flexDirection: 'row', gap: 9, alignItems: 'center', paddingHorizontal: 4 },
  privacyText: { flex: 1, color: colors.textSoft, fontSize: 12, lineHeight: 18 },
  submit: {
    height: 62,
    borderRadius: 21,
    flexDirection: 'row',
    gap: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.45,
  },
});
