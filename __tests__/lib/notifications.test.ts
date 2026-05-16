import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
  ensureNotificationChannel,
  DAILY_REMINDER_COPIES,
} from '../../src/lib/notifications';

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
}));

describe('requestNotificationPermission', () => {
  it('returns true when permission is granted', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    expect(await requestNotificationPermission()).toBe(true);
  });

  it('returns false when permission is denied', async () => {
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
    expect(await requestNotificationPermission()).toBe(false);
  });
});

describe('scheduleDailyReminder', () => {
  beforeEach(() => {
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notification-id');
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(null);
  });

  it('schedules with the correct hour and minute', async () => {
    await scheduleDailyReminder('09:30');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: expect.objectContaining({ hour: 9, minute: 30 }),
      })
    );
  });

  it('cancels any existing reminder before scheduling a new one', async () => {
    await scheduleDailyReminder('08:00');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('includes a non-empty body from DAILY_REMINDER_COPIES', async () => {
    await scheduleDailyReminder('08:00');
    const call = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(DAILY_REMINDER_COPIES).toContain(call.content.body);
  });
});

describe('cancelDailyReminder', () => {
  it('calls cancelScheduledNotificationAsync', async () => {
    (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);
    await cancelDailyReminder();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalled();
  });
});

describe('ensureNotificationChannel', () => {
  it('calls setNotificationChannelAsync on Android', async () => {
    Object.defineProperty(Platform, 'OS', { get: () => 'android' });
    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(null);
    await ensureNotificationChannel();
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalled();
  });
});

describe('DAILY_REMINDER_COPIES', () => {
  it('has at least 3 copy strings', () => {
    expect(DAILY_REMINDER_COPIES.length).toBeGreaterThanOrEqual(3);
  });
});
