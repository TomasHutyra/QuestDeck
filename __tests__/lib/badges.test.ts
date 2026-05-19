import { getBadgeProgress, getNearestLockedBadges } from '../../src/lib/badges';
import { allBadges } from '../../src/data/badges';
import { Quest, CompletedQuest } from '../../src/types';

function makeCompleted(questId: string, override?: Partial<CompletedQuest>): CompletedQuest {
  return {
    questId,
    completedAt: '2026-05-01T10:00:00.000Z',
    completedDate: '2026-05-01',
    xpAwarded: 10,
    ...override,
  };
}

function makeQuest(id: string, override?: Partial<Quest>): Quest {
  return {
    id,
    title: 'Test Quest',
    description: 'A quest',
    category: 'home',
    moods: ['bored'],
    durationMinutes: 15,
    difficulty: 'easy',
    people: 'solo',
    location: 'indoors',
    xp: 10,
    packId: 'free',
    ...override,
  };
}

const baseInput = {
  badgeDefinitions: allBadges,
  completedQuests: [] as CompletedQuest[],
  questById: {} as Record<string, Quest>,
  currentStreak: 0,
  longestStreak: 0,
  totalXp: 0,
  level: 1,
};

describe('getBadgeProgress', () => {
  it('returns all badges locked with current 0 when no quests completed', () => {
    const results = getBadgeProgress(baseInput);
    expect(results.every((r) => !r.unlocked)).toBe(true);
    expect(results.every((r) => r.current === 0)).toBe(true);
  });

  it('unlocks first_quest after 1 completed quest', () => {
    const questById = { q1: makeQuest('q1') };
    const results = getBadgeProgress({
      ...baseInput,
      completedQuests: [makeCompleted('q1')],
      questById,
    });
    const badge = results.find((r) => r.badge.id === 'first_quest')!;
    expect(badge.unlocked).toBe(true);
    expect(badge.current).toBe(1);
  });

  it('unlocks getting_started after 3 completed quests', () => {
    const questById = { q1: makeQuest('q1'), q2: makeQuest('q2'), q3: makeQuest('q3') };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2'), makeCompleted('q3')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'getting_started')!.unlocked).toBe(true);
  });

  it('unlocks quest_collector after 10 completed quests', () => {
    const questById: Record<string, Quest> = {};
    const completedQuests: CompletedQuest[] = [];
    for (let i = 0; i < 10; i++) {
      questById[`q${i}`] = makeQuest(`q${i}`);
      completedQuests.push(makeCompleted(`q${i}`));
    }
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'quest_collector')!.unlocked).toBe(true);
  });

  it('unlocks three_day_streak when longestStreak is 3', () => {
    const results = getBadgeProgress({ ...baseInput, longestStreak: 3 });
    expect(results.find((r) => r.badge.id === 'three_day_streak')!.unlocked).toBe(true);
  });

  it('unlocks seven_day_streak when longestStreak is 7', () => {
    const results = getBadgeProgress({ ...baseInput, longestStreak: 7 });
    expect(results.find((r) => r.badge.id === 'seven_day_streak')!.unlocked).toBe(true);
  });

  it('unlocks fresh_air after 3 outdoor quests', () => {
    const questById = {
      q1: makeQuest('q1', { location: 'outdoors' }),
      q2: makeQuest('q2', { location: 'outdoors' }),
      q3: makeQuest('q3', { location: 'outdoors' }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2'), makeCompleted('q3')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'fresh_air')!.unlocked).toBe(true);
  });

  it('shows partial progress for creative_spark with 1 creative quest', () => {
    const questById = { q1: makeQuest('q1', { moods: ['creative'] }) };
    const results = getBadgeProgress({
      ...baseInput,
      completedQuests: [makeCompleted('q1')],
      questById,
    });
    const badge = results.find((r) => r.badge.id === 'creative_spark')!;
    expect(badge.unlocked).toBe(false);
    expect(badge.current).toBe(1);
    expect(badge.progress).toBeCloseTo(1 / 3);
  });

  it('counts completed_count even when questById has no metadata for that id', () => {
    const completedQuests = [makeCompleted('missing_id')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById: {} });
    // completed_count counts raw completions — no metadata needed
    expect(results.find((r) => r.badge.id === 'first_quest')!.unlocked).toBe(true);
    // location-based badge stays at 0 — no quest metadata to inspect
    expect(results.find((r) => r.badge.id === 'fresh_air')!.current).toBe(0);
  });

  it('unlocks social_starter with 2 partner quests (array people condition)', () => {
    const questById = {
      q1: makeQuest('q1', { people: 'partner' }),
      q2: makeQuest('q2', { people: 'partner' }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'social_starter')!.unlocked).toBe(true);
  });

  it('unlocks social_starter with 1 partner + 1 friends quest', () => {
    const questById = {
      q1: makeQuest('q1', { people: 'partner' }),
      q2: makeQuest('q2', { people: 'friends' }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'social_starter')!.unlocked).toBe(true);
  });

  it('does not count solo quests toward social_starter', () => {
    const questById = { q1: makeQuest('q1', { people: 'solo' }), q2: makeQuest('q2', { people: 'solo' }) };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2')];
    const results = getBadgeProgress({ ...baseInput, completedQuests, questById });
    expect(results.find((r) => r.badge.id === 'social_starter')!.unlocked).toBe(false);
  });
});

describe('getNearestLockedBadges', () => {
  it('returns at most 3 by default and all are locked', () => {
    const results = getNearestLockedBadges(baseInput);
    expect(results.length).toBeLessThanOrEqual(3);
    expect(results.every((r) => !r.unlocked)).toBe(true);
  });

  it('sorts locked badges by progress descending', () => {
    const questById = {
      q1: makeQuest('q1', { location: 'outdoors', moods: ['creative'] }),
      q2: makeQuest('q2', { location: 'outdoors', moods: ['creative'] }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2')];
    const results = getNearestLockedBadges({ ...baseInput, completedQuests, questById }, 10);
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].progress).toBeGreaterThanOrEqual(results[i + 1].progress);
    }
  });

  it('when progress is equal, badge with fewer remaining completions comes first', () => {
    // 2 completions give fresh_air 2/3, creative_spark 2/3, getting_started 2/3 (remaining=1 each)
    // quest_collector is 2/10 (remaining=8) — lower progress, should rank after them
    const questById = {
      q1: makeQuest('q1', { location: 'outdoors', moods: ['creative'] }),
      q2: makeQuest('q2', { location: 'outdoors', moods: ['creative'] }),
    };
    const completedQuests = [makeCompleted('q1'), makeCompleted('q2')];
    const results = getNearestLockedBadges({ ...baseInput, completedQuests, questById }, 10);
    const freshAirIdx = results.findIndex((r) => r.badge.id === 'fresh_air');
    const questCollectorIdx = results.findIndex((r) => r.badge.id === 'quest_collector');
    expect(questCollectorIdx).toBeGreaterThan(freshAirIdx);
  });

  it('returns empty array when all badges are unlocked', () => {
    const questById: Record<string, Quest> = {};
    const completedQuests: CompletedQuest[] = [];
    for (let i = 0; i < 25; i++) {
      questById[`q${i}`] = makeQuest(`q${i}`, {
        location: 'outdoors',
        moods: ['creative', 'need-reset'],
        people: 'friends',
      });
      completedQuests.push(makeCompleted(`q${i}`));
    }
    const results = getNearestLockedBadges(
      { ...baseInput, completedQuests, questById, longestStreak: 7 },
    );
    expect(results).toHaveLength(0);
  });
});
