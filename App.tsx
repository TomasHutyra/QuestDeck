import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootStack } from './src/navigation/RootStack';
import { useSettingsStore } from './src/stores/settingsStore';
import { scheduleDailyReminder } from './src/lib/notifications';

export default function App() {
  useEffect(() => {
    const reschedule = () => {
      const { dailyReminderEnabled, dailyReminderTime } = useSettingsStore.getState();
      if (dailyReminderEnabled) {
        void scheduleDailyReminder(dailyReminderTime);
      }
    };

    if (useSettingsStore.persist.hasHydrated()) {
      reschedule();
    } else {
      return useSettingsStore.persist.onFinishHydration(reschedule);
    }
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="dark" />
        <RootStack />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
