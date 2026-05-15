import { Pack } from '../types';

export const PACKS: Pack[] = [
  {
    id: 'free',
    name: 'Free Pack',
    description: 'Everyday quests for any mood',
    isPremium: false,
    emoji: '🎒',
    questCount: 100,
  },
  {
    id: 'date-night',
    name: 'Date Night',
    description: 'Quests built for two — conversation, adventure, and connection',
    isPremium: true,
    emoji: '💑',
    questCount: 25,
  },
  {
    id: 'city-explorer',
    name: 'City Explorer',
    description: 'Urban adventures to discover your city like a stranger would',
    isPremium: true,
    emoji: '🌆',
    questCount: 20,
  },
];

export const packById: Record<string, Pack> = Object.fromEntries(
  PACKS.map((p) => [p.id, p])
);
