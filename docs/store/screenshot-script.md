# QuestDeck — Screenshot Script

6 screenshots for Google Play Store listing.

**Spec:** 1080 × 1920 px, portrait, 16:9 or 9:19.5 ratio, PNG.
**Device:** Pixel 8 (frameless preferred) or any modern Android frame. Do not use an iPhone frame for a Google Play listing.
**Connection state:** Airplane mode on. No notification bar distractions.
**System UI:** Hide notification bar if possible, or set to a clean state (time: 12:00, battery full, no notifications).

---

## Screenshot 1 — Home Screen

**Caption overlay:** "Pick your mood"

**Screen:** HomeScreen

**App state to set up:**
- Total XP: 220 (renders as Level 2, partially filled XP bar — looks active but not maxed)
- No mood selected yet — just show the full mood grid
- All 8 mood buttons visible: Bored, At Home, Outside, Partner, Friends, Weekend, Creative, Need Reset

**What the user sees:**
- "QuestDeck" title top-left with "What do you feel like?" subtitle
- Three icon buttons top-right (progress, packs, settings)
- Orange XP bar below the header showing partial progress
- 2×4 grid of colourful mood buttons filling the screen

**Goal:** Establish the concept instantly. Viewer understands this is about choosing a mood.

**Setup steps:**
1. Clear app data or use a fresh install profile
2. Manually set XP to 220 via AsyncStorage before taking the screenshot, or just complete 10–12 quests first
3. Do not tap any mood — leave the grid in its default state

---

## Screenshot 2 — Quest Reveal (All Cards Face-Down)

**Caption overlay:** "Draw 3 quest cards"

**Screen:** QuestRevealScreen, immediately after tapping "At Home" or "Bored"

**App state to set up:**
- Enter the Quest Reveal screen from HomeScreen
- None of the 3 cards has been tapped yet — all face-down
- The three cards should show their back face (question marks or pattern)

**What the user sees:**
- Three large face-down cards arranged vertically or in a slight fan
- Mood label at the top (e.g. "At Home")
- Cards clearly waiting to be tapped — creates curiosity

**Goal:** Show the core mechanic. Viewer thinks "I want to tap those."

**Setup steps:**
1. Tap "At Home" on the Home screen
2. Take the screenshot before tapping any card
3. Cards should look identical and face-down

---

## Screenshot 3 — Quest Reveal (One Card Flipped)

**Caption overlay:** "Tap to reveal"

**Screen:** QuestRevealScreen, one card face-up, two still face-down

**App state to set up:**
- Same session as Screenshot 2
- Tap the middle card (or top card) to flip it
- The revealed card should show a visually clean quest: recommended quest: **"No-Phone Window"** or **"Cloud Watch"** — short title, clear concept
- Two remaining cards still face-down

**What the user sees:**
- One flipped card showing quest title and category
- Two face-down cards
- The contrast between revealed and hidden creates tension

**Goal:** Show the flip mechanic and tease the quest content.

**Setup steps:**
1. Tap one card on the Quest Reveal screen
2. Wait for the flip animation to complete
3. Take the screenshot in the settled state (not mid-animation)

---

## Screenshot 4 — Quest Detail

**Caption overlay:** "Choose your quest"

**Screen:** QuestDetailScreen

**Recommended quest to show:** "3-Color Walk"

Fields visible:
- Title: **3-Color Walk**
- Description: Go outside for 15 minutes and find something red, something blue, and something yellow.
- Duration: 15 min
- Difficulty: Easy
- People: Solo
- Location: Outdoors
- Tip: (if one exists for this quest)
- "Accept Quest" button at bottom

**Why this quest:** Short title, clear concept, universally understandable, outdoors which feels active and appealing.

**App state to set up:**
1. Navigate to this quest's detail screen (tap it from Quest Reveal)
2. The Accept button should be visible at the bottom
3. Scroll position: top of screen (don't show a half-cut description)

**Goal:** Show all the information the user gets before starting. Establishes trust — this isn't vague, it tells you exactly what to do.

---

## Screenshot 5 — Completion Screen with Celebration

**Caption overlay:** "Mark it done. Earn XP."

**Screen:** CompletionScreen with CelebrationOverlay active

**App state to set up:**
- Complete a quest (tap "Done" / mark as complete)
- The celebration overlay (confetti / particles) should be visible
- XP awarded text should be visible: e.g. "+10 XP"
- Level label or "Level Up" if it triggers

**Recommended setup for a clean screenshot:**
1. Choose an easy quest (10 XP)
2. Navigate all the way to completion
3. Capture the screen while the celebration animation is mid-play (bright, particles visible)
4. If animation ends too fast, reload and retry — capture within the first 2 seconds

**What the user sees:**
- Celebration particles/confetti
- Quest title confirmed
- XP awarded clearly shown
- Positive, rewarding visual moment

**Goal:** Show the emotional payoff. This is the "it felt good to complete" moment.

---

## Screenshot 6 — Progress Screen with History

**Caption overlay:** "Track your adventures"

**Screen:** ProgressScreen

**App state to set up:**
- Total XP: ~180–250 (Level 2, partially filled bar — active but not absurd)
- Completed quests: 8–12 entries visible in the list
- Streak: 3 (shows the streak counter without being unrealistically high)
- Best streak: 3

**Recommended completed quests to show (for good-looking titles in the list):**
- 3-Color Walk
- No-Phone Window
- Cloud Watch
- Two-Question Coffee
- Six-Word Story
- Tiny Table Reset
- Doodle for 10 Minutes
- 4-7-8 Breathing

**What the user sees:**
- Level card (orange, showing current level label)
- XP bar (partially filled)
- Three stat boxes: streak, best, done count
- List of completed quests with dates and XP earned

**Goal:** Show that the app tracks progress without it feeling like a surveillance dashboard. The list of completed quests looks satisfying.

**Setup steps:**
1. Either manually complete 8–12 quests in the app over a session
2. Or temporarily inject mock data into AsyncStorage (questdeck-quests and questdeck-progress keys) to simulate a used state
3. Scroll position: top of screen (show level card + stats + at least 4–5 history items)

---

## Caption Overlay Design Guide

For consistency across all 6 screenshots:

**Position:** bottom-third of screen, horizontally centered
**Background:** warm orange pill/bar `#FF8C42` with 12px border radius, 16px padding
**Text:** white, 20–22sp, font-weight 800
**Padding from bottom edge:** ~80px from bottom of screen content

Keep captions to 4 words maximum. One short punchy phrase per screen.

| Screen | Caption |
|--------|---------|
| Home | Pick your mood |
| Reveal (face-down) | Draw 3 quest cards |
| Reveal (one flipped) | Tap to reveal |
| Quest Detail | Choose your quest |
| Completion | Mark it done. Earn XP. |
| Progress | Track your adventures |

---

## Tools for Taking Screenshots

**Easiest approach (USB debugging):**
```
adb exec-out screencap -p > screenshot.png
```

**Or use Android Studio Device Manager → camera icon** for a clean screencap with no notification bar.

**For the animated Completion screenshot:** use screen recording, find the best frame, export as PNG.
