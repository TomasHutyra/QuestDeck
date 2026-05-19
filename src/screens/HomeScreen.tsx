import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { MOODS } from '../data/moods';
import { allQuests, questById } from '../data/quests';
import { allBadges } from '../data/badges';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { usePackStore } from '../stores/packStore';
import { questSelector } from '../lib/questSelector';
import { getNearestLockedBadges } from '../lib/badges';
import { XPBar } from '../components/XPBar';
import { MoodButton } from '../components/MoodButton';
import { Decky } from '../components/Decky';
import { MoodMeta } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { completedQuests, setLastRevealedQuestIds } = useQuestStore();
  const { totalXp, level, currentStreak, longestStreak } = useProgressStore();
  const { unlockedPackIds } = usePackStore();

  const nextBadge = getNearestLockedBadges({
    badgeDefinitions: allBadges,
    completedQuests,
    questById,
    currentStreak,
    longestStreak,
    totalXp,
    level,
  }, 1)[0] ?? null;

  const handleMoodPress = (mood: MoodMeta) => {
    const completedIds = completedQuests.map((cq) => cq.questId);
    const selected = questSelector(mood.id, allQuests, unlockedPackIds, completedIds);
    setLastRevealedQuestIds(selected.map((q) => q.id));
    navigation.navigate('QuestReveal', { mood: mood.id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/logo_header.png')}
          style={styles.logo}
        />
        <View style={styles.icons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.iconEmoji}>⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Packs')}>
            <Text style={styles.iconEmoji}>📦</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.iconEmoji}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <XPBar level={level} totalXp={totalXp} currentStreak={currentStreak} />

      {nextBadge && (
        <TouchableOpacity
          style={styles.badgeTeaser}
          onPress={() => navigation.navigate('Progress')}
          activeOpacity={0.8}
        >
          <Text style={styles.badgeTeaserEmoji}>{nextBadge.badge.emoji}</Text>
          <View style={styles.badgeTeaserInfo}>
            <Text style={styles.badgeTeaserName}>Next: {nextBadge.badge.name}</Text>
            <Text style={styles.badgeTeaserCount}>{nextBadge.current} / {nextBadge.target}</Text>
          </View>
          <View style={styles.badgeTeaserTrack}>
            <View
              style={[styles.badgeTeaserFill, { width: `${Math.min(nextBadge.progress * 100, 100)}%` }]}
            />
          </View>
        </TouchableOpacity>
      )}

      <FlatList
        data={MOODS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.mascotHeader}>
            <Decky pose="idle" size={72} />
            <Text style={styles.moodPrompt}>How are you feeling?</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MoodButton mood={item} onPress={() => handleMoodPress(item)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  logo: { height: 44, width: 62 },
  icons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, backgroundColor: '#fff', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  iconEmoji: { fontSize: 16 },
  mascotHeader: { alignItems: 'center', paddingTop: 8, paddingBottom: 4, gap: 8 },
  moodPrompt: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  grid: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
  cell: { flex: 1 },
  badgeTeaser: {
    marginHorizontal: 16,
    marginBottom: 6,
    backgroundColor: '#FFF0E0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeTeaserEmoji: { fontSize: 18, marginRight: 8 },
  badgeTeaserInfo: { flex: 1 },
  badgeTeaserName: { fontSize: 11, fontWeight: '700', color: '#1a1a1a' },
  badgeTeaserCount: { fontSize: 10, color: '#FF8C42', marginTop: 1 },
  badgeTeaserTrack: {
    width: 44,
    height: 4,
    backgroundColor: '#F0E6D8',
    borderRadius: 2,
    overflow: 'hidden',
    marginLeft: 8,
  },
  badgeTeaserFill: { height: '100%', backgroundColor: '#FF8C42', borderRadius: 2 },
});
