import { Mood, Quest } from '../types';

function sample<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function questSelector(
  mood: Mood,
  allQuests: Quest[],
  unlockedPackIds: string[],
  completedQuestIds: string[],
  count = 3
): Quest[] {
  const isUnlocked = (q: Quest) => unlockedPackIds.includes(q.packId);
  const matchesMood = (q: Quest) => q.moods.includes(mood);
  const isCompleted = (q: Quest) => completedQuestIds.includes(q.id);

  // Step 1: Filter by mood + unlocked packs
  const moodPool = allQuests.filter((q) => isUnlocked(q) && matchesMood(q));
  const uncompleted = moodPool.filter((q) => !isCompleted(q));
  const completed = moodPool.filter((q) => isCompleted(q));

  if (uncompleted.length >= count) {
    return sample(uncompleted, count);
  }

  // Step 2: Fill with completed from same mood
  const partial = [...uncompleted];
  const needed = count - partial.length;
  partial.push(...sample(completed, needed));

  if (partial.length >= count) {
    return partial.slice(0, count);
  }

  // Step 3: Broaden to all moods within unlocked packs
  const broadPool = allQuests.filter(
    (q) => isUnlocked(q) && !partial.some((p) => p.id === q.id)
  );
  const broadUncompleted = broadPool.filter((q) => !isCompleted(q));
  const broadCompleted = broadPool.filter((q) => isCompleted(q));

  const stillNeeded = count - partial.length;
  if (broadUncompleted.length >= stillNeeded) {
    return [...partial, ...sample(broadUncompleted, stillNeeded)];
  }

  partial.push(...broadUncompleted);
  const finalNeeded = count - partial.length;
  partial.push(...sample(broadCompleted, finalNeeded));

  return partial.slice(0, count);
}
