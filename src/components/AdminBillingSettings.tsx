import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { BillingSettings, getAdminBillingSettings, updateBillingSettings } from '../lib/v030Api';
import { colors } from '../theme';
import { AnimatedPressable } from './Motion';
import { Panel, SectionTitle } from './UI';

const emptySettings: BillingSettings = {
  singleton: true,
  bank_name: '',
  account_holder: '',
  iban: '',
  instructions: '',
  is_active: false,
};

export function AdminBillingSettings() {
  const [settings, setSettings] = useState<BillingSettings>(emptySettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSettings(await getAdminBillingSettings());
    } catch (error) {
      Alert.alert('Banka ayarları alınamadı', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (settings.is_active && (!settings.bank_name?.trim() || !settings.account_holder?.trim() || !settings.iban?.trim())) {
      Alert.alert('Eksik banka bilgisi', 'Ödeme sistemini açmak için banka adı, hesap sahibi ve IBAN gerekli.');
      return;
    }
    setSaving(true);
    try {
      await updateBillingSettings(settings);
      await load();
      Alert.alert('Banka ayarları kaydedildi', settings.is_active ? 'Site yönetimleri ödeme ve dekont bildirimi gönderebilir.' : 'Banka ödeme bildirimi geçici olarak kapatıldı.');
    } catch (error) {
      Alert.alert('Ayarlar kaydedilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <SectionTitle title="Banka ve ödeme ayarları" />
      {loading ? (
        <Panel style={styles.loading} gradient>
          <ActivityIndicator color={colors.cyan} />
          <Text style={styles.loadingText}>Banka ayarları hazırlanıyor</Text>
        </Panel>
      ) : (
        <Panel style={styles.panel} gradient>
          <View style={styles.header}>
            <View style={[styles.icon, { backgroundColor: settings.is_active ? 'rgba(67,231,162,.13)' : 'rgba(255,179,92,.13)' }]}>
              <Ionicons name="business" size={25} color={settings.is_active ? colors.green : colors.orange} />
            </View>
            <View style={styles.copy}>
              <Text style={styles.title}>Havale / EFT / FAST</Text>
              <Text style={styles.text}>Bu bilgiler Paket ekranında site yönetimine gösterilir. Gerçek banka bilgileri girilmeden sistemi açma.</Text>
            </View>
            <Switch
              value={settings.is_active}
              onValueChange={(value) => setSettings((current) => ({ ...current, is_active: value }))}
              trackColor={{ false: colors.border, true: colors.green }}
              thumbColor={colors.white}
            />
          </View>

          <Field label="Banka adı" value={settings.bank_name ?? ''} onChangeText={(value) => setSettings((current) => ({ ...current, bank_name: value }))} placeholder="Banka adını yaz" />
          <Field label="Hesap sahibi" value={settings.account_holder ?? ''} onChangeText={(value) => setSettings((current) => ({ ...current, account_holder: value }))} placeholder="Ad Soyad / Şirket unvanı" autoCapitalize="words" />
          <Field label="IBAN" value={settings.iban ?? ''} onChangeText={(value) => setSettings((current) => ({ ...current, iban: value.toUpperCase() }))} placeholder="TR00 0000 0000 0000 0000 0000 00" autoCapitalize="characters" />
          <Field label="Ödeme açıklaması ve talimatlar" value={settings.instructions ?? ''} onChangeText={(value) => setSettings((current) => ({ ...current, instructions: value }))} placeholder="Örn. Açıklama alanına site adı yazılmalıdır." multiline />

          <View style={[styles.state, { borderColor: settings.is_active ? 'rgba(67,231,162,.40)' : 'rgba(255,179,92,.40)' }]}>
            <Ionicons name={settings.is_active ? 'checkmark-circle' : 'pause-circle'} size={20} color={settings.is_active ? colors.green : colors.orange} />
            <Text style={[styles.stateText, { color: settings.is_active ? colors.green : colors.orange }]}>{settings.is_active ? 'ÖDEME BİLDİRİMİ AÇIK' : 'ÖDEME BİLDİRİMİ KAPALI'}</Text>
          </View>

          <AnimatedPressable onPress={() => void save()} disabled={saving}>
            <View style={[styles.save, saving && { opacity: .5 }]}>
              <Ionicons name="save" size={21} color={colors.background} />
              <Text style={styles.saveText}>{saving ? 'KAYDEDİLİYOR' : 'BANKA AYARLARINI KAYDET'}</Text>
            </View>
          </AnimatedPressable>
        </Panel>
      )}
    </View>
  );
}

function Field({ label, multiline, ...props }: React.ComponentProps<typeof TextInput> & { label: string; multiline?: boolean }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        multiline={multiline}
        style={[styles.input, multiline && styles.multiline]}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.cyan}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  loading: { minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 9 },
  loadingText: { color: colors.textSoft, fontSize: 13, fontWeight: '700' },
  panel: { gap: 13 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 49, height: 49, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  title: { color: colors.text, fontSize: 16, fontWeight: '900' },
  text: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 3 },
  label: { color: colors.textSoft, fontSize: 11, fontWeight: '900', marginBottom: 6 },
  input: { minHeight: 52, borderRadius: 15, borderWidth: 1, borderColor: colors.border, color: colors.text, fontSize: 14, fontWeight: '700', paddingHorizontal: 11 },
  multiline: { minHeight: 88, textAlignVertical: 'top', paddingTop: 11 },
  state: { minHeight: 45, borderRadius: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  stateText: { fontSize: 11, fontWeight: '900' },
  save: { minHeight: 55, borderRadius: 17, backgroundColor: colors.green, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  saveText: { color: colors.background, fontSize: 12, fontWeight: '900' },
});
