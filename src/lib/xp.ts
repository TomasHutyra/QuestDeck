export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2200, 3000];

export const LEVEL_LABELS = [
  'Wanderer', 'Explorer', 'Adventurer', 'Pathfinder',
  'Quest Seeker', 'Story Collector', 'Real-Life Hero', 'Legend',
];

export function calculateLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

export function xpProgressInCurrentLevel(xp: number): { earned: number; total: number } {
  const level = calculateLevel(xp);
  const levelIndex = level - 1;
  const currentThreshold = LEVEL_THRESHOLDS[levelIndex];
  const nextThreshold = LEVEL_THRESHOLDS[levelIndex + 1];

  // For the final level, calculate range from previous threshold
  if (nextThreshold === undefined && levelIndex > 0) {
    const prevThreshold = LEVEL_THRESHOLDS[levelIndex - 1];
    const range = currentThreshold - prevThreshold;
    return {
      earned: xp - prevThreshold,
      total: range,
    };
  }

  // For other levels
  return {
    earned: xp - currentThreshold,
    total: nextThreshold! - currentThreshold,
  };
}

export function todayLocalDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function updateStreak(
  currentStreak: number,
  longestStreak: number,
  lastCompletedDate: string | null,
  todayDate: string
): { newStreak: number; newLongest: number } {
  if (lastCompletedDate === todayDate) {
    return { newStreak: currentStreak, newLongest: longestStreak };
  }

  let newStreak: number;
  if (lastCompletedDate === null) {
    newStreak = 1;
  } else {
    const last = new Date(lastCompletedDate);
    const today = new Date(todayDate);
    const diffDays = Math.round((today.getTime() - last.getTime()) / 86400000);
    newStreak = diffDays === 1 ? currentStreak + 1 : 1;
  }

  const newLongest = newStreak > longestStreak ? newStreak : longestStreak;
  return { newStreak, newLongest };
}
