import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';

function safeDate(value?: string) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export function DateField({
  label,
  value,
  onChange,
  optional = false,
}: {
  label: string;
  value?: string;
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const date = useMemo(() => safeDate(value), [value]);
  const text = value
    ? date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Tarih seçilmedi';

  const change = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setOpen(false);
    if (event.type !== 'set' || !selected) return;
    const normalized = new Date(selected);
    normalized.setHours(12, 0, 0, 0);
    onChange(normalized.toISOString());
  };

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <AnimatedPressable containerStyle={styles.pressWrap} onPress={() => setOpen(true)}>
          <View style={[styles.button, !value && styles.empty]}>
            <View style={styles.icon}><Ionicons name="calendar" size={21} color={colors.cyan} /></View>
            <View style={styles.copy}>
              <Text style={styles.value}>{text}</Text>
              <Text style={styles.hint}>Takvimden seçmek için dokun</Text>
            </View>
            <Ionicons name="chevron-down" size={19} color={colors.textMuted} />
          </View>
        </AnimatedPressable>
        {optional && value ? (
          <AnimatedPressable onPress={() => onChange('')}>
            <View style={styles.clear}><Ionicons name="close" size={20} color={colors.red} /></View>
          </AnimatedPressable>
        ) : null}
      </View>
      {open ? (
        <View style={Platform.OS === 'ios' ? styles.iosPicker : undefined}>
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            minimumDate={new Date(2024, 0, 1)}
            onChange={change}
            themeVariant="dark"
          />
          {Platform.OS === 'ios' ? (
            <AnimatedPressable onPress={() => setOpen(false)}>
              <View style={styles.done}><Text style={styles.doneText}>TAMAM</Text></View>
            </AnimatedPressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flex: 1, gap: 7 },
  label: { color: colors.textSoft, fontSize: 13, fontWeight: '900' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pressWrap: { flex: 1 },
  button: { minHeight: 66, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.055)', paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  empty: { backgroundColor: 'rgba(255,255,255,.025)', borderColor: colors.border },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(55,216,255,.12)' },
  copy: { flex: 1 },
  value: { color: colors.text, fontSize: 14, fontWeight: '900' },
  hint: { color: colors.textMuted, fontSize: 10, marginTop: 3 },
  clear: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,101,125,.36)', backgroundColor: 'rgba(255,101,125,.08)', alignItems: 'center', justifyContent: 'center' },
  iosPicker: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,.04)', padding: 8 },
  done: { height: 42, borderRadius: 13, backgroundColor: 'rgba(55,216,255,.13)', alignItems: 'center', justifyContent: 'center' },
  doneText: { color: colors.cyan, fontSize: 12, fontWeight: '900' },
});
