I want to build a mobile app called QuestDeck.



QuestDeck is a privacy-first, offline-first real-life quest card app.



The idea:

People often feel bored, stuck, restless, or unsure what to do. QuestDeck gives them small real-world activity cards they can draw and complete. The app should feel playful, simple, and lightweight — closer to a pocket deck of activity cards than a productivity or habit-tracking app.



The product should NOT use AI at runtime.

The product should NOT require a backend for version 1.

The product should NOT require login or user accounts.

The product should NOT upload photos, location, contacts, or private user data.

The product should work offline.



Target audience:

\- People who are bored and want something simple to do

\- Couples looking for small date/activity ideas

\- Friends looking for light challenges or conversation starters

\- People who want to spend less time scrolling

\- People who want small real-world adventures without complicated planning



Core use cases:

1\. A user opens the app because they are bored.

2\. They choose a mood or situation, such as:

&#x20;  - Bored

&#x20;  - At Home

&#x20;  - Outside

&#x20;  - With Partner

&#x20;  - With Friends

&#x20;  - Weekend

&#x20;  - Creative

&#x20;  - Need Reset

3\. The app shows 3 face-down quest cards.

4\. The user taps to reveal the cards.

5\. The user chooses one quest.

6\. The quest detail screen shows:

&#x20;  - title

&#x20;  - short description

&#x20;  - estimated time

&#x20;  - difficulty

&#x20;  - who it is for

&#x20;  - optional tip

7\. The user can mark the quest as completed.

8\. The app stores completed quests locally.

9\. The user earns simple XP for completed quests.

10\. The user can view basic progress and completed quests.



Product positioning:

QuestDeck should NOT feel like:

\- a serious productivity app

\- a habit tracker

\- a life coaching app

\- a mental health app

\- a fitness app

\- a social network



QuestDeck SHOULD feel like:

\- a playful real-life activity deck

\- a boredom killer

\- a weekend idea generator

\- a small adventure app

\- a privacy-friendly offline app



Technical requirements:

\- Use Expo React Native with TypeScript.

\- Keep the app simple and clean.

\- Use local JSON files for quest data.

\- Use local storage for completed quests and XP.

\- No backend.

\- No authentication.

\- No analytics.

\- No AI.

\- No payments yet, but structure the code so paid packs can be added later.

\- Use a clean, maintainable folder structure.

\- Make the app data-driven so new quest packs can be added by editing JSON.



Initial app structure:

\- Home screen with mood/situation buttons

\- Quest reveal screen showing 3 randomized cards

\- Quest detail screen

\- Completion screen or completion state

\- Progress/history screen

\- Packs screen placeholder



Data model:

Create a Quest type with fields like:

\- id

\- title

\- description

\- category

\- moods

\- durationMinutes

\- difficulty

\- people

\- location

\- xp

\- pack

\- optionalTip



Create sample quest data with at least 30 quests across different moods and situations.



Example quests:

1\. The 3-Color Walk

&#x20;  Go outside for 15 minutes and find something red, something blue, and something yellow.



2\. Tiny Table Reset

&#x20;  Clear one table or desk surface completely. Put back only what belongs there.



3\. Two-Question Coffee

&#x20;  Make a drink and ask your partner or friend two questions you have not asked before.



4\. No-Phone Window

&#x20;  Sit near a window for 10 minutes with no phone. Notice five things outside.



5\. Random Shelf Discovery

&#x20;  Pick one shelf, drawer, or box and rediscover what is inside.



Design direction:

\- Mobile-first

\- Friendly and playful

\- Large cards

\- Simple animations if easy

\- Clean typography

\- Minimal screens

\- No clutter

\- Warm, fun feeling

\- The first version should be usable and pleasant, not over-engineered



Please start by:

1\. Creating the Expo React Native TypeScript project structure.

2\. Defining the core types.

3\. Creating local sample quest data.

4\. Building the basic screens.

5\. Implementing local quest selection.

6\. Implementing local completion tracking and XP.

7\. Keeping the code easy to extend.



After creating the initial version, summarize:

\- what files were created

\- how to run the app

\- what is implemented

\- what should be built next

