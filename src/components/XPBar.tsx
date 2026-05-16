import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LEVEL_LABELS, xpProgressInCurrentLevel } from '../lib/xp';

type Props = {
  level: number;
  totalXp: number;
  currentStreak?: number;
};

export function XPBar({ level, totalXp, currentStreak }: Props) {
  const { earned, total } = xpProgressInCurrentLevel(totalXp);
  const progress = total > 0 ? earned / total : 1;
  const label = LEVEL_LABELS[level - 1] ?? 'Legend';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.levelText}>Lv {level} · {label}</Text>
        <View style={styles.rightGroup}>
          {currentStreak != null && currentStreak > 0 && (
            <Text style={styles.streakText}>🔥 {currentStreak}</Text>
          )}
          <Text style={styles.xpText}>{totalXp} XP</Text>
        </View>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  levelText: { fontSize: 11, color: '#888', fontWeight: '600' },
  rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  streakText: { fontSize: 11, color: '#FF8C42', fontWeight: '700' },
  xpText: { fontSize: 11, color: '#888' },
  track: { height: 4, backgroundColor: '#F0E6D8', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FF8C42', borderRadius: 2 },
});
