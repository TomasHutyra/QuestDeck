# QuestDeck — System Documentation

## Overview

QuestDeck is a privacy-first, offline-first Android app (Expo React Native + TypeScript).  
Users pick a mood, draw 3 random quest cards, choose one, complete it, and earn XP.  
There is no backend, no login, no analytics, and no network traffic after install.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                      UI Layer                       │
│   Screens (9) + Components (10)                     │
│   React Native + react-navigation (native stack)    │
└───────────────────┬─────────────────────────────────┘
                    │ reads / dispatches
┌───────────────────▼─────────────────────────────────┐
│                  State Layer                        │
│   Zustand stores (5) with persist middleware        │
│   questStore · progressStore · badgeStore           │
│   packStore  · settingsStore                        │
└───────────────────┬─────────────────────────────────┘
                    │ persisted via
┌───────────────────▼─────────────────────────────────┐
│               Persistence Layer                     │
│   AsyncStorage (device-only, no cloud)              │
│   questdeck-quests · questdeck-progress             │
│   questdeck-packs  · questdeck-settings             │
│   questdeck-badges                                  │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               Data Layer (static)                   │
│   src/data/quests/free.json  (100 quests)           │
│   src/data/badges/index.ts   (badge definitions)   │
│   src/data/moods.ts          (8 moods)              │
│   src/data/packs.ts          (pack registry)        │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│               Logic / Lib                           │
│   questSelector.ts    — pick 3 cards for a mood     │
│   xp.ts               — levels & streaks            │
│   feedback.ts         — sound + haptics             │
│   badges.ts           — badge condition evaluation  │
│   photos.ts           — camera / gallery access     │
│   notifications.ts    — expo-notifications wrapper  │
│   notificationPrompt.ts — when to show the prompt  │
│   storeReviewPrompt.ts  — when to show rate card   │
│   completeQuest.ts    — completion action           │
└─────────────────────────────────────────────────────┘
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
                                    │ tap card → flip
                                    │ tap flipped card
                                    ▼
                               QuestDetailScreen
                                    │ Accept Quest
                                    ▼
                               CompletionScreen
                                    │ Mark as done
                                    ▼
                               XP awarded + CelebrationOverlay(s)
                               [optional: NotificationPromptCard or StoreReviewPromptCard]
                               [optional: add memory photo]
                                    │ Back to Home
                                    ▼
                               HomeScreen

HomeScreen ──► ProgressScreen  (⭐ icon)
               └──► BadgeLogScreen (Badges tab)
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
  moods: Mood[];
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  people: 'solo' | 'partner' | 'friends' | 'any';
  location: 'indoors' | 'outdoors' | 'any';
  xp: number;
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
  completedDate: string;  // local YYYY-MM-DD — for streak logic
  xpAwarded: number;
  photoUri?: string;      // local file URI if user added a memory photo
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
  questId: string;
  xpAwarded: number;
  totalXpBefore: number;  totalXpAfter: number;
  levelBefore: number;    levelAfter: number;
  levelUp: boolean;
  streakBefore: number;   streakAfter: number;
  streakExtended: boolean;
  newlyUnlockedBadgeIds: string[];
};
```

---

## State Management

Five Zustand stores, all persisted to AsyncStorage:

| Store | Key | Contents |
|-------|-----|----------|
| `questStore` | `questdeck-quests` | `completedQuests[]`, `lastRevealedQuestIds[]`, `activeQuestId` |
| `progressStore` | `questdeck-progress` | `totalXp`, `level`, `currentStreak`, `longestStreak`, `lastCompletedDate` |
| `badgeStore` | `questdeck-badges` | `unlockedAt: Record<badgeId, ISO timestamp>` |
| `packStore` | `questdeck-packs` | `unlockedPackIds[]` (default: `['free']`) |
| `settingsStore` | `questdeck-settings` | see below |

**settingsStore fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `soundEnabled` | boolean | global sound toggle |
| `hapticsEnabled` | boolean | global haptics toggle |
| `reducedMotionEnabled` | boolean | disables animations |
| `onboardingSeen` | boolean | show onboarding once |
| `dailyReminderEnabled` | boolean | whether reminder is scheduled |
| `dailyReminderTime` | string (HH:MM) | scheduled reminder time |
| `notificationPromptDismissCount` | number | −1 = permanently suppressed |
| `notificationPromptDismissedAt` | string\|null | YYYY-MM-DD of last "Maybe later" |
| `notificationPromptLastShownAt` | string\|null | YYYY-MM-DD prompt was shown |
| `storeReviewPromptLastShownAt` | string\|null | YYYY-MM-DD review prompt shown |
| `storeReviewPromptDismissedAt` | string\|null | YYYY-MM-DD of last dismiss |
| `storeReviewPromptDismissCount` | number | number of dismissals |
| `storeReviewRequestedAt` | string\|null | ISO timestamp when user tapped Rate |
| `storeReviewCompletedQuestCountAtLastPrompt` | number\|null | quest count when shown |

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

**Streak logic:** A streak increments when a quest is completed on a calendar day consecutive to the previous completion. Multiple completions in one day count as one streak day.

---

## Badge System

`src/data/badges/index.ts` — badge definitions (`id`, `name`, `emoji`, `condition`).  
`src/lib/badges.ts` — evaluates badge conditions against the current store state.  
`src/data/badges/badgeImages.ts` — static `require()` registry for PNG badge images.  
`src/stores/badgeStore.ts` — persists `unlockedAt` timestamps per badge id.

Badge unlock happens inside `completeQuest.ts` on every successful completion. `newlyUnlockedBadgeIds` in `CompleteQuestResult` drives the badge celebration overlay.

---

## Feedback System

`src/lib/feedback.ts` — sound + haptics, respecting user settings:

| Event | Sound | Haptic |
|-------|-------|--------|
| Card flip | — | Light impact |
| Quest accepted | — | Medium impact |
| Quest completed | `quest-complete.mp3` | Medium impact |
| Streak extended | `streak.mp3` | Heavy impact |
| Level up | `level-up.mp3` | Success notification |
| Badge unlocked | — | Heavy impact |
| Already completed | — | Warning notification |

Sound uses `expo-audio` (`createAudioPlayer`, fire-and-forget with auto-cleanup).  
Haptics use `expo-haptics`. Both fail silently if hardware doesn't support them.

On a successful quest completion, `playQuestCompletedFeedback()` always fires first. Additional sounds (streak, level-up) layer on top.

---

## Celebration Overlays

`src/components/CelebrationOverlay.tsx` — four overlay types:

| Type | Animation | Confetti | Auto-dismiss |
|------|-----------|----------|-------------|
| `quest-complete` | fade + slide up | 20 particles | 1800 ms |
| `streak` | spring scale | 40 particles | 1800 ms |
| `level-up` | spring + overshoot | 40 particles | 1800 ms |
| `badge` | spring scale | 40 particles | 1800 ms |

**Sequencing in CompletionScreen:** primary overlay (level-up/streak/quest-complete) → badge overlay on dismiss. `badgeOverlayQueuedRef` prevents double-triggering. Badge overlay shows all newly unlocked badges: single badge gets large icon + name; multiple badges get a tile row (max 3 shown + "+N more").

---

## Notification System

`src/lib/notifications.ts` — wraps `expo-notifications`:
- `scheduleDailyReminder(time)` — cancels existing, schedules daily at HH:MM using `SchedulableTriggerInputTypes.DAILY`
- `cancelDailyReminder()` — cancels by identifier

`src/lib/notificationPrompt.ts` — controls when the in-app prompt appears:
- First completion with no reminder: always show
- After 1st dismiss: 3-day cooldown
- After 2nd+ dismiss: 7-day cooldown
- `dismissCount = −1`: permanently suppressed (user accepted)

`App.tsx` reschedules the daily reminder on startup (after store hydration) to recover from missed alarms. `plugins/withExactAlarm.js` adds `SCHEDULE_EXACT_ALARM` + `RECEIVE_BOOT_COMPLETED` to the Android manifest for reliable exact alarms on Android 12+.

---

## Store Review Prompt

`src/lib/storeReviewPrompt.ts` — controls when the rate card appears:
- Requires 5+ completed quests
- At most once per day; notification prompt takes priority (only one prompt per completion)
- Cooldowns: dismiss 1 → 14 days or 10 quests; dismiss 2 → 30 days or 20 quests; dismiss 3+ → 60 days
- Rate tap: opens `market://` with `https://` fallback; sets 90-day cooldown only if opening succeeded

---

## Memory Photos

`src/lib/photos.ts` — `takePhoto()` and `pickPhotoFromLibrary()` via `expo-image-picker`. Photos are copied to `documentDirectory/memories/` via `expo-file-system` and stored as `photoUri` on `CompletedQuest`. ProgressScreen shows 48×48 thumbnails; tap opens a full-screen modal.

---

## Privacy & Data

- No network requests after install
- No analytics, crash reporting, or ad SDKs
- All data stored locally via AsyncStorage
- Memory photos stored in app's private document directory
- Uninstalling the app deletes all data
- No account, no login, no email required
