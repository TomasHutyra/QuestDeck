import { Quest, CompleteQuestResult } from '../types';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { calculateLevel, updateStreak, todayLocalDate } from '../lib/xp';

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

  const completedDate = todayLocalDate();

  useQuestStore.getState().addCompletedQuest({
    questId: quest.id,
    completedAt: new Date().toISOString(),
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
