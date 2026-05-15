# QuestDeck — System Documentation

## Overview

QuestDeck is a privacy-first, offline-first Android app (Expo React Native + TypeScript).  
Users pick a mood, draw 3 random quest cards, choose one, complete it, and earn XP.  
There is no backend, no login, no analytics, and no network traffic after install.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                   UI Layer                  │
│   Screens (8) + Components (4)              │
│   React Native + react-navigation           │
└────────────────┬────────────────────────────┘
                 │ reads / dispatches
┌────────────────▼────────────────────────────┐
│               State Layer                   │
│   Zustand stores (4) with persist           │
│   questStore · progressStore                │
│   packStore  · settingsStore                │
└────────────────┬────────────────────────────┘
                 │ persisted via
┌────────────────▼────────────────────────────┐
│             Persistence Layer               │
│   AsyncStorage (device-only, no cloud)      │
│   Keys: questdeck-quests · questdeck-progress│
│         questdeck-packs  · questdeck-settings│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│               Data Layer (static)           │
│   src/data/quests/free.json  (100 quests)   │
│   src/data/moods.ts          (8 moods)      │
│   src/data/packs.ts          (pack registry)│
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│               Logic / Lib                   │
│   questSelector.ts  — pick 3 cards          │
│   xp.ts             — levels & streaks      │
│   feedback.ts       — sound + haptics       │
│   completeQuest.ts  — completion action     │
└─────────────────────────────────────────────┘
```

---

## Screen Flow

```
App start
  │
  ├─ onboardingSeen = false ──► OnboardingScreen (3 slides)
  │                                    │ Get Started / Skip
  │                                    ▼
  └─ onboardingSeen = true ───► HomeScreen
                                    │ tap mood button
                                    ▼
                               QuestRevealScreen (3 face-down cards)
                                    │ tap card → flip animation
                                    │ tap flipped card
                                    ▼
                               QuestDetailScreen
                                    │ Accept Quest
                                    ▼
                               CompletionScreen (mark done / skip)
                                    │ Done
                                    ▼
                               XP awarded + CelebrationOverlay
                                    │ Continue
                                    ▼
                               HomeScreen

HomeScreen ──► ProgressScreen  (⭐ icon)
          ──► PacksScreen      (📦 icon)
          ──► SettingsScreen   (⚙️ icon)
```

---

## Data Models

### Quest
```ts
type Quest = {
  id: string;                                        // unique, e.g. "free-001"
  title: string;
  description: string;
  category: string;
  moods: Mood[];                                     // which mood buttons show this quest
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  people: 'solo' | 'partner' | 'friends' | 'any';
  location: 'indoors' | 'outdoors' | 'any';
  xp: number;                                        // XP awarded on completion
  packId: string;                                    // 'free' or future paid pack id
  optionalTip?: string;
};
```

### Mood
```ts
type Mood =
  | 'bored' | 'at-home' | 'outside' | 'partner'
  | 'friends' | 'weekend' | 'creative' | 'need-reset';
```

### CompletedQuest
```ts
type CompletedQuest = {
  questId: string;
  completedAt: string;    // ISO timestamp — for ordering
  completedDate: string;  // local YYYY-MM-DD — for streak calculation
  xpAwarded: number;
};
```

### Pack
```ts
type Pack = {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  emoji: string;
  questCount: number;
};
```

### CompleteQuestResult
```ts
type CompleteQuestResult = {
  status: 'completed' | 'already_completed';
  xpAwarded: number;
  totalXpBefore: number;  totalXpAfter: number;
  levelBefore: number;    levelAfter: number;
  levelUp: boolean;
  streakBefore: number;   streakAfter: number;
  streakExtended: boolean;
};
```

---

## State Management

Four Zustand stores, all persisted to AsyncStorage:

| Store | Key | Contents |
|-------|-----|----------|
| `questStore` | `questdeck-quests` | `completedQuests[]`, `lastRevealedQuestIds[]` |
| `progressStore` | `questdeck-progress` | `totalXp`, `level`, `currentStreak`, `longestStreak`, `lastCompletedDate` |
| `packStore` | `questdeck-packs` | `unlockedPackIds[]` (default: `['free']`) |
| `settingsStore` | `questdeck-settings` | `soundEnabled`, `hapticsEnabled`, `onboardingSeen` |

All stores use a shared `jsonStorage` adapter (`src/lib/storage.ts`) that wraps AsyncStorage with JSON serialization.

---

## Quest Selection Algorithm

`src/lib/questSelector.ts` — picks 3 quest cards for a given mood:

```
1. Filter: mood matches + pack unlocked
2. Prefer uncompleted quests (fill 3 slots)
3. If < 3 uncompleted: fill remaining from completed (same mood)
4. If still < 3: broaden to all moods within unlocked packs
5. Return exactly 3 quests (or as many as available)
```

This ensures the user always sees cards, even after completing everything.

---

## XP & Level System

`src/lib/xp.ts`

| Level | Name | XP required |
|-------|------|-------------|
| 1 | Wanderer | 0 |
| 2 | Explorer | 100 |
| 3 | Adventurer | 250 |
| 4 | Quester | 500 |
| 5 | Seeker | 900 |
| 6 | Pathfinder | 1500 |
| 7 | Voyager | 2200 |
| 8 | Legend | 3000 |

XP per quest: defined per quest in JSON (typically 10–30 XP based on difficulty).

**Streak logic:** A streak increments when a quest is completed on a calendar day consecutive to the previous completion. Completing multiple quests in one day counts as one streak day.

---

## Feedback System

`src/lib/feedback.ts` — sound + haptics, both respecting user settings:

| Event | Sound | Haptic |
|-------|-------|--------|
| Card flip | — | Light impact |
| Quest accepted | — | Medium impact |
| Quest completed | `quest-complete.mp3` | Medium impact |
| Streak extended | `streak.mp3` | Heavy impact |
| Level up | `level-up.mp3` | Success notification |
| Already completed | — | Warning notification |

Sound uses `expo-audio` (`createAudioPlayer`, fire-and-forget with auto-cleanup).  
Haptics use `expo-haptics`. Both fail silently if hardware doesn't support them.

---

## Privacy & Data

- No network requests after install
- No analytics, crash reporting, or ad SDKs
- All data stored locally via AsyncStorage
- Uninstalling the app deletes all data
- No account, no login, no email required
