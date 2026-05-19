import { Quest, CompleteQuestResult } from '../types';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { useBadgeStore } from '../stores/badgeStore';
import { calculateLevel, updateStreak, todayLocalDate } from '../lib/xp';
import { getBadgeProgress, BadgeEngineInput } from '../lib/badges';
import { allBadges } from '../data/badges';
import { questById } from '../data/quests';

export function completeQuest(quest: Quest): CompleteQuestResult {
  const { completedQuests } = useQuestStore.getState();
  const { totalXp, level, currentStreak, longestStreak, lastCompletedDate } =
    useProgressStore.getState();

  if (completedQuests.some((cq) => cq.questId === quest.id)) {
    return {
      status: 'already_completed',
      questId: quest.id,
      xpAwarded: 0,
      totalXpBefore: totalXp,
      totalXpAfter: totalXp,
      levelBefore: level,
      levelAfter: level,
      levelUp: false,
      streakBefore: currentStreak,
      streakAfter: currentStreak,
      streakExtended: false,
    };
  }

  const nowIso = new Date().toISOString();
  const completedDate = todayLocalDate();

  const beforeInput: BadgeEngineInput = {
    badgeDefinitions: allBadges,
    completedQuests,
    questById,
    currentStreak,
    longestStreak,
    totalXp,
    level,
  };
  const beforeBadgeProgress = getBadgeProgress(beforeInput);

  useQuestStore.getState().addCompletedQuest({
    questId: quest.id,
    completedAt: nowIso,
    completedDate,
    xpAwarded: quest.xp,
  });

  const newTotalXp = totalXp + quest.xp;
  const newLevel = calculateLevel(newTotalXp);
  const { newStreak, newLongest } = updateStreak(
    currentStreak,
    longestStreak,
    lastCompletedDate,
    completedDate
  );

  useProgressStore.getState().updateAfterCompletion({
    totalXp: newTotalXp,
    level: newLevel,
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastCompletedDate: completedDate,
  });

  const afterInput: BadgeEngineInput = {
    badgeDefinitions: allBadges,
    completedQuests: [
      ...completedQuests,
      { questId: quest.id, completedAt: nowIso, completedDate, xpAwarded: quest.xp },
    ],
    questById,
    currentStreak: newStreak,
    longestStreak: newLongest,
    totalXp: newTotalXp,
    level: newLevel,
  };
  const afterBadgeProgress = getBadgeProgress(afterInput);

  const newlyUnlockedIds = afterBadgeProgress
    .filter((after) => {
      const before = beforeBadgeProgress.find((b) => b.badge.id === after.badge.id);
      return before !== undefined && !before.unlocked && after.unlocked;
    })
    .map((bp) => bp.badge.id);

  if (newlyUnlockedIds.length > 0) {
    useBadgeStore.getState().recordUnlocked(newlyUnlockedIds, nowIso);
  }

  return {
    status: 'completed',
    questId: quest.id,
    xpAwarded: quest.xp,
    totalXpBefore: totalXp,
    totalXpAfter: newTotalXp,
    levelBefore: level,
    levelAfter: newLevel,
    levelUp: newLevel > level,
    streakBefore: currentStreak,
    streakAfter: newStreak,
    streakExtended: newStreak > currentStreak,
  };
}
