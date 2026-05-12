import { questSelector } from '../../src/lib/questSelector';
import { Quest } from '../../src/types';

const makeQuest = (overrides: Partial<Quest>): Quest => ({
  id: 'q1',
  title: 'Test Quest',
  description: 'desc',
  category: 'home',
  moods: ['bored'],
  durationMinutes: 10,
  difficulty: 'easy',
  people: 'solo',
  location: 'indoors',
  xp: 10,
  packId: 'free',
  ...overrides,
});

const makeQuests = (count: number, moodOverride = 'bored', packId = 'free'): Quest[] =>
  Array.from({ length: count }, (_, i) =>
    makeQuest({ id: `q${i + 1}`, moods: [moodOverride as any], packId })
  );

describe('questSelector', () => {
  it('returns up to count quests matching mood and pack', () => {
    const quests = makeQuests(10);
    const result = questSelector('bored', quests, ['free'], [], 3);
    expect(result).toHaveLength(3);
    result.forEach((q) => expect(q.packId).toBe('free'));
  });

  it('excludes quests from locked packs', () => {
    const quests = [
      makeQuest({ id: 'a', packId: 'free', moods: ['bored'] }),
      makeQuest({ id: 'b', packId: 'premium', moods: ['bored'] }),
    ];
    const result = questSelector('bored', quests, ['free'], [], 3);
    expect(result.every((q) => q.packId === 'free')).toBe(true);
  });

  it('prefers uncompleted quests', () => {
    const quests = makeQuests(5);
    const completedIds = ['q1', 'q2', 'q3'];
    const result = questSelector('bored', quests, ['free'], completedIds, 2);
    expect(result.every((q) => !completedIds.includes(q.id))).toBe(true);
  });

  it('fills with completed quests when not enough uncompleted', () => {
    const quests = makeQuests(3);
    const completedIds = ['q1', 'q2'];
    const result = questSelector('bored', quests, ['free'], completedIds, 3);
    expect(result).toHaveLength(3);
  });

  it('broadens to all moods when still not enough after filling completed', () => {
    const quests = [
      makeQuest({ id: 'a', moods: ['bored'] }),
      makeQuest({ id: 'b', moods: ['creative'] }),
      makeQuest({ id: 'c', moods: ['creative'] }),
    ];
    const completedIds = ['a'];
    const result = questSelector('bored', quests, ['free'], completedIds, 3);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when no quests exist', () => {
    const result = questSelector('bored', [], ['free'], [], 3);
    expect(result).toHaveLength(0);
  });

  it('returns fewer than count when total quests in all packs is small', () => {
    const quests = makeQuests(2);
    const result = questSelector('bored', quests, ['free'], [], 3);
    expect(result).toHaveLength(2);
  });

  it('never returns duplicate quests', () => {
    const quests = makeQuests(10);
    const result = questSelector('bored', quests, ['free'], [], 3);
    const ids = result.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
