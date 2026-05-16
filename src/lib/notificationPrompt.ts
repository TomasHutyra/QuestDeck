import { useSettingsStore } from '../stores/settingsStore';
import { todayLocalDate } from './xp';

type PromptState = {
  dailyReminderEnabled: boolean;
  notificationPromptDismissCount: number;
  notificationPromptDismissedAt: string | null;
  notificationPromptLastShownAt: string | null;
};

function daysBetween(a: string, b: string): number {
  return Math.floor(
    (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24),
  );
}

export function shouldShowNotificationPrompt(state: PromptState, today: string): boolean {
  if (state.dailyReminderEnabled) return false;
  // -1 = permanently suppressed (user tapped "Remind me" and it was set up)
  if (state.notificationPromptDismissCount < 0) return false;
  // Don't show twice in the same day
  if (state.notificationPromptLastShownAt === today) return false;

  const count = state.notificationPromptDismissCount;
  if (count === 0) return true;

  const lastDismissed = state.notificationPromptDismissedAt;
  if (!lastDismissed) return true;

  const cooldownDays = count === 1 ? 3 : 7;
  return daysBetween(lastDismissed, today) >= cooldownDays;
}

export function recordNotificationPromptShown(): void {
  useSettingsStore.getState().setNotificationPromptLastShownAt(todayLocalDate());
}

export function recordNotificationPromptDismissed(): void {
  const { notificationPromptDismissCount, setNotificationPromptDismissCount, setNotificationPromptDismissedAt, setNotificationPromptLastShownAt } =
    useSettingsStore.getState();
  const today = todayLocalDate();
  setNotificationPromptDismissCount(notificationPromptDismissCount + 1);
  setNotificationPromptDismissedAt(today);
  setNotificationPromptLastShownAt(today);
}

export function recordNotificationPromptAccepted(): void {
  // -1 permanently suppresses further prompts
  useSettingsStore.getState().setNotificationPromptDismissCount(-1);
}

export function recordNotificationPromptIgnored(): void {
  useSettingsStore.getState().setNotificationPromptLastShownAt(todayLocalDate());
}
