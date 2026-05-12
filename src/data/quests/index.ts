import { Quest } from '../../types';
import freeQuests from './free.json';

export const allQuests: Quest[] = freeQuests as Quest[];

export const questById: Record<string, Quest> = Object.fromEntries(
  allQuests.map((q) => [q.id, q])
);
