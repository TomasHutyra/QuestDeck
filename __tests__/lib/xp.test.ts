import {
  LEVEL_THRESHOLDS,
  LEVEL_LABELS,
  calculateLevel,
  xpProgressInCurrentLevel,
  todayLocalDate,
  updateStreak,
} from '../../src/lib/xp';

describe('calculateLevel', () => {
  it('returns 1 at 0 XP', () => {
    expect(calculateLevel(0)).toBe(1);
  });
  it('returns 1 at 99 XP', () => {
    expect(calculateLevel(99)).toBe(1);
  });
  it('returns 2 at exactly 100 XP', () => {
    expect(calculateLevel(100)).toBe(2);
  });
  it('returns 3 at 250 XP', () => {
    expect(calculateLevel(250)).toBe(3);
  });
  it('returns 8 at 3000 XP', () => {
    expect(calculateLevel(3000)).toBe(8);
  });
  it('caps at 8 beyond max threshold', () => {
    expect(calculateLevel(99999)).toBe(8);
  });
});

describe('xpProgressInCurrentLevel', () => {
  it('returns 0/100 at level 1 with 0 XP', () => {
    expect(xpProgressInCurrentLevel(0)).toEqual({ earned: 0, total: 100 });
  });
  it('returns 50/150 at 150 XP (level 2 runs 100–250)', () => {
    expect(xpProgressInCurrentLevel(150)).toEqual({ earned: 50, total: 150 });
  });
  it('returns full range for level 8 (last level)', () => {
    const result = xpProgressInCurrentLevel(3000);
    expect(result.earned).toBe(800);
    expect(result.total).toBe(800);
  });
});

describe('todayLocalDate', () => {
  it('returns a string matching YYYY-MM-DD', () => {
    expect(todayLocalDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('updateStreak', () => {
  const BASE = { currentStreak: 5, longestStreak: 7 };

  it('starts streak at 1 when lastCompletedDate is null', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, null, '2026-05-11');
    expect(result).toEqual({ newStreak: 1, newLongest: 7 });
  });
  it('increments streak when last date is yesterday', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, '2026-05-10', '2026-05-11');
    expect(result).toEqual({ newStreak: 6, newLongest: 7 });
  });
  it('updates longestStreak when currentStreak exceeds it', () => {
    const result = updateStreak(7, 7, '2026-05-10', '2026-05-11');
    expect(result).toEqual({ newStreak: 8, newLongest: 8 });
  });
  it('does not change streak when last date is today', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, '2026-05-11', '2026-05-11');
    expect(result).toEqual({ newStreak: 5, newLongest: 7 });
  });
  it('resets streak to 1 when gap is more than 1 day', () => {
    const result = updateStreak(BASE.currentStreak, BASE.longestStreak, '2026-05-08', '2026-05-11');
    expect(result).toEqual({ newStreak: 1, newLongest: 7 });
  });
});
