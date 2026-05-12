import quests from '../src/data/quests/free.json';
import { PACKS } from '../src/data/packs';
import { Mood } from '../src/types';

const VALID_MOODS: Mood[] = [
  'bored', 'at-home', 'outside', 'partner', 'friends', 'weekend', 'creative', 'need-reset',
];
const VALID_PACK_IDS = PACKS.map((p) => p.id);
const XP_BY_DIFFICULTY: Record<string, number> = { easy: 10, medium: 20, hard: 30 };

const errors: string[] = [];
const seenIds = new Set<string>();

for (const quest of quests as any[]) {
  const { id, moods, packId, difficulty, xp } = quest;

  if (seenIds.has(id)) {
    errors.push(`Duplicate id: ${id}`);
  }
  seenIds.add(id);

  if (!Array.isArray(moods) || moods.length === 0) {
    errors.push(`${id}: moods must be a non-empty array`);
  } else {
    for (const mood of moods) {
      if (!VALID_MOODS.includes(mood)) {
        errors.push(`${id}: invalid mood "${mood}"`);
      }
    }
  }

  if (!VALID_PACK_IDS.includes(packId)) {
    errors.push(`${id}: unknown packId "${packId}"`);
  }

  const expectedXp = XP_BY_DIFFICULTY[difficulty];
  if (expectedXp !== undefined && xp !== expectedXp) {
    errors.push(`${id}: xp is ${xp} but difficulty "${difficulty}" expects ${expectedXp}`);
  }
}

if (errors.length > 0) {
  console.error('Quest validation failed:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
} else {
  console.log(`✓ All ${quests.length} quests valid.`);
}
