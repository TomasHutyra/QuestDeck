import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Mood } from '../types';
import { useSettingsStore } from '../stores/settingsStore';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { QuestRevealScreen } from '../screens/QuestRevealScreen';
import { QuestDetailScreen } from '../screens/QuestDetailScreen';
import { CompletionScreen } from '../screens/CompletionScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { BadgeLogScreen } from '../screens/BadgeLogScreen';
import { PacksScreen } from '../screens/PacksScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Home: undefined;
  QuestReveal: { mood: Mood };
  QuestDetail: { questId: string };
  Completion: { questId: string };
  Progress: undefined;
  BadgeLog: undefined;
  Packs: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  const onboardingSeen = useSettingsStore((s) => s.onboardingSeen);

  return (
    <Stack.Navigator
      initialRouteName={onboardingSeen ? 'Home' : 'Onboarding'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="QuestReveal" component={QuestRevealScreen} />
      <Stack.Screen name="QuestDetail" component={QuestDetailScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="BadgeLog" component={BadgeLogScreen} />
      <Stack.Screen name="Packs" component={PacksScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
