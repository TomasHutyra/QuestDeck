import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type PackState = {
  unlockedPackIds: string[];
};

type PackActions = {
  unlockPack: (packId: string) => void;
};

export const usePackStore = create<PackState & PackActions>()(
  persist(
    (set) => ({
      unlockedPackIds: ['free'],
      unlockPack: (packId) =>
        set((s) => ({
          unlockedPackIds: s.unlockedPackIds.includes(packId)
            ? s.unlockedPackIds
            : [...s.unlockedPackIds, packId],
        })),
    }),
    {
      name: STORAGE_KEYS.PACKS,
      storage: jsonStorage,
    }
  )
);
