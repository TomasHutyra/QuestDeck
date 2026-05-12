import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type ProgressState = {
  totalXp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
};

type ProgressActions = {
  updateAfterCompletion: (update: ProgressState) => void;
  reset: () => void;
};

const initialState: ProgressState = {
  totalXp: 0,
  level: 1,
  currentStreak: 0,
  longestStreak: 0,
  lastCompletedDate: null,
};

export const useProgressStore = create<ProgressState & ProgressActions>()(
  persist(
    (set) => ({
      ...initialState,
      updateAfterCompletion: (update) => set(update),
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.PROGRESS,
      storage: jsonStorage,
    }
  )
);
