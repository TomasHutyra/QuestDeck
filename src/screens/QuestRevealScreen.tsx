import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById, allQuests } from '../data/quests';
import { useQuestStore } from '../stores/questStore';
import { usePackStore } from '../stores/packStore';
import { questSelector } from '../lib/questSelector';
import { QuestCard } from '../components/QuestCard';

type Props = NativeStackScreenProps<RootStackParamList, 'QuestReveal'>;

export function QuestRevealScreen({ navigation, route }: Props) {
  const { mood } = route.params;
  const {
    lastRevealedQuestIds,
    completedQuests,
    setActiveQuestId,
    setLastRevealedQuestIds,
    clearLastRevealedQuestIds,
  } = useQuestStore();
  const { unlockedPackIds } = usePackStore();

  const [revealedIndexes, setRevealedIndexes] = useState<number[]>([]);

  // Clear lastRevealedQuestIds when leaving this screen (both header back + hardware back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', () => {
      clearLastRevealedQuestIds();
    });
    return unsubscribe;
  }, [navigation, clearLastRevealedQuestIds]);

  const quests = lastRevealedQuestIds
    .map((id) => questById[id])
    .filter(Boolean);

  const handleCardPress = (index: number) => {
    if (!revealedIndexes.includes(index)) {
      setRevealedIndexes((prev) => [...prev, index]);
    } else {
      const quest = quests[index];
      if (quest) {
        setActiveQuestId(quest.id);
        navigation.navigate('QuestDetail', { questId: quest.id });
      }
    }
  };

  const handleDrawAgain = () => {
    const completedIds = completedQuests.map((cq) => cq.questId);
    const selected = questSelector(mood, allQuests, unlockedPackIds, completedIds);
    setLastRevealedQuestIds(selected.map((q) => q.id));
    setRevealedIndexes([]);
  };

  if (quests.length === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No quests found</Text>
          <Text style={styles.emptySubtitle}>Try a different mood</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.moodLabel}>{mood}</Text>
          <Text style={styles.hint}>
            {revealedIndexes.length < quests.length ? 'Tap a card to reveal' : 'Tap a card to choose'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.cards}>
        {quests.map((quest, index) => (
          <QuestCard
            key={quest.id}
            quest={quest}
            isRevealed={revealedIndexes.includes(index)}
            onPress={() => handleCardPress(index)}
          />
        ))}

        <TouchableOpacity style={styles.drawAgain} onPress={handleDrawAgain}>
          <Text style={styles.drawAgainText}>Draw again</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backBtn: { padding: 16 },
  backText: { fontSize: 20, color: '#aaa' },
  moodLabel: { fontSize: 16, fontWeight: '800', color: '#1a1a1a', textTransform: 'capitalize' },
  hint: { fontSize: 11, color: '#aaa', marginTop: 2 },
  cards: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#333' },
  emptySubtitle: { fontSize: 13, color: '#aaa', marginTop: 6 },
  drawAgain: {
    marginTop: 8, paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFD0A0', borderRadius: 12,
    backgroundColor: 'transparent',
  },
  drawAgainText: { fontSize: 13, fontWeight: '700', color: '#FF8C42' },
});
