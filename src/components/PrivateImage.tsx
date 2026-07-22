import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ImageStyle, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { createPrivateImageUrl } from '../lib/gateMedia';
import { colors } from '../theme';

export function PrivateImage({ path, style }: { path?: string; style?: StyleProp<ImageStyle> }) {
  const [url, setUrl] = useState<string>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    setFailed(false);
    setUrl(undefined);
    if (!path) return;
    void createPrivateImageUrl(path).then((next) => {
      if (!active) return;
      if (next) setUrl(next);
      else setFailed(true);
    });
    return () => { active = false; };
  }, [path]);

  if (!path) return null;
  const fallbackStyle = style as StyleProp<ViewStyle>;
  if (failed) return <View style={[styles.fallback, fallbackStyle]}><Text style={styles.text}>Görsel açılamadı</Text></View>;
  if (!url) return <View style={[styles.fallback, fallbackStyle]}><ActivityIndicator color={colors.cyan} /></View>;
  return <Image source={{ uri: url }} style={[styles.image, style]} resizeMode="cover" />;
}

const styles = StyleSheet.create({
  image: { width: '100%', height: 160, borderRadius: 16 },
  fallback: { width: '100%', height: 100, borderRadius: 16, backgroundColor: 'rgba(55,216,255,.08)', alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textMuted, fontSize: 11, fontWeight: '800' },
});
