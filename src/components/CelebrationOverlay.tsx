import React, { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { Confetti } from './Confetti';
import { Decky } from './Decky';
import { allBadges } from '../data/badges';
import { BADGE_IMAGES } from '../data/badges/badgeImages';

const CELEBRATION_AUTO_DISMISS_MS = 1800;

type CelebrationOverlayProps = {
  type: 'quest-complete' | 'streak' | 'level-up' | 'badge';
  visible: boolean;
  xpAwarded?: number;
  newStreak?: number;
  newLevel?: number;
  badgeIds?: string[];
  onDismiss?: () => void;
};

export function CelebrationOverlay({
  type,
  visible,
  xpAwarded,
  newStreak,
  newLevel,
  badgeIds,
  onDismiss,
}: CelebrationOverlayProps) {
  const { reducedMotionEnabled } = useSettingsStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDismissRef = useRef(onDismiss);
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => { onDismissRef.current = onDismiss; });

  useEffect(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }

    if (!visible) {
      opacity.setValue(0);
      translateY.setValue(10);
      scale.setValue(0.6);
      return;
    }

    animationRef.current?.stop();

    if (reducedMotionEnabled) {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
    } else if (type === 'quest-complete') {
      opacity.setValue(0);
      translateY.setValue(16);
      animationRef.current = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 350, useNativeDriver: true }),
      ]);
      animationRef.current.start();
    } else if (type === 'streak' || type === 'badge') {
      opacity.setValue(0);
      scale.setValue(0.4);
      animationRef.current = Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.spring(scale, {
          toValue: 1, damping: 6, stiffness: 200, useNativeDriver: true,
        }),
      ]);
      animationRef.current.start();
    } else if (type === 'level-up') {
      opacity.setValue(0);
      scale.setValue(0.7);
      animationRef.current = Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.spring(scale, { toValue: 1.05, damping: 8, stiffness: 180, useNativeDriver: true }),
        ]),
        Animated.spring(scale, { toValue: 1, damping: 12, stiffness: 200, useNativeDriver: true }),
      ]);
      animationRef.current.start();
    }

    dismissTimer.current = setTimeout(() => {
      onDismissRef.current?.();
    }, CELEBRATION_AUTO_DISMISS_MS);

    return () => {
      animationRef.current?.stop();
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [visible, type, reducedMotionEnabled, opacity, translateY, scale]);

  if (!visible) return null;
  if (type === 'badge' && (!badgeIds || badgeIds.length === 0)) return null;

  const renderBadgeIcon = (id: string, boxSize: number, fontSize: number) => {
    const image = BADGE_IMAGES[id];
    const badgeDef = allBadges.find((b) => b.id === id);
    const fallbackEmoji = badgeDef?.emoji ?? '🏅';
    return (
      <View style={{ width: boxSize, height: boxSize, alignItems: 'center', justifyContent: 'center' }}>
        {image
          ? <Image source={image} style={{ width: boxSize, height: boxSize }} resizeMode="contain" />
          : <Text style={{ fontSize }}>{fallbackEmoji}</Text>
        }
      </View>
    );
  };

  return (
    <View style={styles.overlay} pointerEvents="none">
      {type === 'quest-complete' && (
        <>
          <Confetti active={visible} />
          <Animated.View style={[styles.badge, { opacity, transform: [{ translateY }] }]}>
            <Text style={styles.badgeLabel}>You earned</Text>
            <Text style={styles.xpText}>+{xpAwarded ?? 0} XP</Text>
          </Animated.View>
        </>
      )}

      {type === 'streak' && (
        <Animated.View style={[styles.badge, styles.streakBadge, { opacity, transform: [{ scale }] }]}>
          <Decky pose="streak" size={72} />
          <Text style={styles.streakText}>{newStreak}-day streak!</Text>
          <Text style={styles.streakSub}>Keep it going</Text>
        </Animated.View>
      )}

      {type === 'level-up' && (
        <Animated.View style={[styles.badge, styles.levelUpBadge, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.levelUpEmoji}>⬆️</Text>
          <Text style={styles.levelUpText}>Level {newLevel}!</Text>
          <Text style={styles.levelUpSub}>New rank unlocked</Text>
        </Animated.View>
      )}

      {type === 'badge' && badgeIds && (
        <Animated.View style={[styles.badge, styles.badgeBadge, { opacity, transform: [{ scale }] }]}>
          {badgeIds.length === 1 ? (
            <>
              {renderBadgeIcon(badgeIds[0], 64, 40)}
              <Text style={styles.badgeUnlockHeadline}>Badge unlocked!</Text>
              <Text style={styles.badgeUnlockName}>
                {allBadges.find((b) => b.id === badgeIds[0])?.name ?? badgeIds[0]}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.badgeUnlockHeadline}>Badges unlocked!</Text>
              <View style={styles.badgeTileRow}>
                {badgeIds.slice(0, 3).map((id) => (
                  <View key={id} style={styles.badgeTile}>
                    {renderBadgeIcon(id, 48, 28)}
                    <Text style={styles.badgeTileName}>
                      {allBadges.find((b) => b.id === id)?.name ?? id}
                    </Text>
                  </View>
                ))}
              </View>
              {badgeIds.length > 3 && (
                <Text style={styles.badgeMore}>+{badgeIds.length - 3} more</Text>
              )}
            </>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  badge: {
    backgroundColor: '#FFF3E8', borderRadius: 20, paddingHorizontal: 32, paddingVertical: 20,
    alignItems: 'center', borderWidth: 2, borderColor: '#FFD0A0', gap: 4,
    elevation: 8, shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 8,
  },
  streakBadge: { paddingVertical: 24, paddingHorizontal: 40 },
  levelUpBadge: { paddingVertical: 28, paddingHorizontal: 44 },
  badgeLabel: { fontSize: 11, color: '#aaa' },
  xpText: { fontSize: 40, fontWeight: '900', color: '#FF8C42' },
  streakText: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  streakSub: { fontSize: 12, color: '#aaa' },
  levelUpEmoji: { fontSize: 52 },
  levelUpText: { fontSize: 28, fontWeight: '900', color: '#FF8C42' },
  levelUpSub: { fontSize: 13, color: '#888' },
  badgeBadge: { paddingVertical: 24, paddingHorizontal: 36 },
  badgeUnlockHeadline: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  badgeUnlockName: { fontSize: 13, color: '#888', textAlign: 'center' },
  badgeTileRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 4,
  },
  badgeTile: { alignItems: 'center', gap: 4, maxWidth: 72 },
  badgeTileName: { fontSize: 11, color: '#888', textAlign: 'center' },
  badgeMore: { fontSize: 12, color: '#aaa', marginTop: 4 },
});
