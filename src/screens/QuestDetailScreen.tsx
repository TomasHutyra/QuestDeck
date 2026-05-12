import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById } from '../data/quests';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestDetail'>;

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard',
};
const PEOPLE_LABEL: Record<string, string> = {
  solo: 'Solo', partner: 'With partner', friends: 'With friends', any: 'Anyone',
};
const LOCATION_LABEL: Record<string, string> = {
  indoors: '🏠 Indoors', outdoors: '🌿 Outdoors', any: '📍 Anywhere',
};

export function QuestDetailScreen({ navigation, route }: Props) {
  const quest = questById[route.params.questId];

  if (!quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Quest not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>{quest.title}</Text>
          <Text style={styles.description}>{quest.description}</Text>

          <View style={styles.tags}>
            <View style={styles.pill}><Text style={styles.pillText}>{quest.durationMinutes} min</Text></View>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>{DIFFICULTY_LABEL[quest.difficulty]}</Text></View>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>{PEOPLE_LABEL[quest.people]}</Text></View>
            <View style={styles.pillMuted}><Text style={styles.pillMutedText}>{LOCATION_LABEL[quest.location]}</Text></View>
          </View>
        </View>

        {quest.optionalTip ? (
          <View style={styles.tip}>
            <Text style={styles.tipLabel}>TIP</Text>
            <Text style={styles.tipText}>{quest.optionalTip}</Text>
          </View>
        ) : null}

        <Text style={styles.reward}>Reward: <Text style={styles.rewardXp}>⭐ {quest.xp} XP</Text></Text>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('Completion', { questId: quest.id })}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaText}>I'll do this! →</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  error: { margin: 24, color: '#aaa' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  backText: { fontSize: 20, color: '#aaa' },
  content: { padding: 16, gap: 16 },
  card: {
    backgroundColor: '#FFF3E8', borderRadius: 16, padding: 20,
    borderWidth: 1.5, borderColor: '#FFD0A0', gap: 12,
  },
  title: { fontSize: 20, fontWeight: '900', color: '#1a1a1a', lineHeight: 26 },
  description: { fontSize: 14, color: '#444', lineHeight: 21 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: '#FF8C42', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: 'white', fontSize: 11, fontWeight: '700' },
  pillMuted: { backgroundColor: '#F0E6D8', borderRadius: 7, paddingHorizontal: 10, paddingVertical: 4 },
  pillMutedText: { color: '#777', fontSize: 11 },
  tip: {
    borderLeftWidth: 3, borderLeftColor: '#FF8C42',
    backgroundColor: '#FFF3E8', borderRadius: 8, padding: 12, gap: 4,
  },
  tipLabel: { fontSize: 10, fontWeight: '800', color: '#FF8C42', letterSpacing: 1 },
  tipText: { fontSize: 13, color: '#555', lineHeight: 19 },
  reward: { textAlign: 'center', fontSize: 13, color: '#aaa' },
  rewardXp: { fontWeight: '700', color: '#FF8C42' },
  cta: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  ctaText: { fontSize: 16, fontWeight: '800', color: 'white' },
});
