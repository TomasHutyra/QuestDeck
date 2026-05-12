# Feedback & Celebrations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add haptic feedback, simple celebration animations, and an opt-in sound layer to QuestDeck without blocking navigation or requiring a backend.

**Architecture:** A single `feedback.ts` module is the only file that imports haptics/audio libraries; screens call named functions from it. `CelebrationOverlay` is a non-blocking, pointer-events-none component owned by `CompletionScreen`. A new `settingsStore` persists three user toggles; a new `SettingsScreen` exposes them.

**Tech Stack:** expo-haptics, React Native `Animated` API, Zustand persist, AsyncStorage.

---

## File Map

| File | Action |
|---|---|
| `src/lib/storage.ts` | Add `SETTINGS` key |
| `src/stores/settingsStore.ts` | Create |
| `src/types/index.ts` | Replace `CompleteQuestResult` with flat struct |
| `src/actions/completeQuest.ts` | Return before/after diff |
| `__tests__/actions/completeQuest.test.ts` | Update + extend tests |
| `src/lib/feedback.ts` | Create |
| `src/components/CelebrationOverlay.tsx` | Create |
| `src/screens/SettingsScreen.tsx` | Create |
| `src/navigation/RootStack.tsx` | Add `Settings` route |
| `src/screens/HomeScreen.tsx` | Add ⚙️ icon |
| `src/screens/QuestRevealScreen.tsx` | Call `playCardRevealFeedback()` on flip |
| `src/screens/QuestDetailScreen.tsx` | Call `playQuestAcceptedFeedback()` on CTA |
| `src/screens/CompletionScreen.tsx` | Wire feedback + `CelebrationOverlay` |

---

### Task 1: settingsStore

**Files:**
- Modify: `src/lib/storage.ts`
- Create: `src/stores/settingsStore.ts`

- [ ] **Step 1: Add SETTINGS key to storage.ts**

Replace the entire file:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export const STORAGE_KEYS = {
  PROGRESS: 'questdeck-progress',
  QUESTS: 'questdeck-quests',
  PACKS: 'questdeck-packs',
  SETTINGS: 'questdeck-settings',
} as const;

export const jsonStorage = createJSONStorage(() => AsyncStorage);
```

- [ ] **Step 2: Create settingsStore.ts**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotionEnabled: boolean;
};

type SettingsActions = {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotionEnabled: (v: boolean) => void;
};

const initialState: SettingsState = {
  soundEnabled: false,
  hapticsEnabled: true,
  reducedMotionEnabled: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...initialState,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setHapticsEnabled: (v) => set({ hapticsEnabled: v }),
      setReducedMotionEnabled: (v) => set({ reducedMotionEnabled: v }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: jsonStorage,
    }
  )
);
```

- [ ] **Step 3: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```
git add src/lib/storage.ts src/stores/settingsStore.ts
git commit -m "feat: add settingsStore with sound/haptics/reducedMotion toggles"
```

---

### Task 2: Update CompleteQuestResult type

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Replace CompleteQuestResult**

In `src/types/index.ts`, replace:

```ts
export type CompleteQuestResult =
  | { status: 'completed'; xpAwarded: number }
  | { status: 'already_completed' };
```

With:

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
};
```

- [ ] **Step 2: Run tsc — expect errors**

```
npx tsc --noEmit
```

Expected: errors in `completeQuest.ts` and `CompletionScreen.tsx` because they still return/use the old shape. That is expected — you will fix them in Tasks 3 and 11.

- [ ] **Step 3: Commit the type only**

```
git add src/types/index.ts
git commit -m "feat: expand CompleteQuestResult to full before/after diff struct"
```

---

### Task 3: Update completeQuest action

**Files:**
- Modify: `src/actions/completeQuest.ts`

The action must now capture before-state, compute after-state, and return the full diff in both paths.

- [ ] **Step 1: Replace completeQuest.ts entirely**

```ts
import { Quest, CompleteQuestResult } from '../types';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { calculateLevel, updateStreak, todayLocalDate } from '../lib/xp';

export function completeQuest(quest: Quest): CompleteQuestResult {
  const { completedQuests } = useQuestStore.getState();
  const { totalXp, level, currentStreak, longestStreak, lastCompletedDate } =
    useProgressStore.getState();

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
    };
  }

  const completedDate = todayLocalDate();

  useQuestStore.getState().addCompletedQuest({
    questId: quest.id,
    completedAt: new Date().toISOString(),
    completedDate,
    xpAwarded: quest.xp,
  });

  const newTotalXp = totalXp + quest.xp;
  const newLevel = calculateLevel(newTotalXp);
  const { newStreak, newLongest } = updateStreak(
    currentStreak,
    longestStreak,
    lastCompletedDate,
    completedDate
  );

  useProgressStore.getState().updateAfterCompletion({
    totalXp: newTotalXp,
    level: newLevel,
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastCompletedDate: completedDate,
  });

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
  };
}
```

- [ ] **Step 2: Run tsc — should have fewer errors**

```
npx tsc --noEmit
```

Expected: only `CompletionScreen.tsx` has errors now (old result shape access). You fix that in Task 11.

- [ ] **Step 3: Commit**

```
git add src/actions/completeQuest.ts
git commit -m "feat: return before/after diff from completeQuest"
```

---

### Task 4: Update completeQuest tests

**Files:**
- Modify: `__tests__/actions/completeQuest.test.ts`

The old `toEqual` assertions break because the result is now a full object. Replace the whole test file.

- [ ] **Step 1: Replace the test file**

```ts
import { completeQuest } from '../../src/actions/completeQuest';
import { useQuestStore } from '../../src/stores/questStore';
import { useProgressStore } from '../../src/stores/progressStore';
import { Quest } from '../../src/types';

const questEasy: Quest = {
  id: 'test-quest-easy',
  title: 'Test Quest',
  description: 'desc',
  category: 'home',
  moods: ['bored'],
  durationMinutes: 10,
  difficulty: 'easy',
  people: 'solo',
  location: 'indoors',
  xp: 10,
  packId: 'free',
};

const questMedium: Quest = { ...questEasy, id: 'test-quest-medium', difficulty: 'medium', xp: 20 };

beforeEach(() => {
  useQuestStore.setState({
    completedQuests: [],
    activeQuestId: null,
    lastRevealedQuestIds: [],
  });
  useProgressStore.setState({
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
  });
});

describe('completeQuest', () => {
  it('returns completed status with xpAwarded and questId', () => {
    const result = completeQuest(questEasy);
    expect(result.status).toBe('completed');
    expect(result.xpAwarded).toBe(10);
    expect(result.questId).toBe('test-quest-easy');
  });

  it('appends to completedQuests with correct fields', () => {
    completeQuest(questEasy);
    const { completedQuests } = useQuestStore.getState();
    expect(completedQuests).toHaveLength(1);
    expect(completedQuests[0].questId).toBe('test-quest-easy');
    expect(completedQuests[0].xpAwarded).toBe(10);
    expect(completedQuests[0].completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(completedQuests[0].completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('adds XP to totalXp in progressStore', () => {
    completeQuest(questMedium);
    expect(useProgressStore.getState().totalXp).toBe(20);
  });

  it('recalculates level after XP award', () => {
    useProgressStore.setState({ totalXp: 90, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: null });
    completeQuest(questEasy);
    expect(useProgressStore.getState().level).toBe(2);
  });

  it('starts streak at 1 on first completion', () => {
    completeQuest(questEasy);
    expect(useProgressStore.getState().currentStreak).toBe(1);
  });

  it('sets lastCompletedDate to today', () => {
    completeQuest(questEasy);
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(useProgressStore.getState().lastCompletedDate).toBe(expected);
  });

  it('returns already_completed when quest was already done', () => {
    completeQuest(questEasy);
    const result = completeQuest(questEasy);
    expect(result.status).toBe('already_completed');
  });

  it('does not add XP on duplicate completion', () => {
    completeQuest(questEasy);
    completeQuest(questEasy);
    expect(useProgressStore.getState().totalXp).toBe(10);
  });

  it('does not add duplicate to completedQuests', () => {
    completeQuest(questEasy);
    completeQuest(questEasy);
    expect(useQuestStore.getState().completedQuests).toHaveLength(1);
  });

  it('reports levelUp true when XP crosses a threshold', () => {
    useProgressStore.setState({ totalXp: 90, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: null });
    const result = completeQuest(questEasy);
    expect(result.levelUp).toBe(true);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(2);
  });

  it('reports levelUp false when XP stays in same level', () => {
    const result = completeQuest(questEasy);
    expect(result.levelUp).toBe(false);
    expect(result.levelBefore).toBe(result.levelAfter);
  });

  it('reports streakExtended true on first completion', () => {
    const result = completeQuest(questEasy);
    expect(result.streakExtended).toBe(true);
    expect(result.streakBefore).toBe(0);
    expect(result.streakAfter).toBe(1);
  });

  it('already_completed preserves current progress values', () => {
    useProgressStore.setState({ totalXp: 50, level: 1, currentStreak: 3, longestStreak: 5, lastCompletedDate: null });
    completeQuest(questEasy); // first completion — streak resets to 1 (lastCompletedDate was null)
    const result = completeQuest(questEasy); // duplicate
    expect(result.status).toBe('already_completed');
    expect(result.xpAwarded).toBe(0);
    expect(result.totalXpBefore).toBe(60);   // 50 + 10 from first completion
    expect(result.totalXpAfter).toBe(60);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(1);
    expect(result.streakBefore).toBe(1);     // set to 1 by first completion (null lastCompletedDate resets streak)
    expect(result.streakAfter).toBe(1);
    expect(result.levelUp).toBe(false);
    expect(result.streakExtended).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

```
npm test -- --testPathPattern=completeQuest
```

Expected: all tests pass.

- [ ] **Step 3: Run all tests**

```
npm test
```

Expected: all tests pass. (xp and questSelector tests are unaffected.)

- [ ] **Step 4: Commit**

```
git add __tests__/actions/completeQuest.test.ts
git commit -m "test: update completeQuest tests for new result shape"
```

---

### Task 5: Install expo-haptics and create feedback.ts

**Files:**
- Create: `src/lib/feedback.ts`

- [ ] **Step 1: Install expo-haptics**

```
npx expo install expo-haptics
```

Expected: expo-haptics installed. No version conflict warnings for SDK 54.

If the install produces a warning about an unexpected version, run `npx expo install --fix` to align it. Do not proceed if expo-haptics cannot be installed cleanly.

- [ ] **Step 2: Type-check after install**

```
npx tsc --noEmit
```

Expected: same errors as before (only CompletionScreen, from Task 2 — not fixed yet). No new expo-haptics errors.

- [ ] **Step 3: Create src/lib/feedback.ts**

Sound is a safe no-op in this task — no `.mp3` imports. All haptic errors are swallowed silently.

```ts
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../stores/settingsStore';

async function triggerHaptic(fn: () => Promise<void>): Promise<void> {
  const { hapticsEnabled } = useSettingsStore.getState();
  if (!hapticsEnabled) return;
  try {
    await fn();
  } catch {
    // device does not support haptics — ignore silently
  }
}

export async function playCardRevealFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
  // TODO: wire sound — drop card-flip.mp3 into assets/sounds/ and implement playSound()
}

export async function playQuestAcceptedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
  // TODO: wire sound — drop quest-accepted.mp3 into assets/sounds/ and implement playSound()
}

export async function playQuestCompletedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
  // TODO: wire sound — drop quest-complete.mp3 into assets/sounds/ and implement playSound()
}

export async function playStreakExtendedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  );
  // TODO: wire sound — drop streak.mp3 into assets/sounds/ and implement playSound()
}

export async function playLevelUpFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
  // TODO: wire sound — drop level-up.mp3 into assets/sounds/ and implement playSound()
}

export async function playAlreadyCompletedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );
}
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no new errors from feedback.ts.

- [ ] **Step 5: Commit**

```
git add src/lib/feedback.ts package.json package-lock.json
git commit -m "feat: add feedback.ts with haptic functions (sound is no-op until .mp3 files added)"
```

---

### Task 6: CelebrationOverlay component

**Files:**
- Create: `src/components/CelebrationOverlay.tsx`

The overlay is always present in `CompletionScreen`'s tree. `visible` controls whether it renders anything. It auto-dismisses after 1200ms by calling `onDismiss`. `pointerEvents="none"` ensures it never blocks touch.

- [ ] **Step 1: Create src/components/CelebrationOverlay.tsx**

```tsx
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';

type CelebrationOverlayProps = {
  type: 'quest-complete' | 'streak' | 'level-up';
  visible: boolean;
  xpAwarded?: number;
  newStreak?: number;
  newLevel?: number;
  onDismiss?: () => void;
};

export function CelebrationOverlay({
  type,
  visible,
  xpAwarded,
  newStreak,
  newLevel,
  onDismiss,
}: CelebrationOverlayProps) {
  const { reducedMotionEnabled } = useSettingsStore();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;
  const scale = useRef(new Animated.Value(0.6)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    if (reducedMotionEnabled) {
      opacity.setValue(1);
      translateY.setValue(0);
      scale.setValue(1);
    } else if (type === 'quest-complete') {
      opacity.setValue(0);
      translateY.setValue(10);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start();
    } else if (type === 'streak') {
      opacity.setValue(0);
      scale.setValue(0.6);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scale, {
          toValue: 1,
          damping: 10,
          stiffness: 150,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (type === 'level-up') {
      opacity.setValue(0);
      scale.setValue(0.85);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start();
    }

    dismissTimer.current = setTimeout(() => {
      onDismiss?.();
    }, 1200);

    return () => {
      if (dismissTimer.current) {
        clearTimeout(dismissTimer.current);
        dismissTimer.current = null;
      }
    };
  }, [visible, type, reducedMotionEnabled]);

  if (!visible) return null;

  return (
    <View style={styles.overlay} pointerEvents="none">
      {type === 'quest-complete' && (
        <Animated.View
          style={[styles.badge, { opacity, transform: [{ translateY }] }]}
        >
          <Text style={styles.badgeLabel}>You earned</Text>
          <Text style={styles.xpText}>+{xpAwarded ?? 0} XP</Text>
        </Animated.View>
      )}

      {type === 'streak' && (
        <Animated.View
          style={[styles.badge, { opacity, transform: [{ scale }] }]}
        >
          <Text style={styles.largeEmoji}>🔥</Text>
          <Text style={styles.streakText}>{newStreak}-day streak!</Text>
        </Animated.View>
      )}

      {type === 'level-up' && (
        <Animated.View
          style={[styles.badge, { opacity, transform: [{ scale }] }]}
        >
          <Text style={styles.largeEmoji}>⬆️</Text>
          <Text style={styles.levelUpText}>Level {newLevel}!</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  badge: {
    backgroundColor: '#FFF3E8',
    borderRadius: 20,
    paddingHorizontal: 32,
    paddingVertical: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD0A0',
    gap: 4,
    elevation: 8,
    shadowColor: '#FF8C42',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  badgeLabel: { fontSize: 11, color: '#aaa' },
  xpText: { fontSize: 40, fontWeight: '900', color: '#FF8C42' },
  largeEmoji: { fontSize: 36 },
  streakText: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  levelUpText: { fontSize: 22, fontWeight: '900', color: '#FF8C42' },
});
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no errors from the new file. CompletionScreen errors still present (fixed in Task 11).

- [ ] **Step 3: Commit**

```
git add src/components/CelebrationOverlay.tsx
git commit -m "feat: add CelebrationOverlay component with quest-complete/streak/level-up animations"
```

---

### Task 7: SettingsScreen, navigation, and HomeScreen icon

`SettingsScreen` imports `RootStackParamList` for its `Props` type, and `RootStack.tsx` imports `SettingsScreen`. These three files must be written together in one commit so they type-check cleanly.

**Files:**
- Create: `src/screens/SettingsScreen.tsx`
- Modify: `src/navigation/RootStack.tsx`
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Create src/screens/SettingsScreen.tsx**

```tsx
import React from 'react';
import {
  SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSettingsStore } from '../stores/settingsStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const {
    soundEnabled, setSoundEnabled,
    hapticsEnabled, setHapticsEnabled,
    reducedMotionEnabled, setReducedMotionEnabled,
  } = useSettingsStore();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Sound effects</Text>
          <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Haptic feedback</Text>
          <Switch value={hapticsEnabled} onValueChange={setHapticsEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reduced motion</Text>
          <Switch value={reducedMotionEnabled} onValueChange={setReducedMotionEnabled} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4C8',
  },
  label: { fontSize: 14, color: '#333' },
});
```

- [ ] **Step 2: Replace src/navigation/RootStack.tsx**

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Mood } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { QuestRevealScreen } from '../screens/QuestRevealScreen';
import { QuestDetailScreen } from '../screens/QuestDetailScreen';
import { CompletionScreen } from '../screens/CompletionScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { PacksScreen } from '../screens/PacksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  QuestReveal: { mood: Mood };
  QuestDetail: { questId: string };
  Completion: { questId: string };
  Progress: undefined;
  Packs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="QuestReveal" component={QuestRevealScreen} />
      <Stack.Screen name="QuestDetail" component={QuestDetailScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Packs" component={PacksScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Add ⚙️ icon to HomeScreen**

In `src/screens/HomeScreen.tsx`, replace the `icons` View (the one containing ⭐ and 📦):

```tsx
<View style={styles.icons}>
  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Progress')}>
    <Text style={styles.iconEmoji}>⭐</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Packs')}>
    <Text style={styles.iconEmoji}>📦</Text>
  </TouchableOpacity>
  <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
    <Text style={styles.iconEmoji}>⚙️</Text>
  </TouchableOpacity>
</View>
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: only CompletionScreen errors remain (from Task 2, fixed in Task 11).

- [ ] **Step 5: Run tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```
git add src/screens/SettingsScreen.tsx src/navigation/RootStack.tsx src/screens/HomeScreen.tsx
git commit -m "feat: add SettingsScreen, Settings route, and gear icon on HomeScreen"
```

---

### Task 8: Wire feedback in QuestRevealScreen

**Files:**
- Modify: `src/screens/QuestRevealScreen.tsx`

Call `playCardRevealFeedback()` when a face-down card is flipped. The flip happens in `handleCardPress` when `!revealedIndexes.includes(index)`. The `onPress` handler fires once per tap — no re-render guard needed here.

- [ ] **Step 1: Add import and call**

At the top of `QuestRevealScreen.tsx`, add the import after the existing imports:

```ts
import { playCardRevealFeedback } from '../lib/feedback';
```

In `handleCardPress`, update the flip branch:

```ts
const handleCardPress = (index: number) => {
  if (!revealedIndexes.includes(index)) {
    setRevealedIndexes((prev) => [...prev, index]);
    playCardRevealFeedback();
  } else {
    const quest = quests[index];
    if (quest) {
      setActiveQuestId(quest.id);
      navigation.navigate('QuestDetail', { questId: quest.id });
    }
  }
};
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no new errors from this file.

- [ ] **Step 3: Commit**

```
git add src/screens/QuestRevealScreen.tsx
git commit -m "feat: trigger haptic on card flip"
```

---

### Task 9: Wire feedback in QuestDetailScreen

**Files:**
- Modify: `src/screens/QuestDetailScreen.tsx`

Call `playQuestAcceptedFeedback()` when the user taps "I'll do this!". The call goes inside the `onPress` handler — no re-render guard needed.

- [ ] **Step 1: Add import and call**

Add import at the top of `QuestDetailScreen.tsx`:

```ts
import { playQuestAcceptedFeedback } from '../lib/feedback';
```

Update the CTA `TouchableOpacity`:

```tsx
<TouchableOpacity
  style={styles.cta}
  onPress={() => {
    playQuestAcceptedFeedback();
    navigation.navigate('Completion', { questId: quest.id });
  }}
  activeOpacity={0.85}
>
  <Text style={styles.ctaText}>I'll do this! →</Text>
</TouchableOpacity>
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```
git add src/screens/QuestDetailScreen.tsx
git commit -m "feat: trigger haptic on quest accepted"
```

---

### Task 10: Wire feedback and CelebrationOverlay in CompletionScreen

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`

This is the most involved screen change. The screen must:
1. Call the correct feedback function after `completeQuest()` returns.
2. Determine the overlay type (level-up > streak > quest-complete; none for already_completed).
3. Show `CelebrationOverlay` with `visible={overlayVisible}`.
4. Hide the overlay when `onDismiss` fires.
5. Use `hasPlayedRef` to guard against re-renders replaying feedback.

- [ ] **Step 1: Replace CompletionScreen.tsx entirely**

```tsx
import React, { useRef, useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById } from '../data/quests';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { completeQuest } from '../actions/completeQuest';
import {
  playAlreadyCompletedFeedback,
  playLevelUpFeedback,
  playQuestCompletedFeedback,
  playStreakExtendedFeedback,
} from '../lib/feedback';
import { XPBar } from '../components/XPBar';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { CompleteQuestResult } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Completion'>;

function overlayTypeFor(
  result: CompleteQuestResult
): 'quest-complete' | 'streak' | 'level-up' | null {
  if (result.status === 'already_completed') return null;
  if (result.levelUp) return 'level-up';
  if (result.streakExtended) return 'streak';
  return 'quest-complete';
}

export function CompletionScreen({ navigation, route }: Props) {
  const quest = questById[route.params.questId];
  const { clearActiveAndRevealed } = useQuestStore();
  const { totalXp, level, currentStreak } = useProgressStore();

  const [result, setResult] = useState<CompleteQuestResult | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const hasPlayedRef = useRef(false);

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

  const handleBackToHome = () => {
    clearActiveAndRevealed();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  if (!quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Quest not found.</Text>
      </SafeAreaView>
    );
  }

  if (result === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.questDesc}>Complete the quest, then mark it done.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleMarkDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Mark as done ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={handleBackToHome}>
            <Text style={styles.backLinkText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (result.status === 'already_completed') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.alreadyIcon}>✅</Text>
          <Text style={styles.alreadyTitle}>Already completed</Text>
          <Text style={styles.alreadySubtitle}>You already did this one. No XP awarded.</Text>
          <TouchableOpacity style={styles.homeBtn} onPress={handleBackToHome} activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const celebType = overlayTypeFor(result);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.celebrationEmoji}>🎉</Text>
        <Text style={styles.completeTitle}>Quest Complete!</Text>
        <Text style={styles.questSubtitle}>{quest.title}</Text>

        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeLabel}>You earned</Text>
          <Text style={styles.xpBadgeValue}>+{result.xpAwarded} XP</Text>
        </View>

        {currentStreak > 1 ? (
          <View style={styles.streak}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakTitle}>{currentStreak}-day streak!</Text>
              <Text style={styles.streakSub}>Keep it going</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.xpBarWrapper}>
          <XPBar level={level} totalXp={totalXp} />
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={handleBackToHome} activeOpacity={0.85}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      {celebType !== null && (
        <CelebrationOverlay
          type={celebType}
          visible={overlayVisible}
          xpAwarded={result.xpAwarded}
          newStreak={result.streakAfter}
          newLevel={result.levelAfter}
          onDismiss={() => setOverlayVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  error: { margin: 24, color: '#aaa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  celebrationEmoji: { fontSize: 56 },
  completeTitle: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
  questTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  questDesc: { fontSize: 13, color: '#888', textAlign: 'center' },
  questSubtitle: { fontSize: 13, color: '#aaa' },
  xpBadge: {
    backgroundColor: '#FFF3E8', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD0A0', marginVertical: 4,
  },
  xpBadgeLabel: { fontSize: 11, color: '#aaa' },
  xpBadgeValue: { fontSize: 32, fontWeight: '900', color: '#FF8C42' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakEmoji: { fontSize: 26 },
  streakTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  streakSub: { fontSize: 11, color: '#aaa' },
  xpBarWrapper: { width: '100%', marginVertical: 4 },
  doneBtn: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 40, marginTop: 8,
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: 'white' },
  homeBtn: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 40, width: '100%', alignItems: 'center',
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  homeBtnText: { fontSize: 15, fontWeight: '800', color: 'white' },
  backLink: { marginTop: 4 },
  backLinkText: { fontSize: 13, color: '#aaa' },
  alreadyIcon: { fontSize: 48 },
  alreadyTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  alreadySubtitle: { fontSize: 13, color: '#aaa', textAlign: 'center' },
});
```

- [ ] **Step 2: Type-check — expect clean**

```
npx tsc --noEmit
```

Expected: **no errors**. This is the last file that had outstanding type errors from Task 2.

- [ ] **Step 3: Run all tests**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Validate quest data**

```
npm run validate:quests
```

Expected: `All quests valid.`

- [ ] **Step 5: Commit**

```
git add src/screens/CompletionScreen.tsx
git commit -m "feat: wire feedback and CelebrationOverlay in CompletionScreen"
```

- [ ] **Step 6: Push to GitHub**

```
git push
```

---

## Final verification checklist

After all tasks are committed:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test` — all tests pass
- [ ] `npm run validate:quests` — all quests valid
- [ ] Manually test on device/emulator:
  - Tap a mood → flip a card → haptic fires
  - Tap "I'll do this!" → haptic fires
  - Complete a quest → celebration overlay appears and auto-dismisses
  - Complete same quest again → warning haptic fires, no overlay
  - Settings screen: toggle each switch and verify values persist after restart
