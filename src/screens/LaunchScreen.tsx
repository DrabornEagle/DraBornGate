import { StatusBar } from 'expo-status-bar';
import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SOURCE_WIDTH = 864;
const SOURCE_HEIGHT = 1536;

export function LaunchScreen({ onStart }: { onStart: () => void }) {
  const { width, height } = useWindowDimensions();
  const frame = useMemo(() => {
    const scale = Math.max(width / SOURCE_WIDTH, height / SOURCE_HEIGHT);
    return { width: SOURCE_WIDTH * scale, height: SOURCE_HEIGHT * scale };
  }, [height, width]);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar hidden />
      <View style={[styles.frame, frame]}>
        <Image
          source={require('../../assets/branding/draborngate-welcome.png')}
          style={styles.image}
          resizeMode="cover"
          fadeDuration={0}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="DraBornGate uygulamasını başlat"
          accessibilityHint="Giriş ekranını açar"
          hitSlop={8}
          onPress={onStart}
          style={({ pressed }) => [styles.startHitArea, pressed && styles.pressed]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#02070D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    position: 'relative',
    flexShrink: 0,
    backgroundColor: '#02070D',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  startHitArea: {
    position: 'absolute',
    left: '16.2%',
    right: '16.2%',
    top: '81.5%',
    height: '10.7%',
    borderRadius: 24,
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
