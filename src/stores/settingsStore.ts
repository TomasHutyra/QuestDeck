import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotionEnabled: boolean;
  onboardingSeen: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:MM
  notificationPromptDismissCount: number;
  notificationPromptDismissedAt: string | null; // YYYY-MM-DD of last "Maybe later"
  notificationPromptLastShownAt: string | null;  // YYYY-MM-DD of last show (dismiss or ignore)
};

type SettingsActions = {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotionEnabled: (v: boolean) => void;
  setOnboardingSeen: (v: boolean) => void;
  setDailyReminderEnabled: (v: boolean) => void;
  setDailyReminderTime: (v: string) => void;
  setNotificationPromptDismissCount: (v: number) => void;
  setNotificationPromptDismissedAt: (v: string | null) => void;
  setNotificationPromptLastShownAt: (v: string | null) => void;
};

const initialState: SettingsState = {
  soundEnabled: false,
  hapticsEnabled: true,
  reducedMotionEnabled: false,
  onboardingSeen: false,
  dailyReminderEnabled: false,
  dailyReminderTime: '18:00',
  notificationPromptDismissCount: 0,
  notificationPromptDismissedAt: null,
  notificationPromptLastShownAt: null,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...initialState,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setHapticsEnabled: (v) => set({ hapticsEnabled: v }),
      setReducedMotionEnabled: (v) => set({ reducedMotionEnabled: v }),
      setOnboardingSeen: (v) => set({ onboardingSeen: v }),
      setDailyReminderEnabled: (v) => set({ dailyReminderEnabled: v }),
      setDailyReminderTime: (v) => set({ dailyReminderTime: v }),
      setNotificationPromptDismissCount: (v) => set({ notificationPromptDismissCount: v }),
      setNotificationPromptDismissedAt: (v) => set({ notificationPromptDismissedAt: v }),
      setNotificationPromptLastShownAt: (v) => set({ notificationPromptLastShownAt: v }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: jsonStorage,
    }
  )
);
