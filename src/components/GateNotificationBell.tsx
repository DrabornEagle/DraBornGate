import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useGate } from '../store/GateContext';
import { colors, gradients, radius, spacing } from '../theme';
import { GateNotification } from '../types';
import { AnimatedPressable, FadeInView, PulseDot } from './Motion';
import { EmptyState, Panel } from './UI';

const toneFor = (kind: string) => kind.includes('rejected') || kind.includes('cancel') || kind.includes('error') ? colors.red : kind.includes('completed') || kind.includes('approved') || kind.includes('paid') ? colors.green : kind.includes('arrived') || kind.includes('airpass') ? colors.orange : kind.includes('dues') || kind.includes('finance') ? colors.magenta : colors.cyan;
const iconFor = (kind: string): keyof typeof Ionicons.glyphMap => kind.includes('rejected') || kind.includes('cancel') ? 'close-circle' : kind.includes('completed') || kind.includes('approved') || kind.includes('paid') ? 'checkmark-done' : kind.includes('arrived') ? 'location' : kind.includes('dues') || kind.includes('finance') ? 'wallet' : kind.includes('visitor') ? 'people' : kind.includes('code') ? 'keypad' : 'notifications';

export function GateNotificationBell() {
  const gate = useGate();
  const [visible, setVisible] = useState(false);
  const [limit, setLimit] = useState(10);
  const unread = useMemo(() => gate.notifications.filter((item) => !item.readAt).length, [gate.notifications]);
  const bell = useRef(new Animated.Value(0)).current;
  const latestUnreadId = gate.notifications.find((item) => !item.readAt)?.id;

  useEffect(() => {
    if (!latestUnreadId) return;
    bell.setValue(0);
    Animated.sequence([
      Animated.timing(bell, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(bell, { toValue: -1, duration: 90, useNativeDriver: true }),
      Animated.timing(bell, { toValue: 1, duration: 90, useNativeDriver: true }),
      Animated.timing(bell, { toValue: 0, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [bell, latestUnreadId]);

  const markAll = async () => {
    const pending = gate.notifications.filter((item) => !item.readAt).slice(0, 50);
    for (const item of pending) await gate.markNotificationRead(item.id);
  };

  return <>
    <Animated.View style={[styles.floating, { transform: [{ rotate: bell.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-10deg', '0deg', '10deg'] }) }] }]}>
      <AnimatedPressable onPress={() => { setLimit(10); setVisible(true); }}>
        <LinearGradient colors={unread ? ['#1E91C8', '#5537A9'] : ['rgba(25,63,88,.98)', 'rgba(16,40,65,.98)']} style={[styles.bell, unread > 0 && styles.bellUnread]}>
          <Ionicons name={unread ? 'notifications' : 'notifications-outline'} size={25} color={colors.white} />
          {unread ? <View style={styles.badge}><Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text></View> : null}
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>

    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => setVisible(false)} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setVisible(false)} />
        <FadeInView distance={35} style={styles.sheet}>
          <LinearGradient colors={gradients.panelColorful} style={styles.gradient}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <View style={styles.headerIcon}><Ionicons name="notifications" size={30} color={colors.cyan} /></View>
              <View style={styles.copy}><Text style={styles.kicker}>DRABORNGATE BİLDİRİM MERKEZİ</Text><Text style={styles.title}>Bildirimler</Text><Text style={styles.subtitle}>{unread} okunmamış • {gate.notifications.length} toplam kayıt</Text></View>
              <AnimatedPressable onPress={() => setVisible(false)}><View style={styles.close}><Ionicons name="close" size={25} color={colors.text} /></View></AnimatedPressable>
            </View>
            <View style={styles.actionRow}>
              <AnimatedPressable containerStyle={styles.actionWrap} onPress={() => void gate.refresh()}><View style={styles.action}><Ionicons name="refresh" size={18} color={colors.cyan} /><Text style={styles.actionText}>YENİLE</Text></View></AnimatedPressable>
              <AnimatedPressable containerStyle={styles.actionWrap} onPress={() => void markAll()} disabled={!unread}><View style={[styles.action, !unread && styles.actionDisabled]}><Ionicons name="checkmark-done" size={18} color={unread ? colors.green : colors.textMuted} /><Text style={[styles.actionText, { color: unread ? colors.green : colors.textMuted }]}>TÜMÜNÜ OKU</Text></View></AnimatedPressable>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
              {gate.notifications.length ? gate.notifications.slice(0, limit).map((item, index) => <NotificationRow key={item.id} item={item} index={index} onRead={() => !item.readAt && void gate.markNotificationRead(item.id)} />) : <EmptyState icon="notifications-outline" title="Bildirim yok" description="Kurye, güvenlik, ziyaretçi, aidat ve yönetim bildirimleri burada toplanır." />}
              {limit < gate.notifications.length ? <AnimatedPressable onPress={() => setLimit((value) => value + 10)}><View style={styles.more}><Ionicons name="chevron-down" size={20} color={colors.cyan} /><Text style={styles.moreText}>10 BİLDİRİM DAHA GÖSTER</Text><Text style={styles.moreCount}>{gate.notifications.length - limit} kayıt kaldı</Text></View></AnimatedPressable> : null}
            </ScrollView>
          </LinearGradient>
        </FadeInView>
      </View>
    </Modal>
  </>;
}

function NotificationRow({ item, index, onRead }: { item: GateNotification; index: number; onRead: () => void }) {
  const tone = toneFor(item.kind);
  return <FadeInView delay={Math.min(index * 30, 240)} distance={8}>
    <AnimatedPressable onPress={onRead} disabled={Boolean(item.readAt)}>
      <Panel style={[styles.row, !item.readAt && { borderColor: `${tone}70`, backgroundColor: `${tone}0D` }]} gradient>
        <View style={[styles.rowIcon, { backgroundColor: `${tone}1C`, borderColor: `${tone}55` }]}><Ionicons name={iconFor(item.kind)} size={23} color={tone} /></View>
        <View style={styles.copy}><View style={styles.rowTitleLine}><Text style={styles.rowTitle}>{item.title}</Text>{!item.readAt ? <View style={styles.newBadge}><PulseDot color={tone} size={6} /><Text style={[styles.newText, { color: tone }]}>YENİ</Text></View> : null}</View><Text style={styles.rowBody}>{item.body}</Text><Text style={styles.time}>{new Date(item.createdAt).toLocaleString('tr-TR')}</Text></View>
        <Ionicons name={item.readAt ? 'checkmark-circle' : 'chevron-forward'} size={20} color={item.readAt ? colors.green : colors.textMuted} />
      </Panel>
    </AnimatedPressable>
  </FadeInView>;
}

const styles = StyleSheet.create({
  floating: { position: 'absolute', right: 15, top: 9, zIndex: 200 },
  bell: { width: 52, height: 52, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  bellUnread: { borderColor: 'rgba(55,216,255,.72)' },
  badge: { position: 'absolute', right: -5, top: -5, minWidth: 23, height: 23, borderRadius: 12, paddingHorizontal: 5, backgroundColor: colors.red, borderWidth: 2, borderColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(1,7,14,.86)' },
  sheet: { maxHeight: '93%', margin: 8, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: colors.borderStrong },
  gradient: { paddingTop: 10 }, handle: { width: 60, height: 5, borderRadius: 5, backgroundColor: colors.textMuted, opacity: .55, alignSelf: 'center', marginBottom: 10 },
  header: { paddingHorizontal: spacing.md, paddingBottom: 13, flexDirection: 'row', alignItems: 'center', gap: 11 }, headerIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: 'rgba(55,216,255,.14)', borderWidth: 1, borderColor: 'rgba(55,216,255,.38)', alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 }, kicker: { color: colors.cyan, fontSize: 9, fontWeight: '900', letterSpacing: .7 }, title: { color: colors.text, fontSize: 27, fontWeight: '900', marginTop: 1 }, subtitle: { color: colors.textSoft, fontSize: 12, marginTop: 3 }, close: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(255,255,255,.07)', alignItems: 'center', justifyContent: 'center' },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.md, paddingBottom: 12 }, actionWrap: { flex: 1 }, action: { minHeight: 46, borderRadius: 15, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 }, actionDisabled: { opacity: .45 }, actionText: { color: colors.cyan, fontSize: 11, fontWeight: '900' },
  list: { padding: spacing.md, paddingTop: 2, paddingBottom: 35, gap: 10 }, row: { minHeight: 91, flexDirection: 'row', alignItems: 'center', gap: 11 }, rowIcon: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 7 }, rowTitle: { flex: 1, color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '900' }, rowBody: { color: colors.textSoft, fontSize: 13, lineHeight: 19, marginTop: 4 }, time: { color: colors.textMuted, fontSize: 10, marginTop: 6, fontWeight: '700' }, newBadge: { minHeight: 24, paddingHorizontal: 7, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.06)', flexDirection: 'row', alignItems: 'center', gap: 4 }, newText: { fontSize: 8, fontWeight: '900' },
  more: { minHeight: 56, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: 'rgba(55,216,255,.07)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, moreText: { color: colors.cyan, fontSize: 11, fontWeight: '900' }, moreCount: { color: colors.textMuted, fontSize: 9, fontWeight: '800' },
});
