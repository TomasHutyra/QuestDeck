import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CompletedQuest } from '../types';
import { STORAGE_KEYS, jsonStorage } from '../lib/storage';

type QuestState = {
  completedQuests: CompletedQuest[];
  activeQuestId: string | null;
  lastRevealedQuestIds: string[];
};

type QuestActions = {
  addCompletedQuest: (cq: CompletedQuest) => void;
  setActiveQuestId: (id: string | null) => void;
  setLastRevealedQuestIds: (ids: string[]) => void;
  clearLastRevealedQuestIds: () => void;
  clearActiveAndRevealed: () => void;
};

const initialState: QuestState = {
  completedQuests: [],
  activeQuestId: null,
  lastRevealedQuestIds: [],
};

export const useQuestStore = create<QuestState & QuestActions>()(
  persist(
    (set) => ({
      ...initialState,
      addCompletedQuest: (cq) =>
        set((s) => ({ completedQuests: [...s.completedQuests, cq] })),
      setActiveQuestId: (id) => set({ activeQuestId: id }),
      setLastRevealedQuestIds: (ids) => set({ lastRevealedQuestIds: ids }),
      clearLastRevealedQuestIds: () => set({ lastRevealedQuestIds: [] }),
      clearActiveAndRevealed: () =>
        set({ activeQuestId: null, lastRevealedQuestIds: [] }),
    }),
    {
      name: STORAGE_KEYS.QUESTS,
      storage: jsonStorage,
    }
  )
);
