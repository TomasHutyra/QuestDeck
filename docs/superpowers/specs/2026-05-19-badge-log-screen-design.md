# Badge Log Screen Design

**Date:** 2026-05-19
**Status:** Approved

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

Replace `getBadgeProgress(badgeInput).filter(bp => bp.unlocked)` with a new helper:

```ts
getRecentlyUnlockedBadges(
  input: BadgeEngineInput,
  unlockedAt: Record<string, string>,
  count: number,
): BadgeProgress[]
```

`unlockedAt` comes from the new `badgeStore`. Sort unlocked badges by `unlockedAt[badge.id]` descending (most recently unlocked first), return top `count`. Badges missing from `unlockedAt` (unlocked before this feature shipped) sort to oldest.

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
[2-column grid of unlocked BadgeCards, variant="unlocked"]
— or —
[empty state if none]

NEXT BADGES
[vertical list of locked BadgeCards, variant="progress"]
— or —
[all-unlocked message]
```

### Behaviour

- Derives badge data identically to ProgressScreen (same stores, same `questById`)
- Unlocked section: all unlocked badges sorted most-recently-unlocked first, 2-column grid
- Next badges section: all locked badges sorted by progress desc (same as `getNearestLockedBadges` but no count cap — show all)
- Empty state (no badges unlocked): "Complete your first quest to earn badges."
- All-unlocked state: "All badges unlocked. More adventures are coming."
- Uses existing `BadgeCard` — no new component

### Styling

- Same background (`#FFF8F0`), same card style as Adventure Log
- 2-column grid: use `FlatList numColumns={2}` for unlocked section
- Next badges: standard vertical list (same as ProgressScreen)

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

After the quest is added to `questStore` and progress is updated in `progressStore`, compute which badges newly flipped to unlocked:

1. Snapshot `unlockedAt` from `badgeStore` to know which badges were already recorded.
2. Run `getBadgeProgress` with the updated state (new completedQuests + new streak/XP/level).
3. For each badge that is now `unlocked` and NOT yet in `unlockedAt`, record it via `badgeStore.recordUnlocked([id], nowISO)`.

This runs at the end of `completeQuest`, after all store updates.

### `getRecentlyUnlockedBadges` signature

```ts
getRecentlyUnlockedBadges(
  input: BadgeEngineInput,
  unlockedAt: Record<string, string>,
  count: number,
): BadgeProgress[]
```

Sorts unlocked badges by `unlockedAt[badge.id]` descending. Badges not present in `unlockedAt` (unlocked before this feature shipped, or streak badges unlocked before tracking) sort to oldest.

---

## Files Changed

| Action | File |
|--------|------|
| Create | `src/stores/badgeStore.ts` — persisted unlock timestamps |
| Modify | `src/lib/storage.ts` — add BADGES key |
| Modify | `src/actions/completeQuest.ts` — detect and record newly unlocked badges |
| Modify | `src/lib/badges.ts` — add `getRecentlyUnlockedBadges` |
| Modify | `src/screens/HomeScreen.tsx` — image fix + navigate to BadgeLog |
| Modify | `src/screens/ProgressScreen.tsx` — badge tile, 3-recent cap, See all link |
| Modify | `src/navigation/RootStack.tsx` — add BadgeLog route |
| Create | `src/screens/BadgeLogScreen.tsx` |

---

## What Is Not In This Spec

- No new badge definitions
- No new persistence — everything derived from existing stores
- No animations
- No social/sharing features
