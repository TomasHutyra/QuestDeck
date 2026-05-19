import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

export const STORAGE_KEYS = {
  PROGRESS: 'questdeck-progress',
  QUESTS: 'questdeck-quests',
  PACKS: 'questdeck-packs',
  SETTINGS: 'questdeck-settings',
  BADGES: 'questdeck-badges',
} as const;

export const jsonStorage = createJSONStorage(() => AsyncStorage);
