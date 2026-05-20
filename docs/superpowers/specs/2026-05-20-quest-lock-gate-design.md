# Quest Lock Gate — Design Spec

**Date:** 2026-05-20  
**Status:** Approved

## Problem

Users can tap "I'll do this!" → "Mark as done" in seconds without doing the quest. This undermines streaks, badges, and the core premise of the app: put the phone down and go live.

## Solution

Require the phone screen to be locked (and off) for at least 60 seconds before "Mark as done" becomes available. The Completion screen guides the user to lock their phone, detects when they return, and either unlocks the button or gently asks them to go back out.

---

## UX Flow

```
QuestDetail: "I'll do this!" →

CompletionScreen [waiting]
  "Your quest has started.
   Put your phone away and go do it."
  Decky idle pose
  [Back to Home link — always visible]

  ↓ screen turns off (native) or app backgrounds (fallback)

[off-screen — recording duration]

  ↓ screen turns on / app returns to foreground

  if duration < 60s →

CompletionScreen [too-quick]
  "That was quick.
   Give it a little more real-world time."
  Decky playful pose
  Reset — wait for next lock cycle

  if duration ≥ 60s →

CompletionScreen [ready]
  "Mark as done ✓" button
  → existing completion flow (unchanged)
```

---

## State Machine

Local to `CompletionScreen`, active only while `result === null`.

```
waiting → (screenOff) → off-screen → (screenOn, Δt < 60s)  → too-quick → (screenOff) → off-screen → ...
                                    → (screenOn, Δt ≥ 60s)  → ready
```

**States:**

| State | What user sees |
|---|---|
| `waiting` | Quest title + "Put your phone away" message + Decky idle |
| `too-quick` | "That was quick. Give it a little more real-world time." + Decky thinking pose (new asset needed) |
| `ready` | "Mark as done ✓" button |

**Transitions:**
- `waiting` → `off-screen`: any `screenOff` event; record `screenOffAt = Date.now()`
- `too-quick` → `off-screen`: same (any subsequent `screenOff`)
- `off-screen` → `too-quick`: `screenOn` fires AND `Date.now() - screenOffAt < 60_000`
- `off-screen` → `ready`: `screenOn` fires AND `Date.now() - screenOffAt >= 60_000`
- `ready` → (completion): user taps "Mark as done" — existing `handleMarkDone` unchanged

The `LOCK_MINIMUM_MS = 60_000` constant lives in `src/hooks/useScreenState.ts`, easy to tune.

---

## Technical Architecture

### Detection: two layers

**Primary — native `ACTION_SCREEN_OFF` / `ACTION_SCREEN_ON` (Android)**

A small Expo Module written in Kotlin registers a `BroadcastReceiver` *dynamically* (required since Android 8+; manifest-declared receivers do not fire for these system broadcasts). The receiver emits `screenOff` and `screenOn` events to JavaScript via Expo's event emitter.

The receiver is registered in the module's `onActivityResumes` lifecycle and unregistered in `onActivityPauses`, so it never leaks.

**Fallback — React Native `AppState`**

When the native module is unavailable (shouldn't happen on Android, but guards against build issues), `AppState` `background` / `active` transitions serve as a proxy. Cannot distinguish screen-lock from app-switch, but still enforces the 60-second gate for honest users.

### Hook: `src/hooks/useScreenState.ts`

```ts
useScreenState(callbacks: {
  onScreenOff: () => void;
  onScreenOn: () => void;
}): void
```

- Tries native module first; falls back to AppState
- Attaches listeners on mount, removes on unmount
- No return value — pure side-effect hook

`CompletionScreen` calls this hook only while `result === null`. Cleanup is automatic on unmount (after completion or Back to Home).

### Local state in CompletionScreen

```ts
type LockState = 'waiting' | 'too-quick' | 'ready';

const [lockState, setLockState] = useState<LockState>('waiting');
const screenOffAt = useRef<number | null>(null);
```

No store changes. No persistence. State is discarded when the user navigates away.

---

## Files

| Action | File | Change |
|---|---|---|
| Create | `modules/ScreenState/index.ts` | JS interface to the native module |
| Create | `modules/ScreenState/android/src/main/java/expo/modules/screenstate/ScreenStateModule.kt` | Kotlin BroadcastReceiver + Expo Module |
| Create | `src/hooks/useScreenState.ts` | Hook: native → AppState fallback, callbacks |
| Modify | `src/screens/CompletionScreen.tsx` | Lock-state UI in `result === null` branch |
| Modify | `app.json` | Register `ScreenState` module |

---

## Out of Scope

- iOS: Android-only app, iOS detection not needed
- Persisting lock state across app restarts: if the app is killed mid-quest, the user starts over — acceptable
- Configurable threshold per quest (e.g., shorter for 5-min quests): constant 60s is simpler and consistent
- Any server-side verification: privacy-first, offline-first app
