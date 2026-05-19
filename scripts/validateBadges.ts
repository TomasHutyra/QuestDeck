import badges from '../src/data/badges/badges.json';
import { Mood } from '../src/types';

const VALID_CONDITION_TYPES = [
  'completed_count',
  'streak_days',
  'quest_location_count',
  'quest_mood_count',
  'quest_people_count',
  'quest_category_count',
];

const VALID_MOODS: Mood[] = [
  'bored', 'at-home', 'outside', 'partner', 'friends', 'weekend', 'creative', 'need-reset',
];

const VALID_LOCATIONS = ['indoors', 'outdoors', 'any'];
const VALID_PEOPLE = ['solo', 'partner', 'friends', 'any'];

const errors: string[] = [];
const seenIds = new Set<string>();

for (const badge of badges as any[]) {
  const { id, name, description, emoji, image, condition } = badge;

  if (!id || typeof id !== 'string') {
    errors.push('Badge missing valid id');
    continue;
  }

  if (seenIds.has(id)) errors.push(`Duplicate badge id: ${id}`);
  seenIds.add(id);

  if (!name) errors.push(`${id}: name is missing or empty`);
  if (!description) errors.push(`${id}: description is missing or empty`);
  if (!emoji) errors.push(`${id}: emoji is missing or empty`);

  if (image !== undefined) {
    const expected = `badge_${id}.png`;
    if (image !== expected) {
      errors.push(`${id}: image must be "${expected}", got "${image}"`);
    }
  }

  if (!condition || typeof condition !== 'object') {
    errors.push(`${id}: condition is missing`);
    continue;
  }

  if (!VALID_CONDITION_TYPES.includes(condition.type)) {
    errors.push(`${id}: invalid condition type "${condition.type}"`);
  }

  if (!Number.isInteger(condition.target) || condition.target <= 0) {
    errors.push(`${id}: condition.target must be a positive integer, got "${condition.target}"`);
  }

  if (condition.type === 'quest_mood_count') {
    if (!VALID_MOODS.includes(condition.mood)) {
      errors.push(`${id}: invalid mood "${condition.mood}"`);
    }
  }

  if (condition.type === 'quest_people_count') {
    const peopleValues: string[] = Array.isArray(condition.people)
      ? condition.people
      : [condition.people];
    for (const p of peopleValues) {
      if (!VALID_PEOPLE.includes(p)) {
        errors.push(`${id}: invalid people value "${p}"`);
      }
    }
  }

  if (condition.type === 'quest_location_count') {
    if (!VALID_LOCATIONS.includes(condition.location)) {
      errors.push(`${id}: invalid location "${condition.location}"`);
    }
  }

  if (condition.type === 'quest_category_count') {
    if (!condition.category || typeof condition.category !== 'string') {
      errors.push(`${id}: condition.category must be a non-empty string`);
    }
  }
}

if (errors.length > 0) {
  console.error('Badge validation failed:\n' + errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
} else {
  console.log(`✓ All ${(badges as any[]).length} badges valid.`);
}
