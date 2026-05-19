import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PARTICLE_COUNT = 20;
const COLORS = ['#FF8C42', '#FFD0A0', '#FF6B35', '#FFB347', '#FF4500', '#FFF3E8'];
const DURATION = 1400;

type Particle = {
  translateY: Animated.Value;
  translateX: Animated.Value;
  rotate: Animated.Value;
  opacity: Animated.Value;
  left: number;
  color: string;
  size: number;
};

function makeParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    translateY: new Animated.Value(-30),
    translateX: new Animated.Value(0),
    rotate: new Animated.Value(0),
    opacity: new Animated.Value(0),
    left: (SCREEN_WIDTH / count) * i + Math.random() * 10,
    color: COLORS[i % COLORS.length],
    size: 6 + Math.round(Math.random() * 4),
  }));
}

type Props = {
  active: boolean;
  count?: number;
};

export function Confetti({ active, count = PARTICLE_COUNT }: Props) {
  const { reducedMotionEnabled } = useSettingsStore();
  const particles = useRef<Particle[]>(makeParticles(count)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!active) {
      particles.forEach((p) => {
        p.translateY.setValue(-30);
        p.translateX.setValue(0);
        p.opacity.setValue(0);
        p.rotate.setValue(0);
      });
      return;
    }

    if (reducedMotionEnabled) {
      particles.forEach((p) => p.opacity.setValue(0));
      return;
    }

    particles.forEach((p) => {
      p.translateY.setValue(-30);
      p.translateX.setValue(0);
      p.rotate.setValue(0);
      p.opacity.setValue(1);
    });

    animRef.current = Animated.parallel(
      particles.map((p, i) => {
        const delay = i * 25;
        const drift = (Math.random() - 0.5) * 80;
        const fallDistance = 350 + Math.random() * 200;
        return Animated.parallel([
          Animated.timing(p.translateY, {
            toValue: fallDistance, duration: DURATION, delay, useNativeDriver: true,
          }),
          Animated.timing(p.translateX, {
            toValue: drift, duration: DURATION, delay, useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: 1, duration: DURATION, delay, useNativeDriver: true,
          }),
          Animated.sequence([
            Animated.delay(delay + DURATION * 0.6),
            Animated.timing(p.opacity, {
              toValue: 0, duration: DURATION * 0.4, useNativeDriver: true,
            }),
          ]),
        ]);
      })
    );
    animRef.current.start();

    return () => { animRef.current?.stop(); };
  }, [active, reducedMotionEnabled, particles]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.map((p, i) => {
        const rotate = p.rotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', '360deg'],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                left: p.left,
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                opacity: p.opacity,
                transform: [{ translateY: p.translateY }, { translateX: p.translateX }, { rotate }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: { position: 'absolute', top: 0, borderRadius: 2 },
});
