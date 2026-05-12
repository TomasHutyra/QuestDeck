import { Quest, CompleteQuestResult } from '../types';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { calculateLevel, updateStreak, todayLocalDate } from '../lib/xp';

export function completeQuest(quest: Quest): CompleteQuestResult {
  const { completedQuests } = useQuestStore.getState();

  if (completedQuests.some((cq) => cq.questId === quest.id)) {
    return { status: 'already_completed' };
  }

  const completedDate = todayLocalDate();

  useQuestStore.getState().addCompletedQuest({
    questId: quest.id,
    completedAt: new Date().toISOString(),
    completedDate,
    xpAwarded: quest.xp,
  });

  const { totalXp, currentStreak, longestStreak, lastCompletedDate } =
    useProgressStore.getState();

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

  return { status: 'completed', xpAwarded: quest.xp };
}
