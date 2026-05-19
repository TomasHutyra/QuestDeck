import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { useBadgeStore } from '../stores/badgeStore';
import { questById } from '../data/quests';
import { allBadges } from '../data/badges';
import { BadgeCard } from '../components/BadgeCard';
import { getBadgeProgress, getRecentlyUnlockedBadges, BadgeProgress } from '../lib/badges';

type Props = NativeStackScreenProps<RootStackParamList, 'BadgeLog'>;

export function BadgeLogScreen({ navigation }: Props) {
  const { totalXp, level, currentStreak, longestStreak } = useProgressStore();
  const { completedQuests } = useQuestStore();
  const { unlockedAt } = useBadgeStore();

  const badgeInput = {
    badgeDefinitions: allBadges,
    completedQuests,
    questById,
    currentStreak,
    longestStreak,
    totalXp,
    level,
  };

  const allBadgeProgress = getBadgeProgress(badgeInput);

  const unlockedBadges = getRecentlyUnlockedBadges(badgeInput, unlockedAt, Infinity);

  const lockedBadges = allBadgeProgress
    .filter((bp) => !bp.unlocked)
    .sort((a, b) => {
      if (b.progress !== a.progress) return b.progress - a.progress;
      return (a.target - a.current) - (b.target - b.current);
    });

  // Pair unlocked badges into 2-column rows
  const rows: [BadgeProgress, BadgeProgress | null][] = [];
  for (let i = 0; i < unlockedBadges.length; i += 2) {
    rows.push([unlockedBadges[i], unlockedBadges[i + 1] ?? null]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>All Badges</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>UNLOCKED ({unlockedBadges.length})</Text>

        {unlockedBadges.length === 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Complete your first quest to earn badges.</Text>
          </View>
        ) : (
          rows.map((row) => (
            <View key={row[0].badge.id} style={styles.row}>
              <View style={styles.cell}>
                <BadgeCard progress={row[0]} variant="unlocked" style={styles.cardFull} />
              </View>
              {row[1] ? (
                <View style={styles.cell}>
                  <BadgeCard progress={row[1]} variant="unlocked" style={styles.cardFull} />
                </View>
              ) : (
                <View style={styles.cell} />
              )}
            </View>
          ))
        )}

        <Text style={[styles.sectionLabel, styles.nextLabel]}>NEXT BADGES</Text>

        {lockedBadges.length === 0 ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>All badges unlocked. More adventures are coming.</Text>
          </View>
        ) : (
          lockedBadges.map((bp) => (
            <BadgeCard key={bp.badge.id} progress={bp} variant="progress" />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  content: { padding: 16, gap: 12 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', letterSpacing: 0.5 },
  nextLabel: { marginTop: 8 },
  row: { flexDirection: 'row', gap: 10 },
  cell: { flex: 1 },
  cardFull: { width: '100%' },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
  },
  infoText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
});
