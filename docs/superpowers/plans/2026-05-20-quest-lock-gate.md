# Quest Lock Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent mindless "Mark as done" tapping by requiring the phone screen to be locked for at least 60 seconds before the completion button appears.

**Architecture:** A Kotlin `BroadcastReceiver` listens to `ACTION_SCREEN_OFF` / `ACTION_SCREEN_ON` system broadcasts and stores timestamps natively (safe against JS delivery delays). A `useScreenState` React hook wraps the native module (with AppState fallback) and calls `onScreenReturn(snapshot)` whenever the app returns to foreground. `CompletionScreen` uses the hook and evaluates `hasMetLockMinimum()` — a pure function in `src/lib/questLockGate.ts` — to transition between `waiting`, `too-quick`, and `ready` lock states. The receiver is registered on hook mount and unregistered on unmount; timestamps are reset on every new quest session.

**Tech Stack:** React Native 0.81.5, Expo SDK 54, New Architecture + interop layer, Kotlin, `NativeModules` / `NativeEventEmitter`, `AppState`, Jest 29

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/questLockGate.ts` | Pure functions: `LOCK_MINIMUM_MS`, `getLockDurationMs`, `hasMetLockMinimum` |
| Create | `__tests__/lib/questLockGate.test.ts` | 5 boundary + reset tests |
| Create | `android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStateModule.kt` | Kotlin BroadcastReceiver, native timestamp storage, JS event emission |
| Create | `android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStatePackage.kt` | ReactPackage registration |
| Modify | `android/app/src/main/java/com/BookdragonDev/QuestDeck/MainApplication.kt` | Add `ScreenStatePackage` to package list |
| Create | `src/lib/screenStateModule.ts` | TS interface to native module, `ScreenStateSnapshot` type |
| Create | `src/hooks/useScreenState.ts` | Hook: native + AppState fallback, snapshot on foreground return |
| Modify | `src/components/Decky.tsx` | Add `'thinking'` pose |
| Add | `assets/decky/thinking.png` | New Decky pose asset (provided separately) |
| Modify | `src/screens/CompletionScreen.tsx` | Lock gate states in `result === null` branch |

---

### Task 1: Pure lock gate logic + tests (TDD)

**Files:**
- Create: `src/lib/questLockGate.ts`
- Create: `__tests__/lib/questLockGate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/questLockGate.test.ts`:

```ts
import {
  LOCK_MINIMUM_MS,
  getLockDurationMs,
  hasMetLockMinimum,
} from '../../src/lib/questLockGate';

describe('getLockDurationMs', () => {
  it('returns the difference when both timestamps are present', () => {
    expect(getLockDurationMs(1000, 61000)).toBe(60000);
  });
  it('returns null when screenOffAt is null', () => {
    expect(getLockDurationMs(null, 61000)).toBeNull();
  });
  it('returns null when screenOnAt is null', () => {
    expect(getLockDurationMs(1000, null)).toBeNull();
  });
});

describe('hasMetLockMinimum', () => {
  it('returns true at exactly LOCK_MINIMUM_MS', () => {
    expect(hasMetLockMinimum(0, LOCK_MINIMUM_MS)).toBe(true);
  });
  it('returns false at LOCK_MINIMUM_MS - 1', () => {
    expect(hasMetLockMinimum(0, LOCK_MINIMUM_MS - 1)).toBe(false);
  });
  it('returns false when screenOffAt is null', () => {
    expect(hasMetLockMinimum(null, LOCK_MINIMUM_MS)).toBe(false);
  });
  it('returns false when screenOnAt is null', () => {
    expect(hasMetLockMinimum(0, null)).toBe(false);
  });
  it('returns false when both timestamps are null (state after session reset)', () => {
    expect(hasMetLockMinimum(null, null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```
npm test -- --testPathPattern="questLockGate"
```

Expected: `Cannot find module '../../src/lib/questLockGate'`

- [ ] **Step 3: Create the implementation**

Create `src/lib/questLockGate.ts`:

```ts
export const LOCK_MINIMUM_MS = 60_000;

export function getLockDurationMs(
  screenOffAt: number | null,
  screenOnAt: number | null,
): number | null {
  if (screenOffAt === null || screenOnAt === null) return null;
  return screenOnAt - screenOffAt;
}

export function hasMetLockMinimum(
  screenOffAt: number | null,
  screenOnAt: number | null,
): boolean {
  const duration = getLockDurationMs(screenOffAt, screenOnAt);
  return duration !== null && duration >= LOCK_MINIMUM_MS;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```
npm test -- --testPathPattern="questLockGate"
```

Expected: 8 tests pass.

- [ ] **Step 5: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```
git add src/lib/questLockGate.ts __tests__/lib/questLockGate.test.ts
git commit -m "feat(lock-gate): add pure questLockGate functions with boundary tests"
```

---

### Task 2: Kotlin native module + package + MainApplication

**Files:**
- Create: `android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStateModule.kt`
- Create: `android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStatePackage.kt`
- Modify: `android/app/src/main/java/com/BookdragonDev/QuestDeck/MainApplication.kt`

- [ ] **Step 1: Create ScreenStateModule.kt**

Create `android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStateModule.kt`:

```kotlin
package com.BookdragonDev.QuestDeck

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenStateModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "ScreenState"
    }

    private var lastScreenOffAt: Long? = null
    private var lastScreenOnAt: Long? = null
    private var receiver: BroadcastReceiver? = null

    override fun getName(): String = NAME

    private fun emit(event: String) {
        if (reactContext.hasActiveReactInstance()) {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(event, null)
        }
    }

    @ReactMethod
    fun startObserving(promise: Promise) {
        // Reset timestamps — prevents old timestamps from a previous quest unlocking a new one
        lastScreenOffAt = null
        lastScreenOnAt = null

        if (receiver != null) {
            promise.resolve(true)
            return
        }

        val filter = IntentFilter().apply {
            addAction(Intent.ACTION_SCREEN_OFF)
            addAction(Intent.ACTION_SCREEN_ON)
        }

        receiver = object : BroadcastReceiver() {
            override fun onReceive(context: Context, intent: Intent) {
                when (intent.action) {
                    Intent.ACTION_SCREEN_OFF -> {
                        lastScreenOffAt = System.currentTimeMillis()
                        emit("screenOff")
                    }
                    Intent.ACTION_SCREEN_ON -> {
                        lastScreenOnAt = System.currentTimeMillis()
                        emit("screenOn")
                    }
                }
            }
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(receiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            reactContext.registerReceiver(receiver, filter)
        }

        promise.resolve(true)
    }

    @ReactMethod
    fun stopObserving(promise: Promise) {
        receiver?.let {
            try {
                reactContext.unregisterReceiver(it)
            } catch (_: IllegalArgumentException) {
                // Already unregistered — safe to ignore
            }
            receiver = null
        }
        promise.resolve(null)
    }

    @ReactMethod
    fun getScreenStateSnapshot(promise: Promise) {
        val map = Arguments.createMap().apply {
            val off = lastScreenOffAt
            val on = lastScreenOnAt
            if (off != null) putDouble("lastScreenOffAt", off.toDouble()) else putNull("lastScreenOffAt")
            if (on != null) putDouble("lastScreenOnAt", on.toDouble()) else putNull("lastScreenOnAt")
            putBoolean("detectorAvailable", true)
        }
        promise.resolve(map)
    }

    // Required stubs for NativeEventEmitter compatibility
    @ReactMethod
    fun addListener(eventName: String) {}

    @ReactMethod
    fun removeListeners(count: Int) {}
}
```

- [ ] **Step 2: Create ScreenStatePackage.kt**

Create `android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStatePackage.kt`:

```kotlin
package com.BookdragonDev.QuestDeck

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ScreenStatePackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext,
    ): List<NativeModule> = listOf(ScreenStateModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext,
    ): List<ViewManager<*, *>> = emptyList()
}
```

- [ ] **Step 3: Register in MainApplication.kt**

In `android/app/src/main/java/com/BookdragonDev/QuestDeck/MainApplication.kt`, replace:

```kotlin
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Packages that cannot be autolinked yet can be added manually here, for example:
              // add(MyReactNativePackage())
            }
```

With:

```kotlin
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              add(ScreenStatePackage())
            }
```

- [ ] **Step 4: Type-check (TS only — Kotlin is verified at build time)**

```
npx tsc --noEmit
```

Expected: no errors (TypeScript doesn't touch Kotlin files).

- [ ] **Step 5: Commit**

```
git add android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStateModule.kt
git add android/app/src/main/java/com/BookdragonDev/QuestDeck/ScreenStatePackage.kt
git add android/app/src/main/java/com/BookdragonDev/QuestDeck/MainApplication.kt
git commit -m "feat(lock-gate): add ScreenState native module with BroadcastReceiver and timestamp storage"
```

---

### Task 3: JS interface to native module

**Files:**
- Create: `src/lib/screenStateModule.ts`

- [ ] **Step 1: Create the module interface**

Create `src/lib/screenStateModule.ts`:

```ts
import { NativeModules, NativeEventEmitter } from 'react-native';

export type ScreenStateSnapshot = {
  lastScreenOffAt: number | null;
  lastScreenOnAt: number | null;
  detectorAvailable: boolean;
};

const NativeScreenState = NativeModules.ScreenState as {
  startObserving(): Promise<boolean>;
  stopObserving(): Promise<null>;
  getScreenStateSnapshot(): Promise<ScreenStateSnapshot>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
} | undefined;

export const detectorAvailable = !!NativeScreenState;

export function startObserving(): Promise<void> {
  return NativeScreenState ? NativeScreenState.startObserving().then(() => undefined) : Promise.resolve();
}

export function stopObserving(): Promise<void> {
  return NativeScreenState ? NativeScreenState.stopObserving().then(() => undefined) : Promise.resolve();
}

export async function getScreenStateSnapshot(): Promise<ScreenStateSnapshot> {
  if (NativeScreenState) {
    return NativeScreenState.getScreenStateSnapshot();
  }
  return { lastScreenOffAt: null, lastScreenOnAt: null, detectorAvailable: false };
}

export function createScreenStateEmitter(): NativeEventEmitter | null {
  return NativeScreenState ? new NativeEventEmitter(NativeScreenState as never) : null;
}
```

Note: `as never` on the NativeEventEmitter constructor is required because `NativeEventEmitter` expects an `EventEmitter` type that React Native doesn't export cleanly — this cast is the standard workaround.

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/lib/screenStateModule.ts
git commit -m "feat(lock-gate): add screenStateModule TS interface with ScreenStateSnapshot type"
```

---

### Task 4: useScreenState hook

**Files:**
- Create: `src/hooks/useScreenState.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useScreenState.ts`:

```ts
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import {
  ScreenStateSnapshot,
  detectorAvailable,
  startObserving,
  stopObserving,
  getScreenStateSnapshot,
  createScreenStateEmitter,
} from '../lib/screenStateModule';

type ScreenStateCallbacks = {
  onScreenOff?: () => void;
  onScreenReturn: (snapshot: ScreenStateSnapshot) => void;
};

export function useScreenState({ onScreenOff, onScreenReturn }: ScreenStateCallbacks): void {
  const callbacksRef = useRef({ onScreenOff, onScreenReturn });
  callbacksRef.current = { onScreenOff, onScreenReturn };

  useEffect(() => {
    let mounted = true;
    const subs: Array<{ remove(): void }> = [];

    // Reset native timestamps for this quest session.
    // Prevents timestamps from a previous quest unlocking the current one.
    void startObserving();

    if (detectorAvailable) {
      const emitter = createScreenStateEmitter();
      if (emitter) {
        subs.push(
          emitter.addListener('screenOff', () => {
            callbacksRef.current.onScreenOff?.();
          }),
        );
      }

      // AppState active is authoritative: always call snapshot on foreground return.
      // Native 'screenOn' event is best-effort and may be delayed; AppState is reliable.
      subs.push(
        AppState.addEventListener('change', async (state: AppStateStatus) => {
          if (state === 'active' && mounted) {
            const snapshot = await getScreenStateSnapshot();
            callbacksRef.current.onScreenReturn(snapshot);
          }
        }),
      );
    } else {
      // Fallback: AppState only — cannot distinguish screen-lock from app-switch.
      let lastBackgroundAt: number | null = null;

      subs.push(
        AppState.addEventListener('change', async (state: AppStateStatus) => {
          if (state === 'background') {
            lastBackgroundAt = Date.now();
            callbacksRef.current.onScreenOff?.();
          } else if (state === 'active' && mounted) {
            const snapshot: ScreenStateSnapshot = {
              lastScreenOffAt: lastBackgroundAt,
              lastScreenOnAt: Date.now(),
              detectorAvailable: false,
            };
            callbacksRef.current.onScreenReturn(snapshot);
          }
        }),
      );
    }

    return () => {
      mounted = false;
      subs.forEach((s) => s.remove());
      void stopObserving();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/hooks/useScreenState.ts
git commit -m "feat(lock-gate): add useScreenState hook with native detector and AppState fallback"
```

---

### Task 5: Decky thinking pose

**Files:**
- Modify: `src/components/Decky.tsx`
- Add: `assets/decky/thinking.png` (provide this PNG asset before this step)

- [ ] **Step 1: Add the thinking PNG asset**

Place the `thinking.png` file in `assets/decky/thinking.png`. This is a new Decky pose — a character with a hand on chin or a questioning expression, suitable for "That was quick, try again."

- [ ] **Step 2: Update Decky.tsx**

In `src/components/Decky.tsx`, replace the entire file:

```tsx
import React from 'react';
import { Image } from 'react-native';

export type DeckyPose = 'idle' | 'wave' | 'celebrate' | 'empty' | 'streak' | 'thinking';

type Props = {
  pose: DeckyPose;
  size?: number;
};

const POSE_ASSET: Record<DeckyPose, ReturnType<typeof require>> = {
  idle:      require('../../assets/decky/idle.png'),
  wave:      require('../../assets/decky/wave.png'),
  celebrate: require('../../assets/decky/celebrate.png'),
  empty:     require('../../assets/decky/empty.png'),
  streak:    require('../../assets/decky/streak.png'),
  thinking:  require('../../assets/decky/thinking.png'),
};

export function Decky({ pose, size = 64 }: Props) {
  return (
    <Image
      source={POSE_ASSET[pose]}
      style={{ width: size, height: Math.round(size * 1.4) }}
      resizeMode="contain"
    />
  );
}
```

- [ ] **Step 3: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```
npm test
```

Expected: all existing tests pass.

- [ ] **Step 5: Commit**

```
git add src/components/Decky.tsx assets/decky/thinking.png
git commit -m "feat(decky): add thinking pose for lock gate too-quick state"
```

---

### Task 6: CompletionScreen lock gate UI

**Files:**
- Modify: `src/screens/CompletionScreen.tsx`

- [ ] **Step 1: Add imports**

In `src/screens/CompletionScreen.tsx`, add these two import lines after the existing imports:

```ts
import { useScreenState } from '../hooks/useScreenState';
import { hasMetLockMinimum } from '../lib/questLockGate';
```

- [ ] **Step 2: Add lockState and hook call**

Inside `CompletionScreen`, after the existing `useState` declarations (after line `const [photoUri, setPhotoUri] = useState<string | null>(null);`), add:

```ts
  const [lockState, setLockState] = useState<'waiting' | 'too-quick' | 'ready'>('waiting');

  useScreenState({
    onScreenReturn: (snapshot) => {
      if (result !== null) return; // quest already completed — ignore
      if (snapshot.lastScreenOffAt === null) return; // no lock happened yet — ignore
      if (hasMetLockMinimum(snapshot.lastScreenOffAt, snapshot.lastScreenOnAt)) {
        setLockState('ready');
      } else {
        setLockState('too-quick');
      }
    },
  });
```

- [ ] **Step 3: Replace the result === null render branch**

Find and replace the entire `if (result === null)` block (currently lines 227–242):

**Remove:**
```tsx
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
```

**Add:**
```tsx
  if (result === null) {
    if (lockState === 'waiting') {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Decky pose="idle" size={80} />
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDesc}>Your quest has started.</Text>
            <Text style={styles.questDesc}>Put your phone away and go do it.</Text>
            <TouchableOpacity style={styles.backLink} onPress={handleBackToHome}>
              <Text style={styles.backLinkText}>← Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    if (lockState === 'too-quick') {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.center}>
            <Decky pose="thinking" size={80} />
            <Text style={styles.questTitle}>{quest.title}</Text>
            <Text style={styles.questDesc}>That was quick.</Text>
            <Text style={styles.questDesc}>Give it a little more real-world time.</Text>
            <TouchableOpacity style={styles.backLink} onPress={handleBackToHome}>
              <Text style={styles.backLinkText}>← Back to Home</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    // lockState === 'ready'
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.questTitle}>{quest.title}</Text>
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
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Run full test suite**

```
npm test
```

Expected: all tests pass. (No new tests for CompletionScreen — the lock gate logic is covered by `questLockGate.test.ts` and the hook is not easily unit-tested without a running native module.)

- [ ] **Step 6: Commit**

```
git add src/screens/CompletionScreen.tsx
git commit -m "feat(lock-gate): add lock gate states to CompletionScreen — waiting, too-quick, ready"
```

---

### Task 7: Final verification

- [ ] **Step 1: Full type-check**

```
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Full test suite**

```
npm test
```

Expected: all tests pass.

- [ ] **Step 3: Validate data**

```
npm run validate:quests
npm run validate:badges
```

Expected: no validation errors.

- [ ] **Step 4: Build and manual QA**

Build and run on a device (`npx expo run:android`), then verify:

| Scenario | Expected result |
|---|---|
| Tap "I'll do this!" — stay in app, don't lock | `waiting` state: Decky idle + "Put your phone away" |
| Lock phone for < 60s, return | `too-quick` state: Decky thinking + "That was quick" |
| Lock phone for ≥ 60s, return | `ready` state: "Mark as done ✓" button appears |
| Switch to another app for ≥ 60s (native detector active) | Does NOT unlock — screen never turned off |
| Switch to another app for ≥ 60s (fallback only) | Unlocks — acceptable limitation of AppState fallback |
| Tap "Back to Home" from any lock state | Returns to Home; coming back starts lock gate over from `waiting` |
| Complete quest after unlock | Existing XP / streak / badge celebration unchanged |
| Complete a first quest (unlocks `first_quest` badge) | Badge celebration overlay fires as before |
| Start two quests in a row — lock ≥ 60s on second quest only | First quest's timestamps are reset; only second quest's lock counts |

- [ ] **Step 5: Commit any smoke-test fixes**

```
git status
# if clean: nothing to do
# if fixes needed:
git add <changed files>
git commit -m "fix: smoke-test corrections for lock gate"
```
