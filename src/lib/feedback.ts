import * as Haptics from 'expo-haptics';
import { createAudioPlayer } from 'expo-audio';
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

function playSound(file: ReturnType<typeof require>): void {
  const { soundEnabled } = useSettingsStore.getState();
  if (!soundEnabled) return;
  try {
    const player = createAudioPlayer(file);
    player.play();
    player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        player.remove();
      }
    });
  } catch {
    // audio not available — ignore silently
  }
}

export async function playCardRevealFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  );
}

export async function playQuestAcceptedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  );
}

export async function playQuestCompletedFeedback(): Promise<void> {
  playSound(require('../../assets/sounds/quest-complete.mp3'));
  await triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

export async function playStreakExtendedFeedback(): Promise<void> {
  playSound(require('../../assets/sounds/streak.mp3'));
  await triggerHaptic(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy));
}

export async function playLevelUpFeedback(): Promise<void> {
  playSound(require('../../assets/sounds/level-up.mp3'));
  await triggerHaptic(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

export async function playAlreadyCompletedFeedback(): Promise<void> {
  await triggerHaptic(() =>
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
  );
}
