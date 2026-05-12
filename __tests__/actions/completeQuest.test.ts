import { completeQuest } from '../../src/actions/completeQuest';
import { useQuestStore } from '../../src/stores/questStore';
import { useProgressStore } from '../../src/stores/progressStore';
import { Quest } from '../../src/types';

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

const questMedium: Quest = { ...questEasy, id: 'test-quest-medium', difficulty: 'medium', xp: 20 };

beforeEach(() => {
  useQuestStore.setState({
    completedQuests: [],
    activeQuestId: null,
    lastRevealedQuestIds: [],
  });
  useProgressStore.setState({
    totalXp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletedDate: null,
  });
});

describe('completeQuest', () => {
  it('returns completed status with xpAwarded and questId', () => {
    const result = completeQuest(questEasy);
    expect(result.status).toBe('completed');
    expect(result.xpAwarded).toBe(10);
    expect(result.questId).toBe('test-quest-easy');
  });

  it('appends to completedQuests with correct fields', () => {
    completeQuest(questEasy);
    const { completedQuests } = useQuestStore.getState();
    expect(completedQuests).toHaveLength(1);
    expect(completedQuests[0].questId).toBe('test-quest-easy');
    expect(completedQuests[0].xpAwarded).toBe(10);
    expect(completedQuests[0].completedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(completedQuests[0].completedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('adds XP to totalXp in progressStore', () => {
    completeQuest(questMedium);
    expect(useProgressStore.getState().totalXp).toBe(20);
  });

  it('recalculates level after XP award', () => {
    useProgressStore.setState({ totalXp: 90, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: null });
    completeQuest(questEasy);
    expect(useProgressStore.getState().level).toBe(2);
  });

  it('starts streak at 1 on first completion', () => {
    completeQuest(questEasy);
    expect(useProgressStore.getState().currentStreak).toBe(1);
  });

  it('sets lastCompletedDate to today', () => {
    completeQuest(questEasy);
    const today = new Date();
    const expected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    expect(useProgressStore.getState().lastCompletedDate).toBe(expected);
  });

  it('returns already_completed when quest was already done', () => {
    completeQuest(questEasy);
    const result = completeQuest(questEasy);
    expect(result.status).toBe('already_completed');
  });

  it('does not add XP on duplicate completion', () => {
    completeQuest(questEasy);
    completeQuest(questEasy);
    expect(useProgressStore.getState().totalXp).toBe(10);
  });

  it('does not add duplicate to completedQuests', () => {
    completeQuest(questEasy);
    completeQuest(questEasy);
    expect(useQuestStore.getState().completedQuests).toHaveLength(1);
  });

  it('reports levelUp true when XP crosses a threshold', () => {
    useProgressStore.setState({ totalXp: 90, level: 1, currentStreak: 0, longestStreak: 0, lastCompletedDate: null });
    const result = completeQuest(questEasy);
    expect(result.levelUp).toBe(true);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(2);
  });

  it('reports levelUp false when XP stays in same level', () => {
    const result = completeQuest(questEasy);
    expect(result.levelUp).toBe(false);
    expect(result.levelBefore).toBe(result.levelAfter);
  });

  it('reports streakExtended true on first completion', () => {
    const result = completeQuest(questEasy);
    expect(result.streakExtended).toBe(true);
    expect(result.streakBefore).toBe(0);
    expect(result.streakAfter).toBe(1);
  });

  it('already_completed preserves current progress values', () => {
    useProgressStore.setState({ totalXp: 50, level: 1, currentStreak: 3, longestStreak: 5, lastCompletedDate: null });
    completeQuest(questEasy); // first completion — streak resets to 1 (lastCompletedDate was null)
    const result = completeQuest(questEasy); // duplicate
    expect(result.status).toBe('already_completed');
    expect(result.xpAwarded).toBe(0);
    expect(result.totalXpBefore).toBe(60);   // 50 + 10 from first completion
    expect(result.totalXpAfter).toBe(60);
    expect(result.levelBefore).toBe(1);
    expect(result.levelAfter).toBe(1);
    expect(result.streakBefore).toBe(1);     // set to 1 by first completion (null lastCompletedDate resets streak)
    expect(result.streakAfter).toBe(1);
    expect(result.levelUp).toBe(false);
    expect(result.streakExtended).toBe(false);
  });
});
