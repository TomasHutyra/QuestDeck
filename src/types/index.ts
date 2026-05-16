export type Mood =
  | 'bored'
  | 'at-home'
  | 'outside'
  | 'partner'
  | 'friends'
  | 'weekend'
  | 'creative'
  | 'need-reset';

export type Quest = {
  id: string;
  title: string;
  description: string;
  category: string;
  moods: Mood[];
  durationMinutes: number;
  difficulty: 'easy' | 'medium' | 'hard';
  people: 'solo' | 'partner' | 'friends' | 'any';
  location: 'indoors' | 'outdoors' | 'any';
  xp: number;
  packId: string;
  optionalTip?: string;
};

export type Pack = {
  id: string;
  name: string;
  description: string;
  isPremium: boolean;
  emoji: string;
  questCount: number;
};

export type CompletedQuest = {
  questId: string;
  completedAt: string;   // ISO timestamp — for ordering
  completedDate: string; // local YYYY-MM-DD — for streak logic
  xpAwarded: number;
  photoUri?: string;
};

export type MoodMeta = {
  id: Mood;
  label: string;
  emoji: string;
};

export type CompleteQuestResult = {
  status: 'completed' | 'already_completed';
  questId: string;
  xpAwarded: number;
  totalXpBefore: number;
  totalXpAfter: number;
  levelBefore: number;
  levelAfter: number;
  levelUp: boolean;
  streakBefore: number;
  streakAfter: number;
  streakExtended: boolean;
};
