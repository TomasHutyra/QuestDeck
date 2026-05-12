import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Mood } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { QuestRevealScreen } from '../screens/QuestRevealScreen';
import { QuestDetailScreen } from '../screens/QuestDetailScreen';
import { CompletionScreen } from '../screens/CompletionScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import { PacksScreen } from '../screens/PacksScreen';

export type RootStackParamList = {
  Home: undefined;
  QuestReveal: { mood: Mood };
  QuestDetail: { questId: string };
  Completion: { questId: string };
  Progress: undefined;
  Packs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="QuestReveal" component={QuestRevealScreen} />
      <Stack.Screen name="QuestDetail" component={QuestDetailScreen} />
      <Stack.Screen name="Completion" component={CompletionScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />
      <Stack.Screen name="Packs" component={PacksScreen} />
    </Stack.Navigator>
  );
}
