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
