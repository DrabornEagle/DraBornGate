import React, { PropsWithChildren, useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  PressableProps,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { RacingMotorcycle } from './RacingMotorcycle';

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
  const lift = useRef(new Animated.Value(0)).current;

  const animate = (pressed: boolean) => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: pressed ? 0.965 : 1,
        damping: pressed ? 18 : 15,
        stiffness: pressed ? 420 : 320,
        useNativeDriver: true,
      }),
      Animated.spring(lift, {
        toValue: pressed ? 2 : 0,
        damping: 18,
        stiffness: 320,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <Animated.View
      style={[
        containerStyle,
        { transform: [{ scale }, { translateY: lift }] },
      ]}
    >
      <Pressable
        {...props}
        onPressIn={(event) => {
          animate(true);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          animate(false);
          onPressOut?.(event);
        }}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function PulseDot({ color, size = 10 }: { color: string; size?: number }) {
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
        width: size,
        height: size,
        borderRadius: size,
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

export function FloatingView({
  children,
  style,
  distance = 5,
  duration = 1700,
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  distance?: number;
  duration?: number;
}>) {
  const float = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [duration, float]);

  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            {
              translateY: float.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -distance],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function AnimatedMotorcycle({
  color,
  size = 58,
}: {
  color: string;
  size?: number;
}) {
  return <RacingMotorcycle color={color} size={size} />;
}
