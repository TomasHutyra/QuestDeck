import React, { useRef, useEffect } from 'react';
import { TouchableOpacity, Text, View, Animated, StyleSheet } from 'react-native';
import { Quest } from '../types';

type Props = {
  quest: Quest;
  isRevealed: boolean;
  onPress: () => void;
};

export function QuestCard({ quest, isRevealed, onPress }: Props) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 0.3, duration: 120, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
  }, [isRevealed]);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
      <Animated.View style={[styles.card, isRevealed ? styles.revealed : styles.faceDown, { opacity }]}>
        {isRevealed ? (
          <View style={styles.revealedContent}>
            <Text style={styles.title}>{quest.title}</Text>
            <Text style={styles.description} numberOfLines={2}>{quest.description}</Text>
            <View style={styles.meta}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{quest.durationMinutes} min</Text>
              </View>
              <Text style={styles.xp}>⭐ {quest.xp} XP</Text>
            </View>
            <View style={styles.ctaRow}>
              <Text style={styles.ctaText}>Choose this quest →</Text>
            </View>
          </View>
        ) : (
          <View style={styles.faceDownContent}>
            <Text style={styles.cardIcon}>🃏</Text>
            <Text style={styles.tapHint}>Tap to reveal</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    justifyContent: 'center',
  },
  faceDown: {
    backgroundColor: '#FF8C42',
    alignItems: 'center',
  },
  revealed: {
    backgroundColor: '#FFF3E8',
    borderWidth: 2,
    borderColor: '#FF8C42',
  },
  faceDownContent: { alignItems: 'center' },
  cardIcon: { fontSize: 28 },
  tapHint: { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 6 },
  revealedContent: { gap: 6 },
  title: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  description: { fontSize: 12, color: '#666', lineHeight: 17 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  badge: { backgroundColor: '#FF8C42', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: '700' },
  xp: { fontSize: 11, color: '#aaa' },
  ctaRow: {
    alignItems: 'flex-end',
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#FFD0A0',
  },
  ctaText: { fontSize: 12, fontWeight: '800', color: '#FF8C42' },
});
