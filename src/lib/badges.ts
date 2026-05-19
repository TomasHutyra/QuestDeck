import { BadgeDefinition, BadgeCondition } from '../data/badges';
import { Quest, CompletedQuest } from '../types';

export type BadgeEngineInput = {
  badgeDefinitions: BadgeDefinition[];
  completedQuests: CompletedQuest[];
  questById: Record<string, Quest>;
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  level: number;
};

export type BadgeProgress = {
  badge: BadgeDefinition;
  current: number;
  target: number;
  unlocked: boolean;
  progress: number; // 0..1
};

function evaluateCondition(
  condition: BadgeCondition,
  completedQuests: CompletedQuest[],
  questById: Record<string, Quest>,
  longestStreak: number,
): number {
  switch (condition.type) {
    case 'completed_count':
      // counts raw completions — no quest metadata needed
      return completedQuests.length;

    case 'streak_days':
      // uses longestStreak so the badge stays unlocked even if the current streak resets
      return longestStreak;

    case 'quest_location_count': {
      if (condition.location === 'any') {
        // "any" = any completion where quest metadata exists
        return completedQuests.filter((cq) => questById[cq.questId] != null).length;
      }
      return completedQuests.filter(
        (cq) => questById[cq.questId]?.location === condition.location,
      ).length;
    }

    case 'quest_mood_count':
      return completedQuests.filter(
        (cq) => questById[cq.questId]?.moods.includes(condition.mood),
      ).length;

    case 'quest_people_count': {
      const allowed = Array.isArray(condition.people)
        ? condition.people
        : [condition.people];
      return completedQuests.filter(
        (cq) => {
          const q = questById[cq.questId];
          return q != null && allowed.includes(q.people);
        },
      ).length;
    }

    case 'quest_category_count':
      return completedQuests.filter(
        (cq) => questById[cq.questId]?.category === condition.category,
      ).length;
  }
}

export function getBadgeProgress(input: BadgeEngineInput): BadgeProgress[] {
  const { badgeDefinitions, completedQuests, questById, longestStreak } = input;

  return badgeDefinitions.map((badge) => {
    const target = badge.condition.target;
    const raw = evaluateCondition(badge.condition, completedQuests, questById, longestStreak);
    const current = Math.min(raw, target);
    const unlocked = raw >= target;
    const progress = target > 0 ? Math.min(current / target, 1) : 1;
    return { badge, current, target, unlocked, progress };
  });
}

export function getNearestLockedBadges(input: BadgeEngineInput, count = 3): BadgeProgress[] {
  return getBadgeProgress(input)
    .filter((bp) => !bp.unlocked)
    .sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return (a.target - a.current) - (b.target - b.current);
    })
    .slice(0, count);
}
