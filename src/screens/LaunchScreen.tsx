import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SOURCE_WIDTH = 864;
const SOURCE_HEIGHT = 1536;

export function LaunchScreen({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const frame = useMemo(() => {
    const scale = Math.min(width / SOURCE_WIDTH, height / SOURCE_HEIGHT);
    return { width: SOURCE_WIDTH * scale, height: SOURCE_HEIGHT * scale };
  }, [height, width]);

  return <SafeAreaView style={styles.safe} edges={[]}>
    <View style={[styles.frame, frame]}>
      <Image source={require('../../assets/branding/draborngate-welcome.png')} style={styles.image} resizeMode="contain" fadeDuration={0} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Başla"
        android_ripple={{ color: 'rgba(255,255,255,.16)', borderless: false }}
        onPress={onStart}
        style={({ pressed }) => [styles.startHitArea, pressed && styles.pressed]}
      />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#02070D', alignItems: 'center', justifyContent: 'center' },
  frame: { position: 'relative', overflow: 'hidden', backgroundColor: '#02070D' },
  image: { width: '100%', height: '100%' },
  startHitArea: { position: 'absolute', left: '16.2%', right: '16.2%', top: '81.5%', height: '10.7%', borderRadius: 24 },
  pressed: { backgroundColor: 'rgba(255,255,255,.10)', transform: [{ scale: .985 }] },
});
