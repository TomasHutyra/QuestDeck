# QuestDeck — Sounds, Haptics & Celebrations Design Spec

**Date:** 2026-05-12
**Platform:** Android-first (Expo React Native + TypeScript)
**Status:** Approved

---

## Overview

Add a lightweight sensory feedback layer to QuestDeck: haptic responses on key interactions, simple celebration animations on completion events, and optional sound playback. The feature must be tasteful — no loud sounds, no blocking animations, no interruption to normal navigation.

**Constraints:**
- No backend, login, analytics, payments, AI, or notifications.
- Sound is opt-in (default off) to avoid surprising users in public.
- Haptics and animations ship in v1. Sound is wired only if real `.mp3` files are present.
- `feedback.ts` is the **only** file that imports haptics or audio libraries.

---

## New and Modified Units

| File | Status | Role |
|---|---|---|
| `src/stores/settingsStore.ts` | **Create** | Persisted toggles: sound, haptics, reducedMotion |
| `src/lib/feedback.ts` | **Create** | Only file importing expo-haptics/expo-audio. All feedback functions. |
| `src/components/CelebrationOverlay.tsx` | **Create** | Animated celebration overlay; respects reducedMotion |
| `src/screens/SettingsScreen.tsx` | **Create** | Three toggle rows for user preferences |
| `src/types/index.ts` | **Modify** | Replace `CompleteQuestResult` with richer flat struct |
| `src/actions/completeQuest.ts` | **Modify** | Return before/after diff in result |
| `src/navigation/RootStack.tsx` | **Modify** | Add `Settings` route |
| `src/screens/HomeScreen.tsx` | **Modify** | Add ⚙️ icon → SettingsScreen |
| `src/screens/QuestRevealScreen.tsx` | **Modify** | Call `playCardRevealFeedback()` on card flip |
| `src/screens/QuestDetailScreen.tsx` | **Modify** | Call `playQuestAcceptedFeedback()` on CTA press |
| `src/screens/CompletionScreen.tsx` | **Modify** | Call feedback + show CelebrationOverlay |
| `__tests__/actions/completeQuest.test.ts` | **Modify** | Update assertions for new `CompleteQuestResult` shape |

---

## settingsStore (`src/stores/settingsStore.ts`)

```ts
type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotionEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotionEnabled: (v: boolean) => void;
};
```

**Defaults:**
```ts
soundEnabled: false        // opt-in — sound can surprise users in public
hapticsEnabled: true       // subtle, safe default
reducedMotionEnabled: false
```

Persisted via Zustand `persist` + `createJSONStorage(() => AsyncStorage)`, identical pattern to `progressStore`, `questStore`, and `packStore`. Storage key: `questdeck-settings`.

---

## CompleteQuestResult Type (`src/types/index.ts`)

Replace the current discriminated union with a flat struct. The `already_completed` spelling (underscore) is preserved for consistency with existing code.

```ts
type CompleteQuestResult = {
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

For `already_completed`, all numeric fields are 0 and all boolean fields are `false`. No optional fields — always a complete object.

---

## completeQuest Action (`src/actions/completeQuest.ts`)

Before mutating stores, capture:
- `totalXpBefore` from `progressStore.totalXp`
- `levelBefore` from `progressStore.level`
- `streakBefore` from `progressStore.currentStreak`

After mutation, compute:
- `levelUp = levelAfter > levelBefore`
- `streakExtended = streakAfter > streakBefore`

Return the full `CompleteQuestResult` in both the `completed` and `already_completed` paths.

For `already_completed`:
```ts
{
  status: 'already_completed',
  questId: quest.id,
  xpAwarded: 0,
  totalXpBefore: totalXp, totalXpAfter: totalXp,
  levelBefore: level, levelAfter: level,
  levelUp: false,
  streakBefore: currentStreak, streakAfter: currentStreak,
  streakExtended: false,
}
```

---

## feedback.ts (`src/lib/feedback.ts`)

The **only** file in the codebase that imports `expo-haptics` or any audio library.

### Sound strategy

Sound files are **not bundled in this feature**. In React Native/Expo, `require()` for a missing static asset fails at bundle time — a `try/catch` does not protect against this. Therefore:

- If no `.mp3` files exist in `assets/sounds/`, all sound calls are no-ops.
- When real sound files are added, wire them up here. Until then, the `playSound` helper returns immediately.
- Add a single `// TODO: wire sound — drop .mp3 files into assets/sounds/ and implement playSound()` comment.

### Haptic mapping

| Function | `expo-haptics` call | Sound (when wired) |
|---|---|---|
| `playCardRevealFeedback()` | `impactAsync(ImpactFeedbackStyle.Light)` | `card-flip.mp3` |
| `playQuestAcceptedFeedback()` | `impactAsync(ImpactFeedbackStyle.Medium)` | `quest-accepted.mp3` |
| `playQuestCompletedFeedback()` | `impactAsync(ImpactFeedbackStyle.Medium)` | `quest-complete.mp3` |
| `playStreakExtendedFeedback()` | `impactAsync(ImpactFeedbackStyle.Heavy)` | `streak.mp3` |
| `playLevelUpFeedback()` | `notificationAsync(NotificationFeedbackType.Success)` | `level-up.mp3` |
| `playAlreadyCompletedFeedback()` | `notificationAsync(NotificationFeedbackType.Warning)` | *(no sound)* |

### Guard logic (same for all functions)

```ts
export async function playCardRevealFeedback(): Promise<void> {
  const { hapticsEnabled, soundEnabled } = useSettingsStore.getState();
  if (hapticsEnabled) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
  if (soundEnabled) {
    // TODO: wire sound
  }
}
```

All haptics errors are swallowed silently — a device that does not support haptics should never crash the app.

### expo-audio compatibility

If `expo-audio` installs and works cleanly against SDK 54, implement `playSound(file)` using it. If there is any dependency conflict or runtime incompatibility, leave sound as a no-op and do not block the haptics/animation work.

---

## CelebrationOverlay (`src/components/CelebrationOverlay.tsx`)

### Props

```ts
type CelebrationOverlayProps = {
  type: 'quest-complete' | 'streak' | 'level-up';
  visible: boolean;
  xpAwarded: number;
  newStreak: number;
  newLevel: number;
};
```

### Positioning

- `position: 'absolute'`, covering the screen with `top/left/right/bottom: 0`
- `pointerEvents="none"` — never intercepts touch
- Rendered inside `CompletionScreen`, always present in the component tree; `visible` controls opacity

### Celebration priority

CompletionScreen selects the overlay type using this priority:

1. **level-up** — `result.levelUp === true`
2. **streak** — `result.streakExtended === true` (and no level-up)
3. **quest-complete** — completed, no level-up, no streak extension
4. **no overlay** — `already_completed`

### Animations

All animations use `React Native Animated` API only — no external animation library.

| Type | Animation |
|---|---|
| `quest-complete` | XP badge fades up: opacity 0→1, translateY +10→0 over 400ms |
| `streak` | Streak badge scale spring: 0.6→1.0, `useNativeDriver`, spring config `{ damping: 10, stiffness: 150 }` |
| `level-up` | Level message: opacity 0→1 + scale 0.85→1.0 over 450ms |

Auto-dismissed after **1200ms** via `setTimeout`. Animation starts when `visible` becomes `true`.

### reducedMotionEnabled

If `reducedMotionEnabled` is `true`: skip all `Animated` calls. Render the content at full opacity immediately. Content is identical, no motion.

---

## Settings Screen (`src/screens/SettingsScreen.tsx`)

Accessible via ⚙️ icon in HomeScreen header (right side, next to ⭐ and 📦). Back button returns to HomeScreen.

Three rows:

```
Sound effects          [Switch]
Haptic feedback        [Switch]
Reduced motion         [Switch]
```

Each row uses React Native `Switch`. Reads from and writes to `settingsStore`. No external library required.

---

## Navigation (`src/navigation/RootStack.tsx`)

Add `Settings: undefined` to `RootStackParamList`. The screen is pushed from HomeScreen and popped with the default back button.

---

## Feedback Trigger Points

### QuestRevealScreen

- On card flip (when a face-down card is tapped): call `playCardRevealFeedback()`.
- Guard with a ref or index check so the sound/haptic does not re-fire on re-render.

### QuestDetailScreen

- On "I'll do this!" CTA press: call `playQuestAcceptedFeedback()`.
- Call once — inside the `onPress` handler, not in a `useEffect`.

### CompletionScreen

- After `completeQuest(quest)` returns:
  - `already_completed` → `playAlreadyCompletedFeedback()`
  - `completed` + `levelUp` → `playLevelUpFeedback()`
  - `completed` + `streakExtended` (no levelUp) → `playStreakExtendedFeedback()`
  - `completed` only → `playQuestCompletedFeedback()`
- Guard with a ref (e.g. `hasPlayedRef`) so feedback does not replay on re-render.
- Set `CelebrationOverlay` `visible={true}` at the same moment feedback fires.

---

## Test Updates (`__tests__/actions/completeQuest.test.ts`)

The existing assertions `expect(result).toEqual({ status: 'completed', xpAwarded: 10 })` and `expect(result).toEqual({ status: 'already_completed' })` will break because the result shape is now a full struct.

Update to assert:
```ts
expect(result.status).toBe('completed');
expect(result.xpAwarded).toBe(10);
expect(result.levelUp).toBe(false);    // at 10 XP, no level-up
expect(result.streakExtended).toBe(true); // first completion extends streak
```

Add new tests for `levelUp: true` and `streakExtended: true` scenarios.

---

## UX Constraints

- No animation runs longer than 450ms.
- CelebrationOverlay auto-dismisses after 1200ms.
- `pointerEvents="none"` on overlay — "Back to Home" button is always reachable.
- Sound is off by default — users opt in from Settings.
- Haptics are on by default but off on devices that do not support them (swallowed silently).
- `reducedMotionEnabled` shows static content with no motion.
