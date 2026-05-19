# QuestDeck — Implementation Documentation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 + React Native 0.81 |
| Language | TypeScript (strict) |
| Navigation | `@react-navigation/native-stack` |
| State | Zustand 5 + `persist` middleware |
| Persistence | AsyncStorage via `jsonStorage` adapter |
| Sound | `expo-audio` (createAudioPlayer) |
| Haptics | `expo-haptics` |
| Notifications | `expo-notifications` |
| Photos | `expo-image-picker` + `expo-file-system` |
| Safe area | `react-native-safe-area-context` |
| Build | Gradle 8 / Kotlin 2.1 |
| Min Android | API 24 (Android 7.0 Nougat) |
| Package name | `com.BookdragonDev.QuestDeck` |

---

## Project Structure

```
QuestDeck/
├── App.tsx                        # Root: SafeAreaProvider + NavigationContainer
│                                  # Also reschedules daily reminder on startup
├── index.ts                       # Expo entry point
├── app.json                       # Expo config (package, version, icons, splash, plugins)
│
├── plugins/
│   └── withExactAlarm.js          # Config plugin: adds SCHEDULE_EXACT_ALARM +
│                                  # RECEIVE_BOOT_COMPLETED to AndroidManifest
│
├── assets/
│   ├── icon.png                   # App icon 1024×1024
│   ├── adaptive-icon.png          # Android adaptive icon foreground
│   ├── splash-icon.png            # Splash screen logo
│   ├── logo_header.png            # Pre-sized header logo (186×132, 3× density)
│   ├── decky/                     # Decky mascot PNGs (idle, wave, celebrate, empty, streak)
│   └── sounds/
│       ├── quest-complete.mp3
│       ├── streak.mp3
│       └── level-up.mp3
│
├── src/
│   ├── types/index.ts             # All shared TypeScript types
│   │
│   ├── data/
│   │   ├── quests/
│   │   │   ├── free.json          # 100 free quests
│   │   │   └── index.ts           # Aggregates all packs → allQuests[], questById{}
│   │   ├── badges/
│   │   │   ├── index.ts           # Badge definitions (id, name, emoji, condition fn)
│   │   │   └── badgeImages.ts     # Static require() registry for PNG badge images
│   │   ├── moods.ts               # 8 MoodMeta objects (id, label, emoji)
│   │   └── packs.ts               # Pack registry (id, name, isPremium, …)
│   │
│   ├── stores/
│   │   ├── questStore.ts          # completedQuests, lastRevealedQuestIds, activeQuestId
│   │   ├── progressStore.ts       # totalXp, level, streak, lastCompletedDate
│   │   ├── badgeStore.ts          # unlockedAt: Record<badgeId, ISO timestamp>
│   │   ├── packStore.ts           # unlockedPackIds
│   │   └── settingsStore.ts       # sound, haptics, reducedMotion, notifications,
│   │                              # store review prompt state
│   │
│   ├── lib/
│   │   ├── questSelector.ts       # Picks 3 quests for a mood
│   │   ├── xp.ts                  # Level thresholds, streak logic, todayLocalDate()
│   │   ├── feedback.ts            # Sound + haptic feedback per event
│   │   ├── badges.ts              # Evaluates badge conditions; getRecentlyUnlockedBadges()
│   │   ├── photos.ts              # takePhoto(), pickPhotoFromLibrary()
│   │   ├── notifications.ts       # scheduleDailyReminder(), cancelDailyReminder()
│   │   ├── notificationPrompt.ts  # shouldShowNotificationPrompt(), record* helpers
│   │   ├── storeReviewPrompt.ts   # shouldShowStoreReviewPrompt(), record* helpers,
│   │   │                          # openGooglePlayListing()
│   │   └── storage.ts             # AsyncStorage jsonStorage adapter + STORAGE_KEYS
│   │
│   ├── actions/
│   │   └── completeQuest.ts       # Quest completion: XP + streak + badge unlock + stores
│   │
│   ├── components/
│   │   ├── XPBar.tsx              # Level + XP progress bar
│   │   ├── MoodButton.tsx         # Single mood button in the 2×4 grid
│   │   ├── QuestCard.tsx          # Flippable card (face-down / face-up)
│   │   ├── Decky.tsx              # Pose-based mascot (idle/wave/celebrate/empty/streak)
│   │   ├── Confetti.tsx           # Animated confetti (count prop, native driver)
│   │   ├── CelebrationOverlay.tsx # quest-complete/streak/level-up/badge overlays
│   │   ├── NotificationPromptCard.tsx  # In-app daily reminder prompt card
│   │   ├── StoreReviewPromptCard.tsx   # In-app Google Play review prompt card
│   │   └── BadgeCard.tsx          # Single badge tile (locked/unlocked states)
│   │
│   ├── screens/
│   │   ├── OnboardingScreen.tsx   # 3-slide intro (shown once on first launch)
│   │   ├── HomeScreen.tsx         # Mood grid + XP bar + nav icons
│   │   ├── QuestRevealScreen.tsx  # 3 flippable quest cards
│   │   ├── QuestDetailScreen.tsx  # Full quest info + Accept button
│   │   ├── CompletionScreen.tsx   # Mark done + XP display + celebration + prompts + photo
│   │   ├── ProgressScreen.tsx     # Level, streaks, completed quest history + photos
│   │   ├── BadgeLogScreen.tsx     # All badges, locked/unlocked state, unlock dates
│   │   ├── PacksScreen.tsx        # Free + premium pack cards
│   │   └── SettingsScreen.tsx     # Sound / haptics / reduced motion toggles + reset
│   │
│   └── navigation/
│       └── RootStack.tsx          # Stack navigator + RootStackParamList types
│
├── scripts/
│   ├── validateQuests.ts          # Validates free.json structure (npm run validate:quests)
│   ├── validateBadges.ts          # Validates badge definitions (npm run validate:badges)
│   └── generateBadgeImages.js     # Generates badgeImages.ts registry (npm run codegen:badge-images)
│
├── __tests__/                     # Jest unit tests
│   ├── actions/
│   └── lib/
│
├── docs/
│   ├── SYSTEM.md                  # Architecture and data models
│   ├── IMPLEMENTATION.md          # This file
│   └── store/
│       ├── google-play-listing.md
│       ├── screenshot-script.md
│       └── privacy-policy.md
│
└── android/                       # Generated by expo prebuild (gitignored)
    └── app/
        ├── build.gradle           # namespace, applicationId, versionCode, signing config
        ├── questdeck.keystore     # Release signing key (never commit!)
        └── src/main/
            ├── AndroidManifest.xml
            └── java/com/BookdragonDev/QuestDeck/
```

---

## Development Commands

```bash
npx expo start              # Start Metro bundler
npx expo start --android    # Start + open on connected Android device
npx expo run:android        # Full native build + install on device
npx tsc --noEmit            # TypeScript type check
npm test                    # Run Jest tests
npm run validate:quests     # Validate free.json structure
npm run validate:badges     # Validate badge definitions
npm run codegen:badge-images # Regenerate badgeImages.ts after adding badge PNGs
```

---

## Adding a New Quest Pack

1. **Create the JSON file** `src/data/quests/adventure.json` — same schema as `free.json`, `packId: "adventure"`.

2. **Register in `src/data/quests/index.ts`**:
   ```ts
   import adventureQuests from './adventure.json';
   export const allQuests: Quest[] = [...freeQuests, ...adventureQuests] as Quest[];
   ```

3. **Register in `src/data/packs.ts`**:
   ```ts
   { id: 'adventure', name: 'Adventure Pack', isPremium: true, emoji: '🏔️', questCount: 25, ... }
   ```

4. **Validate**: `npm run validate:quests`

---

## Adding a New Badge

1. Add the badge definition to `src/data/badges/index.ts` with an `id`, `name`, `emoji`, and `condition` function.
2. Optionally add a PNG image to `assets/` and run `npm run codegen:badge-images` to register it.
3. Run `npm run validate:badges` to verify.

---

## AsyncStorage Keys

| Key | Store | Contents |
|-----|-------|----------|
| `questdeck-quests` | questStore | `completedQuests[]`, `lastRevealedQuestIds[]` |
| `questdeck-progress` | progressStore | XP, level, streaks, lastCompletedDate |
| `questdeck-badges` | badgeStore | `unlockedAt` record |
| `questdeck-packs` | packStore | `unlockedPackIds[]` |
| `questdeck-settings` | settingsStore | all settings and prompt state |

To reset all app data: **Settings → Reset all data**, or uninstall the app.

---

## Google Play Release Build

### Version bump

Version is managed in `app.json` (not manually in `build.gradle`):

```json
"version": "1.3.1",
"android": {
  "versionCode": 6
}
```

`versionCode` must be strictly higher than any previously uploaded version.

### Build steps

**1. Prebuild** (required when `app.json` plugins change):
```bash
npx expo prebuild --platform android
```
Signing config and keystore survive prebuild. `versionCode`/`versionName` are taken from `app.json`.

**2. Clear old outputs** (avoids stale cache):
```powershell
Remove-Item -Recurse -Force android/app/build/outputs/bundle
Remove-Item -Recurse -Force android/app/build/intermediates
```
Do NOT use `gradlew clean` — the clean task fails on CMake debug clean.

**3. Build the AAB**:
```bash
cd android && ./gradlew bundleRelease
```

Output: `android/app/build/outputs/bundle/release/app-release.aab`

**4. Upload to Google Play Console** → Production → Create new release → Upload AAB.

### Checklist before every release

- [ ] `versionCode` incremented in `app.json`
- [ ] `versionName` updated in `app.json`
- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes
- [ ] `npx expo prebuild --platform android` run if plugins changed
- [ ] `./gradlew bundleRelease` completes without errors
- [ ] Tested on physical device before promoting to production

---

## Signing

Keystore: `android/app/questdeck.keystore` (gitignored).  
Credentials: `android/gradle.properties` (gitignored).

**Back up the keystore.** If lost, you cannot publish updates to the same Play Store listing.

---

## Key Design Decisions

**No backend.** All state is local. Eliminates auth, GDPR complexity, server costs, and network failures. Trade-off: no cross-device sync.

**Static quest data in JSON.** New quests ship with app updates. Keeps the app fully offline. Trade-off: quest fixes require a Play Store update.

**Zustand over Redux.** Minimal boilerplate, built-in `persist`, direct store access outside React (`useXStore.getState()`) needed by `completeQuest.ts`.

**`completeQuest` as a plain function, not a hook.** Called once on press. Reads stores via `.getState()` to avoid stale closure issues.

**Confetti count prop.** `Confetti` accepts a `count` prop (default 20). Streak, level-up, and badge overlays use 40 for a bigger celebration.

**Startup notification reschedule.** `App.tsx` reschedules the daily reminder on every launch (after store hydration). Belt-and-suspenders against Android Doze mode / OEM restrictions dropping the alarm. `plugins/withExactAlarm.js` ensures `SCHEDULE_EXACT_ALARM` is declared for exact alarms on Android 12+.

**Pre-sized logo asset.** `logo_header.png` (186×132) is a pre-rendered 3× version of the brand logo. React Native's new architecture does not reliably scale large bitmaps in small containers.
