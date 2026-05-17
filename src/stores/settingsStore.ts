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
  // Store review prompt — local dates unless noted
  storeReviewPromptLastShownAt: string | null;              // YYYY-MM-DD of last show (dismiss or ignore)
  storeReviewPromptDismissedAt: string | null;              // YYYY-MM-DD of last "Maybe later"
  storeReviewPromptDismissCount: number;
  storeReviewRequestedAt: string | null;                    // ISO timestamp when user tapped "Rate QuestDeck"
  storeReviewCompletedQuestCountAtLastPrompt: number | null; // total completed quests when prompt last shown
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
  setStoreReviewPromptLastShownAt: (v: string | null) => void;
  setStoreReviewPromptDismissedAt: (v: string | null) => void;
  setStoreReviewPromptDismissCount: (v: number) => void;
  setStoreReviewRequestedAt: (v: string | null) => void;
  setStoreReviewCompletedQuestCountAtLastPrompt: (v: number | null) => void;
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
  storeReviewPromptLastShownAt: null,
  storeReviewPromptDismissedAt: null,
  storeReviewPromptDismissCount: 0,
  storeReviewRequestedAt: null,
  storeReviewCompletedQuestCountAtLastPrompt: null,
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
      setStoreReviewPromptLastShownAt: (v) => set({ storeReviewPromptLastShownAt: v }),
      setStoreReviewPromptDismissedAt: (v) => set({ storeReviewPromptDismissedAt: v }),
      setStoreReviewPromptDismissCount: (v) => set({ storeReviewPromptDismissCount: v }),
      setStoreReviewRequestedAt: (v) => set({ storeReviewRequestedAt: v }),
      setStoreReviewCompletedQuestCountAtLastPrompt: (v) => set({ storeReviewCompletedQuestCountAtLastPrompt: v }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: jsonStorage,
    }
  )
);
