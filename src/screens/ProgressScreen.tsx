import React, { useState } from 'react';
import {
  View, Text, Image, FlatList, Modal, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { questById } from '../data/quests';
import { allBadges } from '../data/badges';
import { Decky } from '../components/Decky';
import { BadgeCard } from '../components/BadgeCard';
import { LEVEL_LABELS, xpProgressInCurrentLevel } from '../lib/xp';
import { getBadgeProgress, getNearestLockedBadges, getRecentlyUnlockedBadges } from '../lib/badges';
import { useBadgeStore } from '../stores/badgeStore';
import { CompletedQuest } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Progress'>;

export function ProgressScreen({ navigation }: Props) {
  const { totalXp, level, currentStreak, longestStreak } = useProgressStore();
  const { completedQuests } = useQuestStore();
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const { earned, total } = xpProgressInCurrentLevel(totalXp);
  const progress = total > 0 ? earned / total : 1;
  const levelLabel = LEVEL_LABELS[level - 1] ?? 'Legend';

  const sorted = [...completedQuests].sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );

  const badgeInput = {
    badgeDefinitions: allBadges,
    completedQuests,
    questById,
    currentStreak,
    longestStreak,
    totalXp,
    level,
  };
  const { unlockedAt } = useBadgeStore();
  const nearestLocked = getNearestLockedBadges(badgeInput);
  const allBadgeProgress = getBadgeProgress(badgeInput);
  const allUnlocked = allBadgeProgress.filter((bp) => bp.unlocked);
  const recentUnlocked = getRecentlyUnlockedBadges(badgeInput, unlockedAt, 3);

  const renderItem = ({ item }: { item: CompletedQuest }) => {
    const quest = questById[item.questId];
    return (
      <TouchableOpacity
        style={styles.historyItem}
        activeOpacity={item.photoUri ? 0.7 : 1}
        onPress={() => { if (item.photoUri) setSelectedPhoto(item.photoUri); }}
      >
        {item.photoUri && (
          <Image source={{ uri: item.photoUri }} style={styles.historyThumb} />
        )}
        <View style={styles.historyLeft}>
          <Text style={styles.historyTitle}>{quest?.title ?? item.questId}</Text>
          <Text style={styles.historyDate}>{item.completedDate}</Text>
        </View>
        <Text style={styles.historyXp}>+{item.xpAwarded} XP</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Adventure Log</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => `${item.questId}-${item.completedAt}`}
        ListHeaderComponent={
          <View style={styles.top}>
            {/* Section 1: Summary card */}
            <View style={styles.levelCard}>
              <Text style={styles.levelSub}>Adventure Log</Text>
              <Text style={styles.levelNum}>Level {level} · {levelLabel}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.min(progress * 100, 100)}%` }]} />
              </View>
              <View style={styles.xpRow}>
                <Text style={styles.xpText}>{totalXp} XP</Text>
                <Text style={styles.xpText}>{totalXp + (total - earned)} XP to next</Text>
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
                <Text style={styles.statLabel}>quests done</Text>
              </View>
            </View>

            {/* Badge count tile */}
            <TouchableOpacity
              style={styles.badgeCountTile}
              onPress={() => navigation.navigate('BadgeLog')}
              activeOpacity={0.8}
            >
              <Text style={styles.badgeCountIcon}>🏅</Text>
              <Text style={styles.badgeCountText}>
                {allUnlocked.length} / {allBadges.length} badges unlocked
              </Text>
              <Text style={styles.badgeCountArrow}>→</Text>
            </TouchableOpacity>

            {/* Section 2: Next Badges */}
            <Text style={styles.sectionLabel}>NEXT BADGES</Text>
            {nearestLocked.length === 0 ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  All badges unlocked for now. More adventures are coming.
                </Text>
              </View>
            ) : (
              <View style={styles.badgeList}>
                {nearestLocked.map((bp) => (
                  <BadgeCard key={bp.badge.id} progress={bp} variant="progress" />
                ))}
              </View>
            )}

            {/* Section 3: Unlocked Badges */}
            <View style={styles.sectionRow}>
              <Text style={styles.sectionLabel}>UNLOCKED BADGES</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BadgeLog')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {recentUnlocked.length === 0 ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>Complete your first quest to unlock badges.</Text>
              </View>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unlockedScroll}
                contentContainerStyle={styles.unlockedContent}
              >
                {recentUnlocked.map((bp) => (
                  <BadgeCard key={bp.badge.id} progress={bp} variant="unlocked" />
                ))}
              </ScrollView>
            )}

            {/* Section 4: Recent Adventures */}
            {sorted.length > 0 ? (
              <Text style={styles.sectionLabel}>RECENT ADVENTURES</Text>
            ) : (
              <View style={styles.emptyCard}>
                <Decky pose="empty" size={64} />
                <Text style={styles.emptyTitle}>No adventures yet</Text>
                <Text style={styles.emptyBody}>
                  Complete your first quest and it will appear here.
                </Text>
              </View>
            )}
          </View>
        }
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      <Modal
        visible={selectedPhoto !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <TouchableOpacity
          style={styles.photoOverlay}
          activeOpacity={1}
          onPress={() => setSelectedPhoto(null)}
        >
          {selectedPhoto && (
            <Image source={{ uri: selectedPhoto }} style={styles.photoFull} resizeMode="contain" />
          )}
          <Text style={styles.photoClose}>✕</Text>
        </TouchableOpacity>
      </Modal>
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
  levelNum: { fontSize: 22, fontWeight: '900', color: 'white', marginBottom: 6 },
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
    letterSpacing: 0.5,
  },
  badgeList: { marginBottom: 4 },
  infoCard: {
    backgroundColor: 'white', borderRadius: 14, padding: 16, alignItems: 'center',
  },
  infoText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
  unlockedScroll: { marginHorizontal: -16 },
  unlockedContent: { paddingHorizontal: 16, flexDirection: 'row', gap: 8, paddingBottom: 4 },
  emptyCard: {
    marginTop: 24, alignItems: 'center', padding: 24,
    backgroundColor: 'white', borderRadius: 16, gap: 8,
  },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#1a1a1a' },
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
  photoOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoFull: { width: '100%', height: '85%' },
  photoClose: {
    position: 'absolute', top: 52, right: 20,
    fontSize: 20, color: 'rgba(255,255,255,0.7)', fontWeight: '700',
  },
  badgeCountTile: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0E0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  badgeCountIcon: { fontSize: 20, marginRight: 10 },
  badgeCountText: { flex: 1, fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  badgeCountArrow: { fontSize: 14, color: '#FF8C42', fontWeight: '700' },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  seeAll: { fontSize: 11, fontWeight: '700', color: '#FF8C42' },
});
