import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export type DeckyPose = 'idle' | 'wave' | 'celebrate' | 'empty' | 'streak';

type Props = {
  pose: DeckyPose;
  size?: number;
};

// Placeholder faces used until PNG assets are provided.
// TODO: Replace with Image requires from assets/decky/ when designer delivers:
//   decky_idle.png | decky_wave.png | decky_celebrate.png | decky_empty.png | decky_streak.png
// Example replacement:
//   const POSE_ASSET: Record<DeckyPose, ReturnType<typeof require>> = {
//     idle:      require('../../assets/decky/decky_idle.png'),
//     wave:      require('../../assets/decky/decky_wave.png'),
//     celebrate: require('../../assets/decky/decky_celebrate.png'),
//     empty:     require('../../assets/decky/decky_empty.png'),
//     streak:    require('../../assets/decky/decky_streak.png'),
//   };
//   return <Image source={POSE_ASSET[pose]} style={{ width: size, height: cardHeight }} resizeMode="contain" />;
const POSE_FACE: Record<DeckyPose, string> = {
  idle:      '😐',
  wave:      '👋',
  celebrate: '🥳',
  empty:     '😴',
  streak:    '🔥',
};

export function Decky({ pose, size = 64 }: Props) {
  const cardHeight = Math.round(size * 1.4);
  const fontSize = Math.round(size * 0.42);
  return (
    <View style={[
      styles.card,
      { width: size, height: cardHeight, borderRadius: Math.round(size * 0.14) },
    ]}>
      <View style={styles.shine} />
      <Text style={[styles.face, { fontSize }]}>{POSE_FACE[pose]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FF8C42',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  shine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  face: { zIndex: 1 },
});
