# Badge Log Screen Design

**Date:** 2026-05-19
**Status:** Approved (corrections applied 2026-05-19)

## Goal

Three targeted improvements to the badge/Adventure Log experience:

1. Fix HomeScreen badge teaser to show badge images instead of always showing emoji.
2. Cap the Adventure Log unlocked-badges section to 3 most recently unlocked; add a badge count tile and "See all →" link that both navigate to the new BadgeLog screen.
3. Add a new `BadgeLogScreen` showing all unlocked badges plus all next-badge progress cards.

---

## Entry Points to BadgeLog

Three places push to the new `BadgeLog` route:

| Location | Element |
|----------|---------|
| HomeScreen | Badge teaser row (currently navigates to Progress — change to BadgeLog) |
| Adventure Log | Badge count tile (new, between stats and NEXT BADGES) |
| Adventure Log | "See all →" link on the UNLOCKED BADGES section label row |

---

## 1. HomeScreen Teaser — Image Fix

**Problem:** The teaser renders `{nextBadge.badge.emoji}` unconditionally. `BADGE_IMAGES` is never consulted.

**Fix:** Replace the emoji `<Text>` with a 28×28 fixed box that renders `<Image>` if `BADGE_IMAGES[badge.id]` exists, otherwise the emoji `<Text>`. The box is always 28×28 so layout never shifts.

**Navigation change:** `onPress` navigates to `BadgeLog` instead of `Progress`.

---

## 2. Adventure Log Changes

### Badge Count Tile

A compact touchable card between the stats row and the NEXT BADGES section label:

```
🏅  3 / 10 badges unlocked                     →
```

- Shows `unlockedBadges.length / allBadges.length`
- Entire tile is touchable → navigates to `BadgeLog`
- Warm cream background (`#FFF0E0`), orange arrow, consistent with existing card style

### Unlocked Badges — Max 3 Recent

Replace `getBadgeProgress(badgeInput).filter(bp => bp.unlocked)` with `getRecentlyUnlockedBadges`:

```ts
getRecentlyUnlockedBadges(
  input: BadgeEngineInput,
  unlockedAt: Record<string, string>,
  count: number,
): BadgeProgress[]
```

- Only includes unlocked badges
- Sorts by `unlockedAt[badge.id]` descending (most recently unlocked first)
- Badges missing from `unlockedAt` (existing users, pre-feature) sort to oldest
- When timestamps are equal, preserve badge definition order (stable sort)
- Returns top `count`

`unlockedAt` comes from `badgeStore`.

### "See all →" Link

On the same row as the `UNLOCKED BADGES` section label, right-aligned small tappable text → navigates to `BadgeLog`.

```
UNLOCKED BADGES                              See all →
```

---

## 3. BadgeLogScreen

**File:** `src/screens/BadgeLogScreen.tsx`
**Route:** `BadgeLog` (no params) — added to `RootStackParamList` and `RootStack`

### Layout

```
← All Badges

UNLOCKED  (N)
[2-column rows of unlocked BadgeCards, variant="unlocked"]
— or —
[empty state if none]

NEXT BADGES
[locked BadgeCards with progress, variant="progress"]
— or —
[all-unlocked message]
```

### Behaviour

- Derives badge data identically to ProgressScreen (same stores, same `questById`)
- Unlocked section: all unlocked badges sorted most-recently-unlocked first, rendered in 2-column rows
- Next badges section: all locked badges sorted by progress desc (same sort as `getNearestLockedBadges` but no count cap — show all)
- Empty state (no badges unlocked): "Complete your first quest to earn badges."
- All-unlocked state: "All badges unlocked. More adventures are coming."
- Uses existing `BadgeCard` — no new component

### Implementation note — avoid nested FlatLists

Use a single `ScrollView`. Render unlocked badges manually in 2-column rows (pair up the array, render each pair as a `View` with `flexDirection: 'row'`). Render next badges with `.map()`. This avoids nested vertical scroll conflicts.

### Styling

- Same background (`#FFF8F0`), same card style as Adventure Log
- 2-column rows: gap between columns and between rows consistent with existing `BadgeCard` sizing
- Next badges: vertical stack, same as ProgressScreen NEXT BADGES

---

## Badge Unlock Persistence

### New store: `src/stores/badgeStore.ts`

```ts
type BadgeStoreState = {
  unlockedAt: Record<string, string>; // badgeId → ISO timestamp
};
type BadgeStoreActions = {
  recordUnlocked: (ids: string[], timestamp: string) => void;
  reset: () => void;
};
```

Persisted to AsyncStorage under a new key `STORAGE_KEYS.BADGES`.

### Detection in `src/actions/completeQuest.ts`

**If the quest is already completed, return early — do not evaluate or record badges.**

Otherwise, use the same `nowIso` timestamp for both `completedAt` and badge unlock recording.

Compute badge progress before and after the completion:

```ts
const nowIso = new Date().toISOString();

const beforeBadgeProgress = getBadgeProgress(beforeInput);

// add quest to questStore
// update progressStore

const afterBadgeProgress = getBadgeProgress(afterInput);

const newlyUnlockedIds = afterBadgeProgress
  .filter((after) => {
    const before = beforeBadgeProgress.find((b) => b.badge.id === after.badge.id);
    return before && !before.unlocked && after.unlocked;
  })
  .map((bp) => bp.badge.id);

if (newlyUnlockedIds.length > 0) {
  badgeStore.recordUnlocked(newlyUnlockedIds, nowIso);
}
```

This detects only badges that changed from **locked → unlocked** during this single completion. Badges already unlocked before this completion are not re-recorded. Badges already in `unlockedAt` from previous completions are not overwritten.

The `beforeInput` must be constructed from store state **before** any mutations. The `afterInput` from state **after** all mutations.

---

## Tests

New test file: `__tests__/actions/completeQuestBadges.test.ts`

- Completing first quest records `first_quest` in `unlockedAt`
- Completing third quest records `getting_started` in `unlockedAt`
- `already_completed` does not record any badge unlocks
- Badges already unlocked before this completion are not re-recorded (no overwrite)
- Multiple badges unlocked by one completion are all recorded with the same timestamp
- `getRecentlyUnlockedBadges` sorts by `unlockedAt` descending
- Badges missing from `unlockedAt` sort to oldest (before any timestamped badges)

---

## Files Changed

| Action | File |
|--------|------|
| Create | `src/stores/badgeStore.ts` — persisted unlock timestamps |
| Modify | `src/lib/storage.ts` — add BADGES key |
| Modify | `src/actions/completeQuest.ts` — detect locked→unlocked transitions, record with shared nowIso |
| Modify | `src/lib/badges.ts` — add `getRecentlyUnlockedBadges` |
| Modify | `src/screens/HomeScreen.tsx` — image fix + navigate to BadgeLog |
| Modify | `src/screens/ProgressScreen.tsx` — badge tile, 3-recent cap, See all link |
| Modify | `src/navigation/RootStack.tsx` — add BadgeLog route |
| Create | `src/screens/BadgeLogScreen.tsx` |
| Create | `__tests__/actions/completeQuestBadges.test.ts` |

---

## What Is Not In This Spec

- No backend persistence — badge unlock timestamps are stored locally in AsyncStorage only
- Badge progress is still fully derived from existing quest/progress store data
- No new badge definitions
- No animations
- No social/sharing features
