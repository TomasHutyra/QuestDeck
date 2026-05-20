import { NativeModules, NativeEventEmitter } from 'react-native';

export type ScreenStateSnapshot = {
  lastScreenOffAt: number | null;
  lastScreenOnAt: number | null;
  detectorAvailable: boolean;
};

const NativeScreenState = NativeModules.ScreenState as
  | {
      startObserving(): Promise<boolean>;
      stopObserving(): Promise<null>;
      getScreenStateSnapshot(): Promise<ScreenStateSnapshot>;
      addListener(eventName: string): void;
      removeListeners(count: number): void;
    }
  | undefined;

export async function startObserving(): Promise<{ detectorAvailable: boolean }> {
  if (!NativeScreenState) {
    return { detectorAvailable: false };
  }
  try {
    await NativeScreenState.startObserving();
    return { detectorAvailable: true };
  } catch {
    return { detectorAvailable: false };
  }
}

export async function stopObserving(): Promise<void> {
  if (!NativeScreenState) return;
  try {
    await NativeScreenState.stopObserving();
  } catch {
    // ignore — receiver may already be unregistered
  }
}

export async function getScreenStateSnapshot(): Promise<ScreenStateSnapshot> {
  if (!NativeScreenState) {
    return { lastScreenOffAt: null, lastScreenOnAt: null, detectorAvailable: false };
  }
  return NativeScreenState.getScreenStateSnapshot();
}

export function createScreenStateEmitter(): NativeEventEmitter | null {
  if (!NativeScreenState) return null;
  return new NativeEventEmitter(NativeScreenState as never);
}
