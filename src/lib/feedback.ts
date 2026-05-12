import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../stores/settingsStore';

async function triggerHaptic(fn: () => Promise<void>): Promise<void> {
  const { hapticsEnabled } = useSettingsStore.getState();
  if (!hapticsEnabled) return;
  try {
    await fn();
  } catch {
    // device does not support haptics — ignore silently
  }
}

export async function playCardRevealFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
  // TODO: wire sound — drop card-flip.mp3 into assets/sounds/ and implement playSound()
}

export async function playQuestAcceptedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
  // TODO: wire sound — drop quest-accepted.mp3 into assets/sounds/ and implement playSound()
}

export async function playQuestCompletedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
  // TODO: wire sound — drop quest-complete.mp3 into assets/sounds/ and implement playSound()
}

export async function playStreakExtendedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  );
  // TODO: wire sound — drop streak.mp3 into assets/sounds/ and implement playSound()
}

export async function playLevelUpFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
  );
  // TODO: wire sound — drop level-up.mp3 into assets/sounds/ and implement playSound()
}

export async function playAlreadyCompletedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );
}
