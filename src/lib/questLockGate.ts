export const LOCK_MINIMUM_MS = 60_000;

export function getLockDurationMs(
  screenOffAt: number | null,
  screenOnAt: number | null,
): number | null {
  if (screenOffAt === null || screenOnAt === null) return null;
  return screenOnAt - screenOffAt;
}

export function hasMetLockMinimum(
  screenOffAt: number | null,
  screenOnAt: number | null,
): boolean {
  const duration = getLockDurationMs(screenOffAt, screenOnAt);
  return duration !== null && duration >= LOCK_MINIMUM_MS;
}
