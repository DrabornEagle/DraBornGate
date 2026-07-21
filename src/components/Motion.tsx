import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';

interface FadeInProps extends PropsWithChildren {
  delay?: number;
  style?: StyleProp<ViewStyle>;
  distance?: number;
}

export function FadeInView({
  children,
  delay = 0,
  style,
  distance = 18,
}: FadeInProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(distance)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 430,
        delay,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        delay,
        damping: 18,
        stiffness: 140,
        mass: 0.8,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, distance, opacity, translateY]);

  return (
    <Animated.View style={[style, { opacity, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

interface AnimatedPressableProps extends PressableProps {
  containerStyle?: StyleProp<ViewStyle>;
}

export function AnimatedPressable({
  children,
  containerStyle,
  onPressIn,
  onPressOut,
  ...props
}: AnimatedPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[containerStyle, { transform: [{ scale }] }]}>
      <Pressable
        {...props}
        onPressIn={(event) => {
          Animated.spring(scale, {
            toValue: 0.97,
            damping: 18,
            stiffness: 420,
            useNativeDriver: true,
          }).start();
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          Animated.spring(scale, {
            toValue: 1,
            damping: 15,
            stiffness: 320,
            useNativeDriver: true,
          }).start();
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function PulseDot({ color }: { color: string }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={{
        width: 10,
        height: 10,
        borderRadius: 10,
        backgroundColor: color,
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
        transform: [
          {
            scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1.18] }),
          },
        ],
      }}
    />
  );
}
