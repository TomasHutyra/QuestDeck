import {
  shouldShowNotificationPrompt,
} from '../../src/lib/notificationPrompt';

type PromptState = Parameters<typeof shouldShowNotificationPrompt>[0];

const base: PromptState = {
  dailyReminderEnabled: false,
  notificationPromptDismissCount: 0,
  notificationPromptDismissedAt: null,
  notificationPromptLastShownAt: null,
};

describe('shouldShowNotificationPrompt', () => {
  it('shows on first completion with no prior history', () => {
    expect(shouldShowNotificationPrompt(base, '2026-05-16')).toBe(true);
  });

  it('does not show if daily reminder is already enabled', () => {
    expect(shouldShowNotificationPrompt(
      { ...base, dailyReminderEnabled: true },
      '2026-05-16',
    )).toBe(false);
  });

  it('does not show if already shown today', () => {
    expect(shouldShowNotificationPrompt(
      { ...base, notificationPromptLastShownAt: '2026-05-16' },
      '2026-05-16',
    )).toBe(false);
  });

  it('does not show again within 3 days of first dismiss', () => {
    // dismissed on day 0, check on day 2 → still within 3-day window
    expect(shouldShowNotificationPrompt(
      { ...base, notificationPromptDismissCount: 1, notificationPromptDismissedAt: '2026-05-14', notificationPromptLastShownAt: '2026-05-14' },
      '2026-05-16',
    )).toBe(false);
  });

  it('shows again after 3 days on first dismiss', () => {
    // dismissed on day 0, check on day 3 → eligible
    expect(shouldShowNotificationPrompt(
      { ...base, notificationPromptDismissCount: 1, notificationPromptDismissedAt: '2026-05-13', notificationPromptLastShownAt: '2026-05-13' },
      '2026-05-16',
    )).toBe(true);
  });

  it('does not show again within 7 days of second dismiss', () => {
    // dismissed twice, last dismiss 6 days ago
    expect(shouldShowNotificationPrompt(
      { ...base, notificationPromptDismissCount: 2, notificationPromptDismissedAt: '2026-05-10', notificationPromptLastShownAt: '2026-05-10' },
      '2026-05-16',
    )).toBe(false);
  });

  it('shows again after 7 days on second+ dismiss', () => {
    // dismissed twice, last dismiss 7 days ago
    expect(shouldShowNotificationPrompt(
      { ...base, notificationPromptDismissCount: 2, notificationPromptDismissedAt: '2026-05-09', notificationPromptLastShownAt: '2026-05-09' },
      '2026-05-16',
    )).toBe(true);
  });

  it('does not show after "Remind me" permanently suppresses it', () => {
    // dismiss count of -1 signals permanent suppression
    expect(shouldShowNotificationPrompt(
      { ...base, notificationPromptDismissCount: -1 },
      '2026-05-16',
    )).toBe(false);
  });
});
