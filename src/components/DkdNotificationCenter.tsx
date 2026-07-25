import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { GateNotification } from '../types';
import { AnimatedPressable, FadeInView, PulseDot } from './Motion';

function dkd_notificationTone(dkd_kind: string) {
  if (dkd_kind.includes('completed')) return { color: colors.green, icon: 'checkmark-done' as const };
  if (dkd_kind.includes('arrived')) return { color: colors.orange, icon: 'location' as const };
  if (dkd_kind.includes('visitor')) return { color: colors.purple, icon: 'people' as const };
  if (dkd_kind.includes('dues') || dkd_kind.includes('finance')) return { color: colors.orange, icon: 'wallet' as const };
  return { color: colors.cyan, icon: 'notifications' as const };
}

function DkdNotificationCard({ dkd_item, dkd_onRead }: { dkd_item: GateNotification; dkd_onRead: () => void }) {
  const dkd_tone = dkd_notificationTone(dkd_item.kind);
  return <AnimatedPressable onPress={dkd_onRead}>
    <LinearGradient colors={gradients.panelColorful} style={[s.item, { borderColor: `${dkd_tone.color}65` }]}>
      <View style={[s.itemIcon, { borderColor: `${dkd_tone.color}70`, backgroundColor: `${dkd_tone.color}16` }]}><Ionicons name={dkd_tone.icon} size={27} color={dkd_tone.color} /></View>
      <View style={s.copy}><View style={s.itemTitleRow}><Text style={s.itemTitle}>{dkd_item.title}</Text>{!dkd_item.readAt ? <View style={s.newPill}><PulseDot color={colors.green} size={7} /><Text style={s.newText}>YENİ</Text></View> : null}</View><Text style={s.itemBody}>{dkd_item.body}</Text><Text style={s.itemTime}>{new Date(dkd_item.createdAt).toLocaleString('tr-TR')}</Text></View>
      <Ionicons name="chevron-forward" size={24} color={colors.textMuted} />
    </LinearGradient>
  </AnimatedPressable>;
}

export function DkdNotificationBell() {
  const dkd_gate = useGate();
  const [dkd_open, dkd_setOpen] = useState(false);
  const [dkd_limit, dkd_setLimit] = useState(5);
  const [dkd_working, dkd_setWorking] = useState(false);
  const [dkd_clearArmed, dkd_setClearArmed] = useState(false);
  const dkd_unreadCount = useMemo(() => dkd_gate.notifications.filter((dkd_item) => !dkd_item.readAt).length, [dkd_gate.notifications]);
  const dkd_visible = dkd_gate.notifications.slice(0, dkd_limit);
  const dkd_remaining = Math.max(0, dkd_gate.notifications.length - dkd_visible.length);

  const dkd_openCenter = () => { dkd_setLimit(5); dkd_setClearArmed(false); dkd_setOpen(true); };
  const dkd_markAll = async () => {
    dkd_setWorking(true);
    try { await dkd_gate.markAllNotificationsRead(); }
    finally { dkd_setWorking(false); }
  };
  const dkd_clear = async () => {
    if (!dkd_clearArmed) { dkd_setClearArmed(true); return; }
    dkd_setWorking(true);
    try { await dkd_gate.clearNotifications(); dkd_setClearArmed(false); }
    finally { dkd_setWorking(false); }
  };

  return <>
    <AnimatedPressable containerStyle={s.bellDock} onPress={dkd_openCenter} accessibilityRole="button" accessibilityLabel="Bildirim merkezini aç">
      <LinearGradient colors={['rgba(33,149,202,.98)', 'rgba(64,70,177,.98)', 'rgba(96,52,179,.98)']} style={s.bell}>
        <Ionicons name="notifications" size={31} color={colors.white} />
        {dkd_unreadCount ? <View style={s.badge}><Text style={s.badgeText}>{dkd_unreadCount > 99 ? '99+' : dkd_unreadCount}</Text></View> : null}
      </LinearGradient>
    </AnimatedPressable>

    <Modal visible={dkd_open} transparent animationType="fade" onRequestClose={() => dkd_setOpen(false)}>
      <SafeAreaView style={s.overlay} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <View style={s.header}><View style={s.headerIcon}><Ionicons name="notifications" size={35} color={colors.cyan} /></View><View style={s.copy}><Text style={s.eyebrow}>DRABORNGATE BİLDİRİM MERKEZİ</Text><Text style={s.title}>Bildirimler</Text><Text style={s.subtitle}>{dkd_unreadCount} okunmamış • {dkd_gate.notifications.length} toplam kayıt</Text></View><AnimatedPressable onPress={() => dkd_setOpen(false)}><View style={s.close}><Ionicons name="close" size={31} color={colors.white} /></View></AnimatedPressable></View>

          <View style={s.actionRow}>
            <AnimatedPressable containerStyle={s.actionWrap} disabled={dkd_working} onPress={() => void dkd_gate.refresh()}><View style={s.action}><Ionicons name="refresh" size={21} color={colors.cyan} /><Text style={[s.actionText, { color: colors.cyan }]}>YENİLE</Text></View></AnimatedPressable>
            <AnimatedPressable containerStyle={s.actionWrap} disabled={dkd_working || dkd_unreadCount === 0} onPress={() => void dkd_markAll()}><View style={s.action}><Ionicons name="checkmark-done" size={23} color={colors.green} /><Text style={[s.actionText, { color: colors.green }]}>TÜMÜNÜ OKU</Text></View></AnimatedPressable>
          </View>
          <AnimatedPressable disabled={dkd_working || dkd_gate.notifications.length === 0} onPress={() => void dkd_clear()}><View style={[s.clearAction, dkd_clearArmed && s.clearArmed]}><Ionicons name={dkd_clearArmed ? 'warning' : 'trash'} size={21} color={colors.red} /><Text style={s.clearText}>{dkd_clearArmed ? 'EMİN MİSİN? TEKRAR DOKUN' : 'TÜMÜNÜ TEMİZLE'}</Text></View></AnimatedPressable>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
            {dkd_visible.length ? dkd_visible.map((dkd_item, dkd_index) => <FadeInView key={dkd_item.id} delay={dkd_index * 35}><DkdNotificationCard dkd_item={dkd_item} dkd_onRead={() => !dkd_item.readAt && void dkd_gate.markNotificationRead(dkd_item.id)} /></FadeInView>) : <View style={s.empty}><Ionicons name="notifications-off-outline" size={42} color={colors.textMuted} /><Text style={s.emptyTitle}>Bildirim bulunmuyor</Text><Text style={s.emptyText}>Yeni kurye, ziyaretçi, aidat ve geçiş hareketleri burada görünecek.</Text></View>}
            {dkd_remaining > 0 ? <AnimatedPressable onPress={() => dkd_setLimit((dkd_value) => dkd_value + 5)}><View style={s.more}><Ionicons name="chevron-down" size={20} color={colors.cyan} /><Text style={s.moreText}>DAHA FAZLA • {dkd_remaining}</Text></View></AnimatedPressable> : null}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  bellDock: { position: 'absolute', zIndex: 80, top: 24, right: 18 },
  bell: { width: 60, height: 60, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(55,216,255,.55)', alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  badge: { position: 'absolute', right: -5, top: -8, minWidth: 25, height: 25, borderRadius: 14, paddingHorizontal: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,8,15,.74)', paddingHorizontal: 14, paddingTop: 44, paddingBottom: 10 },
  sheet: { flex: 1, borderRadius: 28, backgroundColor: 'rgba(9,34,52,.99)', borderWidth: 1, borderColor: 'rgba(55,216,255,.34)', paddingHorizontal: spacing.md, paddingTop: 12, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 82, height: 7, borderRadius: 7, backgroundColor: 'rgba(255,255,255,.24)', marginBottom: 14 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerIcon: { width: 75, height: 75, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(55,216,255,.55)', backgroundColor: 'rgba(55,216,255,.11)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1 },
  eyebrow: { color: colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: .8 },
  title: { color: colors.text, fontSize: 31, fontWeight: '900', marginTop: 3 },
  subtitle: { color: colors.textSoft, fontSize: 13, marginTop: 4 },
  close: { width: 54, height: 54, borderRadius: 17, backgroundColor: 'rgba(255,255,255,.10)', alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 18 },
  actionWrap: { flex: 1 },
  action: { minHeight: 58, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(55,216,255,.4)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { fontSize: 11, fontWeight: '900' },
  clearAction: { minHeight: 49, marginTop: 9, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,101,125,.48)', backgroundColor: 'rgba(255,101,125,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  clearArmed: { backgroundColor: 'rgba(255,101,125,.17)', borderColor: colors.red },
  clearText: { color: colors.red, fontSize: 11, fontWeight: '900' },
  list: { gap: 11, paddingTop: 18, paddingBottom: 28 },
  item: { minHeight: 132, borderRadius: radius.lg, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  itemIcon: { width: 65, height: 65, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  itemTitle: { flex: 1, color: colors.text, fontSize: 17, lineHeight: 22, fontWeight: '900' },
  itemBody: { color: colors.textSoft, fontSize: 12, lineHeight: 18, marginTop: 5 },
  itemTime: { color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 8 },
  newPill: { minHeight: 26, borderRadius: 10, paddingHorizontal: 7, backgroundColor: 'rgba(67,231,162,.10)', flexDirection: 'row', alignItems: 'center', gap: 4 },
  newText: { color: colors.green, fontSize: 7, fontWeight: '900' },
  more: { height: 52, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(55,216,255,.45)', backgroundColor: 'rgba(55,216,255,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  moreText: { color: colors.cyan, fontSize: 11, fontWeight: '900' },
  empty: { minHeight: 250, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 14 },
  emptyText: { color: colors.textSoft, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
});
