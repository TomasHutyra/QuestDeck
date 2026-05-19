import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { BadgeProgress } from '../lib/badges';
import { BADGE_IMAGES } from '../data/badges/badgeImages';

type Props = {
  progress: BadgeProgress;
  variant: 'progress' | 'unlocked';
};

const VISUAL_SIZE = 64;

export function BadgeCard({ progress, variant }: Props) {
  const { badge, current, target, progress: pct } = progress;
  const imageSource = BADGE_IMAGES[badge.id];

  const visual = imageSource ? (
    <Image source={imageSource} style={styles.image} />
  ) : (
    <View style={styles.emojiBox}>
      <Text style={styles.emoji}>{badge.emoji}</Text>
    </View>
  );

  if (variant === 'unlocked') {
    return (
      <View style={styles.unlockedCard}>
        {visual}
        <Text style={styles.name} numberOfLines={1}>{badge.name}</Text>
        <Text style={styles.unlockedDesc} numberOfLines={2}>{badge.description}</Text>
      </View>
    );
  }

  return (
    <View style={styles.progressCard}>
      {visual}
      <View style={styles.info}>
        <Text style={styles.name}>{badge.name}</Text>
        <Text style={styles.progressDesc}>{badge.description}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(pct * 100, 100)}%` }]} />
        </View>
        <Text style={styles.count}>{current} / {target}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: VISUAL_SIZE, height: VISUAL_SIZE, borderRadius: 8 },
  emojiBox: {
    width: VISUAL_SIZE,
    height: VISUAL_SIZE,
    borderRadius: 8,
    backgroundColor: '#FFF0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 30 },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    elevation: 1,
  },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 13, fontWeight: '800', color: '#1a1a1a', marginBottom: 2 },
  progressDesc: { fontSize: 11, color: '#888', marginBottom: 6 },
  track: {
    height: 5,
    backgroundColor: '#F0E6D8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#FF8C42', borderRadius: 3 },
  count: { fontSize: 11, color: '#FF8C42', fontWeight: '700', marginTop: 4 },
  unlockedCard: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    elevation: 1,
    width: 116,
  },
  unlockedDesc: { fontSize: 10, color: '#aaa', textAlign: 'center', marginTop: 2 },
});
