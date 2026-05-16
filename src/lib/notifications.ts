import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const NOTIFICATION_ID = 'questdeck-daily-reminder';
export const DAILY_REMINDER_CHANNEL_ID = 'questdeck-daily-reminder';

export const DAILY_REMINDER_COPIES = [
  'Your daily quest is waiting.',
  'Draw a card and do something real.',
  'Got 10 minutes? Pick a small quest.',
];

function randomCopy(): string {
  return DAILY_REMINDER_COPIES[Math.floor(Math.random() * DAILY_REMINDER_COPIES.length)];
}

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL_ID, {
    name: 'Daily Reminder',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250],
    lightColor: '#FF8C42',
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDailyReminder(time: string): Promise<void> {
  // Ensure the Android channel exists before scheduling — safe to call multiple times
  await ensureNotificationChannel();
  await cancelDailyReminder();
  const [hours, minutes] = time.split(':').map(Number);
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'QuestDeck',
      body: randomCopy(),
      ...(Platform.OS === 'android' ? { channelId: DAILY_REMINDER_CHANNEL_ID } : {}),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
    },
  });
}

export async function cancelDailyReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
}
