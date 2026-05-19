import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type BadgeState = {
  unlockedAt: Record<string, string>; // badgeId → ISO timestamp
};

type BadgeActions = {
  recordUnlocked: (ids: string[], timestamp: string) => void;
  reset: () => void;
};

const initialState: BadgeState = {
  unlockedAt: {},
};

export const useBadgeStore = create<BadgeState & BadgeActions>()(
  persist(
    (set) => ({
      ...initialState,
      recordUnlocked: (ids, timestamp) =>
        set((s) => {
          const updated = { ...s.unlockedAt };
          for (const id of ids) {
            if (!(id in updated)) {
              updated[id] = timestamp;
            }
          }
          return { unlockedAt: updated };
        }),
      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEYS.BADGES,
      storage: jsonStorage,
    }
  )
);
