import { registerRootComponent } from 'expo';
import * as Notifications from 'expo-notifications';
import { ensureNotificationChannel } from './src/lib/notifications';

import App from './App';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Create Android notification channel at startup. No-op on iOS.
// Fire-and-forget — a failure here must not crash the app.
void ensureNotificationChannel().catch(() => {});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
