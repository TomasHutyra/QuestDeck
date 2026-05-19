import { completeQuest } from '../../src/actions/completeQuest';
import { useQuestStore } from '../../src/stores/questStore';
import { useProgressStore } from '../../src/stores/progressStore';
import { useBadgeStore } from '../../src/stores/badgeStore';
import { getRecentlyUnlockedBadges, BadgeEngineInput } from '../../src/lib/badges';
import { allBadges } from '../../src/data/badges';
import { questById } from '../../src/data/quests';
import { Quest, CompletedQuest } from '../../src/types';

const questEasy: Quest = {
  id: 'test-quest-easy',
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
};

beforeEach(() => {
  useQuestStore.setState({ completedQuests: [], activeQuestId: null, lastRevealedQuestIds: [] });
  useProgressStore.setState({ totalXp: 0, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: null });
  useBadgeStore.setState({ unlockedAt: {} });
});

// ── getRecentlyUnlockedBadges ──────────────────────────────────────────────

describe('getRecentlyUnlockedBadges', () => {
  const makeInput = (count: number): BadgeEngineInput => ({
    badgeDefinitions: allBadges,
    completedQuests: Array.from({ length: count }, (_, i) => ({
      questId: `q${i}`,
      completedAt: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`,
      completedDate: `2026-01-${String(i + 1).padStart(2, '0')}`,
      xpAwarded: 10,
    })) as CompletedQuest[],
    questById,
    currentStreak: 0,
    longestStreak: 0,
    totalXp: count * 10,
    level: 1,
  });

  it('sorts by unlockedAt descending — most recently unlocked first', () => {
    // 10 completions → first_quest (target 1), getting_started (target 3), quest_collector (target 10) all unlocked
    const input = makeInput(10);
    const unlockedAt: Record<string, string> = {
      first_quest: '2026-01-01T00:00:00.000Z',      // oldest
      getting_started: '2026-01-10T00:00:00.000Z',  // newest
      quest_collector: '2026-01-05T00:00:00.000Z',  // middle
    };

    const result = getRecentlyUnlockedBadges(input, unlockedAt, 3);

    expect(result[0].badge.id).toBe('getting_started');
    expect(result[1].badge.id).toBe('quest_collector');
    expect(result[2].badge.id).toBe('first_quest');
  });

  it('badges missing from unlockedAt sort to oldest (before any timestamped badge)', () => {
    // 3 completions → first_quest (target 1) and getting_started (target 3) are unlocked
    const input = makeInput(3);
    const unlockedAt: Record<string, string> = {
      getting_started: '2026-01-03T00:00:00.000Z',
      // first_quest intentionally absent (simulates pre-feature user)
    };

    const result = getRecentlyUnlockedBadges(input, unlockedAt, 2);

    expect(result[0].badge.id).toBe('getting_started'); // has timestamp
    expect(result[1].badge.id).toBe('first_quest');     // missing → sorts last
  });
});

// ── completeQuest badge recording ─────────────────────────────────────────

describe('completeQuest badge recording', () => {
  it('completing first quest records first_quest in unlockedAt and returns it in newlyUnlockedBadgeIds', () => {
    const result = completeQuest(questEasy);

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['first_quest']).toBeDefined();
    expect(unlockedAt['first_quest']).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.newlyUnlockedBadgeIds).toContain('first_quest');
  });

  it('completing third quest records getting_started in unlockedAt and returns it in newlyUnlockedBadgeIds', () => {
    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
        { questId: 'q2', completedAt: '2026-01-02T00:00:00.000Z', completedDate: '2026-01-02', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({ totalXp: 20, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: null });

    // questEasy.id = 'test-quest-easy' — distinct from pre-seeded q1/q2, so not already_completed
    const result = completeQuest(questEasy);

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['getting_started']).toBeDefined();
    expect(result.newlyUnlockedBadgeIds).toContain('getting_started');
  });

  it('already_completed does not record any badge unlocks and returns empty newlyUnlockedBadgeIds', () => {
    completeQuest(questEasy);                    // first completion — records first_quest
    useBadgeStore.setState({ unlockedAt: {} });  // reset badge store
    const result = completeQuest(questEasy);     // already_completed — must not touch badge store

    expect(Object.keys(useBadgeStore.getState().unlockedAt)).toHaveLength(0);
    expect(result.newlyUnlockedBadgeIds).toEqual([]);
  });

  it('badges already unlocked before this completion are not re-recorded and not in newlyUnlockedBadgeIds', () => {
    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({ totalXp: 10, level: 1, currentStreak: 1, longestStreak: 1, lastCompletedDate: null });
    useBadgeStore.setState({ unlockedAt: { first_quest: '2026-01-01T00:00:00.000Z' } });

    // quest #2 — first_quest (target 1) was already unlocked before; should not appear in result
    const result = completeQuest(questEasy);

    expect(useBadgeStore.getState().unlockedAt['first_quest']).toBe('2026-01-01T00:00:00.000Z');
    expect(result.newlyUnlockedBadgeIds).not.toContain('first_quest');
  });

  it('multiple badges unlocked by one completion are recorded with the same timestamp', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');

    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
        { questId: 'q2', completedAt: '2026-01-02T00:00:00.000Z', completedDate: '2026-01-02', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({
      totalXp: 20, level: 1, currentStreak: 2, longestStreak: 2, lastCompletedDate: yesterdayStr,
    });

    // quest #3 with streak 2→3: unlocks getting_started (count≥3) AND three_day_streak (streak≥3)
    completeQuest(questEasy);

    const { unlockedAt } = useBadgeStore.getState();
    expect(unlockedAt['getting_started']).toBeDefined();
    expect(unlockedAt['three_day_streak']).toBeDefined();
    expect(unlockedAt['getting_started']).toBe(unlockedAt['three_day_streak']); // same nowIso
  });

  it('a single completion can return multiple newlyUnlockedBadgeIds', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = [
      yesterday.getFullYear(),
      String(yesterday.getMonth() + 1).padStart(2, '0'),
      String(yesterday.getDate()).padStart(2, '0'),
    ].join('-');

    useQuestStore.setState({
      completedQuests: [
        { questId: 'q1', completedAt: '2026-01-01T00:00:00.000Z', completedDate: '2026-01-01', xpAwarded: 10 },
        { questId: 'q2', completedAt: '2026-01-02T00:00:00.000Z', completedDate: '2026-01-02', xpAwarded: 10 },
      ],
      activeQuestId: null,
      lastRevealedQuestIds: [],
    });
    useProgressStore.setState({
      totalXp: 20, level: 1, currentStreak: 2, longestStreak: 2, lastCompletedDate: yesterdayStr,
    });

    // quest #3 with streak 2→3: getting_started (count≥3) + three_day_streak (streak≥3) both unlock
    const result = completeQuest(questEasy);

    expect(result.newlyUnlockedBadgeIds).toContain('getting_started');
    expect(result.newlyUnlockedBadgeIds).toContain('three_day_streak');
    expect(result.newlyUnlockedBadgeIds.length).toBeGreaterThanOrEqual(2);
  });
});
