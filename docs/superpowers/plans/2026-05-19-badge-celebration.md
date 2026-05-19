# Badge Celebration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a spring-bounce celebration overlay when a quest completion unlocks one or more badges, sequenced after any streak or level-up overlay.

**Architecture:** Four small, ordered changes: (1) thread `newlyUnlockedBadgeIds` through the result type and action, (2) add haptic feedback function, (3) add `'badge'` type to `CelebrationOverlay`, (4) add a second overlay state + sequencing to `CompletionScreen`. Tests are updated alongside task 1.

**Tech Stack:** React Native / Expo, TypeScript, Zustand, expo-haptics, `Animated` API.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/types/index.ts` | Add `newlyUnlockedBadgeIds: string[]` to `CompleteQuestResult` |
| Modify | `src/actions/completeQuest.ts` | Return `newlyUnlockedBadgeIds` in both branches |
| Modify | `__tests__/actions/completeQuestBadges.test.ts` | Assert `newlyUnlockedBadgeIds`; add multiple-ids test |
| Modify | `src/lib/feedback.ts` | Add `playBadgeUnlockedFeedback()` |
| Modify | `src/components/CelebrationOverlay.tsx` | Add `'badge'` type, `badgeIds` prop, constant, rendering |
| Modify | `src/screens/CompletionScreen.tsx` | Add `badgeOverlayVisible`, `badgeOverlayQueuedRef`, sequencing |

---

## Task 1: Add `newlyUnlockedBadgeIds` to result type, action, and tests

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/actions/completeQuest.ts`
- Modify: `__tests__/actions/completeQuestBadges.test.ts`

- [ ] **Step 1: Update `CompleteQuestResult` in `src/types/index.ts`**

Replace the `CompleteQuestResult` type (lines 49–61):

```ts
export type CompleteQuestResult = {
  status: 'completed' | 'already_completed';
  questId: string;
  xpAwarded: number;
  totalXpBefore: number;
  totalXpAfter: number;
  levelBefore: number;
  levelAfter: number;
  levelUp: boolean;
  streakBefore: number;
  streakAfter: number;
  streakExtended: boolean;
  newlyUnlockedBadgeIds: string[];
};
```

- [ ] **Step 2: Add `newlyUnlockedBadgeIds` to `completeQuest` return values in `src/actions/completeQuest.ts`**

In the early-return branch (already_completed, lines 16–29), add the field:

```ts
  if (completedQuests.some((cq) => cq.questId === quest.id)) {
    return {
      status: 'already_completed',
      questId: quest.id,
      xpAwarded: 0,
      totalXpBefore: totalXp,
      totalXpAfter: totalXp,
      levelBefore: level,
      levelAfter: level,
      levelUp: false,
      streakBefore: currentStreak,
      streakAfter: currentStreak,
      streakExtended: false,
      newlyUnlockedBadgeIds: [],
    };
  }
```

In the successful-completion return (lines 94–106), add the field:

```ts
  return {
    status: 'completed',
    questId: quest.id,
    xpAwarded: quest.xp,
    totalXpBefore: totalXp,
    totalXpAfter: newTotalXp,
    levelBefore: level,
    levelAfter: newLevel,
    levelUp: newLevel > level,
    streakBefore: currentStreak,
    streakAfter: newStreak,
    streakExtended: newStreak > currentStreak,
    newlyUnlockedBadgeIds: newlyUnlockedIds,
  };
```

- [ ] **Step 3: Update tests to assert `newlyUnlockedBadgeIds` and add new test case**

Replace the entire `completeQuest badge recording` describe block in `__tests__/actions/completeQuestBadges.test.ts` (lines 81–161) with the following. The `getRecentlyUnlockedBadges` describe block (lines 32–77) is unchanged.

```ts
describe('completeQuest badge recording', () => {
  it('completing first quest records first_quest in unlockedAt and returns it in newlyUnlockedBadgeIds', () => {
    const result = completeQuest(questEasy);

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['first_quest']).toBeDefined();
    expect(unlockedAt['first_quest']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.newlyUnlockedBadgeIds).toContain('first_quest');
  });

  it('completing third quest records getting_started in unlockedAt and returns it in newlyUnlockedBadgeIds', () => {
    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
        { questId: 'q2', completedAt: '2026-01-02T00:00:00.000Z', completedDate: '2026-01-02', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({ totalXp: 20, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: null });

    const result = completeQuest(questEasy); // quest #3

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['getting_started']).toBeDefined();
    expect(result.newlyUnlockedBadgeIds).toContain('getting_started');
  });

  it('already_completed does not record any badge unlocks and returns empty newlyUnlockedBadgeIds', () => {
    completeQuest(questEasy);           // first completion — records first_quest
    useBadgeStore.setState({ unlockedAt: {} }); // reset badge store
    const result = completeQuest(questEasy); // already_completed — must not touch badge store

    expect(Object.keys(useBadgeStore.getState().unlockedAt)).toHaveLength(0);
    expect(result.newlyUnlockedBadgeIds).toEqual([]);
  });

  it('badges already unlocked before this completion are not re-recorded and not in newlyUnlockedBadgeIds', () => {
    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({ totalXp: 10, level: 1, currentStreak: 1, longestStreak: 1, lastCompletedDate: null });
    useBadgeStore.setState({ unlockedAt: { first_quest: '2026-01-01T00:00:00.000Z' } });

    const result = completeQuest(questEasy); // quest #2 — first_quest already unlocked before

    expect(useBadgeStore.getState().unlockedAt['first_quest']).toBe('2026-01-01T00:00:00.000Z');
    expect(result.newlyUnlockedBadgeIds).not.toContain('first_quest');
  });

  it('multiple badges unlocked by one completion are recorded with the same timestamp', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');

    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
        { questId: 'q2', completedAt: '2026-01-02T00:00:00.000Z', completedDate: '2026-01-02', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({
      totalXp: 20, level: 1, currentStreak: 2, longestStreak: 2, lastCompletedDate: yesterdayStr,
    });

    completeQuest(questEasy); // triggers count=3 AND streak=3 simultaneously

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['getting_started']).toBeDefined();
    expect(unlockedAt['three_day_streak']).toBeDefined();
    expect(unlockedAt['getting_started']).toBe(unlockedAt['three_day_streak']); // same nowIso
  });

  it('a single completion can return multiple newlyUnlockedBadgeIds', () => {
    // quest #3 with 2→3 day streak → both getting_started (count≥3) and three_day_streak (streak≥3) unlock
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');

    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
        { questId: 'q2', completedAt: '2026-01-02T00:00:00.000Z', completedDate: '2026-01-02', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({
      totalXp: 20, level: 1, currentStreak: 2, longestStreak: 2, lastCompletedDate: yesterdayStr,
    });

    const result = completeQuest(questEasy);

    expect(result.newlyUnlockedBadgeIds).toContain('getting_started');
    expect(result.newlyUnlockedBadgeIds).toContain('three_day_streak');
    expect(result.newlyUnlockedBadgeIds.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 4: Run tests**

```
npm test -- --testPathPattern=completeQuestBadges
```

Expected: all 7 tests in `completeQuestBadges.test.ts` pass (2 `getRecentlyUnlockedBadges` + 6 `completeQuest badge recording`).

- [ ] **Step 5: Commit**

```
git add src/types/index.ts src/actions/completeQuest.ts "__tests__/actions/completeQuestBadges.test.ts"
git commit -m "feat(result): add newlyUnlockedBadgeIds to CompleteQuestResult"
```

---

## Task 2: Add `playBadgeUnlockedFeedback` to `src/lib/feedback.ts`

**Files:**
- Modify: `src/lib/feedback.ts`

- [ ] **Step 1: Add the function**

Append after `playAlreadyCompletedFeedback` (after line 62):

```ts
export async function playBadgeUnlockedFeedback(): Promise<void> {
  await triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}
```

- [ ] **Step 2: Commit**

```
git add src/lib/feedback.ts
git commit -m "feat(feedback): add playBadgeUnlockedFeedback (heavy haptic only)"
```

---

## Task 3: Add `'badge'` type to `CelebrationOverlay`

**Files:**
- Modify: `src/components/CelebrationOverlay.tsx`

- [ ] **Step 1: Replace the entire file with the updated version**

```tsx
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

  const renderBadgeIcon = (id: string, size: number, fontSize: number) => {
    const image = BADGE_IMAGES[id];
    if (image) {
      return <Image source={image} style={{ width: size, height: size }} />;
    }
    return <Text style={{ fontSize }}>🏅</Text>;
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
  badgeBadge: { paddingVertical: 24, paddingHorizontal: 36 },
  badgeLabel: { fontSize: 11, color: '#aaa' },
  xpText: { fontSize: 40, fontWeight: '900', color: '#FF8C42' },
  streakText: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  streakSub: { fontSize: 12, color: '#aaa' },
  levelUpEmoji: { fontSize: 52 },
  levelUpText: { fontSize: 28, fontWeight: '900', color: '#FF8C42' },
  levelUpSub: { fontSize: 13, color: '#888' },
  badgeUnlockHeadline: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  badgeUnlockName: { fontSize: 13, color: '#888', textAlign: 'center' },
  badgeTileRow: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 4,
  },
  badgeTile: { alignItems: 'center', gap: 4, maxWidth: 72 },
  badgeTileName: { fontSize: 11, color: '#888', textAlign: 'center' },
  badgeMore: { fontSize: 12, color: '#aaa', marginTop: 4 },
});
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/components/CelebrationOverlay.tsx
git commit -m "feat(celebration): add badge overlay type with spring animation"
```

---

## Task 4: Update `CompletionScreen` with badge overlay sequencing

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`

The existing file is 362 lines. Apply the changes below in order.

- [ ] **Step 1: Add `playBadgeUnlockedFeedback` to the feedback import (lines 15–19)**

```tsx
import {
  playAlreadyCompletedFeedback,
  playBadgeUnlockedFeedback,
  playLevelUpFeedback,
  playQuestCompletedFeedback,
  playStreakExtendedFeedback,
} from '../lib/feedback';
```

- [ ] **Step 2: Add `badgeOverlayVisible` state and `badgeOverlayQueuedRef` ref**

After line 73 (`const [overlayVisible, setOverlayVisible] = useState(false);`), add:

```tsx
const [badgeOverlayVisible, setBadgeOverlayVisible] = useState(false);
```

After line 77 (`const hasPlayedRef = useRef(false);`), add:

```tsx
const badgeOverlayQueuedRef = useRef(false);
```

- [ ] **Step 3: Replace `handleMarkDone` (lines 115–135)**

```tsx
const handleMarkDone = () => {
  if (!quest) return;
  const r = completeQuest(quest);
  setResult(r);
  badgeOverlayQueuedRef.current = false;

  if (!hasPlayedRef.current) {
    hasPlayedRef.current = true;
    if (r.status === 'already_completed') {
      playAlreadyCompletedFeedback();
    } else if (r.levelUp) {
      playLevelUpFeedback();
      setOverlayVisible(true);
    } else if (r.streakExtended) {
      playStreakExtendedFeedback();
      setOverlayVisible(true);
    } else if (r.newlyUnlockedBadgeIds.length > 0) {
      badgeOverlayQueuedRef.current = true;
      playBadgeUnlockedFeedback();
      setBadgeOverlayVisible(true);
    } else {
      playQuestCompletedFeedback();
      setOverlayVisible(true);
    }
  }
};
```

- [ ] **Step 4: Update the first `CelebrationOverlay`'s `onDismiss` to chain to badge overlay**

Replace lines 301–310:

```tsx
      {celebType !== null && (
        <CelebrationOverlay
          type={celebType}
          visible={overlayVisible}
          xpAwarded={result.xpAwarded}
          newStreak={result.streakAfter}
          newLevel={result.levelAfter}
          onDismiss={() => {
            setOverlayVisible(false);
            if (
              result.newlyUnlockedBadgeIds.length > 0 &&
              !badgeOverlayQueuedRef.current
            ) {
              badgeOverlayQueuedRef.current = true;
              playBadgeUnlockedFeedback();
              setBadgeOverlayVisible(true);
            }
          }}
        />
      )}
```

- [ ] **Step 5: Add badge `CelebrationOverlay` instance after the first one**

After the closing `)}` of the first `CelebrationOverlay` block, add:

```tsx
      <CelebrationOverlay
        type="badge"
        visible={badgeOverlayVisible}
        badgeIds={result.newlyUnlockedBadgeIds}
        onDismiss={() => setBadgeOverlayVisible(false)}
      />
```

The render block for the two overlays should look like:

```tsx
      {celebType !== null && (
        <CelebrationOverlay
          type={celebType}
          visible={overlayVisible}
          xpAwarded={result.xpAwarded}
          newStreak={result.streakAfter}
          newLevel={result.levelAfter}
          onDismiss={() => {
            setOverlayVisible(false);
            if (
              result.newlyUnlockedBadgeIds.length > 0 &&
              !badgeOverlayQueuedRef.current
            ) {
              badgeOverlayQueuedRef.current = true;
              playBadgeUnlockedFeedback();
              setBadgeOverlayVisible(true);
            }
          }}
        />
      )}
      <CelebrationOverlay
        type="badge"
        visible={badgeOverlayVisible}
        badgeIds={result.newlyUnlockedBadgeIds}
        onDismiss={() => setBadgeOverlayVisible(false)}
      />
```

Note: the badge `CelebrationOverlay` is rendered unconditionally — when `badgeOverlayVisible` is false, `CelebrationOverlay` returns null internally. When `badgeIds` is empty, the badge type also returns null. So no extra guards are needed.

- [ ] **Step 6: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run full test suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```
git add src/screens/CompletionScreen.tsx
git commit -m "feat(completion): add badge celebration overlay with sequencing"
```

---

## Task 5: Final validation

- [ ] **Step 1: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Validate quest data**

```
npm run validate:quests
```

Expected: `All quests valid.` (or similar success message).

- [ ] **Step 4: Validate badge data**

```
npm run validate:badges
```

Expected: `All badges valid.` (or similar success message).
