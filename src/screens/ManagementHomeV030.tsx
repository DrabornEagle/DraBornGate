import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { AdminSubscriptionCenter } from '../components/AdminSubscriptionCenter';
import { AnimatedPressable } from '../components/Motion';
import { Panel, SectionTitle } from '../components/UI';
import { useGateAdmin } from '../hooks/useGateAdmin';
import { supabase } from '../lib/supabase';
import { useGate } from '../store/GateContext';
import { colors, radius, spacing } from '../theme';
import { ManagementHomeV021 } from './ManagementHomeV021';
import { ManagementReportsV030 } from './ManagementReportsV030';
import { ManagementSubscriptionV030 } from './ManagementSubscriptionV030';

type CenterTab = 'management' | 'reports' | 'subscription' | 'admin';

export function ManagementHomeV030() {
  const gate = useGate();
  const { isAdmin } = useGateAdmin();
  const [tab, setTab] = useState<CenterTab>('management');
  const [managedSiteIds, setManagedSiteIds] = useState<string[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loadingSites, setLoadingSites] = useState(true);

  const loadManagedSites = useCallback(async () => {
    setLoadingSites(true);
    try {
      const { data, error } = await supabase.rpc('dkd_gate_list_my_managed_site_ids');
      if (error) throw error;
      const ids = Array.isArray(data) ? data.filter((item): item is string => typeof item === 'string') : [];
      setManagedSiteIds(ids);
      setSelectedSiteId((current) => current && ids.includes(current) ? current : ids[0] ?? '');
    } finally {
      setLoadingSites(false);
    }
  }, []);

  useEffect(() => {
    void loadManagedSites().catch(() => undefined);
  }, [gate.sites.length, loadManagedSites]);

  useEffect(() => {
    if (!isAdmin && tab === 'admin') setTab('management');
  }, [isAdmin, tab]);

  const sites = useMemo(() => gate.sites.filter((site) => managedSiteIds.includes(site.id)), [gate.sites, managedSiteIds]);
  const selectedSite = sites.find((site) => site.id === selectedSiteId) ?? sites[0];

  if (tab === 'management') {
    return (
      <View style={styles.screen}>
        <ManagementHomeV021 />
        <CenterDock current={tab} onChange={setTab} isAdmin={isAdmin} />
      </View>
    );
  }

  if (tab === 'admin' && isAdmin) {
    return (
      <View style={styles.screen}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.adminContent} automaticallyAdjustKeyboardInsets keyboardShouldPersistTaps="handled">
          <View style={styles.adminHeader}>
            <View style={styles.adminIcon}><Ionicons name="shield-checkmark" size={31} color={colors.magenta} /></View>
            <View style={styles.adminCopy}>
              <Text style={styles.adminEyebrow}>DRABORNGATE V0.3 ADMIN</Text>
              <Text style={styles.adminTitle}>Abonelik ve Gelir Merkezi</Text>
              <Text style={styles.adminText}>Paket fiyatlarını ve limitlerini yönet, ödeme bildirimlerini onayla, gelirleri takip et.</Text>
            </View>
          </View>
          <SectionTitle title="Platform yönetimi" />
          <AdminSubscriptionCenter />
        </ScrollView>
        <CenterDock current={tab} onChange={setTab} isAdmin={isAdmin} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topArea}>
        {loadingSites ? (
          <Panel style={styles.siteLoading}>
            <ActivityIndicator color={colors.cyan} />
            <Text style={styles.siteLoadingText}>Yönetilen siteler hazırlanıyor</Text>
          </Panel>
        ) : sites.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.siteRow}>
            {sites.map((site) => (
              <AnimatedPressable key={site.id} onPress={() => setSelectedSiteId(site.id)}>
                <View style={[styles.siteChip, selectedSite?.id === site.id && styles.siteChipActive]}>
                  <Ionicons name={site.isDemo ? 'flask' : 'business'} size={17} color={selectedSite?.id === site.id ? colors.cyan : colors.textMuted} />
                  <View>
                    <Text style={[styles.siteName, selectedSite?.id === site.id && { color: colors.cyan }]}>{site.name}</Text>
                    <Text style={styles.siteCity}>{site.city || 'Şehir belirtilmedi'}{site.isDemo ? ' • ÖRNEK' : ''}</Text>
                  </View>
                </View>
              </AnimatedPressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.content}>
        {tab === 'reports' ? (
          <ManagementReportsV030 siteId={selectedSite?.id ?? ''} siteName={selectedSite?.name ?? 'Site'} />
        ) : (
          <ManagementSubscriptionV030 siteId={selectedSite?.id ?? ''} siteName={selectedSite?.name ?? 'Site'} />
        )}
      </View>
      <CenterDock current={tab} onChange={setTab} isAdmin={isAdmin} />
    </View>
  );
}

function CenterDock({ current, onChange, isAdmin }: { current: CenterTab; onChange: (tab: CenterTab) => void; isAdmin: boolean }) {
  const tabs: Array<{ id: CenterTab; label: string; icon: keyof typeof Ionicons.glyphMap; tone: string }> = [
    { id: 'management', label: 'Yönetim', icon: 'business', tone: colors.magenta },
    { id: 'reports', label: 'Raporlar', icon: 'analytics', tone: colors.cyan },
    { id: 'subscription', label: 'Paket', icon: 'diamond', tone: colors.purple },
    ...(isAdmin ? [{ id: 'admin' as CenterTab, label: 'Admin', icon: 'shield-checkmark' as keyof typeof Ionicons.glyphMap, tone: colors.orange }] : []),
  ];
  return (
    <View style={styles.dockWrap} pointerEvents="box-none">
      <View style={styles.dock}>
        {tabs.map((item) => {
          const active = current === item.id;
          return (
            <AnimatedPressable key={item.id} containerStyle={styles.tabWrap} onPress={() => onChange(item.id)}>
              <View style={[styles.tab, active && { backgroundColor: `${item.tone}13`, borderColor: `${item.tone}55` }]}>
                <Ionicons name={item.icon} size={22} color={active ? item.tone : colors.textMuted} />
                <Text style={[styles.tabText, active && { color: item.tone }]}>{item.label}</Text>
                {item.id !== 'management' ? <Text style={[styles.newTag, { color: item.tone }]}>V0.3</Text> : null}
              </View>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topArea: { paddingHorizontal: spacing.md, paddingTop: 6 },
  content: { flex: 1 },
  siteRow: { gap: 8, paddingRight: 12 },
  siteChip: { minWidth: 177, minHeight: 55, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  siteChipActive: { borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.08)' },
  siteName: { color: colors.text, fontSize: 12, fontWeight: '900' },
  siteCity: { color: colors.textMuted, fontSize: 9, marginTop: 2 },
  siteLoading: { minHeight: 55, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 8 },
  siteLoadingText: { color: colors.textSoft, fontSize: 12, fontWeight: '700' },
  adminContent: { padding: spacing.md, paddingTop: 15, paddingBottom: 170, gap: 18 },
  adminHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  adminIcon: { width: 62, height: 62, borderRadius: 20, backgroundColor: 'rgba(228,109,255,.12)', borderWidth: 1, borderColor: 'rgba(228,109,255,.38)', alignItems: 'center', justifyContent: 'center' },
  adminCopy: { flex: 1 },
  adminEyebrow: { color: colors.magenta, fontSize: 11, fontWeight: '900', letterSpacing: .7 },
  adminTitle: { color: colors.text, fontSize: 23, fontWeight: '900', marginTop: 4 },
  adminText: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 4 },
  dockWrap: { position: 'absolute', left: 20, right: 20, bottom: 90, zIndex: 60, elevation: 25 },
  dock: { minHeight: 64, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(8,23,38,.97)', padding: 5, flexDirection: 'row', gap: 5 },
  tabWrap: { flex: 1 },
  tab: { height: 53, borderRadius: 17, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabText: { color: colors.textMuted, fontSize: 10, fontWeight: '900' },
  newTag: { position: 'absolute', top: 4, right: 6, fontSize: 7, fontWeight: '900' },
});
