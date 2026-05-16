import React from 'react';
import {
  View, Text, Image, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { questById } from '../data/quests';
import { Decky } from '../components/Decky';
import { LEVEL_LABELS, xpProgressInCurrentLevel } from '../lib/xp';
import { CompletedQuest } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export function ProgressScreen({ navigation }: Props) {
  const { totalXp, level, currentStreak, longestStreak } = useProgressStore();
  const { completedQuests } = useQuestStore();

  const { earned, total } = xpProgressInCurrentLevel(totalXp);
  const progress = total > 0 ? earned / total : 1;
  const levelLabel = LEVEL_LABELS[level - 1] ?? 'Legend';

  const sorted = [...completedQuests].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const renderItem = ({ item }: { item: CompletedQuest }) => {
    const quest = questById[item.questId];
    return (
      <View style={styles.historyItem}>
        {item.photoUri && (
          <Image source={{ uri: item.photoUri }} style={styles.historyThumb} />
        )}
        <View style={styles.historyLeft}>
          <Text style={styles.historyTitle}>{quest?.title ?? item.questId}</Text>
          <Text style={styles.historyDate}>{item.completedDate}</Text>
        </View>
        <Text style={styles.historyXp}>+{item.xpAwarded} XP</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Progress</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.completedAt}
        ListHeaderComponent={
          <View style={styles.top}>
            <View style={styles.levelCard}>
              <Text style={styles.levelSub}>Current level</Text>
              <Text style={styles.levelNum}>Level {level}</Text>
              <Text style={styles.levelLabel}>{levelLabel}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` }]} />
              </View>
              <View style={styles.xpRow}>
                <Text style={styles.xpText}>{totalXp} XP</Text>
                <Text style={styles.xpText}>{totalXp + (total - earned)} XP</Text>
              </View>
            </View>

            <View style={styles.stats}>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🔥</Text>
                <Text style={styles.statNum}>{currentStreak}</Text>
                <Text style={styles.statLabel}>streak</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>🏆</Text>
                <Text style={styles.statNum}>{longestStreak}</Text>
                <Text style={styles.statLabel}>best</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statEmoji}>✅</Text>
                <Text style={styles.statNum}>{completedQuests.length}</Text>
                <Text style={styles.statLabel}>done</Text>
              </View>
            </View>

            {sorted.length > 0 ? (
              <Text style={styles.sectionLabel}>RECENT QUESTS</Text>
            ) : (
              <View style={styles.emptyCard}>
                <Decky pose="empty" size={64} />
                <Text style={styles.emptyTitle}>No quests yet</Text>
                <Text style={styles.emptyBody}>
                  Head back to the home screen, pick a mood, and complete your first quest. It will appear here.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  top: { padding: 16, gap: 12 },
  list: { paddingBottom: 24 },
  levelCard: {
    backgroundColor: '#FF8C42', borderRadius: 16, padding: 16, gap: 4,
  },
  levelSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  levelNum: { fontSize: 26, fontWeight: '900', color: 'white' },
  levelLabel: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  track: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3, overflow: 'hidden',
  },
  fill: { height: '100%', backgroundColor: 'white', borderRadius: 3 },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  xpText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  stats: { flexDirection: 'row', gap: 10 },
  statBox: {
    flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12,
    alignItems: 'center', elevation: 1,
  },
  statEmoji: { fontSize: 20 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#FF8C42', marginTop: 2 },
  statLabel: { fontSize: 10, color: '#aaa', marginTop: 1 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#aaa',
    letterSpacing: 0.5, paddingHorizontal: 0,
  },
  emptyCard: {
    marginTop: 24, alignItems: 'center', padding: 24,
    backgroundColor: 'white', borderRadius: 16, gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  emptyBody: { fontSize: 13, color: '#aaa', textAlign: 'center', lineHeight: 20 },
  historyItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'white', borderRadius: 12, padding: 12, marginHorizontal: 16,
    marginBottom: 8, elevation: 1,
  },
  historyThumb: { width: 48, height: 48, borderRadius: 8, marginRight: 4 },
  historyLeft: { flex: 1, gap: 2 },
  historyTitle: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  historyDate: { fontSize: 11, color: '#aaa' },
  historyXp: { fontSize: 12, fontWeight: '700', color: '#FF8C42' },
});
