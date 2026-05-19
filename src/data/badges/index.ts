import { Mood } from '../../types';
import rawBadges from './badges.json';

type PeopleValue = 'solo' | 'partner' | 'friends' | 'any';

export type BadgeCondition =
  | { type: 'completed_count'; target: number }
  | { type: 'streak_days'; target: number }
  | { type: 'quest_location_count'; location: 'indoors' | 'outdoors' | 'any'; target: number }
  | { type: 'quest_mood_count'; mood: Mood; target: number }
  | { type: 'quest_people_count'; people: PeopleValue | PeopleValue[]; target: number }
  | { type: 'quest_category_count'; category: string; target: number };

export type BadgeDefinition = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  image?: string;
  condition: BadgeCondition;
};

export const allBadges: BadgeDefinition[] = rawBadges as BadgeDefinition[];
