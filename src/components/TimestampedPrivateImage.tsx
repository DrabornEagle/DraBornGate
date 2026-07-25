import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { PrivateImage } from './PrivateImage';

function timestampLabel(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('tr-TR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export function TimestampedPrivateImage({
  path,
  capturedAt,
  style,
  fullscreen = false,
}: {
  path?: string;
  capturedAt?: string;
  style?: StyleProp<ViewStyle>;
  fullscreen?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const label = useMemo(() => timestampLabel(capturedAt), [capturedAt]);
  const attention = useRef(new Animated.Value(0)).current;
  const scan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const attentionLoop = Animated.loop(Animated.sequence([
      Animated.timing(attention, { toValue: 1, duration: 950, useNativeDriver: true }),
      Animated.timing(attention, { toValue: 0, duration: 950, useNativeDriver: true }),
    ]));
    const scanLoop = Animated.loop(Animated.sequence([
      Animated.timing(scan, { toValue: 1, duration: 1900, useNativeDriver: true }),
      Animated.delay(350),
      Animated.timing(scan, { toValue: 0, duration: 0, useNativeDriver: true }),
    ]));
    attentionLoop.start();
    scanLoop.start();
    return () => { attentionLoop.stop(); scanLoop.stop(); };
  }, [attention, scan]);

  if (!path) return null;

  const preview = (
    <Animated.View style={[s.frame, style, {
      transform: [{ scale: attention.interpolate({ inputRange: [0, 1], outputRange: [1, 1.012] }) }],
    }]}>
      <PrivateImage path={path} style={s.image} />
      <Animated.View pointerEvents="none" style={[s.attentionBorder, { opacity: attention.interpolate({ inputRange: [0, 1], outputRange: [.38, 1] }) }]} />
      <View style={s.caption}><Ionicons name="scan" size={14} color={colors.cyan} /><Text style={s.captionText}>SİPARİŞ EKRAN GÖRÜNTÜSÜ • DOKUN VE BÜYÜT</Text></View>
      <Animated.View pointerEvents="none" style={[s.scanLine, { transform: [{ translateY: scan.interpolate({ inputRange: [0, 1], outputRange: [0, 132] }) }] }]} />
      {label ? <View style={s.stamp}><Ionicons name="calendar" size={12} color={colors.white} /><Text style={s.stampText}>{label}</Text></View> : null}
      {fullscreen ? <View style={s.expand}><Ionicons name="expand" size={18} color={colors.white} /></View> : null}
    </Animated.View>
  );

  return <>
    {fullscreen ? <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="Sipariş ekran görüntüsünü tam ekran aç">{preview}</Pressable> : preview}
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <SafeAreaView style={s.modal} edges={['top', 'bottom', 'left', 'right']}>
        <Pressable style={s.close} onPress={() => setOpen(false)}><Ionicons name="close" size={30} color={colors.white} /></Pressable>
        <View style={s.fullFrame}>
          <PrivateImage path={path} style={s.fullImage} resizeMode="contain" />
          {label ? <View style={[s.stamp, s.fullStamp]}><Ionicons name="calendar" size={14} color={colors.white} /><Text style={[s.stampText, s.fullStampText]}>{label}</Text></View> : null}
        </View>
        <Text style={s.hint}>Kapatmak için sağ üstteki çarpıya dokun</Text>
      </SafeAreaView>
    </Modal>
  </>;
}

const s = StyleSheet.create({
  frame: { width: '100%', height: 165, borderRadius: 16, overflow: 'hidden', backgroundColor: 'rgba(5,15,26,.95)', borderWidth: 1, borderColor: 'rgba(55,216,255,.7)' },
  image: { width: '100%', height: '100%', borderRadius: 16 },
  attentionBorder: { ...StyleSheet.absoluteFill, borderRadius: 16, borderWidth: 2, borderColor: colors.cyan },
  caption: { position: 'absolute', left: 8, top: 8, maxWidth: '76%', minHeight: 29, borderRadius: 10, paddingHorizontal: 8, backgroundColor: 'rgba(4,18,31,.88)', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(55,216,255,.55)' },
  captionText: { flexShrink: 1, color: colors.cyan, fontSize: 8, fontWeight: '900', letterSpacing: .25 },
  scanLine: { position: 'absolute', left: 8, right: 8, top: 17, height: 2, borderRadius: 2, backgroundColor: 'rgba(67,231,162,.9)' },
  stamp: { position: 'absolute', right: 8, bottom: 8, minHeight: 27, borderRadius: 9, paddingHorizontal: 8, backgroundColor: 'rgba(0,0,0,.78)', flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,.35)' },
  stampText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  expand: { position: 'absolute', right: 8, top: 8, width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(0,0,0,.72)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.32)' },
  modal: { flex: 1, backgroundColor: 'rgba(0,0,0,.98)', justifyContent: 'center' },
  close: { position: 'absolute', zIndex: 5, top: 18, right: 18, width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,.13)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,.25)' },
  fullFrame: { flex: 1, marginTop: 72, marginHorizontal: 8, marginBottom: 44, justifyContent: 'center' },
  fullImage: { width: '100%', height: '100%', borderRadius: 0 },
  fullStamp: { right: 14, bottom: 14, minHeight: 34, paddingHorizontal: 11 },
  fullStampText: { fontSize: 12 },
  hint: { position: 'absolute', bottom: 15, left: 0, right: 0, color: 'rgba(255,255,255,.68)', fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
