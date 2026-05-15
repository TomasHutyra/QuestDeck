# User Testing Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish QuestDeck for first real-user testing: onboarding, icon/splash branding, 100 free quests, and UI empty-state improvements.

**Architecture:** All changes are local — no new native modules, no backend. Onboarding state lives in the existing `settingsStore` (persisted via AsyncStorage). Quest data stays in `free.json`. Navigation wires onboarding as a conditional initial route.

**Tech Stack:** Expo 54, React Native, TypeScript, Zustand, `react-native-safe-area-context`

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/stores/settingsStore.ts` | Modify | Add `onboardingSeen` field |
| `src/navigation/RootStack.tsx` | Modify | Add `Onboarding` route, set conditional `initialRouteName` |
| `src/screens/OnboardingScreen.tsx` | **Create** | 3-slide onboarding UI |
| `src/data/quests/free.json` | Modify | Expand from 38 → 100 quests |
| `src/screens/ProgressScreen.tsx` | Modify | Improve empty state |
| `src/screens/PacksScreen.tsx` | Modify | Visual polish for Coming Soon packs |
| `app.json` | Modify | Brand colors on splash/icon backgrounds |

---

### Task 1: Add `onboardingSeen` to settingsStore

**Files:**
- Modify: `src/stores/settingsStore.ts`

- [ ] **Step 1: Update the store**

Replace the full contents of `src/stores/settingsStore.ts`:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotionEnabled: boolean;
  onboardingSeen: boolean;
};

type SettingsActions = {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotionEnabled: (v: boolean) => void;
  setOnboardingSeen: (v: boolean) => void;
};

const initialState: SettingsState = {
  soundEnabled: false,
  hapticsEnabled: true,
  reducedMotionEnabled: false,
  onboardingSeen: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...initialState,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setHapticsEnabled: (v) => set({ hapticsEnabled: v }),
      setReducedMotionEnabled: (v) => set({ reducedMotionEnabled: v }),
      setOnboardingSeen: (v) => set({ onboardingSeen: v }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: jsonStorage,
    }
  )
);
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/stores/settingsStore.ts
git commit -m "feat: add onboardingSeen to settingsStore"
```

---

### Task 2: Create OnboardingScreen

**Files:**
- Create: `src/screens/OnboardingScreen.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSettingsStore } from '../stores/settingsStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const SLIDES = [
  {
    emoji: '🎭',
    title: 'Pick a mood',
    body: 'Bored? At home? Out with friends? Choose how you feel right now.',
  },
  {
    emoji: '🃏',
    title: 'Draw 3 quest cards',
    body: 'Tap to flip and reveal three real-world activity cards picked just for you.',
  },
  {
    emoji: '🌍',
    title: 'Do something real',
    body: 'Pick one quest, go do it, and earn XP. No screens required.',
  },
];

const { width } = Dimensions.get('window');

export function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const setOnboardingSeen = useSettingsStore((s) => s.setOnboardingSeen);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleNext = () => {
    if (isLast) {
      setOnboardingSeen(true);
      navigation.replace('Home');
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.skip}>
        <TouchableOpacity onPress={() => { setOnboardingSeen(true); navigation.replace('Home'); }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.slide}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  skip: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 },
  skipText: { fontSize: 14, color: '#bbb', fontWeight: '600' },
  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 16,
  },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', textAlign: 'center' },
  body: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  bottom: { paddingHorizontal: 24, paddingBottom: 32, gap: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D8D0' },
  dotActive: { backgroundColor: '#FF8C42', width: 20 },
  btn: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '800', color: 'white' },
});
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```
Expected: error about `Onboarding` not being in `RootStackParamList` — fixed in Task 3.

---

### Task 3: Wire Onboarding into RootStack

**Files:**
- Modify: `src/navigation/RootStack.tsx`

- [ ] **Step 1: Update RootStack**

Replace the full contents of `src/navigation/RootStack.tsx`:

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Mood } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QuestRevealScreen } from '../screens/QuestRevealScreen';
import { QuestDetailScreen } from '../screens/QuestDetailScreen';
import { CompletionScreen } from '../screens/CompletionScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { PacksScreen } from '../screens/PacksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  QuestReveal: { mood: Mood };
  QuestDetail: { questId: string };
  Completion: { questId: string };
  Progress: undefined;
  Packs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);

  return (
    <Stack.Navigator
      initialRouteName={onboardingSeen ? 'Home' : 'Onboarding'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="QuestReveal" component={QuestRevealScreen} />
      <Stack.Screen name="QuestDetail" component={QuestDetailScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Packs" component={PacksScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Type-check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```
git add src/stores/settingsStore.ts src/screens/OnboardingScreen.tsx src/navigation/RootStack.tsx
git commit -m "feat: add 3-slide onboarding with skip, stored in settingsStore"
```

---

### Task 4: Update app.json brand colors

**Files:**
- Modify: `app.json`

The PNG assets already exist (default Expo placeholders). This task applies brand colors so the splash and adaptive icon background match the app's warm orange theme.

- [ ] **Step 1: Update app.json**

Replace the full contents of `app.json`:

```json
{
  "expo": {
    "name": "QuestDeck",
    "slug": "questdeck",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#FF8C42"
    },
    "ios": {
      "supportsTablet": true
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FF8C42"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.ragnor83.questdeck"
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      "expo-audio"
    ]
  }
}
```

- [ ] **Step 2: Commit**

```
git add app.json
git commit -m "feat: apply warm orange brand colors to splash and adaptive icon background"
```

---

### Task 5: Expand free.json to 100 quests

**Files:**
- Modify: `src/data/quests/free.json`

XP rules: easy → 10, medium → 20, hard → 30. All packId: "free".
Valid moods: `bored`, `at-home`, `outside`, `partner`, `friends`, `weekend`, `creative`, `need-reset`.

- [ ] **Step 1: Append 62 new quests** to `free.json` (inside the existing array, after the last entry):

```json
  {
    "id": "bored-memory-palace",
    "title": "Room Memory Test",
    "description": "Study your room for 60 seconds, close your eyes, and name everything you can remember.",
    "category": "home",
    "moods": ["bored", "at-home"],
    "durationMinutes": 5,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "bored-reverse-playlist",
    "title": "Reverse Playlist",
    "description": "Pick a familiar album and listen to it from last track to first. Notice what changes.",
    "category": "home",
    "moods": ["bored", "need-reset"],
    "durationMinutes": 30,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "bored-postcard",
    "title": "Postcard to Future Self",
    "description": "Write a short letter to yourself to be read in exactly one year. Seal it and date it.",
    "category": "home",
    "moods": ["bored", "creative"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Put it somewhere you will definitely find it — a drawer you rarely open."
  },
  {
    "id": "bored-speed-clean",
    "title": "10-Minute Speed Clean",
    "description": "Set a timer for 10 minutes. Clean as much as you possibly can before it goes off.",
    "category": "home",
    "moods": ["bored", "at-home"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Start with the surfaces you see most. Visible progress keeps you moving."
  },
  {
    "id": "bored-five-words",
    "title": "Learn Five Words",
    "description": "Pick any language. Learn five new words, say them out loud, and use each in a sentence.",
    "category": "home",
    "moods": ["bored", "creative"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "bored-blind-draw",
    "title": "Blind Contour Drawing",
    "description": "Draw your own hand without lifting the pen and without looking at the paper.",
    "category": "home",
    "moods": ["bored", "creative"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "The weirder it looks, the better. It is about observation, not skill."
  },
  {
    "id": "home-fridge-audit",
    "title": "Fridge Audit",
    "description": "Check every item in your fridge. Remove anything expired or you know you will never eat.",
    "category": "home",
    "moods": ["at-home", "bored"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-plant-check",
    "title": "Plant Round",
    "description": "Water, dust, and check every plant in your home. Move one to a better spot if needed.",
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
    "id": "home-gratitude-letter",
    "title": "Gratitude Letter",
    "description": "Write a short, genuine letter of thanks to someone who helped you. Send it only if you want to.",
    "category": "home",
    "moods": ["at-home", "need-reset", "creative"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "home-inbox-zero",
    "title": "Inbox Blitz",
    "description": "Archive or delete emails until you are under 10 unread. No replying — just clearing.",
    "category": "home",
    "moods": ["at-home", "bored"],
    "durationMinutes": 20,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "Unsubscribe from anything you delete without reading."
  },
  {
    "id": "home-slow-morning",
    "title": "Slow Morning",
    "description": "No alarms, no schedule, no social media before noon. See what naturally fills the time.",
    "category": "home",
    "moods": ["at-home", "weekend", "need-reset"],
    "durationMinutes": 120,
    "difficulty": "medium",
    "people": "solo",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "outside-cloud-watch",
    "title": "Cloud Watch",
    "description": "Find a patch of grass or a bench. Lie back and watch the clouds for 15 minutes.",
    "category": "outside",
    "moods": ["outside", "need-reset"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Name the shapes. Let your mind go completely blank otherwise."
  },
  {
    "id": "outside-smell-walk",
    "title": "Smell Walk",
    "description": "Walk for 20 minutes paying attention only to what you smell. Name five distinct smells.",
    "category": "outside",
    "moods": ["outside", "creative", "need-reset"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "outside-say-hello",
    "title": "Say Hello to Strangers",
    "description": "On your next walk, make eye contact and say hello to three different strangers.",
    "category": "outside",
    "moods": ["outside", "bored"],
    "durationMinutes": 20,
    "difficulty": "medium",
    "people": "solo",
    "location": "outdoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "A nod and a smile counts. You do not need to stop and talk."
  },
  {
    "id": "outside-scavenger-hunt",
    "title": "Nature Scavenger Hunt",
    "description": "Find a leaf, a feather, a smooth stone, a seed, and a stick. Arrange them when done.",
    "category": "outside",
    "moods": ["outside", "bored", "creative"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "outside-sunrise-watch",
    "title": "Watch the Sky Change",
    "description": "Go outside at sunrise or sunset. Watch without your phone until the light fully changes.",
    "category": "outside",
    "moods": ["outside", "need-reset", "weekend"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "outside-visit-market",
    "title": "Visit a Market",
    "description": "Find a local market — food, flea, or farmer. Browse with no shopping list and no agenda.",
    "category": "outside",
    "moods": ["outside", "weekend", "creative"],
    "durationMinutes": 45,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "outside-lunch-new",
    "title": "Lunch Somewhere New",
    "description": "Find a restaurant or café you have never been to. Go alone and eat without your phone.",
    "category": "outside",
    "moods": ["outside", "weekend", "bored"],
    "durationMinutes": 60,
    "difficulty": "medium",
    "people": "solo",
    "location": "outdoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "Order something you have never tried. That is the whole point."
  },
  {
    "id": "partner-wish-list",
    "title": "Wish List Swap",
    "description": "Each of you writes five things you wish for in the next year. Share and discuss without judgment.",
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
    "id": "partner-no-words-walk",
    "title": "Silent Walk",
    "description": "Walk together for 20 minutes without speaking. No phones. No music. Just walking.",
    "category": "partner",
    "moods": ["partner", "outside"],
    "durationMinutes": 20,
    "difficulty": "medium",
    "people": "partner",
    "location": "outdoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "It feels awkward at first. After five minutes, it becomes something else entirely."
  },
  {
    "id": "partner-recipe-roulette",
    "title": "Recipe Roulette",
    "description": "Open any cookbook to a random page. Make that dish together using only what you have.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 45,
    "difficulty": "medium",
    "people": "partner",
    "location": "indoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "If you do not have a cookbook, use a random number generator on a recipe website."
  },
  {
    "id": "partner-childhood-favorite",
    "title": "Childhood Favourite",
    "description": "Each of you shares your single favourite thing from childhood. Why was it so special?",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "partner",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "partner-future-home",
    "title": "Dream Home Tour",
    "description": "Describe your dream home to each other room by room in as much detail as possible.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "partner",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Be specific. Where is it? What does the kitchen smell like? What view do you wake up to?"
  },
  {
    "id": "partner-compliment-swap",
    "title": "Unsaid Compliments",
    "description": "Take turns giving three genuine compliments you have thought but never actually said out loud.",
    "category": "partner",
    "moods": ["partner"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "partner",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "partner-teach-each-other",
    "title": "Skill Trade",
    "description": "Each teaches the other one practical skill for 10 minutes. It must be something you actually know.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "partner",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "partner-bucket-list",
    "title": "Bucket List Session",
    "description": "Together, write 10 things you want to do before your next big birthday. Make at least one plan.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 30,
    "difficulty": "easy",
    "people": "partner",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "partner-childhood-movie",
    "title": "Childhood Movie Night",
    "description": "Each pick a favourite movie from your childhood. Flip a coin — that one plays tonight.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 90,
    "difficulty": "medium",
    "people": "partner",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "partner-no-tech-hour",
    "title": "No-Tech Hour",
    "description": "Both put your phones in a drawer for one hour. Do anything you want together — except screens.",
    "category": "partner",
    "moods": ["partner", "at-home"],
    "durationMinutes": 60,
    "difficulty": "medium",
    "people": "partner",
    "location": "indoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "partner-three-things",
    "title": "Three Things I Appreciate",
    "description": "Each of you names three specific things you appreciate about the other this week.",
    "category": "partner",
    "moods": ["partner"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "partner",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-round-robin-story",
    "title": "Round Robin Story",
    "description": "One person starts a story with one sentence. Each person adds one sentence. Go around five times.",
    "category": "friends",
    "moods": ["friends", "at-home"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-compliment-circle",
    "title": "Compliment Circle",
    "description": "Going around the group, each person gives one genuine, specific compliment to each other person.",
    "category": "friends",
    "moods": ["friends"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-trivia",
    "title": "Trivia Challenge",
    "description": "Each person prepares three trivia questions in advance. Quiz each other. Keep score.",
    "category": "friends",
    "moods": ["friends", "at-home"],
    "durationMinutes": 30,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-phone-photo-tour",
    "title": "Phone Photo Tour",
    "description": "Everyone shares their three most recent photos and the full story behind each one.",
    "category": "friends",
    "moods": ["friends"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-act-it-out",
    "title": "Act It Out",
    "description": "One person acts out a phrase, film, or object with no words or sounds. Others guess.",
    "category": "friends",
    "moods": ["friends", "at-home"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Use phone notes to prepare phrases in advance so no one can peek."
  },
  {
    "id": "friends-best-advice",
    "title": "Best Advice Round",
    "description": "Each person shares the single best piece of advice they have ever received. No debates.",
    "category": "friends",
    "moods": ["friends"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-two-truths",
    "title": "Two Truths, One Lie",
    "description": "Each person states two true things and one lie about themselves. Others vote on the lie.",
    "category": "friends",
    "moods": ["friends"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "friends",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "friends-group-walk",
    "title": "Leaderless Walk",
    "description": "Walk together with no plan. Anyone can suggest a turn at any time. Walk for 30 minutes.",
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
    "id": "friends-cook-together",
    "title": "Everyone Brings One Thing",
    "description": "Each person brings one ingredient. Together, make a meal from exactly what you have.",
    "category": "friends",
    "moods": ["friends", "at-home"],
    "durationMinutes": 60,
    "difficulty": "medium",
    "people": "friends",
    "location": "indoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "No one reveals their ingredient until everyone arrives."
  },
  {
    "id": "friends-map-roulette",
    "title": "Map Roulette",
    "description": "Close your eyes and point to a map within 5 km. Walk or travel there together right now.",
    "category": "friends",
    "moods": ["friends", "outside", "weekend"],
    "durationMinutes": 60,
    "difficulty": "medium",
    "people": "friends",
    "location": "outdoors",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "weekend-day-trip",
    "title": "Spontaneous Day Trip",
    "description": "Pick a town or place within an hour of home you have never visited. Go today.",
    "category": "outside",
    "moods": ["outside", "weekend", "bored"],
    "durationMinutes": 240,
    "difficulty": "medium",
    "people": "solo",
    "location": "outdoors",
    "xp": 20,
    "packId": "free",
    "optionalTip": "Do not look it up first. Just go and discover."
  },
  {
    "id": "weekend-book-a-thing",
    "title": "Book One Experience",
    "description": "Book one experience for the next month — a class, a tour, a show, anything. Do it now.",
    "category": "home",
    "moods": ["weekend", "bored"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "weekend-try-new-food",
    "title": "Try One New Food",
    "description": "Buy or make one food you have genuinely never eaten before. Today.",
    "category": "home",
    "moods": ["weekend", "creative", "bored"],
    "durationMinutes": 30,
    "difficulty": "easy",
    "people": "solo",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "weekend-analog-morning",
    "title": "Analogue Morning",
    "description": "Spend the first two hours after waking doing only non-digital things. Read, cook, sketch, walk.",
    "category": "home",
    "moods": ["weekend", "need-reset"],
    "durationMinutes": 120,
    "difficulty": "medium",
    "people": "solo",
    "location": "any",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "creative-haiku",
    "title": "Three Haikus",
    "description": "Write three haikus about three things you can see right now. 5-7-5 syllables.",
    "category": "home",
    "moods": ["creative", "at-home", "bored"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Count syllables on your fingers. They do not need to rhyme."
  },
  {
    "id": "creative-color-study",
    "title": "Single Color Study",
    "description": "Pick one color. Photograph ten different examples of it in the next 30 minutes.",
    "category": "home",
    "moods": ["creative", "bored"],
    "durationMinutes": 30,
    "difficulty": "easy",
    "people": "solo",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "creative-room-sketch",
    "title": "Dream Room Redesign",
    "description": "Sketch how you would redesign one room if cost were no object. Be specific.",
    "category": "home",
    "moods": ["creative", "at-home"],
    "durationMinutes": 20,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "creative-lyrics-poem",
    "title": "Lyrics Poem",
    "description": "Find one line from five different songs. Arrange them into a new poem that makes sense.",
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
    "id": "creative-object-story",
    "title": "Object Origin Story",
    "description": "Pick one random object in your home. Write its imaginary history in 200 words or more.",
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
    "id": "creative-ambient-sound",
    "title": "New Soundscape",
    "description": "Search for an ambient soundscape you have never heard — rain forest, space station, old library — and listen for 20 minutes.",
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
    "id": "creative-redesign-logo",
    "title": "Redesign a Logo",
    "description": "Pick any well-known brand. Sketch a simpler, better version of their logo.",
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
    "id": "creative-photo-story",
    "title": "20-Photo Story",
    "description": "Take exactly 20 photos in 30 minutes that together tell a story with no words or captions.",
    "category": "home",
    "moods": ["creative", "outside"],
    "durationMinutes": 30,
    "difficulty": "medium",
    "people": "solo",
    "location": "any",
    "xp": 20,
    "packId": "free"
  },
  {
    "id": "creative-write-recipe",
    "title": "Non-Food Recipe",
    "description": "Write a recipe for something that is not food. A perfect morning. An apology. Courage.",
    "category": "home",
    "moods": ["creative", "need-reset"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Format it exactly like a real recipe: ingredients, method, serves N, prep time."
  },
  {
    "id": "creative-map-your-day",
    "title": "Map Your Day",
    "description": "Draw a map — not geographic, but visual — of everything you did today. No words allowed.",
    "category": "home",
    "moods": ["creative", "need-reset"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "reset-journal",
    "title": "Two-Minute Dump",
    "description": "Write without stopping for exactly two minutes. No editing, no re-reading, just write.",
    "category": "home",
    "moods": ["need-reset", "at-home"],
    "durationMinutes": 5,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "reset-cold-water",
    "title": "Cold Water Reset",
    "description": "Splash cold water on your face and hold your wrists under cold water for 30 seconds.",
    "category": "home",
    "moods": ["need-reset", "at-home"],
    "durationMinutes": 2,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free",
    "optionalTip": "Cold water activates the dive reflex and slows your heart rate. It works."
  },
  {
    "id": "reset-five-senses",
    "title": "5-4-3-2-1 Ground",
    "description": "Name 5 things you see, 4 you hear, 3 you can touch, 2 you smell, 1 you taste.",
    "category": "home",
    "moods": ["need-reset"],
    "durationMinutes": 5,
    "difficulty": "easy",
    "people": "solo",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "reset-slow-cup",
    "title": "Slow Cup",
    "description": "Make tea or coffee very slowly. Drink it in silence with no screen in sight.",
    "category": "home",
    "moods": ["need-reset", "at-home"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "reset-walk-block",
    "title": "Walk One Block",
    "description": "Go outside and walk exactly one full block. No destination, no podcast, no phone.",
    "category": "outside",
    "moods": ["need-reset", "outside"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "reset-write-it-down",
    "title": "Write It Down",
    "description": "Write down everything currently on your mind. Then cross out every item you cannot control.",
    "category": "home",
    "moods": ["need-reset", "at-home"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "indoors",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "reset-one-small-thing",
    "title": "Do One Small Thing",
    "description": "Find the smallest unfinished task in your head. The one you keep putting off. Do it now.",
    "category": "home",
    "moods": ["need-reset", "at-home", "bored"],
    "durationMinutes": 15,
    "difficulty": "easy",
    "people": "solo",
    "location": "any",
    "xp": 10,
    "packId": "free"
  },
  {
    "id": "reset-screen-break",
    "title": "10-Minute Screen Break",
    "description": "Step away from every screen. Go outside for 10 minutes with nothing in your hands.",
    "category": "outside",
    "moods": ["need-reset", "outside"],
    "durationMinutes": 10,
    "difficulty": "easy",
    "people": "solo",
    "location": "outdoors",
    "xp": 10,
    "packId": "free"
  }
```

- [ ] **Step 2: Validate quests**

```
npm run validate:quests
```
Expected: `✓ All 100 quests valid.`

- [ ] **Step 3: Commit**

```
git add src/data/quests/free.json
git commit -m "feat: expand free quest pack to 100 quests"
```

---

### Task 6: Polish ProgressScreen empty state

**Files:**
- Modify: `src/screens/ProgressScreen.tsx`

Current code shows a plain text hint when no quests are completed. Upgrade it to a centred card with emoji and friendly copy.

- [ ] **Step 1: Replace the empty hint block**

Find in `ProgressScreen.tsx`:

```tsx
            {sorted.length > 0 ? (
              <Text style={styles.sectionLabel}>RECENT QUESTS</Text>
            ) : (
              <Text style={styles.emptyHint}>Complete your first quest to see history here.</Text>
            )}
```

Replace with:

```tsx
            {sorted.length > 0 ? (
              <Text style={styles.sectionLabel}>RECENT QUESTS</Text>
            ) : (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyEmoji}>🗺️</Text>
                <Text style={styles.emptyTitle}>No quests yet</Text>
                <Text style={styles.emptyBody}>
                  Head back to the home screen, pick a mood, and complete your first quest. It will appear here.
                </Text>
              </View>
            )}
```

- [ ] **Step 2: Add styles**

In the `StyleSheet.create({...})` block, add after `emptyHint`:

```ts
  emptyCard: {
    marginTop: 24, alignItems: 'center', padding: 24,
    backgroundColor: 'white', borderRadius: 16, gap: 8,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  emptyBody: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
```

- [ ] **Step 3: Remove the now-unused `emptyHint` style**

Delete this line from the StyleSheet:

```ts
  emptyHint: { fontSize: 13, color: '#ccc', textAlign: 'center', marginTop: 16 },
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/screens/ProgressScreen.tsx
git commit -m "feat: improve ProgressScreen empty state with friendly card"
```

---

### Task 7: Polish PacksScreen

**Files:**
- Modify: `src/screens/PacksScreen.tsx`
- Modify: `src/data/packs.ts` (add questCount field)
- Modify: `src/types/index.ts` (add questCount to Pack type)

Add quest counts to each pack and a clear "Coming soon" label. Keep non-functional.

- [ ] **Step 1: Add questCount to Pack type**

In `src/types/index.ts`, replace:

```ts
export type Pack = {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  emoji: string;
};
```

With:

```ts
export type Pack = {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  emoji: string;
  questCount: number;
};
```

- [ ] **Step 2: Add questCount to PACKS data**

In `src/data/packs.ts`, replace:

```ts
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
```

With:

```ts
export const PACKS: Pack[] = [
  {
    id: 'free',
    name: 'Free Pack',
    description: 'Everyday quests for any mood',
    isPremium: false,
    emoji: '🎒',
    questCount: 100,
  },
  {
    id: 'date-night',
    name: 'Date Night',
    description: 'Quests built for two — conversation, adventure, and connection',
    isPremium: true,
    emoji: '💑',
    questCount: 25,
  },
  {
    id: 'city-explorer',
    name: 'City Explorer',
    description: 'Urban adventures to discover your city like a stranger would',
    isPremium: true,
    emoji: '🌆',
    questCount: 20,
  },
];
```

- [ ] **Step 3: Rewrite PacksScreen render**

Replace the full contents of `src/screens/PacksScreen.tsx`:

```tsx
import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
        <View style={styles.packTop}>
          <Text style={styles.packEmoji}>{item.emoji}</Text>
          {isUnlocked ? (
            <View style={styles.badgeActive}>
              <Text style={styles.badgeTextActive}>Active</Text>
            </View>
          ) : (
            <View style={styles.badgeSoon}>
              <Text style={styles.badgeTextSoon}>Coming soon</Text>
            </View>
          )}
        </View>
        <Text style={styles.packName}>{item.name}</Text>
        <Text style={styles.packDesc}>{item.description}</Text>
        <Text style={styles.packCount}>{item.questCount} quests</Text>
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
    borderRadius: 16, padding: 16, gap: 6,
  },
  packUnlocked: {
    backgroundColor: '#FFF3E8', borderWidth: 1.5, borderColor: '#FFD0A0',
  },
  packLocked: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#EEE',
  },
  packTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packEmoji: { fontSize: 32 },
  packName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  packDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  packCount: { fontSize: 12, color: '#aaa', fontWeight: '600', marginTop: 2 },
  badgeActive: {
    backgroundColor: '#D4EDDA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeTextActive: { fontSize: 12, fontWeight: '700', color: '#3DAA6E' },
  badgeSoon: {
    backgroundColor: '#F0ECE8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeTextSoon: { fontSize: 12, fontWeight: '700', color: '#999' },
});
```

- [ ] **Step 4: Type-check**

```
npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```
git add src/types/index.ts src/data/packs.ts src/screens/PacksScreen.tsx
git commit -m "feat: polish PacksScreen with quest counts and improved Coming Soon style"
```

---

### Task 8: Verify everything

- [ ] **Step 1: Type-check**

```
npx tsc --noEmit
```
Expected: no output (zero errors).

- [ ] **Step 2: Run tests**

```
npm test
```
Expected: all suites pass.

- [ ] **Step 3: Validate quests**

```
npm run validate:quests
```
Expected: `✓ All 100 quests valid.`

- [ ] **Step 4: Final commit if any loose files**

```
git status
```
Commit anything uncommitted before reporting done.
