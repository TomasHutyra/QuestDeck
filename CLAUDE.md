# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QuestDeck is a privacy-first, offline-first real-life quest card app built with **Expo React Native + TypeScript**. Users pick a mood, draw 3 random quest cards, choose one, complete it, and earn XP. No backend, no login, no analytics, no AI, no payments in v1.

Full spec is in `QuestDeck_idea.md`.

## Commands

```bash
npx expo start              # start Metro bundler
npx expo start --android    # run on Android
npx expo start --ios        # run on iOS
npx tsc --noEmit            # type check
```

## Architecture

**Data layer** — quest data lives in local JSON files; completed quests and XP are persisted via AsyncStorage. The app is data-driven: new quest packs = new JSON file + registration.

**Quest data model** (source of truth for all screens):
```ts
type Quest = {
  id: string;
  title: string;
  description: string;
  category: string;
  moods: string[];          // e.g. ["bored", "at-home"]
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  people: 'solo' | 'partner' | 'friends' | 'any';
  location: 'indoors' | 'outdoors' | 'any';
  xp: number;
  packId: string;           // "free" or future paid pack id
  optionalTip?: string;
};
```

**Screen flow:**
```
Home (mood selector)
  → Quest Reveal (3 face-down cards, tap to flip)
    → Quest Detail (title, description, time, difficulty, tip)
      → Completion state (mark done, XP awarded)
Progress / History screen (completed quests, total XP)
Packs screen (placeholder for future paid packs)
```

**Paid packs** — structure code so packs are identifiable by `quest.packId` field; the Packs screen placeholder is the hook for future unlock logic. Do not bake in any payment SDK in v1.
