# Badge Celebration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a spring-bounce celebration overlay when a quest completion unlocks one or more badges, sequenced after any streak or level-up overlay.

**Architecture:** Four small, ordered changes: (1) thread `newlyUnlockedBadgeIds` through the result type and action, (2) add haptic feedback function, (3) add `'badge'` type to `CelebrationOverlay` via targeted edits (not a full file replace), (4) add a second overlay state + sequencing to `CompletionScreen`. Tests are updated alongside task 1.

**Tech Stack:** React Native / Expo, TypeScript, Zustand, expo-haptics, `Animated` API.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/types/index.ts` | Add `newlyUnlockedBadgeIds: string[]` to `CompleteQuestResult` |
| Modify | `src/actions/completeQuest.ts` | Return `newlyUnlockedBadgeIds` in both branches |
| Modify | `__tests__/actions/completeQuestBadges.test.ts` | Assert `newlyUnlockedBadgeIds`; add multiple-ids test |
| Modify | `src/lib/feedback.ts` | Add `playBadgeUnlockedFeedback()` |
| Modify | `src/components/CelebrationOverlay.tsx` | Add `'badge'` type via targeted edits — preserve all existing behavior |
| Modify | `src/screens/CompletionScreen.tsx` | Add `badgeOverlayVisible`, `badgeOverlayQueuedRef`, sequencing |

---

## Task 1: Add `newlyUnlockedBadgeIds` to result type, action, and tests

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/actions/completeQuest.ts`
- Modify: `__tests__/actions/completeQuestBadges.test.ts`

**Note on test quest IDs:** `questEasy` has `id: 'test-quest-easy'`, which is distinct from the pre-seeded `questId: 'q1'` and `questId: 'q2'` values. No separate fixture is needed — `questEasy` is safe to use in all tests below.

- [ ] **Step 1: Update `CompleteQuestResult` in `src/types/index.ts`**

The file currently has `CompleteQuestResult` ending with `streakExtended: boolean;`. Add one field:

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

- [ ] **Step 2: Add `newlyUnlockedBadgeIds` to both return statements in `src/actions/completeQuest.ts`**

The already-completed early return currently ends with `streakExtended: false,`. Add the new field:

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

The successful-completion return currently ends with `streakExtended: newStreak > currentStreak,`. Add the new field:

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

- [ ] **Step 3: Replace the `completeQuest badge recording` describe block in `__tests__/actions/completeQuestBadges.test.ts`**

The `getRecentlyUnlockedBadges` describe block (lines 32–77) is unchanged. Replace everything from `describe('completeQuest badge recording'` to the end of the file with:

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

    // questEasy.id = 'test-quest-easy' — distinct from pre-seeded q1/q2, so not already_completed
    const result = completeQuest(questEasy);

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['getting_started']).toBeDefined();
    expect(result.newlyUnlockedBadgeIds).toContain('getting_started');
  });

  it('already_completed does not record any badge unlocks and returns empty newlyUnlockedBadgeIds', () => {
    completeQuest(questEasy);                    // first completion — records first_quest
    useBadgeStore.setState({ unlockedAt: {} });  // reset badge store
    const result = completeQuest(questEasy);     // already_completed — must not touch badge store

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

    // quest #2 — first_quest (target 1) was already unlocked before; should not appear in result
    const result = completeQuest(questEasy);

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

    // quest #3 with streak 2→3: unlocks getting_started (count≥3) AND three_day_streak (streak≥3)
    completeQuest(questEasy);

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['getting_started']).toBeDefined();
    expect(unlockedAt['three_day_streak']).toBeDefined();
    expect(unlockedAt['getting_started']).toBe(unlockedAt['three_day_streak']); // same nowIso
  });

  it('a single completion can return multiple newlyUnlockedBadgeIds', () => {
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

    // quest #3 with streak 2→3: getting_started (count≥3) + three_day_streak (streak≥3) both unlock
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

Expected: all 8 tests pass (2 `getRecentlyUnlockedBadges` + 6 `completeQuest badge recording`).

- [ ] **Step 5: Commit**

```
git add src/types/index.ts src/actions/completeQuest.ts "__tests__/actions/completeQuestBadges.test.ts"
git commit -m "feat(result): add newlyUnlockedBadgeIds to CompleteQuestResult"
```

---

## Task 2: Add `playBadgeUnlockedFeedback` to `src/lib/feedback.ts`

**Files:**
- Modify: `src/lib/feedback.ts`

- [ ] **Step 1: Append after `playAlreadyCompletedFeedback`**

The file currently ends after `playAlreadyCompletedFeedback`. Append:

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

## Task 3: Add `'badge'` type to `CelebrationOverlay` via targeted edits

**Files:**
- Modify: `src/components/CelebrationOverlay.tsx`

**IMPORTANT:** Do NOT replace the whole file. Use Edit tool to apply each change below. Preserve all existing behavior for quest-complete, streak, level-up, reducedMotion, timers, Confetti, Decky, and styling.

- [ ] **Step 1: Add `Image` to the react-native import**

Old:
```tsx
import { Animated, StyleSheet, Text, View } from 'react-native';
```
New:
```tsx
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
```

- [ ] **Step 2: Add badge-data imports and the auto-dismiss constant after the existing imports**

Old (the last import line in the file):
```tsx
import { Decky } from './Decky';
```
New:
```tsx
import { Decky } from './Decky';
import { allBadges } from '../data/badges';
import { BADGE_IMAGES } from '../data/badges/badgeImages';

const CELEBRATION_AUTO_DISMISS_MS = 1800;
```

- [ ] **Step 3: Update the props type to add `'badge'` and `badgeIds`**

Old:
```tsx
type CelebrationOverlayProps = {
  type: 'quest-complete' | 'streak' | 'level-up';
  visible: boolean;
  xpAwarded?: number;
  newStreak?: number;
  newLevel?: number;
  onDismiss?: () => void;
};
```
New:
```tsx
type CelebrationOverlayProps = {
  type: 'quest-complete' | 'streak' | 'level-up' | 'badge';
  visible: boolean;
  xpAwarded?: number;
  newStreak?: number;
  newLevel?: number;
  badgeIds?: string[];
  onDismiss?: () => void;
};
```

- [ ] **Step 4: Add `badgeIds` to the component function signature**

Old:
```tsx
export function CelebrationOverlay({
  type,
  visible,
  xpAwarded,
  newStreak,
  newLevel,
  onDismiss,
}: CelebrationOverlayProps) {
```
New:
```tsx
export function CelebrationOverlay({
  type,
  visible,
  xpAwarded,
  newStreak,
  newLevel,
  badgeIds,
  onDismiss,
}: CelebrationOverlayProps) {
```

- [ ] **Step 5: Add `'badge'` to the streak animation branch**

Old:
```tsx
    } else if (type === 'streak') {
```
New:
```tsx
    } else if (type === 'streak' || type === 'badge') {
```

- [ ] **Step 6: Replace the hardcoded `1800` with the constant**

Old:
```tsx
    dismissTimer.current = setTimeout(() => {
      onDismissRef.current?.();
    }, 1800);
```
New:
```tsx
    dismissTimer.current = setTimeout(() => {
      onDismissRef.current?.();
    }, CELEBRATION_AUTO_DISMISS_MS);
```

- [ ] **Step 7: Add badge early-return guard and the `renderBadgeIcon` helper**

Old:
```tsx
  if (!visible) return null;

  return (
```
New:
```tsx
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
```

- [ ] **Step 8: Add badge JSX block inside the overlay View, after the level-up block**

The level-up block currently ends with:
```tsx
      {type === 'level-up' && (
        <Animated.View style={[styles.badge, styles.levelUpBadge, { opacity, transform: [{ scale }] }]}>
          <Text style={styles.levelUpEmoji}>⬆️</Text>
          <Text style={styles.levelUpText}>Level {newLevel}!</Text>
          <Text style={styles.levelUpSub}>New rank unlocked</Text>
        </Animated.View>
      )}
    </View>
  );
}
```
Replace with:
```tsx
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
```

- [ ] **Step 9: Add new styles to the end of `StyleSheet.create`**

Old (last style entry):
```tsx
  levelUpSub: { fontSize: 13, color: '#888' },
});
```
New:
```tsx
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
```

- [ ] **Step 10: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```
git add src/components/CelebrationOverlay.tsx
git commit -m "feat(celebration): add badge overlay type with spring animation"
```

---

## Task 4: Update `CompletionScreen` with badge overlay sequencing

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`

The existing file is 362 lines. Apply the changes below in order using the Edit tool.

**Sequencing rules encoded here:**
- level-up or streak: show primary overlay first → on dismiss, if badges, show badge overlay
- badges only (no level-up, no streak): skip quest-complete → show badge overlay directly
- no badges, no streak, no level-up: show quest-complete overlay (unchanged)
- guard: `badgeOverlayQueuedRef` prevents badge overlay from being triggered twice

- [ ] **Step 1: Add `playBadgeUnlockedFeedback` to the feedback import**

Old:
```tsx
import {
  playAlreadyCompletedFeedback,
  playLevelUpFeedback,
  playQuestCompletedFeedback,
  playStreakExtendedFeedback,
} from '../lib/feedback';
```
New:
```tsx
import {
  playAlreadyCompletedFeedback,
  playBadgeUnlockedFeedback,
  playLevelUpFeedback,
  playQuestCompletedFeedback,
  playStreakExtendedFeedback,
} from '../lib/feedback';
```

- [ ] **Step 2: Add `badgeOverlayVisible` state after `overlayVisible`**

Old:
```tsx
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
```
New:
```tsx
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [badgeOverlayVisible, setBadgeOverlayVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
```

- [ ] **Step 3: Add `badgeOverlayQueuedRef` after `hasPlayedRef`**

Old:
```tsx
  const hasPlayedRef = useRef(false);
  const promptShownRef = useRef(false);
```
New:
```tsx
  const hasPlayedRef = useRef(false);
  const badgeOverlayQueuedRef = useRef(false);
  const promptShownRef = useRef(false);
```

- [ ] **Step 4: Replace `handleMarkDone`**

Old:
```tsx
  const handleMarkDone = () => {
    if (!quest) return;
    const r = completeQuest(quest);
    setResult(r);

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
      } else {
        playQuestCompletedFeedback();
        setOverlayVisible(true);
      }
    }
  };
```
New:
```tsx
  const handleMarkDone = () => {
    if (!quest) return;
    setOverlayVisible(false);
    setBadgeOverlayVisible(false);
    badgeOverlayQueuedRef.current = false;

    const r = completeQuest(quest);
    setResult(r);

    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      if (r.status === 'already_completed') {
        void playAlreadyCompletedFeedback();
      } else if (r.levelUp) {
        void playLevelUpFeedback();
        setOverlayVisible(true);
      } else if (r.streakExtended) {
        void playStreakExtendedFeedback();
        setOverlayVisible(true);
      } else if (r.newlyUnlockedBadgeIds.length > 0) {
        badgeOverlayQueuedRef.current = true;
        void playBadgeUnlockedFeedback();
        setBadgeOverlayVisible(true);
      } else {
        void playQuestCompletedFeedback();
        setOverlayVisible(true);
      }
    }
  };
```

- [ ] **Step 5: Update the first `CelebrationOverlay`'s `onDismiss` to chain to badge overlay**

Old:
```tsx
        <CelebrationOverlay
          type={celebType}
          visible={overlayVisible}
          xpAwarded={result.xpAwarded}
          newStreak={result.streakAfter}
          newLevel={result.levelAfter}
          onDismiss={() => setOverlayVisible(false)}
        />
```
New:
```tsx
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
              void playBadgeUnlockedFeedback();
              setBadgeOverlayVisible(true);
            }
          }}
        />
```

- [ ] **Step 6: Add badge `CelebrationOverlay` after the first one**

The current file ends the SafeAreaView with the first CelebrationOverlay and then closes `</SafeAreaView>`. The first CelebrationOverlay block currently is wrapped as:

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
              void playBadgeUnlockedFeedback();
              setBadgeOverlayVisible(true);
            }
          }}
        />
      )}
    </SafeAreaView>
```

Replace with:
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
              void playBadgeUnlockedFeedback();
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
    </SafeAreaView>
```

The badge overlay renders unconditionally — `CelebrationOverlay` returns null internally when `visible` is false or `badgeIds` is empty.

- [ ] **Step 7: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 8: Run all tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 9: Commit**

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

Expected: no errors.

- [ ] **Step 4: Validate badge data**

```
npm run validate:badges
```

Expected: no errors.
