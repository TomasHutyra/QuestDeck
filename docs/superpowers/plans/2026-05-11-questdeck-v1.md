# QuestDeck v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build QuestDeck v1 — a privacy-first, offline-first Android quest card app in Expo React Native + TypeScript.

**Architecture:** Zustand stores persisted to AsyncStorage hold all user state (XP, streaks, completed quests, unlocked packs). Pure functions in `lib/` handle quest selection and XP logic. A single `completeQuest` action in `actions/` coordinates across stores. All quest content lives in local JSON files.

**Tech Stack:** Expo (blank TypeScript template), React Navigation (native stack), Zustand + persist middleware, AsyncStorage, Jest + jest-expo + @testing-library/react-native.

---

## File Map

```
/
  App.tsx                               # NavigationContainer + RootStack
  src/
    types/index.ts                      # Quest, Pack, Mood, CompletedQuest types
    data/
      quests/
        free.json                       # 35 quests, packId "free"
        index.ts                        # exports allQuests, questById
      packs.ts                          # PACKS array + Pack registry
      moods.ts                          # MOODS array (id, label, emoji)
    stores/
      progressStore.ts                  # totalXp, level, streak, lastCompletedDate
      questStore.ts                     # completedQuests, activeQuestId, lastRevealedQuestIds
      packStore.ts                      # unlockedPackIds
    actions/
      completeQuest.ts                  # CompleteQuestResult + completeQuest(quest)
    lib/
      storage.ts                        # STORAGE_KEYS + jsonStorage for persist
      xp.ts                             # calculateLevel, xpProgressInCurrentLevel, updateStreak, todayLocalDate
      questSelector.ts                  # questSelector() with 6-level fallback
    navigation/
      RootStack.tsx                     # Stack.Navigator + RootStackParamList
    screens/
      HomeScreen.tsx
      QuestRevealScreen.tsx
      QuestDetailScreen.tsx
      CompletionScreen.tsx
      ProgressScreen.tsx
      PacksScreen.tsx
    components/
      QuestCard.tsx                     # face-down or revealed card
      MoodButton.tsx                    # single mood grid button
      XPBar.tsx                         # level label + progress bar
  __tests__/
    lib/
      xp.test.ts
      questSelector.test.ts
    actions/
      completeQuest.test.ts
  scripts/
    validateQuests.ts
```

---

## Task 1: Scaffold Expo project + configure test environment

**Files:**
- Create: `App.tsx` (replace generated)
- Create: `__tests__/lib/.gitkeep`
- Modify: `package.json` (jest config)

- [ ] **Step 1: Initialise project in current directory**

Run from `C:\Projects\AI\Claude\QuestDeck`:
```bash
npx create-expo-app@latest . -t blank-typescript --yes
```
Expected: `package.json`, `app.json`, `App.tsx`, `tsconfig.json`, `babel.config.js`, `assets/` created. Existing files (`CLAUDE.md`, `docs/`, `QuestDeck_idea.md`) are untouched.

- [ ] **Step 2: Install runtime dependencies**

```bash
npx expo install @react-navigation/native @react-navigation/native-stack
npx expo install react-native-screens react-native-safe-area-context
npx expo install @react-native-async-storage/async-storage
npm install zustand
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev @testing-library/react-native @testing-library/jest-native
```

- [ ] **Step 4: Configure Jest**

In `package.json`, replace the `"jest"` key with:
```json
"jest": {
  "preset": "jest-expo",
  "setupFilesAfterFramework": ["@testing-library/jest-native/extend-expect"],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|zustand)"
  ]
}
```

- [ ] **Step 5: Add AsyncStorage mock**

Create `__mocks__/@react-native-async-storage/async-storage.js`:
```js
module.exports = {
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
};
```

- [ ] **Step 6: Verify test runner works**

```bash
npx jest --listTests
```
Expected: no errors, empty list.

- [ ] **Step 7: Create src directory structure**

```bash
mkdir -p src/types src/data/quests src/stores src/actions src/lib src/screens src/components src/navigation
mkdir -p __tests__/lib __tests__/actions
```

- [ ] **Step 8: Commit scaffold**

```bash
git add -A
git commit -m "chore: scaffold Expo project with deps and test config"
```

---

## Task 2: Define types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write `src/types/index.ts`**

```ts
export type Mood =
  | 'bored'
  | 'at-home'
  | 'outside'
  | 'partner'
  | 'friends'
  | 'weekend'
  | 'creative'
  | 'need-reset';

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: string;
  moods: Mood[];
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  people: 'solo' | 'partner' | 'friends' | 'any';
  location: 'indoors' | 'outdoors' | 'any';
  xp: number;
  packId: string;
  optionalTip?: string;
};

export type Pack = {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  emoji: string;
};

export type CompletedQuest = {
  questId: string;
  completedAt: string;   // ISO timestamp — for ordering
  completedDate: string; // local YYYY-MM-DD — for streak logic
  xpAwarded: number;
};

export type MoodMeta = {
  id: Mood;
  label: string;
  emoji: string;
};

export type CompleteQuestResult =
  | { status: 'completed'; xpAwarded: number }
  | { status: 'already_completed' };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: define core types"
```

---

## Task 3: Create data layer

**Files:**
- Create: `src/data/quests/free.json`
- Create: `src/data/quests/index.ts`
- Create: `src/data/packs.ts`
- Create: `src/data/moods.ts`

- [ ] **Step 1: Write `src/data/quests/free.json`**

```json
[
  {
    "id": "home-table-reset",
    "title": "Tiny Table Reset",
    "description": "Clear one table or desk surface completely. Put back only what belongs there.",
    "category": "home",
    "moods": ["at-home", "bored"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Set a 5-min timer. It's faster than you think."
  },
  {
    "id": "home-no-phone-window",
    "title": "No-Phone Window",
    "description": "Sit near a window for 10 minutes with no phone. Notice five things outside.",
    "category": "home",
    "moods": ["at-home", "need-reset"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-shelf-discovery",
    "title": "Random Shelf Discovery",
    "description": "Pick one shelf, drawer, or box and rediscover what is inside.",
    "category": "home",
    "moods": ["at-home", "bored"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Take out everything first, then only put back what you actually use."
  },
  {
    "id": "home-stretch",
    "title": "One-Song Stretch",
    "description": "Put on one song and stretch slowly from head to toe until the song ends.",
    "category": "home",
    "moods": ["at-home", "need-reset"],
    "durationMinutes": 5,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-three-good-things",
    "title": "Write Three Good Things",
    "description": "Write down three specific things that went well today, however small.",
    "category": "home",
    "moods": ["need-reset", "creative"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-breathing",
    "title": "4-7-8 Breathing",
    "description": "Inhale for 4 counts, hold for 7, exhale for 8. Repeat 4 times.",
    "category": "home",
    "moods": ["need-reset", "at-home"],
    "durationMinutes": 5,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Find somewhere quiet and sit with your back straight."
  },
  {
    "id": "home-read-ten-pages",
    "title": "Read Ten Pages",
    "description": "Pick up any book and read exactly ten pages without checking your phone.",
    "category": "home",
    "moods": ["at-home", "bored"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-drawer-detox",
    "title": "Drawer Detox",
    "description": "Empty one junk drawer. Keep only items with a clear purpose. Bin the rest.",
    "category": "home",
    "moods": ["at-home", "bored"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-doodle",
    "title": "Doodle for 10 Minutes",
    "description": "Grab a pen and paper and draw whatever comes to mind. No rules, no judgment.",
    "category": "home",
    "moods": ["at-home", "creative"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-six-word-story",
    "title": "Six-Word Story",
    "description": "Write a complete story in exactly six words. Try three different ones.",
    "category": "home",
    "moods": ["creative", "bored"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Hemingway's famous example: \"For sale: baby shoes, never worn.\""
  },
  {
    "id": "home-playlist-mood",
    "title": "Make a Mood Playlist",
    "description": "Build a playlist of 8 songs that all fit one specific feeling or moment.",
    "category": "home",
    "moods": ["creative", "need-reset"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-photo-rediscovery",
    "title": "Photo Album Rediscovery",
    "description": "Scroll to photos from one year ago. Pick your favourite three and remember the day.",
    "category": "home",
    "moods": ["creative", "bored"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "outside-color-walk",
    "title": "3-Color Walk",
    "description": "Go outside for 15 minutes and find something red, something blue, and something yellow.",
    "category": "outside",
    "moods": ["outside", "bored"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "outside-sit-somewhere",
    "title": "Sit Somewhere New",
    "description": "Find a spot outside you have never sat before and stay for 20 minutes.",
    "category": "outside",
    "moods": ["outside", "need-reset"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Leave your headphones at home. Just listen."
  },
  {
    "id": "outside-five-textures",
    "title": "Find Five Textures",
    "description": "Touch and identify five different textures on your walk — rough, smooth, soft, sharp, wet.",
    "category": "outside",
    "moods": ["outside", "creative", "bored"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "outside-count-things",
    "title": "Count Interesting Things",
    "description": "Walk for 15 minutes and count how many genuinely interesting things you spot.",
    "category": "outside",
    "moods": ["outside", "bored"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "partner-two-questions",
    "title": "Two-Question Coffee",
    "description": "Make a drink and ask your partner two questions you have never asked before.",
    "category": "partner",
    "moods": ["partner"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "partner",
    "location": "any",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Avoid questions about logistics. Ask about dreams, memories, or small preferences."
  },
  {
    "id": "partner-show-three-things",
    "title": "Show Each Other Three Things",
    "description": "Each of you shows the other three things on your phone you have never shared before.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "partner",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "partner-memory-list",
    "title": "Memory List",
    "description": "Each of you writes down your five favourite shared memories, then compare your lists.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "partner",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-story-trade",
    "title": "Best/Worst Story Trade",
    "description": "Each person shares their best and worst experience from the last month. No phones.",
    "category": "friends",
    "moods": ["friends"],
    "durationMinutes": 30,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-kitchen-experiment",
    "title": "Kitchen Experiment",
    "description": "Make something edible using only what you already have. No recipe allowed.",
    "category": "home",
    "moods": ["at-home", "creative"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "The stranger the combination, the better the story."
  },
  {
    "id": "home-rearrange-corner",
    "title": "Rearrange One Corner",
    "description": "Pick one corner of a room and completely rearrange it. Move furniture if needed.",
    "category": "home",
    "moods": ["at-home", "creative"],
    "durationMinutes": 20,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "home-make-something",
    "title": "Make Something With What You Have",
    "description": "Use only materials in your home to make a small physical object. No buying anything.",
    "category": "home",
    "moods": ["creative", "at-home"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "outside-different-route",
    "title": "Walk a Different Route",
    "description": "Walk somewhere familiar but take every possible wrong turn. See where you end up.",
    "category": "outside",
    "moods": ["outside", "bored", "weekend"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "solo",
    "location": "outdoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "outside-explore-new-street",
    "title": "Explore a New Street",
    "description": "Find a street within 10 minutes of home you have never walked down. Walk the whole length.",
    "category": "outside",
    "moods": ["outside", "weekend"],
    "durationMinutes": 45,
    "difficulty": "medium",
    "people": "solo",
    "location": "outdoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "partner-cook-together",
    "title": "Cook Together",
    "description": "Cook a full meal together with no screens and no outside help. Divide the tasks.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 45,
    "difficulty": "medium",
    "people": "partner",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "partner-walk-no-phones",
    "title": "Walk Without Phones",
    "description": "Leave your phones at home. Walk for 30 minutes and talk about whatever comes up.",
    "category": "partner",
    "moods": ["partner", "outside"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "partner",
    "location": "outdoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "friends-random-restaurant",
    "title": "Random Restaurant Challenge",
    "description": "Open a map, spin, pick the first restaurant in a random direction. Go there right now.",
    "category": "friends",
    "moods": ["friends", "outside"],
    "durationMinutes": 60,
    "difficulty": "medium",
    "people": "friends",
    "location": "outdoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "friends-skill-share",
    "title": "Skill Share",
    "description": "Each person teaches the group one thing they know that others probably don't.",
    "category": "friends",
    "moods": ["friends"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "friends",
    "location": "any",
    "xp": 20,
    "packId": "free",
    "optionalTip": "Keep each lesson to 5 minutes. Practical and hands-on beats theory."
  },
  {
    "id": "friends-photo-challenge",
    "title": "Photo Challenge",
    "description": "Each person takes one photo in the next 30 minutes that best captures the day. Compare.",
    "category": "friends",
    "moods": ["friends", "outside"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "friends",
    "location": "outdoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "weekend-new-neighborhood",
    "title": "New Neighbourhood Walk",
    "description": "Pick a neighbourhood you have never explored. Spend an hour walking with no destination.",
    "category": "outside",
    "moods": ["outside", "weekend"],
    "durationMinutes": 60,
    "difficulty": "medium",
    "people": "solo",
    "location": "outdoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "weekend-morning-no-screens",
    "title": "Morning Without Screens",
    "description": "From waking up until noon, no phone, TV, or computer. Do whatever you want otherwise.",
    "category": "home",
    "moods": ["at-home", "weekend", "need-reset"],
    "durationMinutes": 120,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "Tell someone the night before so you are not expected to reply."
  },
  {
    "id": "weekend-learn-one-thing",
    "title": "Learn One New Thing",
    "description": "Pick something you have always been curious about. Spend 30 minutes actually learning it.",
    "category": "home",
    "moods": ["at-home", "weekend", "creative"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "weekend-organize-space",
    "title": "Organize One Space",
    "description": "Choose one room, cupboard, or area that has been bothering you. Fix it completely.",
    "category": "home",
    "moods": ["at-home", "weekend"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "home-digital-detox",
    "title": "Digital Detox Hour",
    "description": "Put your phone in another room for one full hour. Do something analogue instead.",
    "category": "home",
    "moods": ["at-home", "weekend", "need-reset"],
    "durationMinutes": 60,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "Tell someone you will be offline so you are not tempted to check."
  }
]
```

- [ ] **Step 2: Write `src/data/packs.ts`**

```ts
import { Pack } from '../types';

export const PACKS: Pack[] = [
  {
    id: 'free',
    name: 'Free Pack',
    description: 'Everyday quests for any mood',
    isPremium: false,
    emoji: '🎒',
  },
  {
    id: 'date-night',
    name: 'Date Night',
    description: '25 quests for couples',
    isPremium: true,
    emoji: '💑',
  },
  {
    id: 'city-explorer',
    name: 'City Explorer',
    description: '20 outdoor urban quests',
    isPremium: true,
    emoji: '🌆',
  },
];

export const packById: Record<string, Pack> = Object.fromEntries(
  PACKS.map((p) => [p.id, p])
);
```

- [ ] **Step 3: Write `src/data/moods.ts`**

```ts
import { MoodMeta } from '../types';

export const MOODS: MoodMeta[] = [
  { id: 'bored',      label: 'Bored',      emoji: '😴' },
  { id: 'at-home',    label: 'At Home',    emoji: '🏠' },
  { id: 'outside',    label: 'Outside',    emoji: '🌿' },
  { id: 'partner',    label: 'Partner',    emoji: '❤️' },
  { id: 'friends',    label: 'Friends',    emoji: '👯' },
  { id: 'weekend',    label: 'Weekend',    emoji: '🌅' },
  { id: 'creative',   label: 'Creative',   emoji: '🎨' },
  { id: 'need-reset', label: 'Need Reset', emoji: '🧘' },
];
```

- [ ] **Step 4: Write `src/data/quests/index.ts`**

```ts
import { Quest } from '../../types';
import freeQuests from './free.json';

export const allQuests: Quest[] = freeQuests as Quest[];

export const questById: Record<string, Quest> = Object.fromEntries(
  allQuests.map((q) => [q.id, q])
);
```

- [ ] **Step 5: Enable JSON imports in tsconfig**

In `tsconfig.json`, ensure `compilerOptions` includes:
```json
{
  "compilerOptions": {
    "resolveJsonModule": true
  }
}
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/data/
git commit -m "feat: add quest data, packs registry, and mood metadata"
```

---

## Task 4: Create Zustand stores

**Files:**
- Create: `src/lib/storage.ts`
- Create: `src/stores/progressStore.ts`
- Create: `src/stores/questStore.ts`
- Create: `src/stores/packStore.ts`

- [ ] **Step 1: Write `src/lib/storage.ts`**

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export const STORAGE_KEYS = {
  PROGRESS: 'questdeck-progress',
  QUESTS: 'questdeck-quests',
  PACKS: 'questdeck-packs',
} as const;

export const jsonStorage = createJSONStorage(() => AsyncStorage);
```

- [ ] **Step 2: Write `src/stores/progressStore.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type ProgressState = {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
};

type ProgressActions = {
  updateAfterCompletion: (update: ProgressState) => void;
  reset: () => void;
};

const initialState: ProgressState = {
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
};

export const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set) => ({
      ...initialState,
      updateAfterCompletion: (update) => set(update),
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.PROGRESS,
      storage: jsonStorage,
    }
  )
);
```

- [ ] **Step 3: Write `src/stores/questStore.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompletedQuest } from '../types';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type QuestState = {
  completedQuests: CompletedQuest[];
  activeQuestId: string | null;
  lastRevealedQuestIds: string[];
};

type QuestActions = {
  addCompletedQuest: (cq: CompletedQuest) => void;
  setActiveQuestId: (id: string | null) => void;
  setLastRevealedQuestIds: (ids: string[]) => void;
  clearLastRevealedQuestIds: () => void;
  clearActiveAndRevealed: () => void;
};

const initialState: QuestState = {
  completedQuests: [],
  activeQuestId: null,
  lastRevealedQuestIds: [],
};

export const useQuestStore = create<QuestState & QuestActions>()(
  persist(
    (set) => ({
      ...initialState,
      addCompletedQuest: (cq) =>
        set((s) => ({ completedQuests: [...s.completedQuests, cq] })),
      setActiveQuestId: (id) => set({ activeQuestId: id }),
      setLastRevealedQuestIds: (ids) => set({ lastRevealedQuestIds: ids }),
      clearLastRevealedQuestIds: () => set({ lastRevealedQuestIds: [] }),
      clearActiveAndRevealed: () =>
        set({ activeQuestId: null, lastRevealedQuestIds: [] }),
    }),
    {
      name: STORAGE_KEYS.QUESTS,
      storage: jsonStorage,
    }
  )
);
```

- [ ] **Step 4: Write `src/stores/packStore.ts`**

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type PackState = {
  unlockedPackIds: string[];
};

type PackActions = {
  unlockPack: (packId: string) => void;
};

export const usePackStore = create<PackState & PackActions>()(
  persist(
    (set) => ({
      unlockedPackIds: ['free'],
      unlockPack: (packId) =>
        set((s) => ({
          unlockedPackIds: s.unlockedPackIds.includes(packId)
            ? s.unlockedPackIds
            : [...s.unlockedPackIds, packId],
        })),
    }),
    {
      name: STORAGE_KEYS.PACKS,
      storage: jsonStorage,
    }
  )
);
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage.ts src/stores/
git commit -m "feat: add Zustand stores for progress, quests, and packs"
```

---

## Task 5: Build `lib/xp.ts` with TDD

**Files:**
- Create: `__tests__/lib/xp.test.ts`
- Create: `src/lib/xp.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/xp.test.ts`:
```ts
import {
  LEVEL_THRESHOLDS,
  LEVEL_LABELS,
  calculateLevel,
  xpProgressInCurrentLevel,
  todayLocalDate,
  updateStreak,
} from '../../src/lib/xp';

describe('calculateLevel', () => {
  it('returns 1 at 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });
  it('returns 1 at 99 XP', () => {
    expect(calculateLevel(99)).toBe(1);
  });
  it('returns 2 at exactly 100 XP', () => {
    expect(calculateLevel(100)).toBe(2);
  });
  it('returns 3 at 250 XP', () => {
    expect(calculateLevel(250)).toBe(3);
  });
  it('returns 8 at 3000 XP', () => {
    expect(calculateLevel(3000)).toBe(8);
  });
  it('caps at 8 beyond max threshold', () => {
    expect(calculateLevel(99999)).toBe(8);
  });
});

describe('xpProgressInCurrentLevel', () => {
  it('returns 0/100 at level 1 with 0 XP', () => {
    expect(xpProgressInCurrentLevel(0)).toEqual({ earned: 0, total: 100 });
  });
  it('returns 50/150 at 150 XP (level 2 runs 100–250)', () => {
    expect(xpProgressInCurrentLevel(150)).toEqual({ earned: 50, total: 150 });
  });
  it('returns full range for level 8 (last level)', () => {
    const result = xpProgressInCurrentLevel(3000);
    expect(result.earned).toBe(800);
    expect(result.total).toBe(800);
  });
});

describe('todayLocalDate', () => {
  it('returns a string matching YYYY-MM-DD', () => {
    expect(todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('updateStreak', () => {
  const BASE = { currentStreak: 5, longestStreak: 7 };

  it('starts streak at 1 when lastCompletedDate is null', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, null, '2026-05-11');
    expect(result).toEqual({ newStreak: 1, newLongest: 7 });
  });
  it('increments streak when last date is yesterday', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, '2026-05-10', '2026-05-11');
    expect(result).toEqual({ newStreak: 6, newLongest: 7 });
  });
  it('updates longestStreak when currentStreak exceeds it', () => {
    const result = updateStreak(7, 7, '2026-05-10', '2026-05-11');
    expect(result).toEqual({ newStreak: 8, newLongest: 8 });
  });
  it('does not change streak when last date is today', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, '2026-05-11', '2026-05-11');
    expect(result).toEqual({ newStreak: 5, newLongest: 7 });
  });
  it('resets streak to 1 when gap is more than 1 day', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, '2026-05-08', '2026-05-11');
    expect(result).toEqual({ newStreak: 1, newLongest: 7 });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/xp.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '../../src/lib/xp'"

- [ ] **Step 3: Write `src/lib/xp.ts`**

```ts
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2200, 3000];

export const LEVEL_LABELS = [
  'Wanderer', 'Explorer', 'Adventurer', 'Quester',
  'Seeker', 'Pathfinder', 'Voyager', 'Legend',
];

export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function xpProgressInCurrentLevel(xp: number): { earned: number; total: number } {
  const level = calculateLevel(xp);
  const levelIndex = level - 1;
  const currentThreshold = LEVEL_THRESHOLDS[levelIndex];
  const nextThreshold = LEVEL_THRESHOLDS[levelIndex + 1] ?? currentThreshold + 800;
  return {
    earned: xp - currentThreshold,
    total: nextThreshold - currentThreshold,
  };
}

export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastCompletedDate: string | null,
  todayDate: string
): { newStreak: number; newLongest: number } {
  if (lastCompletedDate === todayDate) {
    return { newStreak: currentStreak, newLongest: longestStreak };
  }

  let newStreak: number;
  if (lastCompletedDate === null) {
    newStreak = 1;
  } else {
    const last = new Date(lastCompletedDate);
    const today = new Date(todayDate);
    const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
    newStreak = diffDays === 1 ? currentStreak + 1 : 1;
  }

  const newLongest = newStreak > longestStreak ? newStreak : longestStreak;
  return { newStreak, newLongest };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/xp.test.ts --no-coverage
```
Expected: PASS — 12 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/xp.ts __tests__/lib/xp.test.ts
git commit -m "feat: implement xp helpers (calculateLevel, updateStreak) with tests"
```

---

## Task 6: Build `lib/questSelector.ts` with TDD

**Files:**
- Create: `__tests__/lib/questSelector.test.ts`
- Create: `src/lib/questSelector.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/questSelector.test.ts`:
```ts
import { questSelector } from '../../src/lib/questSelector';
import { Quest } from '../../src/types';

const makeQuest = (overrides: Partial<Quest>): Quest => ({
  id: 'q1',
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
  ...overrides,
});

const makeQuests = (count: number, moodOverride = 'bored', packId = 'free'): Quest[] =>
  Array.from({ length: count }, (_, i) =>
    makeQuest({ id: `q${i + 1}`, moods: [moodOverride as any], packId })
  );

describe('questSelector', () => {
  it('returns up to count quests matching mood and pack', () => {
    const quests = makeQuests(10);
    const result = questSelector('bored', quests, ['free'], [], 3);
    expect(result).toHaveLength(3);
    result.forEach((q) => expect(q.packId).toBe('free'));
  });

  it('excludes quests from locked packs', () => {
    const quests = [
      makeQuest({ id: 'a', packId: 'free', moods: ['bored'] }),
      makeQuest({ id: 'b', packId: 'premium', moods: ['bored'] }),
    ];
    const result = questSelector('bored', quests, ['free'], [], 3);
    expect(result.every((q) => q.packId === 'free')).toBe(true);
  });

  it('prefers uncompleted quests', () => {
    const quests = makeQuests(5);
    const completedIds = ['q1', 'q2', 'q3'];
    const result = questSelector('bored', quests, ['free'], completedIds, 2);
    expect(result.every((q) => !completedIds.includes(q.id))).toBe(true);
  });

  it('fills with completed quests when not enough uncompleted', () => {
    const quests = makeQuests(3);
    const completedIds = ['q1', 'q2'];
    const result = questSelector('bored', quests, ['free'], completedIds, 3);
    expect(result).toHaveLength(3);
  });

  it('broadens to all moods when still not enough after filling completed', () => {
    const quests = [
      makeQuest({ id: 'a', moods: ['bored'] }),
      makeQuest({ id: 'b', moods: ['creative'] }),
      makeQuest({ id: 'c', moods: ['creative'] }),
    ];
    const completedIds = ['a'];
    const result = questSelector('bored', quests, ['free'], completedIds, 3);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no quests exist', () => {
    const result = questSelector('bored', [], ['free'], [], 3);
    expect(result).toHaveLength(0);
  });

  it('returns fewer than count when total quests in all packs is small', () => {
    const quests = makeQuests(2);
    const result = questSelector('bored', quests, ['free'], [], 3);
    expect(result).toHaveLength(2);
  });

  it('never returns duplicate quests', () => {
    const quests = makeQuests(10);
    const result = questSelector('bored', quests, ['free'], [], 3);
    const ids = result.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/lib/questSelector.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '../../src/lib/questSelector'"

- [ ] **Step 3: Write `src/lib/questSelector.ts`**

```ts
import { Mood, Quest } from '../types';

function sample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function questSelector(
  mood: Mood,
  allQuests: Quest[],
  unlockedPackIds: string[],
  completedQuestIds: string[],
  count = 3
): Quest[] {
  const isUnlocked = (q: Quest) => unlockedPackIds.includes(q.packId);
  const matchesMood = (q: Quest) => q.moods.includes(mood);
  const isCompleted = (q: Quest) => completedQuestIds.includes(q.id);

  // Step 1: Filter by mood + unlocked packs
  const moodPool = allQuests.filter((q) => isUnlocked(q) && matchesMood(q));
  const uncompleted = moodPool.filter((q) => !isCompleted(q));
  const completed = moodPool.filter((q) => isCompleted(q));

  if (uncompleted.length >= count) {
    return sample(uncompleted, count);
  }

  // Step 2: Fill with completed from same mood
  const partial = [...uncompleted];
  const needed = count - partial.length;
  partial.push(...sample(completed, needed));

  if (partial.length >= count) {
    return partial.slice(0, count);
  }

  // Step 3: Broaden to all moods within unlocked packs
  const broadPool = allQuests.filter(
    (q) => isUnlocked(q) && !partial.some((p) => p.id === q.id)
  );
  const broadUncompleted = broadPool.filter((q) => !isCompleted(q));
  const broadCompleted = broadPool.filter((q) => isCompleted(q));

  const stillNeeded = count - partial.length;
  if (broadUncompleted.length >= stillNeeded) {
    return [...partial, ...sample(broadUncompleted, stillNeeded)];
  }

  partial.push(...broadUncompleted);
  const finalNeeded = count - partial.length;
  partial.push(...sample(broadCompleted, finalNeeded));

  return partial.slice(0, count);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/lib/questSelector.test.ts --no-coverage
```
Expected: PASS — 8 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/questSelector.ts __tests__/lib/questSelector.test.ts
git commit -m "feat: implement questSelector with 6-level fallback and tests"
```

---

## Task 7: Build `actions/completeQuest.ts` with TDD

**Files:**
- Create: `__tests__/actions/completeQuest.test.ts`
- Create: `src/actions/completeQuest.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/actions/completeQuest.test.ts`:
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
  it('returns completed status with xpAwarded', () => {
    const result = completeQuest(questEasy);
    expect(result).toEqual({ status: 'completed', xpAwarded: 10 });
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
    expect(result).toEqual({ status: 'already_completed' });
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
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest __tests__/actions/completeQuest.test.ts --no-coverage
```
Expected: FAIL — "Cannot find module '../../src/actions/completeQuest'"

- [ ] **Step 3: Write `src/actions/completeQuest.ts`**

```ts
import { Quest, CompleteQuestResult } from '../types';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { calculateLevel, updateStreak, todayLocalDate } from '../lib/xp';

export function completeQuest(quest: Quest): CompleteQuestResult {
  const { completedQuests } = useQuestStore.getState();

  if (completedQuests.some((cq) => cq.questId === quest.id)) {
    return { status: 'already_completed' };
  }

  const completedDate = todayLocalDate();

  useQuestStore.getState().addCompletedQuest({
    questId: quest.id,
    completedAt: new Date().toISOString(),
    completedDate,
    xpAwarded: quest.xp,
  });

  const { totalXp, currentStreak, longestStreak, lastCompletedDate } =
    useProgressStore.getState();

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

  return { status: 'completed', xpAwarded: quest.xp };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest __tests__/actions/completeQuest.test.ts --no-coverage
```
Expected: PASS — 9 tests passed.

- [ ] **Step 5: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/actions/completeQuest.ts __tests__/actions/completeQuest.test.ts
git commit -m "feat: implement completeQuest action with duplicate guard and tests"
```

---

## Task 8: Set up navigation

**Files:**
- Create: `src/navigation/RootStack.tsx`
- Modify: `App.tsx`

- [ ] **Step 1: Write `src/navigation/RootStack.tsx`**

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

export type RootStackParamList = {
  Home: undefined;
  QuestReveal: { mood: Mood };
  QuestDetail: { questId: string };
  Completion: { questId: string };
  Progress: undefined;
  Packs: undefined;
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
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Create placeholder screens** (needed so RootStack compiles)

Create each of these with a minimal placeholder — replace with real content in later tasks:

`src/screens/HomeScreen.tsx`:
```tsx
import React from 'react';
import { View, Text } from 'react-native';
export function HomeScreen() {
  return <View><Text>Home</Text></View>;
}
```

Repeat the same minimal pattern for:
- `src/screens/QuestRevealScreen.tsx` — export `QuestRevealScreen`
- `src/screens/QuestDetailScreen.tsx` — export `QuestDetailScreen`
- `src/screens/CompletionScreen.tsx` — export `CompletionScreen`
- `src/screens/ProgressScreen.tsx` — export `ProgressScreen`
- `src/screens/PacksScreen.tsx` — export `PacksScreen`

- [ ] **Step 3: Write `App.tsx`**

```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { RootStack } from './src/navigation/RootStack';

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <RootStack />
    </NavigationContainer>
  );
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Start the app and verify it opens on a device/emulator**

```bash
npx expo start --android
```
Expected: app opens, shows "Home" placeholder text.

- [ ] **Step 6: Commit**

```bash
git add src/navigation/ src/screens/ App.tsx
git commit -m "feat: set up React Navigation stack with placeholder screens"
```

---

## Task 9: Build shared components

**Files:**
- Create: `src/components/XPBar.tsx`
- Create: `src/components/MoodButton.tsx`
- Create: `src/components/QuestCard.tsx`

- [ ] **Step 1: Write `src/components/XPBar.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LEVEL_LABELS, xpProgressInCurrentLevel } from '../lib/xp';

type Props = {
  level: number;
  totalXp: number;
};

export function XPBar({ level, totalXp }: Props) {
  const { earned, total } = xpProgressInCurrentLevel(totalXp);
  const progress = total > 0 ? earned / total : 1;
  const label = LEVEL_LABELS[level - 1] ?? 'Legend';

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.levelText}>Lv {level} · {label}</Text>
        <Text style={styles.xpText}>{totalXp} XP</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  levelText: { fontSize: 11, color: '#888', fontWeight: '600' },
  xpText: { fontSize: 11, color: '#888' },
  track: { height: 4, backgroundColor: '#F0E6D8', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#FF8C42', borderRadius: 2 },
});
```

- [ ] **Step 2: Write `src/components/MoodButton.tsx`**

```tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MoodMeta } from '../types';

type Props = {
  mood: MoodMeta;
  onPress: () => void;
};

export function MoodButton({ mood, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.emoji}>{mood.emoji}</Text>
      <Text style={styles.label}>{mood.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  emoji: { fontSize: 22, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600', color: '#333' },
});
```

- [ ] **Step 3: Write `src/components/QuestCard.tsx`**

```tsx
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
    borderWidth: 1.5,
    borderColor: '#FFD0A0',
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
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/
git commit -m "feat: add QuestCard, MoodButton, and XPBar components"
```

---

## Task 10: Build HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Replace HomeScreen placeholder with full implementation**

```tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { MOODS } from '../data/moods';
import { allQuests } from '../data/quests';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { usePackStore } from '../stores/packStore';
import { questSelector } from '../lib/questSelector';
import { XPBar } from '../components/XPBar';
import { MoodButton } from '../components/MoodButton';
import { MoodMeta } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { completedQuests, setLastRevealedQuestIds } = useQuestStore();
  const { totalXp, level } = useProgressStore();
  const { unlockedPackIds } = usePackStore();

  const handleMoodPress = (mood: MoodMeta) => {
    const completedIds = completedQuests.map((cq) => cq.questId);
    const selected = questSelector(mood.id, allQuests, unlockedPackIds, completedIds);
    setLastRevealedQuestIds(selected.map((q) => q.id));
    navigation.navigate('QuestReveal', { mood: mood.id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>QuestDeck</Text>
          <Text style={styles.subtitle}>What do you feel like?</Text>
        </View>
        <View style={styles.icons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.iconEmoji}>⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Packs')}>
            <Text style={styles.iconEmoji}>📦</Text>
          </TouchableOpacity>
        </View>
      </View>

      <XPBar level={level} totalXp={totalXp} />

      <FlatList
        data={MOODS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MoodButton mood={item} onPress={() => handleMoodPress(item)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  subtitle: { fontSize: 12, color: '#aaa', marginTop: 2 },
  icons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, backgroundColor: '#fff', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  iconEmoji: { fontSize: 16 },
  grid: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
  cell: { flex: 1 },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run the app and verify mood buttons render and XP bar shows**

```bash
npx expo start --android
```
Expected: 8 mood buttons in 2-column grid, XP bar, ⭐ and 📦 icons visible.

- [ ] **Step 4: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: implement HomeScreen with mood grid and XP bar"
```

---

## Task 11: Build QuestRevealScreen

**Files:**
- Modify: `src/screens/QuestRevealScreen.tsx`

- [ ] **Step 1: Replace QuestRevealScreen placeholder with full implementation**

```tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById, allQuests } from '../data/quests';
import { useQuestStore } from '../stores/questStore';
import { usePackStore } from '../stores/packStore';
import { questSelector } from '../lib/questSelector';
import { QuestCard } from '../components/QuestCard';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestReveal'>;

export function QuestRevealScreen({ navigation, route }: Props) {
  const { mood } = route.params;
  const {
    lastRevealedQuestIds,
    completedQuests,
    setActiveQuestId,
    setLastRevealedQuestIds,
    clearLastRevealedQuestIds,
  } = useQuestStore();
  const { unlockedPackIds } = usePackStore();

  const [revealedIndexes, setRevealedIndexes] = useState<number[]>([]);

  // Clear lastRevealedQuestIds when leaving this screen (both header back + hardware back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      clearLastRevealedQuestIds();
    });
    return unsubscribe;
  }, [navigation, clearLastRevealedQuestIds]);

  const quests = lastRevealedQuestIds
    .map((id) => questById[id])
    .filter(Boolean);

  const handleCardPress = (index: number) => {
    if (!revealedIndexes.includes(index)) {
      setRevealedIndexes((prev) => [...prev, index]);
    } else {
      const quest = quests[index];
      if (quest) {
        setActiveQuestId(quest.id);
        navigation.navigate('QuestDetail', { questId: quest.id });
      }
    }
  };

  const handleDrawAgain = () => {
    const completedIds = completedQuests.map((cq) => cq.questId);
    const selected = questSelector(mood, allQuests, unlockedPackIds, completedIds);
    setLastRevealedQuestIds(selected.map((q) => q.id));
    setRevealedIndexes([]);
  };

  if (quests.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No quests found</Text>
          <Text style={styles.emptySubtitle}>Try a different mood</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.moodLabel}>{mood}</Text>
          <Text style={styles.hint}>
            {revealedIndexes.length < quests.length ? 'Tap a card to reveal' : 'Tap a card to choose'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.cards}>
        {quests.map((quest, index) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            isRevealed={revealedIndexes.includes(index)}
            onPress={() => handleCardPress(index)}
          />
        ))}

        <TouchableOpacity style={styles.drawAgain} onPress={handleDrawAgain}>
          <Text style={styles.drawAgainText}>Draw again</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { padding: 16 },
  backText: { fontSize: 20, color: '#aaa' },
  moodLabel: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', textTransform: 'capitalize' },
  hint: { fontSize: 11, color: '#aaa', marginTop: 2 },
  cards: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptySubtitle: { fontSize: 13, color: '#aaa', marginTop: 6 },
  drawAgain: {
    marginTop: 8, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFD0A0', borderRadius: 12,
    backgroundColor: 'transparent',
  },
  drawAgainText: { fontSize: 13, fontWeight: '700', color: '#FF8C42' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run the app and verify**

```bash
npx expo start --android
```
Tap a mood on HomeScreen. Expected: 3 face-down cards appear. Tap each card to reveal. Tap a revealed card to navigate to detail placeholder. Tap "Draw again" to reshuffle. Hardware back should return to Home.

- [ ] **Step 4: Commit**

```bash
git add src/screens/QuestRevealScreen.tsx
git commit -m "feat: implement QuestRevealScreen with one-by-one reveal and draw again"
```

---

## Task 12: Build QuestDetailScreen

**Files:**
- Modify: `src/screens/QuestDetailScreen.tsx`

- [ ] **Step 1: Replace QuestDetailScreen placeholder with full implementation**

```tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById } from '../data/quests';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestDetail'>;

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
};
const PEOPLE_LABEL: Record<string, string> = {
  solo: 'Solo', partner: 'With partner', friends: 'With friends', any: 'Anyone',
};
const LOCATION_LABEL: Record<string, string> = {
  indoors: '🏠 Indoors', outdoors: '🌿 Outdoors', any: '📍 Anywhere',
};

export function QuestDetailScreen({ navigation, route }: Props) {
  const quest = questById[route.params.questId];

  if (!quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Quest not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{quest.title}</Text>
          <Text style={styles.description}>{quest.description}</Text>

          <View style={styles.tags}>
            <View style={styles.pill}><Text style={styles.pillText}>{quest.durationMinutes} min</Text></View>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>{DIFFICULTY_LABEL[quest.difficulty]}</Text></View>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>{PEOPLE_LABEL[quest.people]}</Text></View>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>{LOCATION_LABEL[quest.location]}</Text></View>
          </View>
        </View>

        {quest.optionalTip ? (
          <View style={styles.tip}>
            <Text style={styles.tipLabel}>TIP</Text>
            <Text style={styles.tipText}>{quest.optionalTip}</Text>
          </View>
        ) : null}

        <Text style={styles.reward}>Reward: <Text style={styles.rewardXp}>⭐ {quest.xp} XP</Text></Text>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('Completion', { questId: quest.id })}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>I'll do this! →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  error: { margin: 24, color: '#aaa' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backText: { fontSize: 20, color: '#aaa' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#FFF3E8', borderRadius: 16, padding: 20,
    borderWidth: 1.5, borderColor: '#FFD0A0', gap: 12,
  },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', lineHeight: 26 },
  description: { fontSize: 14, color: '#444', lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: '#FF8C42', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: 'white', fontSize: 11, fontWeight: '700' },
  pillMuted: { backgroundColor: '#F0E6D8', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  pillMutedText: { color: '#777', fontSize: 11 },
  tip: {
    borderLeftWidth: 3, borderLeftColor: '#FF8C42',
    backgroundColor: '#FFF3E8', borderRadius: 8, padding: 12, gap: 4,
  },
  tipLabel: { fontSize: 10, fontWeight: '800', color: '#FF8C42', letterSpacing: 1 },
  tipText: { fontSize: 13, color: '#555', lineHeight: 19 },
  reward: { textAlign: 'center', fontSize: 13, color: '#aaa' },
  rewardXp: { fontWeight: '700', color: '#FF8C42' },
  cta: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: 'white' },
});
```

- [ ] **Step 2: Verify TypeScript compiles and test in app**

```bash
npx tsc --noEmit
npx expo start --android
```
Expected: full quest detail visible after tapping a revealed card. Tip block only appears for quests that have `optionalTip`.

- [ ] **Step 3: Commit**

```bash
git add src/screens/QuestDetailScreen.tsx
git commit -m "feat: implement QuestDetailScreen with full quest info and CTA"
```

---

## Task 13: Build CompletionScreen

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`

- [ ] **Step 1: Replace CompletionScreen placeholder with full implementation**

```tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById } from '../data/quests';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { completeQuest } from '../actions/completeQuest';
import { XPBar } from '../components/XPBar';
import { CompleteQuestResult } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Completion'>;

export function CompletionScreen({ navigation, route }: Props) {
  const quest = questById[route.params.questId];
  const { clearActiveAndRevealed } = useQuestStore();
  const { totalXp, level, currentStreak } = useProgressStore();

  const [result, setResult] = useState<CompleteQuestResult | null>(null);

  const handleMarkDone = () => {
    if (!quest) return;
    const r = completeQuest(quest);
    setResult(r);
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

- [ ] **Step 2: Verify TypeScript compiles and test the full flow**

```bash
npx tsc --noEmit
npx expo start --android
```
Walk through the complete flow: Home → Reveal → Detail → Completion. Expected: XP and streak appear after marking done. "Back to Home" resets to HomeScreen. Completing the same quest again shows "Already completed" with no XP.

- [ ] **Step 3: Commit**

```bash
git add src/screens/CompletionScreen.tsx
git commit -m "feat: implement CompletionScreen with XP, streak, and duplicate guard"
```

---

## Task 14: Build ProgressScreen

**Files:**
- Modify: `src/screens/ProgressScreen.tsx`

- [ ] **Step 1: Replace ProgressScreen placeholder with full implementation**

```tsx
import React from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { questById } from '../data/quests';
import { LEVEL_LABELS, xpProgressInCurrentLevel } from '../lib/xp';
import { CompletedQuest } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export function ProgressScreen({ navigation }: Props) {
  const { totalXp, level, currentStreak, longestStreak } = useProgressStore();
  const { completedQuests } = useQuestStore();

  const { earned, total } = xpProgressInCurrentLevel(totalXp);
  const progress = total > 0 ? earned / total : 1;
  const levelLabel = LEVEL_LABELS[level - 1] ?? 'Legend';

  const sorted = [...completedQuests].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const renderItem = ({ item }: { item: CompletedQuest }) => {
    const quest = questById[item.questId];
    return (
      <View style={styles.historyItem}>
        <View style={styles.historyLeft}>
          <Text style={styles.historyTitle}>{quest?.title ?? item.questId}</Text>
          <Text style={styles.historyDate}>{item.completedDate}</Text>
        </View>
        <Text style={styles.historyXp}>+{item.xpAwarded} XP</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Progress</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.completedAt}
        ListHeaderComponent={
          <View style={styles.top}>
            <View style={styles.levelCard}>
              <Text style={styles.levelSub}>Current level</Text>
              <Text style={styles.levelNum}>Level {level}</Text>
              <Text style={styles.levelLabel}>{levelLabel}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` }]} />
              </View>
              <View style={styles.xpRow}>
                <Text style={styles.xpText}>{totalXp} XP</Text>
                <Text style={styles.xpText}>{totalXp + (total - earned)} XP</Text>
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
                <Text style={styles.statLabel}>done</Text>
              </View>
            </View>

            {sorted.length > 0 ? (
              <Text style={styles.sectionLabel}>RECENT QUESTS</Text>
            ) : (
              <Text style={styles.emptyHint}>Complete your first quest to see history here.</Text>
            )}
          </View>
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  top: { padding: 16, gap: 12 },
  list: { paddingBottom: 24 },
  levelCard: {
    backgroundColor: '#FF8C42', borderRadius: 16, padding: 16, gap: 4,
  },
  levelSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  levelNum: { fontSize: 26, fontWeight: '900', color: 'white' },
  levelLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  track: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: 'white', borderRadius: 3 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xpText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  stats: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12,
    alignItems: 'center', elevation: 1,
  },
  statEmoji: { fontSize: 20 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#FF8C42', marginTop: 2 },
  statLabel: { fontSize: 10, color: '#aaa', marginTop: 1 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa',
    letterSpacing: 0.5, paddingHorizontal: 0,
  },
  emptyHint: { fontSize: 13, color: '#ccc', textAlign: 'center', marginTop: 16 },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 12, padding: 12, marginHorizontal: 16,
    marginBottom: 8, elevation: 1,
  },
  historyLeft: { gap: 2 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  historyDate: { fontSize: 11, color: '#aaa' },
  historyXp: { fontSize: 12, fontWeight: '700', color: '#FF8C42' },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Verify in app**

```bash
npx expo start --android
```
Tap ⭐ from HomeScreen. Expected: level card, streak stats, completed quest history (empty until quests are completed).

- [ ] **Step 4: Commit**

```bash
git add src/screens/ProgressScreen.tsx
git commit -m "feat: implement ProgressScreen with level card, streak stats, and quest history"
```

---

## Task 15: Build PacksScreen

**Files:**
- Modify: `src/screens/PacksScreen.tsx`

- [ ] **Step 1: Replace PacksScreen placeholder with full implementation**

```tsx
import React from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { PACKS } from '../data/packs';
import { usePackStore } from '../stores/packStore';
import { Pack } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Packs'>;

export function PacksScreen({ navigation }: Props) {
  const { unlockedPackIds } = usePackStore();

  const renderItem = ({ item }: { item: Pack }) => {
    const isUnlocked = unlockedPackIds.includes(item.id);
    return (
      <View style={[styles.pack, isUnlocked ? styles.packUnlocked : styles.packLocked]}>
        <Text style={styles.packEmoji}>{item.emoji}</Text>
        <View style={styles.packInfo}>
          <Text style={styles.packName}>{item.name}</Text>
          <Text style={styles.packDesc}>{item.description}</Text>
        </View>
        <View style={[styles.badge, isUnlocked ? styles.badgeActive : styles.badgeLocked]}>
          <Text style={[styles.badgeText, isUnlocked ? styles.badgeTextActive : styles.badgeTextLocked]}>
            {isUnlocked ? 'Active' : '🔒 Soon'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Quest Packs</Text>
      </View>

      <FlatList
        data={PACKS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  list: { padding: 16, gap: 12 },
  pack: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14,
  },
  packUnlocked: {
    backgroundColor: '#FFF3E8', borderWidth: 1.5, borderColor: '#FFD0A0',
  },
  packLocked: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#EEE', opacity: 0.75,
  },
  packEmoji: { fontSize: 28 },
  packInfo: { flex: 1, gap: 2 },
  packName: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },
  packDesc: { fontSize: 11, color: '#888' },
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  badgeActive: { backgroundColor: '#D4EDDA' },
  badgeLocked: { backgroundColor: '#F0E6D8' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextActive: { color: '#3DAA6E' },
  badgeTextLocked: { color: '#aaa' },
});
```

- [ ] **Step 2: Verify TypeScript compiles and test in app**

```bash
npx tsc --noEmit
npx expo start --android
```
Tap 📦 from HomeScreen. Expected: Free Pack shown as active (green badge), Date Night and City Explorer shown as locked (grey badge).

- [ ] **Step 3: Commit**

```bash
git add src/screens/PacksScreen.tsx
git commit -m "feat: implement PacksScreen with free and locked premium pack cards"
```

---

## Task 16: Quest data validation script

**Files:**
- Create: `scripts/validateQuests.ts`
- Modify: `package.json`

- [ ] **Step 1: Write `scripts/validateQuests.ts`**

```ts
import quests from '../src/data/quests/free.json';
import { PACKS } from '../src/data/packs';
import { Mood } from '../src/types';

const VALID_MOODS: Mood[] = [
  'bored', 'at-home', 'outside', 'partner', 'friends', 'weekend', 'creative', 'need-reset',
];
const VALID_PACK_IDS = PACKS.map((p) => p.id);
const XP_BY_DIFFICULTY: Record<string, number> = { easy: 10, medium: 20, hard: 30 };

const errors: string[] = [];
const seenIds = new Set<string>();

for (const quest of quests as any[]) {
  const { id, moods, packId, difficulty, xp } = quest;

  if (seenIds.has(id)) {
    errors.push(`Duplicate id: ${id}`);
  }
  seenIds.add(id);

  if (!Array.isArray(moods) || moods.length === 0) {
    errors.push(`${id}: moods must be a non-empty array`);
  } else {
    for (const mood of moods) {
      if (!VALID_MOODS.includes(mood)) {
        errors.push(`${id}: invalid mood "${mood}"`);
      }
    }
  }

  if (!VALID_PACK_IDS.includes(packId)) {
    errors.push(`${id}: unknown packId "${packId}"`);
  }

  const expectedXp = XP_BY_DIFFICULTY[difficulty];
  if (expectedXp !== undefined && xp !== expectedXp) {
    errors.push(`${id}: xp is ${xp} but difficulty "${difficulty}" expects ${expectedXp}`);
  }
}

if (errors.length > 0) {
  console.error('Quest validation failed:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
} else {
  console.log(`✓ All ${quests.length} quests valid.`);
}
```

- [ ] **Step 2: Add `ts-node` for running the script**

```bash
npm install --save-dev ts-node
```

- [ ] **Step 3: Add npm script to `package.json`**

In the `"scripts"` section of `package.json`, add:
```json
"validate:quests": "ts-node --project tsconfig.json scripts/validateQuests.ts"
```

- [ ] **Step 4: Run validation and verify it passes**

```bash
npm run validate:quests
```
Expected: `✓ All 35 quests valid.`

- [ ] **Step 5: Commit**

```bash
git add scripts/validateQuests.ts package.json
git commit -m "feat: add quest data validation script (npm run validate:quests)"
```

---

## Task 17: Final end-to-end verification

- [ ] **Step 1: Run full test suite**

```bash
npx jest --no-coverage
```
Expected: all tests pass.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Run quest validation**

```bash
npm run validate:quests
```
Expected: `✓ All 35 quests valid.`

- [ ] **Step 4: Manual end-to-end test on Android**

```bash
npx expo start --android
```
Walk through these scenarios:

1. Open app → see mood grid + XP bar (Level 1, 0 XP).
2. Tap "Bored" → 3 face-down cards appear.
3. Tap each card one by one → all 3 reveal.
4. Tap a revealed card → Quest Detail opens.
5. Tap "I'll do this!" → CompletionScreen shows "Mark as done".
6. Tap "Mark as done" → XP awarded, streak shows 1-day.
7. Tap "Back to Home" → returns to HomeScreen, XP bar updated.
8. Tap ⭐ → Progress screen shows level, streak, completed quest.
9. Tap 📦 → Packs screen shows Free Pack active, others locked.
10. Tap "Bored" again → new 3 cards (selector avoids just-completed quest).
11. Tap hardware back on Reveal screen → returns to Home cleanly.
12. Complete the same quest again → "Already completed" screen, no XP change.
13. Tap "Draw again" on Reveal screen → new set of 3 cards.

- [ ] **Step 5: Commit verification**

```bash
git add -A
git commit -m "chore: verify complete QuestDeck v1 end-to-end flow"
```
