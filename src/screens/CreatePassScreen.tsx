import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { AnimatedPressable, FadeInView, PulseDot } from '../components/Motion';
import { Panel } from '../components/UI';
import { useDemo } from '../store/DemoContext';
import { colors, gradients, radius, spacing } from '../theme';
import { DeliveryPlatform } from '../types';

const platforms: DeliveryPlatform[] = ['DraBornGo', 'Trendyol Go', 'Yemeksepeti', 'Getir', 'Diğer'];

export function CreatePassScreen({ onBack, onCreated }: { onBack: () => void; onCreated: () => void }) {
  const { createPass } = useDemo();
  const [platform, setPlatform] = useState<DeliveryPlatform>('DraBornGo');
  const [site, setSite] = useState('DraBorn Marina Evleri');
  const [gate, setGate] = useState('A Kapısı');
  const [block, setBlock] = useState('B Blok');
  const [apartment, setApartment] = useState('18');
  const [orderNumber, setOrderNumber] = useState(`DBG-${Math.floor(100000 + Math.random() * 899999)}`);
  const [note, setNote] = useState('Temassız teslimat');
  const [imageUri, setImageUri] = useState<string>();
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState(false);
  const valid = useMemo(() => Boolean(site.trim() && gate.trim() && block.trim() && apartment.trim() && orderNumber.trim()), [site, gate, block, apartment, orderNumber]);

  const scan = async (uri?: string) => {
    if (uri) setImageUri(uri);
    setScanning(true); setScanned(false);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setPlatform('DraBornGo'); setSite('DraBorn Marina Evleri'); setGate('A Kapısı'); setBlock('B Blok'); setApartment('18');
    setOrderNumber(`DBG-${Math.floor(100000 + Math.random() * 899999)}`);
    setScanning(false); setScanned(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Galeri izni gerekli', 'Sipariş ekran görüntüsünü seçmek için galeri izni ver.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]?.uri) await scan(result.assets[0].uri);
  };

  const submit = () => {
    if (!valid) return Alert.alert('Eksik bilgi', 'Site, kapı, blok, daire ve sipariş numarasını doldur.');
    createPass({ platform, site: site.trim(), gate: gate.trim(), block: block.trim(), apartment: apartment.trim(), orderNumber: orderNumber.trim(), note: note.trim(), screenshotUri: imageUri });
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onCreated();
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <FadeInView style={styles.header}>
          <AnimatedPressable onPress={onBack}><View style={styles.back}><Ionicons name="arrow-back" size={21} color={colors.text} /></View></AnimatedPressable>
          <View style={styles.headerCopy}><Text style={styles.title}>Yeni CourierPass</Text><Text style={styles.subtitle}>Sipariş bilgilerini tara ve güvenliğe gönder</Text></View>
          <View style={styles.step}><Text style={styles.stepText}>v0.1</Text></View>
        </FadeInView>

        <FadeInView delay={80}>
          <Text style={styles.label}>SİPARİŞ EKRAN GÖRÜNTÜSÜ</Text>
          <Panel style={styles.scanPanel}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.preview} /> : <View style={styles.scanIcon}><Ionicons name="scan" size={50} color={colors.cyan} /></View>}
            <Text style={styles.scanTitle}>{scanning ? 'Sipariş analiz ediliyor...' : scanned ? 'Demo analiz tamamlandı' : 'Sipariş ekranını tara'}</Text>
            <Text style={styles.scanText}>Demo OCR; site, blok, daire ve sipariş numarasını örnek verilerle doldurur.</Text>
            <View style={styles.scanActions}>
              <AnimatedPressable containerStyle={styles.actionWrap} onPress={pickImage}><View style={styles.outlineButton}><Ionicons name="images" size={17} color={colors.cyan} /><Text style={styles.outlineText}>Galeriden seç</Text></View></AnimatedPressable>
              <AnimatedPressable containerStyle={styles.actionWrap} onPress={() => void scan()} disabled={scanning}><LinearGradient colors={gradients.primary} style={styles.demoButton}>{scanning ? <PulseDot color={colors.white} /> : <Ionicons name="sparkles" size={17} color={colors.white} />}<Text style={styles.demoText}>{scanning ? 'Taranıyor' : 'Demo Tara'}</Text></LinearGradient></AnimatedPressable>
            </View>
          </Panel>
        </FadeInView>

        <FadeInView delay={150}>
          <Text style={styles.label}>TESLİMAT PLATFORMU</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {platforms.map((item) => <AnimatedPressable key={item} onPress={() => setPlatform(item)}><View style={[styles.chip, platform === item && styles.chipActive]}><Ionicons name={platform === item ? 'checkmark-circle' : 'ellipse-outline'} size={15} color={platform === item ? colors.cyan : colors.textMuted} /><Text style={[styles.chipText, platform === item && styles.chipTextActive]}>{item}</Text></View></AnimatedPressable>)}
          </ScrollView>
        </FadeInView>

        <FadeInView delay={220}>
          <Text style={styles.label}>GEÇİŞ BİLGİLERİ</Text>
          <Panel style={styles.form}>
            <Field icon="business" label="Site / Rezidans" value={site} onChangeText={setSite} />
            <View style={styles.row}><Field style={styles.half} icon="enter" label="Kapı" value={gate} onChangeText={setGate} /><Field style={styles.half} icon="grid" label="Blok" value={block} onChangeText={setBlock} /></View>
            <View style={styles.row}><Field style={styles.half} icon="home" label="Daire" value={apartment} onChangeText={setApartment} keyboardType="number-pad" /><Field style={styles.half} icon="receipt" label="Sipariş No" value={orderNumber} onChangeText={setOrderNumber} /></View>
            <Field icon="chatbox-ellipses" label="Kurye notu" value={note} onChangeText={setNote} multiline />
          </Panel>
        </FadeInView>

        <FadeInView delay={290} style={styles.privacy}><Ionicons name="lock-closed" size={16} color={colors.green} /><Text style={styles.privacyText}>Demo bilgiler yalnızca bu cihazda saklanır; sunucuya gönderilmez.</Text></FadeInView>

        <FadeInView delay={340}><AnimatedPressable onPress={submit} disabled={!valid}><LinearGradient colors={valid ? gradients.success : ['#34485A', '#263A4B']} style={styles.submit}><Ionicons name="paper-plane" size={20} color={colors.background} /><Text style={styles.submitText}>GÜVENLİĞE GÖNDER</Text><Ionicons name="arrow-forward" size={19} color={colors.background} /></LinearGradient></AnimatedPressable></FadeInView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ icon, label, style, multiline, ...props }: { icon: keyof typeof Ionicons.glyphMap; label: string; style?: object; multiline?: boolean; value: string; onChangeText: (value: string) => void; keyboardType?: 'default' | 'number-pad' }) {
  return <View style={[styles.field, style]}><Text style={styles.fieldLabel}>{label}</Text><View style={[styles.inputWrap, multiline && styles.inputMulti]}><Ionicons name={icon} size={16} color={colors.cyan} /><TextInput {...props} multiline={multiline} style={[styles.input, multiline && styles.inputTextMulti]} placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} /></View></View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 }, content: { padding: spacing.md, paddingBottom: 42, gap: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11 }, back: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }, headerCopy: { flex: 1 }, title: { color: colors.text, fontSize: 21, fontWeight: '900' }, subtitle: { color: colors.textSoft, fontSize: 10, marginTop: 3 }, step: { paddingHorizontal: 10, height: 30, borderRadius: radius.pill, backgroundColor: 'rgba(55,216,255,.1)', alignItems: 'center', justifyContent: 'center' }, stepText: { color: colors.cyan, fontSize: 9, fontWeight: '900' },
  label: { color: colors.textSoft, fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 }, scanPanel: { alignItems: 'center', gap: 10 }, scanIcon: { width: 90, height: 90, borderRadius: 28, backgroundColor: 'rgba(55,216,255,.1)', alignItems: 'center', justifyContent: 'center' }, preview: { width: '100%', height: 150, borderRadius: radius.md }, scanTitle: { color: colors.text, fontSize: 15, fontWeight: '800' }, scanText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, textAlign: 'center' }, scanActions: { width: '100%', flexDirection: 'row', gap: 9 }, actionWrap: { flex: 1 }, outlineButton: { height: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, outlineText: { color: colors.cyan, fontSize: 10, fontWeight: '800' }, demoButton: { height: 46, borderRadius: 15, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center' }, demoText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  chips: { gap: 8, paddingRight: 14 }, chip: { height: 40, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', gap: 6, alignItems: 'center' }, chipActive: { borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.09)' }, chipText: { color: colors.textSoft, fontSize: 10, fontWeight: '700' }, chipTextActive: { color: colors.text },
  form: { gap: 12 }, row: { flexDirection: 'row', gap: 10 }, half: { flex: 1 }, field: { flex: 1 }, fieldLabel: { color: colors.textSoft, fontSize: 9, fontWeight: '800', marginBottom: 6 }, inputWrap: { minHeight: 48, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.025)', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 11 }, inputMulti: { minHeight: 72, alignItems: 'flex-start', paddingTop: 13 }, input: { flex: 1, color: colors.text, fontSize: 11, fontWeight: '600', paddingVertical: 0 }, inputTextMulti: { minHeight: 45, textAlignVertical: 'top' }, privacy: { flexDirection: 'row', gap: 8, alignItems: 'center', paddingHorizontal: 4 }, privacyText: { flex: 1, color: colors.textSoft, fontSize: 9, lineHeight: 14 }, submit: { height: 58, borderRadius: 20, flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center' }, submitText: { color: colors.background, fontSize: 12, fontWeight: '900', letterSpacing: .5 },
});
