import {
  LOCK_MINIMUM_MS,
  getLockDurationMs,
  hasMetLockMinimum,
} from '../../src/lib/questLockGate';

describe('getLockDurationMs', () => {
  it('returns the difference when both timestamps are present', () => {
    expect(getLockDurationMs(1000, 61000)).toBe(60000);
  });
  it('returns null when screenOffAt is null', () => {
    expect(getLockDurationMs(null, 61000)).toBeNull();
  });
  it('returns null when screenOnAt is null', () => {
    expect(getLockDurationMs(1000, null)).toBeNull();
  });
});

describe('hasMetLockMinimum', () => {
  it('returns true at exactly LOCK_MINIMUM_MS', () => {
    expect(hasMetLockMinimum(0, LOCK_MINIMUM_MS)).toBe(true);
  });
  it('returns false at LOCK_MINIMUM_MS - 1', () => {
    expect(hasMetLockMinimum(0, LOCK_MINIMUM_MS - 1)).toBe(false);
  });
  it('returns false when screenOffAt is null', () => {
    expect(hasMetLockMinimum(null, LOCK_MINIMUM_MS)).toBe(false);
  });
  it('returns false when screenOnAt is null', () => {
    expect(hasMetLockMinimum(0, null)).toBe(false);
  });
  it('returns false when both timestamps are null (state after session reset)', () => {
    expect(hasMetLockMinimum(null, null)).toBe(false);
  });
  it('returns false when screenOnAt < screenOffAt (invalid ordering)', () => {
    expect(hasMetLockMinimum(61000, 1000)).toBe(false);
  });
});
