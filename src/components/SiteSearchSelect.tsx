import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';
import { Panel } from './UI';

export type RegistrationSite = { id: string; name: string; city?: string; address?: string };

export function SiteSearchSelect({ value, onChange }: { value?: RegistrationSite; onChange: (site: RegistrationSite) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<RegistrationSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('Site adından en az 2 harf yazarak ara.');

  const search = useCallback(async (text = query) => {
    const normalized = text.trim();
    if (normalized.length < 2) {
      setResults([]);
      setMessage('Site adından en az 2 harf yazarak ara.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_search_registration_sites', { p_query: normalized });
      if (error) throw error;
      const next = Array.isArray(data) ? data.filter((item): item is RegistrationSite => Boolean(item && typeof item === 'object' && typeof item.id === 'string' && typeof item.name === 'string')) : [];
      setResults(next);
      setMessage(next.length ? `${next.length} site bulundu` : 'Bu adla aktif site bulunamadı.');
    } catch (error) {
      setResults([]);
      setMessage(error instanceof Error ? error.message : 'Site araması yapılamadı.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (query.trim().length < 2) return;
    const timer = setTimeout(() => void search(query), 450);
    return () => clearTimeout(timer);
  }, [query, search]);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>BAŞVURU YAPILACAK SİTE</Text>
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Ionicons name="search" size={21} color={colors.cyan} />
          <TextInput value={query} onChangeText={setQuery} onSubmitEditing={() => void search()} placeholder="Site veya apartman adı ara" placeholderTextColor={colors.textMuted} selectionColor={colors.cyan} autoCapitalize="words" style={styles.input} />
          {loading ? <ActivityIndicator size="small" color={colors.cyan} /> : null}
        </View>
        <AnimatedPressable onPress={() => void search()} disabled={loading}><View style={styles.searchButton}><Ionicons name="arrow-forward" size={22} color={colors.white} /></View></AnimatedPressable>
      </View>

      {value ? <Panel style={styles.selected} gradient><View style={styles.selectedIcon}><Ionicons name="checkmark-circle" size={27} color={colors.green} /></View><View style={styles.copy}><Text style={styles.siteName}>{value.name}</Text><Text style={styles.siteDetail}>{[value.city, value.address].filter(Boolean).join(' • ') || 'Site seçildi'}</Text></View><Text style={styles.selectedText}>SEÇİLDİ</Text></Panel> : null}

      <Text style={styles.message}>{message}</Text>
      <View style={styles.list}>{results.map((site) => { const active = value?.id === site.id; return <AnimatedPressable key={site.id} onPress={() => onChange(site)}><View style={[styles.result, active && styles.resultActive]}><View style={[styles.resultIcon, active && styles.resultIconActive]}><Ionicons name="business" size={21} color={active ? colors.green : colors.magenta} /></View><View style={styles.copy}><Text style={styles.siteName}>{site.name}</Text><Text numberOfLines={2} style={styles.siteDetail}>{[site.city, site.address].filter(Boolean).join(' • ') || 'Adres bilgisi yok'}</Text></View><Ionicons name={active ? 'checkmark-circle' : 'ellipse-outline'} size={23} color={active ? colors.green : colors.textMuted} /></View></AnimatedPressable>; })}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 9 }, label: { color: colors.textSoft, fontSize: 12, fontWeight: '900', letterSpacing: .6 }, searchRow: { flexDirection: 'row', gap: 8 }, inputWrap: { flex: 1, minHeight: 58, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(255,255,255,.035)', paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }, input: { flex: 1, minHeight: 56, color: colors.text, fontSize: 15, fontWeight: '700' }, searchButton: { width: 58, height: 58, borderRadius: radius.md, backgroundColor: colors.magenta, alignItems: 'center', justifyContent: 'center' }, selected: { flexDirection: 'row', alignItems: 'center', gap: 10, borderColor: 'rgba(67,231,162,.55)' }, selectedIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(67,231,162,.12)', alignItems: 'center', justifyContent: 'center' }, selectedText: { color: colors.green, fontSize: 10, fontWeight: '900' }, message: { color: colors.textMuted, fontSize: 11, lineHeight: 16 }, list: { gap: 8 }, result: { minHeight: 72, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,.025)', padding: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, resultActive: { borderColor: 'rgba(67,231,162,.58)', backgroundColor: 'rgba(67,231,162,.08)' }, resultIcon: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(228,109,255,.12)', alignItems: 'center', justifyContent: 'center' }, resultIconActive: { backgroundColor: 'rgba(67,231,162,.14)' }, copy: { flex: 1 }, siteName: { color: colors.text, fontSize: 14, fontWeight: '900' }, siteDetail: { color: colors.textSoft, fontSize: 11, lineHeight: 16, marginTop: 3 },
});
