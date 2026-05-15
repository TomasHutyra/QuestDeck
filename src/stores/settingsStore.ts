import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type SettingsState = {
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  reducedMotionEnabled: boolean;
  onboardingSeen: boolean;
};

type SettingsActions = {
  setSoundEnabled: (v: boolean) => void;
  setHapticsEnabled: (v: boolean) => void;
  setReducedMotionEnabled: (v: boolean) => void;
  setOnboardingSeen: (v: boolean) => void;
};

const initialState: SettingsState = {
  soundEnabled: false,
  hapticsEnabled: true,
  reducedMotionEnabled: false,
  onboardingSeen: false,
};

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      ...initialState,
      setSoundEnabled: (v) => set({ soundEnabled: v }),
      setHapticsEnabled: (v) => set({ hapticsEnabled: v }),
      setReducedMotionEnabled: (v) => set({ reducedMotionEnabled: v }),
      setOnboardingSeen: (v) => set({ onboardingSeen: v }),
    }),
    {
      name: STORAGE_KEYS.SETTINGS,
      storage: jsonStorage,
    }
  )
);
