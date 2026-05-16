import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotionEnabled: boolean;
  onboardingSeen: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string; // HH:MM, e.g. "09:00"
};

type SettingsActions = {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotionEnabled: (v: boolean) => void;
  setOnboardingSeen: (v: boolean) => void;
  setDailyReminderEnabled: (v: boolean) => void;
  setDailyReminderTime: (v: string) => void;
};

const initialState: SettingsState = {
  soundEnabled: false,
  hapticsEnabled: true,
  reducedMotionEnabled: false,
  onboardingSeen: false,
  dailyReminderEnabled: false,
  dailyReminderTime: '09:00',
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
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: jsonStorage,
    }
  )
);
