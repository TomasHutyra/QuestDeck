# Quest Lock Gate — Design Spec

**Date:** 2026-05-20  
**Status:** Approved (revised after ChatGPT technical review)

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

[off-screen — recording duration natively]

  ↓ screen turns on / app returns to foreground
  ↓ JS calls getScreenStateSnapshot()

  if duration < 60s →

CompletionScreen [too-quick]
  "That was quick.
   Give it a little more real-world time."
  Decky thinking pose (new asset needed)
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
waiting → (screenOff) → off-screen → (screenOn + snapshot, Δt < 60s)  → too-quick → (screenOff) → off-screen → ...
                                    → (screenOn + snapshot, Δt ≥ 60s)  → ready
```

**States:**

| State | What user sees |
|---|---|
| `waiting` | Quest title + "Put your phone away" message + Decky idle |
| `too-quick` | "That was quick. Give it a little more real-world time." + Decky thinking |
| `ready` | "Mark as done ✓" button |

**Transitions:**
- `waiting` / `too-quick` → `off-screen`: any `screenOff` event
- `off-screen` → `too-quick` or `ready`: `screenOn` event fires → JS calls `getScreenStateSnapshot()` → evaluates `hasMetLockMinimum()`
- `ready` → (completion): user taps "Mark as done" — existing `handleMarkDone` unchanged

**Eligibility for Mark as done** (all must be true):
1. `lastScreenOffAt` is not null
2. `lastScreenOnAt` is not null
3. `lastScreenOnAt - lastScreenOffAt >= LOCK_MINIMUM_MS`
4. App is active on CompletionScreen

**Back to Home:**
- Unregisters the receiver immediately
- Clears all local lock state
- Navigates to Home via `clearActiveAndRevealed()` + `navigation.reset()`
- If user navigates back to CompletionScreen via another path, the lock gate starts over from `waiting`

---

## Technical Architecture

### Detection: two layers

**Primary — native `ACTION_SCREEN_OFF` / `ACTION_SCREEN_ON` (Android)**

A small Expo Module in Kotlin registers a `BroadcastReceiver` *dynamically* (required since Android 8+; manifest-declared receivers do not fire for these system broadcasts). On Android 13+ (API 33+), `registerReceiver` requires an explicit `RECEIVER_NOT_EXPORTED` flag — the module handles this with a version check.

**Receiver lifetime is tied to lock gate active state**, not activity lifecycle:
- Register: when `useScreenState` hook mounts (CompletionScreen enters lock-gate flow)
- Unregister: when `useScreenState` hook unmounts (CompletionScreen unmounts, Back to Home tapped, or quest completed)
- The receiver stays registered while the app is backgrounded/locked — this is intentional and correct

`ACTION_SCREEN_ON` may fire while the activity is still transitioning. Native timestamps avoid relying on JS event delivery timing.

**Native module stores timestamps natively:**
- On `ACTION_SCREEN_OFF`: records `lastScreenOffAt = System.currentTimeMillis()`
- On `ACTION_SCREEN_ON`: records `lastScreenOnAt = System.currentTimeMillis()`
- Optionally emits JS events for real-time UI response (best-effort)

**Snapshot API:**
```ts
getScreenStateSnapshot(): Promise<{
  lastScreenOffAt: number | null;  // epoch ms
  lastScreenOnAt: number | null;   // epoch ms
  detectorAvailable: boolean;
}>
```

JS calls this on `AppState` → `active` transition to read authoritative timestamps, bypassing any event delivery delays.

**Fallback — React Native `AppState`**

When `detectorAvailable` is false (build issue, device incompatibility): `AppState` `background` / `active` transitions serve as a proxy. Cannot distinguish screen-lock from app-switch, but still enforces the 60-second gate for honest users.

| What user does | AppState | Native ACTION_SCREEN_OFF |
|---|---|---|
| Presses lock button | background ✓ | fires ✓ |
| Screen times out | background ✓ | fires ✓ |
| Presses home button | background ✓ | does NOT fire |
| Switches to another app | background ✓ | does NOT fire |

### Pure logic: `src/lib/questLockGate.ts`

```ts
export const LOCK_MINIMUM_MS = 60_000;

export function getLockDurationMs(
  screenOffAt: number | null,
  screenOnAt: number | null,
): number | null

export function hasMetLockMinimum(
  screenOffAt: number | null,
  screenOnAt: number | null,
): boolean
```

**Tests (`__tests__/lib/questLockGate.test.ts`):**
- 60_000 ms qualifies → true
- 59_999 ms does not qualify → false
- null `screenOffAt` does not qualify → false
- null `screenOnAt` does not qualify → false

### Hook: `src/hooks/useScreenState.ts`

```ts
useScreenState(callbacks: {
  onScreenOff: () => void;
  onScreenOn: () => void;
}): void
```

1. On mount: starts native module receiver (or registers AppState listener as fallback)
2. On `screenOn` / AppState `active`: calls `getScreenStateSnapshot()`, delivers timestamps via callback
3. On unmount: unregisters receiver / AppState listener

`CompletionScreen` calls this hook only while `result === null`.

### Local state in CompletionScreen

```ts
type LockState = 'waiting' | 'too-quick' | 'ready';

const [lockState, setLockState] = useState<LockState>('waiting');
```

No store changes. No persistence. State is discarded when the user navigates away.

---

## Files

| Action | File | Change |
|---|---|---|
| Create | `modules/ScreenState/index.ts` | JS interface + `getScreenStateSnapshot()` |
| Create | `modules/ScreenState/android/src/main/java/expo/modules/screenstate/ScreenStateModule.kt` | Kotlin: BroadcastReceiver, timestamp storage, event emission, API 33+ flags |
| Create | `src/lib/questLockGate.ts` | Pure functions: `LOCK_MINIMUM_MS`, `getLockDurationMs`, `hasMetLockMinimum` |
| Create | `__tests__/lib/questLockGate.test.ts` | 4 boundary tests |
| Create | `src/hooks/useScreenState.ts` | Hook: native → AppState fallback, snapshot on return |
| Modify | `src/screens/CompletionScreen.tsx` | Lock-state UI in `result === null` branch |
| Modify | `app.json` | Register `ScreenState` module |

---

## Manual QA Checklist

- Tap "I'll do this!" and stay in app → no Mark as done button visible
- Lock phone for < 60s → "That was quick. Give it a little more real-world time."
- Lock phone for ≥ 60s → "Mark as done ✓" button appears
- Switch to another app for ≥ 60s (native detector available) → does NOT count, no button
- Switch to another app for ≥ 60s (fallback mode only) → counts (acceptable limitation)
- "Back to Home" at any lock state clears session; returning to CompletionScreen restarts from `waiting`
- Completing quest: existing XP / streak / badge celebration flow works unchanged

---

## Verification Commands

```
npx tsc --noEmit
npm test
npm run validate:quests
npm run validate:badges
```

---

## Out of Scope

- iOS: Android-only app
- Persisting lock state across app restarts: user starts over — acceptable
- Configurable threshold per quest: constant 60s is consistent
- Backend, login, analytics, GPS, required photos, social verification, punitive copy, daily reward limits
