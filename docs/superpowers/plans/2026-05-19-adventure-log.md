# Adventure Log Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform ProgressScreen into an "Adventure Log" with badges, badge progress, level-up copy, and a redesigned history section — all local-first, data-driven, no backend.

**Architecture:** Badge definitions live in `src/data/badges/badges.json` (data-driven, no eval). A pure engine `src/lib/badges.ts` derives progress from existing store state. ProgressScreen is restructured to show summary, next-badges, unlocked-badges, and recent-adventures sections.

**Tech Stack:** React Native / TypeScript / Expo, Zustand stores (existing), jest-expo for tests, ts-node for validation scripts.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Modify | `src/lib/xp.ts` | Update LEVEL_LABELS to spec copy |
| Create | `src/data/badges/badges.json` | 10 badge definitions |
| Create | `src/data/badges/index.ts` | BadgeCondition + BadgeDefinition types, allBadges export |
| Create | `src/data/badges/badgeImages.ts` | Static image registry (all commented out) |
| Create | `src/lib/badges.ts` | getBadgeProgress, getNearestLockedBadges engine |
| Create | `src/components/BadgeCard.tsx` | progress + unlocked card variants |
| Modify | `src/screens/ProgressScreen.tsx` | Full layout restructure → Adventure Log |
| Modify | `src/screens/HomeScreen.tsx` | Small next-badge teaser row |
| Create | `scripts/validateBadges.ts` | Badge JSON validation script |
| Modify | `package.json` | Add validate:badges script |
| Create | `__tests__/lib/badges.test.ts` | Badge engine unit tests |
| Create | `assets/badges/.gitkeep` | Placeholder so folder exists in git |

---

## Task 1: Update LEVEL_LABELS

**Files:**
- Modify: `src/lib/xp.ts`

The current labels at indices 3–6 differ from the spec. Update only the string values; thresholds and logic are unchanged.

Current: `['Wanderer', 'Explorer', 'Adventurer', 'Quester', 'Seeker', 'Pathfinder', 'Voyager', 'Legend']`
Target:  `['Wanderer', 'Explorer', 'Adventurer', 'Pathfinder', 'Quest Seeker', 'Story Collector', 'Real-Life Hero', 'Legend']`

- [ ] **Step 1: Edit LEVEL_LABELS in src/lib/xp.ts**

Replace the array:

```ts
export const LEVEL_LABELS = [
  'Wanderer', 'Explorer', 'Adventurer', 'Pathfinder',
  'Quest Seeker', 'Story Collector', 'Real-Life Hero', 'Legend',
];
```

- [ ] **Step 2: Run type check to confirm no breakage**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run existing tests to confirm nothing broke**

```bash
npm test -- --testPathPattern="xp.test"
```

Expected: all pass (the test suite doesn't assert label values, only level numbers).

- [ ] **Step 4: Commit**

```bash
git add src/lib/xp.ts
git commit -m "feat(adventure-log): update level labels to spec copy"
```

---

## Task 2: Create badge type definitions

**Files:**
- Create: `src/data/badges/index.ts`

This file owns all badge-related types and re-exports the JSON data cast to those types. It must be created before `badges.json` is consumed anywhere.

- [ ] **Step 1: Create src/data/badges/index.ts**

```ts
import { Mood } from '../../types';
import rawBadges from './badges.json';

export type BadgeCondition =
  | { type: 'completed_count'; target: number }
  | { type: 'streak_days'; target: number }
  | { type: 'quest_location_count'; location: 'indoors' | 'outdoors' | 'any'; target: number }
  | { type: 'quest_mood_count'; mood: Mood; target: number }
  | { type: 'quest_people_count'; people: 'solo' | 'partner' | 'friends' | 'any'; target: number }
  | { type: 'quest_category_count'; category: string; target: number };

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  image?: string;
  condition: BadgeCondition;
};

export const allBadges: BadgeDefinition[] = rawBadges as BadgeDefinition[];
```

Note: `badges.json` does not exist yet — TypeScript will error until Task 3 creates it. Do not run tsc until Task 3 is done.

---

## Task 3: Create badge definitions JSON

**Files:**
- Create: `src/data/badges/badges.json`

- [ ] **Step 1: Create src/data/badges/badges.json**

```json
[
  {
    "id": "first_quest",
    "name": "First Quest",
    "emoji": "🏁",
    "description": "Complete your first real-life quest.",
    "image": "badge_first_quest.png",
    "condition": { "type": "completed_count", "target": 1 }
  },
  {
    "id": "getting_started",
    "name": "Getting Started",
    "emoji": "✨",
    "description": "Complete 3 quests.",
    "image": "badge_getting_started.png",
    "condition": { "type": "completed_count", "target": 3 }
  },
  {
    "id": "quest_collector",
    "name": "Quest Collector",
    "emoji": "🎒",
    "description": "Complete 10 quests.",
    "image": "badge_quest_collector.png",
    "condition": { "type": "completed_count", "target": 10 }
  },
  {
    "id": "real_life_adventurer",
    "name": "Real-Life Adventurer",
    "emoji": "🧭",
    "description": "Complete 25 real-life quests.",
    "image": "badge_real_life_adventurer.png",
    "condition": { "type": "completed_count", "target": 25 }
  },
  {
    "id": "three_day_streak",
    "name": "3-Day Streak",
    "emoji": "🔥",
    "description": "Complete quests on 3 different days in a row.",
    "image": "badge_three_day_streak.png",
    "condition": { "type": "streak_days", "target": 3 }
  },
  {
    "id": "seven_day_streak",
    "name": "7-Day Streak",
    "emoji": "🔥",
    "description": "Complete quests on 7 different days in a row.",
    "image": "badge_seven_day_streak.png",
    "condition": { "type": "streak_days", "target": 7 }
  },
  {
    "id": "fresh_air",
    "name": "Fresh Air",
    "emoji": "🌳",
    "description": "Complete 3 outdoor quests.",
    "image": "badge_fresh_air.png",
    "condition": { "type": "quest_location_count", "location": "outdoors", "target": 3 }
  },
  {
    "id": "creative_spark",
    "name": "Creative Spark",
    "emoji": "🎨",
    "description": "Complete 3 creative quests.",
    "image": "badge_creative_spark.png",
    "condition": { "type": "quest_mood_count", "mood": "creative", "target": 3 }
  },
  {
    "id": "home_reset",
    "name": "Home Reset",
    "emoji": "🧹",
    "description": "Complete 3 reset quests.",
    "image": "badge_home_reset.png",
    "condition": { "type": "quest_mood_count", "mood": "need-reset", "target": 3 }
  },
  {
    "id": "social_starter",
    "name": "Social Starter",
    "emoji": "💬",
    "description": "Complete 2 social quests.",
    "image": "badge_social_starter.png",
    "condition": { "type": "quest_people_count", "people": "friends", "target": 2 }
  }
]
```

- [ ] **Step 2: Run type check — both files together should now compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/data/badges/badges.json src/data/badges/index.ts
git commit -m "feat(adventure-log): add badge definitions and types"
```

---

## Task 4: Create badge image registry and assets folder

**Files:**
- Create: `src/data/badges/badgeImages.ts`
- Create: `assets/badges/.gitkeep`

Metro bundler cannot handle dynamic `require()` calls with runtime strings. All badge images must be registered with static `require()` calls. This file lists all future image slots; they're commented out until PNGs are added.

- [ ] **Step 1: Create assets/badges/.gitkeep**

Create an empty file at `assets/badges/.gitkeep` so the folder is tracked in git and image PNGs can be dropped in later.

- [ ] **Step 2: Create src/data/badges/badgeImages.ts**

```ts
import { ImageSourcePropType } from 'react-native';

// TODO: To add a badge image:
// 1. Place a 512x512 PNG in assets/badges/ (e.g., badge_first_quest.png)
// 2. Uncomment the corresponding line below
// Metro requires static require() calls — dynamic require with runtime strings won't work
export const BADGE_IMAGES: Record<string, ImageSourcePropType> = {
  // first_quest: require('../../../assets/badges/badge_first_quest.png'),
  // getting_started: require('../../../assets/badges/badge_getting_started.png'),
  // quest_collector: require('../../../assets/badges/badge_quest_collector.png'),
  // real_life_adventurer: require('../../../assets/badges/badge_real_life_adventurer.png'),
  // three_day_streak: require('../../../assets/badges/badge_three_day_streak.png'),
  // seven_day_streak: require('../../../assets/badges/badge_seven_day_streak.png'),
  // fresh_air: require('../../../assets/badges/badge_fresh_air.png'),
  // creative_spark: require('../../../assets/badges/badge_creative_spark.png'),
  // home_reset: require('../../../assets/badges/badge_home_reset.png'),
  // social_starter: require('../../../assets/badges/badge_social_starter.png'),
};
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add assets/badges/.gitkeep src/data/badges/badgeImages.ts
git commit -m "feat(adventure-log): add badge image registry and assets folder"
```

---

## Task 5: Write badge engine tests (TDD — write failing tests first)

**Files:**
- Create: `__tests__/lib/badges.test.ts`

Write all tests before implementing the engine. Every test must fail at this point because `src/lib/badges.ts` does not exist yet.

- [ ] **Step 1: Create __tests__/lib/badges.test.ts**

```ts
import { getBadgeProgress, getNearestLockedBadges } from '../../src/lib/badges';
import { allBadges } from '../../src/data/badges';
import { Quest, CompletedQuest } from '../../src/types';

function makeCompleted(questId: string, override?: Partial<CompletedQuest>): CompletedQuest {
  return {
    questId,
    completedAt: '2026-05-01T10:00:00.000Z',
    completedDate: '2026-05-01',
    xpAwarded: 10,
    ...override,
  };
}

function makeQuest(id: string, override?: Partial<Quest>): Quest {
  return {
    id,
    title: 'Test Quest',
    description: 'A quest',
    category: 'home',
    moods: ['bored'],
    durationMinutes: 15,
    difficulty: 'easy',
    people: 'solo',
    location: 'indoors',
    xp: 10,
    packId: 'free',
    ...override,
  };
}

const baseInput = {
  badgeDefinitions: allBadges,
  completedQuests: [] as CompletedQuest[],
  questById: {} as Record<string, Quest>,
  currentStreak: 0,
  longestStreak: 0,
  totalXp: 0,
  level: 1,
};

describe('getBadgeProgress', () => {
  it('returns all badges locked with current 0 when no quests completed', () => {
    const results = getBadgeProgress(baseInput);
    expect(results.every((r) => !r.unlocked)).toBe(true);
    expect(results.every((r) => r.current === 0)).toBe(true);
  });

  it('unlocks first_quest after 1 completed quest', () => {
    const questById = { q1: makeQuest('q1') };
    const results = getBadgeProgress({
      ...baseInput,
      completedQuests: [makeCompleted('q1')],
      questById,
    });
    const badge = results.find((r) => r.badge.id === 'first_quest')!;
    expect(badge.unlocked).toBe(true);
    expect(badge.current).toBe(1);
  });

  it('unlocks getting_started after 3 completed quests', () => {
    const questById = {
      q1: makeQuest('q1'),
      q2: makeQuest('q2'),
      q3: makeQuest('q3'),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2'), makeCompleted('q3')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'getting_started')!.unlocked).toBe(true);
  });

  it('unlocks quest_collector after 10 completed quests', () => {
    const questById: Record<string, Quest> = {};
    const completedQuests: CompletedQuest[] = [];
    for (let i = 0; i < 10; i++) {
      questById[`q${i}`] = makeQuest(`q${i}`);
      completedQuests.push(makeCompleted(`q${i}`));
    }
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'quest_collector')!.unlocked).toBe(true);
  });

  it('unlocks three_day_streak when longestStreak is 3', () => {
    const results = getBadgeProgress({ ...baseInput, longestStreak: 3 });
    expect(results.find((r) => r.badge.id === 'three_day_streak')!.unlocked).toBe(true);
  });

  it('unlocks seven_day_streak when longestStreak is 7', () => {
    const results = getBadgeProgress({ ...baseInput, longestStreak: 7 });
    expect(results.find((r) => r.badge.id === 'seven_day_streak')!.unlocked).toBe(true);
  });

  it('unlocks fresh_air after 3 outdoor quests', () => {
    const questById = {
      q1: makeQuest('q1', { location: 'outdoors' }),
      q2: makeQuest('q2', { location: 'outdoors' }),
      q3: makeQuest('q3', { location: 'outdoors' }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2'), makeCompleted('q3')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'fresh_air')!.unlocked).toBe(true);
  });

  it('shows partial progress for creative_spark with 1 creative quest', () => {
    const questById = { q1: makeQuest('q1', { moods: ['creative'] }) };
    const results = getBadgeProgress({
      ...baseInput,
      completedQuests: [makeCompleted('q1')],
      questById,
    });
    const badge = results.find((r) => r.badge.id === 'creative_spark')!;
    expect(badge.unlocked).toBe(false);
    expect(badge.current).toBe(1);
    expect(badge.progress).toBeCloseTo(1 / 3);
  });

  it('ignores completed quests with missing questId safely', () => {
    const completedQuests = [makeCompleted('nonexistent_id')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById: {} });
    // completed_count still increments (we count completions regardless)
    expect(results.find((r) => r.badge.id === 'first_quest')!.unlocked).toBe(true);
    // but location/mood/people/category badges stay at 0 (no quest metadata)
    expect(results.find((r) => r.badge.id === 'fresh_air')!.current).toBe(0);
  });
});

describe('getNearestLockedBadges', () => {
  it('returns at most 3 by default', () => {
    const results = getNearestLockedBadges(baseInput);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.every((r) => !r.unlocked)).toBe(true);
  });

  it('sorts locked badges by progress descending', () => {
    // q1 and q2 are outdoors+creative → fresh_air=2/3, creative_spark=2/3
    const questById = {
      q1: makeQuest('q1', { location: 'outdoors', moods: ['creative'] }),
      q2: makeQuest('q2', { location: 'outdoors', moods: ['creative'] }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2')];
    const results = getNearestLockedBadges({ ...baseInput, completedQuests, questById }, 10);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].progress).toBeGreaterThanOrEqual(results[i + 1].progress);
    }
  });

  it('when progress is equal, badge with fewer remaining completions comes first', () => {
    // 2 completions: fresh_air(2/3 remaining=1), creative_spark(2/3 remaining=1), getting_started(2/3 remaining=1)
    // quest_collector(2/10 remaining=8) — lower progress, should appear after
    const questById = {
      q1: makeQuest('q1', { location: 'outdoors', moods: ['creative'] }),
      q2: makeQuest('q2', { location: 'outdoors', moods: ['creative'] }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2')];
    const results = getNearestLockedBadges({ ...baseInput, completedQuests, questById }, 10);
    const freshAirIdx = results.findIndex((r) => r.badge.id === 'fresh_air');
    const questCollectorIdx = results.findIndex((r) => r.badge.id === 'quest_collector');
    expect(questCollectorIdx).toBeGreaterThan(freshAirIdx);
  });

  it('returns empty array when all badges are unlocked', () => {
    const questById: Record<string, Quest> = {};
    const completedQuests: CompletedQuest[] = [];
    for (let i = 0; i < 25; i++) {
      questById[`q${i}`] = makeQuest(`q${i}`, {
        location: 'outdoors',
        moods: ['creative', 'need-reset'],
        people: 'friends',
      });
      completedQuests.push(makeCompleted(`q${i}`));
    }
    const results = getNearestLockedBadges(
      { ...baseInput, completedQuests, questById, longestStreak: 7 },
    );
    expect(results).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — confirm they fail because src/lib/badges.ts does not exist**

```bash
npm test -- --testPathPattern="badges.test"
```

Expected: FAIL — `Cannot find module '../../src/lib/badges'`

---

## Task 6: Implement badge engine

**Files:**
- Create: `src/lib/badges.ts`

- [ ] **Step 1: Create src/lib/badges.ts**

```ts
import { BadgeDefinition, BadgeCondition } from '../data/badges';
import { Quest, CompletedQuest } from '../types';

export type BadgeEngineInput = {
  badgeDefinitions: BadgeDefinition[];
  completedQuests: CompletedQuest[];
  questById: Record<string, Quest>;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  level: number;
};

export type BadgeProgress = {
  badge: BadgeDefinition;
  current: number;
  target: number;
  unlocked: boolean;
  progress: number; // 0..1
};

function evaluateCondition(
  condition: BadgeCondition,
  completedQuests: CompletedQuest[],
  questById: Record<string, Quest>,
  longestStreak: number,
): number {
  switch (condition.type) {
    case 'completed_count':
      return completedQuests.length;

    case 'streak_days':
      return longestStreak;

    case 'quest_location_count': {
      return completedQuests.filter(
        (cq) => questById[cq.questId]?.location === condition.location,
      ).length;
    }

    case 'quest_mood_count': {
      return completedQuests.filter(
        (cq) => questById[cq.questId]?.moods.includes(condition.mood),
      ).length;
    }

    case 'quest_people_count': {
      return completedQuests.filter(
        (cq) => questById[cq.questId]?.people === condition.people,
      ).length;
    }

    case 'quest_category_count': {
      return completedQuests.filter(
        (cq) => questById[cq.questId]?.category === condition.category,
      ).length;
    }
  }
}

export function getBadgeProgress(input: BadgeEngineInput): BadgeProgress[] {
  const { badgeDefinitions, completedQuests, questById, longestStreak } = input;

  return badgeDefinitions.map((badge) => {
    const target = badge.condition.target;
    const current = evaluateCondition(badge.condition, completedQuests, questById, longestStreak);
    const clamped = Math.min(current, target);
    const unlocked = current >= target;
    const progress = target > 0 ? Math.min(clamped / target, 1) : 1;
    return { badge, current: clamped, target, unlocked, progress };
  });
}

export function getNearestLockedBadges(input: BadgeEngineInput, count = 3): BadgeProgress[] {
  return getBadgeProgress(input)
    .filter((bp) => !bp.unlocked)
    .sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return (a.target - a.current) - (b.target - b.current);
    })
    .slice(0, count);
}
```

- [ ] **Step 2: Run badge tests — must all pass**

```bash
npm test -- --testPathPattern="badges.test"
```

Expected: all 12 tests PASS.

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/badges.ts __tests__/lib/badges.test.ts
git commit -m "feat(adventure-log): implement badge progress engine with TDD"
```

---

## Task 7: Create BadgeCard component

**Files:**
- Create: `src/components/BadgeCard.tsx`

The visual area (image or emoji box) is always a fixed 64×64 box so the layout is identical whether an image exists or not — no layout shift when images are added later.

- [ ] **Step 1: Create src/components/BadgeCard.tsx**

```tsx
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
        <Text style={styles.name}>{badge.name}</Text>
        <Text style={styles.desc}>{badge.description}</Text>
      </View>
    );
  }

  return (
    <View style={styles.progressCard}>
      {visual}
      <View style={styles.info}>
        <Text style={styles.name}>{badge.name}</Text>
        <Text style={styles.desc}>{badge.description}</Text>
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
  emoji: { fontSize: 32 },
  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 12,
    elevation: 1,
  },
  info: { flex: 1, gap: 2 },
  name: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },
  desc: { fontSize: 11, color: '#888', marginBottom: 4 },
  track: {
    height: 5,
    backgroundColor: '#F0E6D8',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: '#FF8C42', borderRadius: 3 },
  count: { fontSize: 11, color: '#FF8C42', fontWeight: '700', marginTop: 2 },
  unlockedCard: {
    alignItems: 'center',
    gap: 6,
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 14,
    elevation: 1,
    width: 120,
  },
});
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/BadgeCard.tsx
git commit -m "feat(adventure-log): add BadgeCard component with progress and unlocked variants"
```

---

## Task 8: Restructure ProgressScreen into Adventure Log

**Files:**
- Modify: `src/screens/ProgressScreen.tsx`

Full rewrite of this file. Route name stays `Progress` (navigation unchanged). The four sections are: summary card, next badges, unlocked badges, recent adventures.

- [ ] **Step 1: Replace the full content of src/screens/ProgressScreen.tsx**

```tsx
import React, { useState } from 'react';
import {
  View, Text, Image, FlatList, Modal, ScrollView,
  StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { questById } from '../data/quests';
import { allBadges } from '../data/badges';
import { Decky } from '../components/Decky';
import { BadgeCard } from '../components/BadgeCard';
import { LEVEL_LABELS, xpProgressInCurrentLevel } from '../lib/xp';
import { getBadgeProgress, getNearestLockedBadges } from '../lib/badges';
import { CompletedQuest } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export function ProgressScreen({ navigation }: Props) {
  const { totalXp, level, currentStreak, longestStreak } = useProgressStore();
  const { completedQuests } = useQuestStore();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { earned, total } = xpProgressInCurrentLevel(totalXp);
  const xpProgress = total > 0 ? earned / total : 1;
  const levelLabel = LEVEL_LABELS[level - 1] ?? 'Legend';

  const sorted = [...completedQuests].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
  );

  const badgeInput = {
    badgeDefinitions: allBadges,
    completedQuests,
    questById,
    currentStreak,
    longestStreak,
    totalXp,
    level,
  };

  const nearestLocked = getNearestLockedBadges(badgeInput);
  const allBadgeProgress = getBadgeProgress(badgeInput);
  const unlockedBadges = allBadgeProgress.filter((bp) => bp.unlocked);

  const renderItem = ({ item }: { item: CompletedQuest }) => {
    const quest = questById[item.questId];
    return (
      <TouchableOpacity
        style={styles.historyItem}
        activeOpacity={item.photoUri ? 0.7 : 1}
        onPress={() => { if (item.photoUri) setSelectedPhoto(item.photoUri); }}
      >
        {item.photoUri && (
          <Image source={{ uri: item.photoUri }} style={styles.historyThumb} />
        )}
        <View style={styles.historyLeft}>
          <Text style={styles.historyTitle}>{quest?.title ?? item.questId}</Text>
          <Text style={styles.historyDate}>{item.completedDate}</Text>
        </View>
        <Text style={styles.historyXp}>+{item.xpAwarded} XP</Text>
      </TouchableOpacity>
    );
  };

  const header = (
    <View style={styles.top}>
      {/* Section 1: Summary */}
      <View style={styles.levelCard}>
        <Text style={styles.levelSub}>Adventure Log</Text>
        <Text style={styles.levelNum}>Level {level} · {levelLabel}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.min(xpProgress * 100, 100)}%` }]} />
        </View>
        <View style={styles.xpRow}>
          <Text style={styles.xpText}>{totalXp} XP</Text>
          <Text style={styles.xpText}>{totalXp + (total - earned)} XP to next</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statNum}>{currentStreak}</Text>
          <Text style={styles.statLabel}>streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>🏆</Text>
          <Text style={styles.statNum}>{longestStreak}</Text>
          <Text style={styles.statLabel}>best</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>✅</Text>
          <Text style={styles.statNum}>{completedQuests.length}</Text>
          <Text style={styles.statLabel}>quests done</Text>
        </View>
      </View>

      {/* Section 2: Next Badges */}
      <Text style={styles.sectionLabel}>NEXT BADGES</Text>
      {nearestLocked.length === 0 ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            All badges unlocked for now. More adventures are coming.
          </Text>
        </View>
      ) : (
        <View style={styles.badgeList}>
          {nearestLocked.map((bp) => (
            <BadgeCard key={bp.badge.id} progress={bp} variant="progress" />
          ))}
        </View>
      )}

      {/* Section 3: Unlocked Badges */}
      <Text style={styles.sectionLabel}>UNLOCKED BADGES</Text>
      {unlockedBadges.length === 0 ? (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>Complete your first quest to unlock badges.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.unlockedScroll}
          contentContainerStyle={styles.unlockedContent}
        >
          {unlockedBadges.map((bp) => (
            <BadgeCard key={bp.badge.id} progress={bp} variant="unlocked" />
          ))}
        </ScrollView>
      )}

      {/* Section 4: Recent Adventures */}
      {sorted.length > 0 ? (
        <Text style={styles.sectionLabel}>RECENT ADVENTURES</Text>
      ) : (
        <View style={styles.emptyCard}>
          <Decky pose="empty" size={64} />
          <Text style={styles.emptyTitle}>No adventures yet</Text>
          <Text style={styles.emptyBody}>
            Complete your first quest and it will appear here.
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Adventure Log</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.completedAt}
        ListHeaderComponent={header}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <TouchableOpacity
          style={styles.photoOverlay}
          activeOpacity={1}
          onPress={() => setSelectedPhoto(null)}
        >
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.photoFull} resizeMode="contain" />
          )}
          <Text style={styles.photoClose}>✕</Text>
        </TouchableOpacity>
      </Modal>
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
    paddingBottom: 4,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  top: { padding: 16, gap: 12 },
  list: { paddingBottom: 24 },
  levelCard: {
    backgroundColor: '#FF8C42',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  levelSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  levelNum: { fontSize: 22, fontWeight: '900', color: 'white' },
  track: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginVertical: 6,
  },
  fill: { height: '100%', backgroundColor: 'white', borderRadius: 3 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  stats: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    elevation: 1,
  },
  statEmoji: { fontSize: 20 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#FF8C42', marginTop: 2 },
  statLabel: { fontSize: 10, color: '#aaa', marginTop: 1 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#aaa',
    letterSpacing: 0.5,
  },
  badgeList: { gap: 8 },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  infoText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
  unlockedScroll: { marginHorizontal: -16 },
  unlockedContent: { paddingHorizontal: 16, flexDirection: 'row', gap: 8 },
  emptyCard: {
    marginTop: 4,
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    borderRadius: 16,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  emptyBody: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    elevation: 1,
  },
  historyThumb: { width: 48, height: 48, borderRadius: 8, marginRight: 4 },
  historyLeft: { flex: 1, gap: 2 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  historyDate: { fontSize: 11, color: '#aaa' },
  historyXp: { fontSize: 12, fontWeight: '700', color: '#FF8C42' },
  photoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoFull: { width: '100%', height: '85%' },
  photoClose: {
    position: 'absolute',
    top: 52,
    right: 20,
    fontSize: 20,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '700',
  },
});
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ProgressScreen.tsx
git commit -m "feat(adventure-log): restructure ProgressScreen into Adventure Log with badge sections"
```

---

## Task 9: Add HomeScreen next-badge teaser

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

Show the top nearest locked badge as a small tappable row between XPBar and the mood grid. It navigates to Adventure Log when tapped. If there are no locked badges (all unlocked), the teaser is hidden. Keep it compact — a single row, not a full card.

- [ ] **Step 1: Modify src/screens/HomeScreen.tsx**

Add the following imports at the top alongside existing ones:

```tsx
import { questById } from '../data/quests';
import { allBadges } from '../data/badges';
import { getNearestLockedBadges } from '../lib/badges';
```

Inside the `HomeScreen` component body, after the existing store calls and before `return`, add:

```tsx
  const nextBadge = getNearestLockedBadges({
    badgeDefinitions: allBadges,
    completedQuests,
    questById,
    currentStreak,
    longestStreak: useProgressStore.getState().longestStreak,
    totalXp,
    level,
  }, 1)[0] ?? null;
```

Replace the existing `return` statement's inner content so the teaser appears between `<XPBar .../>` and `<FlatList .../>`:

```tsx
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo_header.png')}
          style={styles.logo}
        />
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
      </View>

      <XPBar level={level} totalXp={totalXp} currentStreak={currentStreak} />

      {nextBadge && (
        <TouchableOpacity
          style={styles.badgeTeaser}
          onPress={() => navigation.navigate('Progress')}
          activeOpacity={0.8}
        >
          <Text style={styles.badgeTeaserEmoji}>{nextBadge.badge.emoji}</Text>
          <View style={styles.badgeTeaserInfo}>
            <Text style={styles.badgeTeaserName}>Next: {nextBadge.badge.name}</Text>
            <Text style={styles.badgeTeaserCount}>{nextBadge.current} / {nextBadge.target}</Text>
          </View>
          <View style={styles.badgeTeaserTrack}>
            <View
              style={[
                styles.badgeTeaserFill,
                { width: `${Math.min(nextBadge.progress * 100, 100)}%` },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={MOODS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.mascotHeader}>
            <Decky pose="idle" size={72} />
            <Text style={styles.moodPrompt}>How are you feeling?</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MoodButton mood={item} onPress={() => handleMoodPress(item)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
```

Add these styles to the existing `StyleSheet.create({...})` in HomeScreen:

```ts
  badgeTeaser: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: '#FFF0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badgeTeaserEmoji: { fontSize: 20 },
  badgeTeaserInfo: { flex: 1 },
  badgeTeaserName: { fontSize: 11, fontWeight: '700', color: '#1a1a1a' },
  badgeTeaserCount: { fontSize: 10, color: '#FF8C42' },
  badgeTeaserTrack: {
    width: 48,
    height: 4,
    backgroundColor: '#F0E6D8',
    borderRadius: 2,
    overflow: 'hidden',
  },
  badgeTeaserFill: { height: '100%', backgroundColor: '#FF8C42', borderRadius: 2 },
```

Note: `useProgressStore.getState().longestStreak` reads longestStreak directly from the store without adding a hook call; this avoids a re-render just for this value. Alternatively, destructure `longestStreak` from `useProgressStore()` at the top of the component alongside the other values — either approach works.

**Simpler alternative for the longestStreak read:** Add `longestStreak` to the existing `useProgressStore()` destructure at the top of the component:

```tsx
  const { totalXp, level, currentStreak, longestStreak } = useProgressStore();
```

Then use `longestStreak` directly in the `nextBadge` computation:

```tsx
  const nextBadge = getNearestLockedBadges({
    badgeDefinitions: allBadges,
    completedQuests,
    questById,
    currentStreak,
    longestStreak,
    totalXp,
    level,
  }, 1)[0] ?? null;
```

Use the simpler destructure approach (second option above).

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full test suite**

```bash
npm test
```

Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat(adventure-log): add next-badge teaser to HomeScreen"
```

---

## Task 10: Create badge validation script

**Files:**
- Create: `scripts/validateBadges.ts`
- Modify: `package.json`

Follow the pattern established by `scripts/validateQuests.ts`.

- [ ] **Step 1: Create scripts/validateBadges.ts**

```ts
import badges from '../src/data/badges/badges.json';
import { Mood } from '../src/types';

const VALID_CONDITION_TYPES = [
  'completed_count',
  'streak_days',
  'quest_location_count',
  'quest_mood_count',
  'quest_people_count',
  'quest_category_count',
];

const VALID_MOODS: Mood[] = [
  'bored', 'at-home', 'outside', 'partner', 'friends', 'weekend', 'creative', 'need-reset',
];

const VALID_LOCATIONS = ['indoors', 'outdoors', 'any'];
const VALID_PEOPLE = ['solo', 'partner', 'friends', 'any'];
const IMAGE_PATTERN = /^badge_[a-z0-9_]+\.png$/;

const errors: string[] = [];
const seenIds = new Set<string>();

for (const badge of badges as any[]) {
  const { id, name, description, emoji, image, condition } = badge;

  if (!id || typeof id !== 'string') {
    errors.push('Badge missing valid id');
    continue;
  }

  if (seenIds.has(id)) errors.push(`Duplicate badge id: ${id}`);
  seenIds.add(id);

  if (!name) errors.push(`${id}: name is missing or empty`);
  if (!description) errors.push(`${id}: description is missing or empty`);
  if (!emoji) errors.push(`${id}: emoji is missing or empty`);

  if (image !== undefined && !IMAGE_PATTERN.test(image)) {
    errors.push(`${id}: image "${image}" must match pattern badge_<name>.png`);
  }

  if (!condition || typeof condition !== 'object') {
    errors.push(`${id}: condition is missing`);
    continue;
  }

  if (!VALID_CONDITION_TYPES.includes(condition.type)) {
    errors.push(`${id}: invalid condition type "${condition.type}"`);
  }

  if (!Number.isInteger(condition.target) || condition.target <= 0) {
    errors.push(`${id}: condition.target must be a positive integer, got "${condition.target}"`);
  }

  if (condition.type === 'quest_mood_count' && !VALID_MOODS.includes(condition.mood)) {
    errors.push(`${id}: invalid mood "${condition.mood}"`);
  }

  if (condition.type === 'quest_people_count' && !VALID_PEOPLE.includes(condition.people)) {
    errors.push(`${id}: invalid people "${condition.people}"`);
  }

  if (condition.type === 'quest_location_count' && !VALID_LOCATIONS.includes(condition.location)) {
    errors.push(`${id}: invalid location "${condition.location}"`);
  }

  if (condition.type === 'quest_category_count' && !condition.category) {
    errors.push(`${id}: condition.category must be a non-empty string`);
  }
}

if (errors.length > 0) {
  console.error('Badge validation failed:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
} else {
  console.log(`✓ All ${(badges as any[]).length} badges valid.`);
}
```

- [ ] **Step 2: Add validate:badges to package.json scripts**

In `package.json`, add `"validate:badges"` alongside the existing `"validate:quests"` entry:

```json
"validate:badges": "ts-node --project scripts/tsconfig.scripts.json scripts/validateBadges.ts"
```

The full scripts block becomes:

```json
"scripts": {
  "start": "expo start",
  "android": "expo run:android",
  "ios": "expo run:ios",
  "web": "expo start --web",
  "test": "jest",
  "test:watch": "jest --watch",
  "validate:quests": "ts-node --project scripts/tsconfig.scripts.json scripts/validateQuests.ts",
  "validate:badges": "ts-node --project scripts/tsconfig.scripts.json scripts/validateBadges.ts"
}
```

- [ ] **Step 3: Run the validation script**

```bash
npm run validate:badges
```

Expected output:
```
✓ All 10 badges valid.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/validateBadges.ts package.json
git commit -m "feat(adventure-log): add badge validation script"
```

---

## Task 11: Final verification

Run the complete verification checklist to confirm everything is green before marking done.

- [ ] **Step 1: TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Full test suite**

```bash
npm test
```

Expected: all tests pass. Check that `__tests__/lib/badges.test.ts` shows all 12 tests green.

- [ ] **Step 3: Quest validation**

```bash
npm run validate:quests
```

Expected: `✓ All N quests valid.`

- [ ] **Step 4: Badge validation**

```bash
npm run validate:badges
```

Expected: `✓ All 10 badges valid.`

- [ ] **Step 5: Commit summary (if any leftover unstaged work)**

Check git status. If clean, no commit needed. If there are stragglers, stage and commit them with a descriptive message.

---

## Spec Coverage Checklist

| Spec task | Covered by plan task |
|-----------|---------------------|
| T1 — Rename ProgressScreen header copy | Task 8 |
| T2 — Adventure Log summary stats | Task 8 (levelCard + stats row) |
| T3 — Badge definitions JSON | Task 2 + Task 3 |
| T4 — Badge image asset convention | Task 4 (registry + assets/badges/) |
| T5 — Badge progress engine | Task 6 |
| T6 — BadgeCard component | Task 7 |
| T7 — ProgressScreen layout restructure | Task 8 |
| T8 — No separate milestones system | Handled — nearestLocked IS the milestone |
| T9 — HomeScreen next badge teaser | Task 9 |
| T10 — JSON validation | Task 10 |
| T11 — Tests | Task 5 + Task 6 |
| T12 — Product tone (copy) | Task 8 copy strings |
| LEVEL_LABELS update | Task 1 |
