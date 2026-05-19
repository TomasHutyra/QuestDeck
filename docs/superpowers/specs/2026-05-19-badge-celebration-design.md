# Badge Celebration Design

**Date:** 2026-05-19
**Status:** Approved

## Goal

Show a celebration overlay when completing a quest that unlocks one or more badges. If a streak or level-up overlay is also triggered, show it first; badges follow on dismiss. When only badges unlock (no streak, no level-up), the badge overlay replaces the quest-complete overlay.

---

## 1. `CompleteQuestResult` — new field

Add `newlyUnlockedBadgeIds: string[]` to `CompleteQuestResult` in `src/types/index.ts`.

- For `status: 'already_completed'`: value is `[]`.
- For `status: 'completed'`: the IDs that transitioned locked → unlocked during this completion (may be `[]`).

`completeQuest.ts` already computes `newlyUnlockedIds`. Return it in the result object.

---

## 2. `playBadgeUnlockedFeedback` — `src/lib/feedback.ts`

```ts
export async function playBadgeUnlockedFeedback(): Promise<void> {
  await triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}
```

Heavy haptic only — no new sound asset.

---

## 3. `CelebrationOverlay` — badge type

**New prop shape:**

```ts
type CelebrationOverlayProps = {
  type: 'quest-complete' | 'streak' | 'level-up' | 'badge';
  visible: boolean;
  xpAwarded?: number;
  newStreak?: number;
  newLevel?: number;
  badgeIds?: string[];   // new
  onDismiss?: () => void;
};
```

**Animation:** Same spring as `'streak'` — fade in + spring scale from 0.4 → 1 (damping 6, stiffness 200).

**Content — 1 badge (`badgeIds.length === 1`):**

```
+----------------------------------+
|   [64×64 badge image or emoji]   |
|       Badge unlocked!            |
|       <Badge Name>               |
+----------------------------------+
```

- Headline: `"Badge unlocked!"`
- Image: 64×64 — `<Image>` if `BADGE_IMAGES[id]` exists, otherwise emoji `<Text>` at font size 40.
- Badge name: `allBadges.find(b => b.id === id)?.name ?? id` (import `allBadges` from `'../data/badges'`).

**Content — 2+ badges (`badgeIds.length > 1`):**

```
+----------------------------------+
|       Badges unlocked!           |
|  [48×48]  [48×48]  [48×48]       |
|  Name A   Name B   Name C        |
+----------------------------------+
```

- Headline: `"Badges unlocked!"`
- Row of tiles: each tile is a 48×48 image (or emoji fallback at font size 28) with the badge name below in small text.
- Tiles are laid out in a single `flexDirection: 'row'` with `flexWrap: 'wrap'` and `justifyContent: 'center'` (handles 2 or 3 badges cleanly).

**Styling:** Same card background/border as other types (`#FFF3E8`, `borderRadius: 20`, `borderColor: '#FFD0A0'`). Headline font: `fontSize: 20, fontWeight: '800', color: '#1a1a1a'`. Badge name: `fontSize: 11, color: '#888', textAlign: 'center'`.

---

## 4. `CompletionScreen` — sequencing

### State changes

Replace single `overlayVisible` with two booleans:

```ts
const [overlayVisible, setOverlayVisible] = useState(false);     // existing — level-up / streak / quest-complete
const [badgeOverlayVisible, setBadgeOverlayVisible] = useState(false);  // new — badge
```

### `handleMarkDone` — updated branching

```
if already_completed       → playAlreadyCompletedFeedback()        (no overlay)
else if levelUp            → playLevelUpFeedback(); setOverlayVisible(true)
else if streakExtended     → playStreakExtendedFeedback(); setOverlayVisible(true)
else if newlyUnlocked > 0  → playBadgeUnlockedFeedback(); setBadgeOverlayVisible(true)
else                       → playQuestCompletedFeedback(); setOverlayVisible(true)
```

Key change: when only badges unlock (no level-up, no streak), the quest-complete overlay is skipped and the badge overlay is shown immediately.

### First overlay `onDismiss` — chain to badge overlay

```ts
onDismiss={() => {
  setOverlayVisible(false);
  if (result?.newlyUnlockedBadgeIds && result.newlyUnlockedBadgeIds.length > 0) {
    playBadgeUnlockedFeedback();
    setBadgeOverlayVisible(true);
  }
}}
```

This fires after level-up or streak overlays auto-dismiss (1800 ms timer).

### Badge overlay render

```tsx
<CelebrationOverlay
  type="badge"
  visible={badgeOverlayVisible}
  badgeIds={result?.newlyUnlockedBadgeIds ?? []}
  onDismiss={() => setBadgeOverlayVisible(false)}
/>
```

Rendered alongside the existing `CelebrationOverlay` (both are `absoluteFill`; only one is `visible` at a time).

---

## 5. Tests

Update `__tests__/actions/completeQuestBadges.test.ts` to assert the `newlyUnlockedBadgeIds` field in the returned result:

- First quest → `result.newlyUnlockedBadgeIds` includes `'first_quest'`
- Third quest → includes `'getting_started'`
- Already completed → `result.newlyUnlockedBadgeIds` is `[]`
- No new badges (second quest, not yet reaching any threshold) → `result.newlyUnlockedBadgeIds` is `[]`

---

## Files Changed

| Action | File |
|--------|------|
| Modify | `src/types/index.ts` — add `newlyUnlockedBadgeIds: string[]` to `CompleteQuestResult` |
| Modify | `src/actions/completeQuest.ts` — return `newlyUnlockedBadgeIds` in result |
| Modify | `src/lib/feedback.ts` — add `playBadgeUnlockedFeedback` |
| Modify | `src/components/CelebrationOverlay.tsx` — add `'badge'` type + `badgeIds` prop |
| Modify | `src/screens/CompletionScreen.tsx` — add `badgeOverlayVisible` state + sequencing logic |
| Modify | `__tests__/actions/completeQuestBadges.test.ts` — assert `newlyUnlockedBadgeIds` in result |

---

## What Is Not In This Spec

- No sound asset for badge unlock (haptic only)
- No badge-unlock animation on BadgeLogScreen
- No changes to BadgeLogScreen or ProgressScreen
- No new badge definitions
