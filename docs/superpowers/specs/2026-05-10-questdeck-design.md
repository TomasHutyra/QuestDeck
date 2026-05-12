# QuestDeck v1 — Design Spec

**Date:** 2026-05-10  
**Platform:** Android-first (Expo React Native + TypeScript)  
**Status:** Approved

---

## Overview

QuestDeck is a privacy-first, offline-first real-life quest card app. Users pick a mood, draw 3 randomised quest cards one by one, choose one quest, complete it in the real world, and earn XP. No backend, no login, no analytics, no AI, no payments in v1.

---

## Project Structure

```
src/
  data/
    quests/
      free.json           # 30+ quests, free pack
      index.ts            # imports JSON files, exports allQuests: Quest[] and questById: Record<string, Quest>
    packs.ts              # pack registry (id, name, description, isPremium, emoji)
    moods.ts              # MOODS array — id, label, emoji; used by HomeScreen to render buttons
  stores/
    progressStore.ts      # XP, level, streak — Zustand + persist
    questStore.ts         # completedQuests, activeQuestId, lastRevealedQuestIds — Zustand + persist
    packStore.ts          # unlockedPackIds — Zustand + persist (placeholder for future IAP)
  actions/
    completeQuest.ts      # coordinates completion logic across questStore and progressStore
  lib/
    storage.ts            # AsyncStorage key constants + typed get/set helpers
    questSelector.ts      # filters and samples quests for a given mood
    xp.ts                 # XP→level formula, streak update logic
  screens/
    HomeScreen.tsx
    QuestRevealScreen.tsx
    QuestDetailScreen.tsx
    CompletionScreen.tsx
    ProgressScreen.tsx
    PacksScreen.tsx
  components/
    QuestCard.tsx         # single card — face-down or revealed
    MoodButton.tsx
    XPBar.tsx
  navigation/
    RootStack.tsx         # Stack.Navigator wrapping all screens
  types/
    index.ts              # all shared types
```

`lib/` contains pure functions and storage helpers — no React, no stores. Screens import from stores and `lib/`; components are pure UI.

---

## Types

```ts
// types/index.ts

type Mood =
  | 'bored' | 'at-home' | 'outside' | 'partner'
  | 'friends' | 'weekend' | 'creative' | 'need-reset';

type Quest = {
  id: string;
  title: string;
  description: string;
  category: string;
  moods: Mood[];
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  people: 'solo' | 'partner' | 'friends' | 'any';
  location: 'indoors' | 'outdoors' | 'any';
  xp: number;           // 10 easy / 20 medium / 30 hard
  packId: string;       // e.g. "free"
  optionalTip?: string;
};

type Pack = {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  emoji: string;        // visual identity without artwork, e.g. "🎒"
};

type CompletedQuest = {
  questId: string;
  completedAt: string;   // ISO timestamp — used for history ordering (handles multiple completions per day)
  completedDate: string; // local YYYY-MM-DD — used for streak logic
  xpAwarded: number;
};
```

---

## Stores

### progressStore
```ts
{
  totalXp: number;
  level: number;               // 1–8, derived from totalXp via LEVEL_THRESHOLDS
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;  // local YYYY-MM-DD
}
```

### questStore
```ts
{
  completedQuests: CompletedQuest[];
  activeQuestId: string | null;
  lastRevealedQuestIds: string[];   // exactly 3 IDs; stable across re-renders
}
```

### packStore
```ts
{
  unlockedPackIds: string[];  // always includes 'free'; future IAP appends here
}
```

---

## XP and Level System (`lib/xp.ts`)

```ts
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2200, 3000];
// level 1 = 0 XP, level 2 = 100 XP, …, level 8 = 3000 XP
```

---

## Completion Action (`src/actions/completeQuest.ts`)

CompletionScreen calls `completeQuest(quest)` and receives a result object. All business logic lives here — not in the screen.

```ts
type CompleteQuestResult =
  | { status: 'completed'; xpAwarded: number }
  | { status: 'already_completed' };
```

**Steps:**
1. Check if `quest.id` already exists in `questStore.completedQuests`. If so, return `{ status: 'already_completed' }`.
2. Append to `questStore.completedQuests`:
   ```ts
   { questId: quest.id, completedAt: new Date().toISOString(), completedDate: todayLocalDate(), xpAwarded: quest.xp }
   ```
3. Add `quest.xp` to `progressStore.totalXp`; recalculate `level` from thresholds.
4. Update streak using `progressStore.lastCompletedDate`:
   - null or gap > 1 day → `currentStreak = 1`
   - yesterday → `currentStreak += 1`
   - today → no change (already counted today)
   - If `currentStreak > longestStreak` → update `longestStreak`
5. Set `progressStore.lastCompletedDate` to `todayLocalDate()`.
6. Return `{ status: 'completed', xpAwarded: quest.xp }`.

---

## Quest Selector (`lib/questSelector.ts`)

```ts
questSelector(
  mood: Mood,
  allQuests: Quest[],
  unlockedPackIds: string[],
  completedQuestIds: string[],
  count: number = 3
): Quest[]
```

**Selection logic (in priority order):**
1. Filter by selected `mood` and `packId in unlockedPackIds`.
2. Prefer quests not in `completedQuestIds`. If ≥ `count` uncompleted quests exist, sample `count` from them and return.
3. If fewer than `count` uncompleted quests exist, take all uncompleted ones and fill the remainder by sampling from completed quests matching the same mood.
4. If still fewer than `count` total, broaden to **all moods** within unlocked packs (drop the mood filter). Prefer uncompleted quests in this broadened pool; fill with completed if needed.
5. If still fewer than `count`, return all available quests regardless.
6. If 0 quests exist at any stage, return `[]`. QuestRevealScreen shows the empty state.

---

## Screens

### HomeScreen
- 2-column grid of 8 mood buttons rendered from `MOODS` array in `data/moods.ts` (id, label, emoji) — no hardcoded buttons.
- Top-right: ⭐ icon → ProgressScreen, 📦 icon → PacksScreen.
- Small XP bar below the header showing current level and progress to next level.
- Tapping a mood:
  1. Calls `questSelector(mood, allQuests, unlockedPackIds, completedQuests.map(q => q.questId))`.
  2. Saves result IDs to `questStore.lastRevealedQuestIds`.
  3. Navigates to QuestRevealScreen with `{ mood }`.

### QuestRevealScreen
- Reads quest objects from `lastRevealedQuestIds` — **never re-runs `questSelector` on render**.
- Shows 3 `QuestCard` components. Local state `revealedIndexes: number[]` tracks flipped cards.
- **Tap face-down card** → add its index to `revealedIndexes` (flip animation).
- **Tap revealed card** → set `questStore.activeQuestId`, navigate to QuestDetailScreen with `{ questId }`.
- **"Draw again" button** (optional, shown below cards): calls `questSelector` again, saves new IDs to `lastRevealedQuestIds`, resets `revealedIndexes` to `[]`.
- **Empty state**: if 0 quests returned, show a friendly message ("No quests found for this mood — try another!") with a back button.
- **Back button**: clears `lastRevealedQuestIds`, returns to HomeScreen.

### QuestDetailScreen
- Displays full quest: title, description, `durationMinutes`, `difficulty`, `people`, `location`, `optionalTip` (shown in a tip block if present).
- XP reward shown below details.
- CTA: **"I'll do this!"** → navigates to CompletionScreen with `{ questId }`.
- **Back button**: returns to QuestRevealScreen; `lastRevealedQuestIds` unchanged (cards stay stable).

### CompletionScreen
- Receives `questId`, looks up quest via `questById[questId]`.
- **Pre-completion state**: single "Mark as done" button.
- Tapping it calls `completeQuest(quest)` from `actions/completeQuest.ts`, which returns a `CompleteQuestResult`.
- **Post-completion state**: if `status === 'completed'`, shows XP gained, current streak (🔥), updated XP bar. If `status === 'already_completed'`, shows a neutral message without awarding XP.
- **"Back to Home" button**: clears `activeQuestId` and `lastRevealedQuestIds`, resets navigation stack to HomeScreen.

### ProgressScreen
- Accessible via ⭐ icon on HomeScreen; back button returns.
- Shows in order:
  1. Level badge + label (e.g. "Level 2 · Explorer")
  2. Total XP
  3. XP progress bar (current XP toward next level threshold)
  4. Current streak (🔥 N days) + longest streak
  5. Scrollable list of `completedQuests` sorted by `completedAt` descending (quest title, `completedDate`, XP awarded)

### PacksScreen
- Accessible via 📦 icon on HomeScreen; back button returns.
- **Static for v1.** No IAP logic.
- Shows Free pack card (always unlocked, active state).
- Shows placeholder cards for future premium packs marked "Coming soon" (locked state).

---

## Navigation

Stack-only. No tab bar.

```
HomeScreen
  → QuestRevealScreen  { mood: Mood }
    → QuestDetailScreen  { questId: string }
      → CompletionScreen  { questId: string }
        → HomeScreen  (stack reset, clear activeQuestId + lastRevealedQuestIds)
  → ProgressScreen  (back → HomeScreen)
  → PacksScreen  (back → HomeScreen)
```

**Back behaviour summary:**
- QuestDetail back → QuestRevealScreen (cards stable, no selector re-run)
- QuestReveal back → HomeScreen + clear `lastRevealedQuestIds` — applies to **both** the header back button and the Android hardware back button (use `useFocusEffect` + `BackHandler` or React Navigation's `beforeRemove` event)
- Completion "Back to Home" → reset stack + clear `activeQuestId` + `lastRevealedQuestIds`

---

## Visual Design

- **Background:** `#FFF8F0` (warm cream)
- **Primary accent:** `#FF8C42` → `#FFB347` (orange-amber gradient)
- **Cards:** `#FFF3E8` / `#FFE4C8` with `#FFD0A0` border
- **Face-down cards:** orange-amber gradient with 🃏 icon
- **Tip block:** left-bordered `#FF8C42` strip on `#FFF3E8` background
- **Typography:** bold/heavy weights for titles, muted `#aaa` for metadata
- No tab bar. Large cards. Minimal chrome.

---

## Data Validation (`scripts/validateQuests.ts`)

A development-only script, runnable as `npm run validate:quests`, that checks the integrity of quest JSON data before shipping:

- Every `quest.id` is unique across all packs.
- Every quest has at least one `mood`.
- Every mood value is a valid `Mood` union member.
- Every `quest.packId` exists in `packs.ts`.
- XP matches difficulty for v1: `easy = 10`, `medium = 20`, `hard = 30`.

Exits with a non-zero code and prints a list of violations if any check fails.

---

## Constraints

- No backend, no authentication, no analytics, no AI, no payments in v1.
- All data persisted locally via AsyncStorage (Zustand persist middleware).
- Quest data is local JSON — new packs = new JSON file registered in `data/quests/index.ts`.
- `PacksScreen` is the hook for future IAP: shell exists, no payment SDK.
- Premium instant-reveal feature is **not included in v1**.
