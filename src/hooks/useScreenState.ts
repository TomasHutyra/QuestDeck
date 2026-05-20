import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import {
  ScreenStateSnapshot,
  startObserving,
  stopObserving,
  getScreenStateSnapshot,
  createScreenStateEmitter,
} from '../lib/screenStateModule';

type ScreenStateCallbacks = {
  enabled: boolean;
  onScreenOff?: () => void;
  onScreenReturn: (snapshot: ScreenStateSnapshot) => void;
};

export function useScreenState({
  enabled,
  onScreenOff,
  onScreenReturn,
}: ScreenStateCallbacks): void {
  const callbacksRef = useRef({ onScreenOff, onScreenReturn });
  callbacksRef.current = { onScreenOff, onScreenReturn };

  useEffect(() => {
    if (!enabled) {
      void stopObserving();
      return;
    }

    let mounted = true;
    const subs: Array<{ remove(): void }> = [];

    const setupListeners = (nativeAvail: boolean) => {
      if (!mounted) return;

      if (nativeAvail) {
        const emitter = createScreenStateEmitter();
        if (emitter) {
          subs.push(
            emitter.addListener('screenOff', () => {
              callbacksRef.current.onScreenOff?.();
            }),
          );
        }
        // AppState active is authoritative: always snapshot on foreground return.
        // Native 'screenOn' event is best-effort; AppState is reliable.
        subs.push(
          AppState.addEventListener('change', async (state: AppStateStatus) => {
            if (state === 'active' && mounted) {
              const snapshot = await getScreenStateSnapshot();
              callbacksRef.current.onScreenReturn(snapshot);
            }
          }),
        );
      } else {
        // AppState fallback — cannot distinguish screen-lock from app-switch.
        let lastBackgroundAt: number | null = null;
        subs.push(
          AppState.addEventListener('change', async (state: AppStateStatus) => {
            if (state === 'background') {
              lastBackgroundAt = Date.now();
              callbacksRef.current.onScreenOff?.();
            } else if (state === 'active' && mounted) {
              callbacksRef.current.onScreenReturn({
                lastScreenOffAt: lastBackgroundAt,
                lastScreenOnAt: Date.now(),
                detectorAvailable: false,
              });
            }
          }),
        );
      }
    };

    startObserving()
      .then(({ detectorAvailable }) => setupListeners(detectorAvailable))
      .catch(() => setupListeners(false));

    return () => {
      mounted = false;
      subs.forEach((s) => s.remove());
      void stopObserving();
    };
  }, [enabled]); // eslint-disable-line react-hooks/exhaustive-deps
}
