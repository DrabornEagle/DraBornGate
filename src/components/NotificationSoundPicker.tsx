import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import {
  GATE_NOTIFICATION_SOUND_OPTIONS,
  GateNotificationSoundKey,
  getGateNotificationSound,
  previewGateNotificationSound,
  setGateNotificationSound,
} from '../lib/notifications';
import { colors, radius } from '../theme';
import { AnimatedPressable, PulseDot } from './Motion';
import { Panel } from './UI';

function soundIcon(key: GateNotificationSoundKey): keyof typeof Ionicons.glyphMap {
  if (key === 'silent') return 'volume-mute';
  if (key === 'system') return 'phone-portrait';
  if (key === 'alert') return 'warning';
  if (key === 'pulse') return 'radio';
  if (key === 'signal') return 'notifications';
  if (key === 'digital') return 'hardware-chip';
  return 'musical-notes';
}

export function NotificationSoundPicker() {
  const [selected, setSelected] = useState<GateNotificationSoundKey>('system');
  const [working, setWorking] = useState<GateNotificationSoundKey>();

  useEffect(() => {
    void getGateNotificationSound().then(setSelected).catch(() => undefined);
  }, []);

  const choose = async (key: GateNotificationSoundKey) => {
    setWorking(key);
    try {
      await setGateNotificationSound(key);
      setSelected(key);
    } catch (error) {
      Alert.alert('Zil sesi kaydedilemedi', error instanceof Error ? error.message : 'Tekrar dene.');
    } finally {
      setWorking(undefined);
    }
  };

  const preview = async (key: GateNotificationSoundKey) => {
    setWorking(key);
    try {
      await previewGateNotificationSound(key);
      setSelected(key);
    } catch (error) {
      Alert.alert('Zil sesi çalınamadı', error instanceof Error ? error.message : 'Bildirim iznini kontrol et.');
    } finally {
      setWorking(undefined);
    }
  };

  return (
    <View style={s.list}>
      <Panel style={s.info} gradient>
        <View style={s.infoIcon}><Ionicons name="notifications" size={25} color={colors.cyan} /></View>
        <View style={s.copy}>
          <Text style={s.infoTitle}>Bildirim sesini sen seç</Text>
          <Text style={s.infoText}>Yeni tonlar daha uzun ve yüksek seslidir. Telefonun varsayılan Android bildirim sesini de seçebilirsin.</Text>
        </View>
      </Panel>

      {GATE_NOTIFICATION_SOUND_OPTIONS.map((item) => {
        const active = selected === item.key;
        return (
          <AnimatedPressable key={item.key} onPress={() => void choose(item.key)}>
            <Panel style={[s.option, active && s.active]} gradient>
              <View style={[s.icon, { backgroundColor: active ? 'rgba(55,216,255,.16)' : 'rgba(139,107,255,.10)' }]}>
                <Ionicons name={soundIcon(item.key)} size={23} color={active ? colors.cyan : colors.purple} />
              </View>
              <View style={s.copy}>
                <View style={s.titleRow}><Text style={[s.title, active && { color: colors.cyan }]}>{item.title}</Text>{active ? <PulseDot color={colors.green} size={7} /> : null}</View>
                <Text style={s.text}>{item.description}</Text>
              </View>
              <AnimatedPressable onPress={() => void preview(item.key)} disabled={Boolean(working)}>
                <View style={s.preview}>
                  <Ionicons name={working === item.key ? 'hourglass' : 'play'} size={17} color={colors.orange} />
                  <Text style={s.previewText}>{working === item.key ? 'BEKLE' : 'DİNLE'}</Text>
                </View>
              </AnimatedPressable>
              <Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={active ? colors.green : colors.textMuted} />
            </Panel>
          </AnimatedPressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  list: { gap: 9 },
  info: { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: 'rgba(55,216,255,.38)' },
  infoIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(55,216,255,.12)' },
  copy: { flex: 1 },
  infoTitle: { color: colors.text, fontSize: 14, fontWeight: '900' },
  infoText: { color: colors.textSoft, fontSize: 10, lineHeight: 15, marginTop: 3 },
  option: { minHeight: 78, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10 },
  active: { borderColor: colors.cyan, backgroundColor: 'rgba(55,216,255,.07)' },
  icon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { color: colors.text, fontSize: 13, fontWeight: '900' },
  text: { color: colors.textSoft, fontSize: 9.5, lineHeight: 14, marginTop: 3 },
  preview: { minWidth: 58, minHeight: 39, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.45)', backgroundColor: 'rgba(255,179,92,.08)', alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 7 },
  previewText: { color: colors.orange, fontSize: 7.5, fontWeight: '900' },
});
