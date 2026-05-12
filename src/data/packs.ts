import { Pack } from '../types';

export const PACKS: Pack[] = [
  {
    id: 'free',
    name: 'Free Pack',
    description: 'Everyday quests for any mood',
    isPremium: false,
    emoji: '🎒',
  },
  {
    id: 'date-night',
    name: 'Date Night',
    description: '25 quests for couples',
    isPremium: true,
    emoji: '💑',
  },
  {
    id: 'city-explorer',
    name: 'City Explorer',
    description: '20 outdoor urban quests',
    isPremium: true,
    emoji: '🌆',
  },
];

export const packById: Record<string, Pack> = Object.fromEntries(
  PACKS.map((p) => [p.id, p])
);
