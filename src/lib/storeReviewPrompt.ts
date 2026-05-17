import { Alert, Linking } from 'react-native';
import { useSettingsStore } from '../stores/settingsStore';
import { todayLocalDate } from './xp';

// TODO: Anonymous per-quest feedback (Fun / Okay / Not for me) can be added later
// as an explicit opt-in sending flow. Implement after notification prompt logic is stable.

const PACKAGE_NAME = 'com.BookdragonDev.QuestDeck';

type ReviewPromptState = {
  storeReviewPromptLastShownAt: string | null;              // local YYYY-MM-DD
  storeReviewPromptDismissedAt: string | null;              // local YYYY-MM-DD
  storeReviewPromptDismissCount: number;
  storeReviewRequestedAt: string | null;                    // ISO timestamp
  storeReviewCompletedQuestCountAtLastPrompt: number | null;
};

function daysBetween(a: string, b: string): number {
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function shouldShowStoreReviewPrompt(
  state: ReviewPromptState,
  today: string,
  completedQuestsCount: number,
): boolean {
  if (completedQuestsCount < 5) return false;
  if (state.storeReviewPromptLastShownAt === today) return false;

  if (state.storeReviewRequestedAt !== null) {
    // storeReviewRequestedAt is an ISO timestamp; compare using its date portion
    const daysSinceRequested = daysBetween(state.storeReviewRequestedAt.slice(0, 10), today);
    if (daysSinceRequested < 90) return false;
  }

  const count = state.storeReviewPromptDismissCount;
  if (count === 0) return true;

  const dismissed = state.storeReviewPromptDismissedAt;
  if (!dismissed) return true;

  const countAtLast = state.storeReviewCompletedQuestCountAtLastPrompt ?? 0;
  const questDelta = completedQuestsCount - countAtLast;

  if (count === 1) return daysBetween(dismissed, today) >= 14 || questDelta >= 10;
  if (count === 2) return daysBetween(dismissed, today) >= 30 || questDelta >= 20;
  // count >= 3: time-only cooldown, no quest-delta shortcut
  return daysBetween(dismissed, today) >= 60;
}

export function recordStoreReviewPromptShown(completedQuestsCount: number): void {
  const { setStoreReviewPromptLastShownAt, setStoreReviewCompletedQuestCountAtLastPrompt } =
    useSettingsStore.getState();
  setStoreReviewPromptLastShownAt(todayLocalDate());
  setStoreReviewCompletedQuestCountAtLastPrompt(completedQuestsCount);
}

export function recordStoreReviewPromptDismissed(): void {
  const {
    storeReviewPromptDismissCount,
    setStoreReviewPromptDismissCount,
    setStoreReviewPromptDismissedAt,
    setStoreReviewPromptLastShownAt,
  } = useSettingsStore.getState();
  const today = todayLocalDate();
  setStoreReviewPromptDismissCount(storeReviewPromptDismissCount + 1);
  setStoreReviewPromptDismissedAt(today);
  setStoreReviewPromptLastShownAt(today);
  // storeReviewCompletedQuestCountAtLastPrompt is intentionally preserved — not updated on dismiss
}

export function recordStoreReviewRequested(): void {
  const { setStoreReviewRequestedAt, setStoreReviewPromptLastShownAt } =
    useSettingsStore.getState();
  setStoreReviewRequestedAt(new Date().toISOString()); // ISO timestamp
  setStoreReviewPromptLastShownAt(todayLocalDate());   // local YYYY-MM-DD
}

export async function openGooglePlayListing(): Promise<boolean> {
  const marketUrl = `market://details?id=${PACKAGE_NAME}`;
  const webUrl = `https://play.google.com/store/apps/details?id=${PACKAGE_NAME}`;
  try {
    await Linking.openURL(marketUrl);
    return true;
  } catch {
    try {
      await Linking.openURL(webUrl);
      return true;
    } catch {
      Alert.alert(
        'Could not open Google Play',
        'Visit play.google.com to rate QuestDeck.',
      );
      return false;
    }
  }
}
