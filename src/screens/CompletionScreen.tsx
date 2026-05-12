import React, { useRef, useState } from 'react';
import {
  SafeAreaView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById } from '../data/quests';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { completeQuest } from '../actions/completeQuest';
import {
  playAlreadyCompletedFeedback,
  playLevelUpFeedback,
  playQuestCompletedFeedback,
  playStreakExtendedFeedback,
} from '../lib/feedback';
import { XPBar } from '../components/XPBar';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { CompleteQuestResult } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Completion'>;

function overlayTypeFor(
  result: CompleteQuestResult
): 'quest-complete' | 'streak' | 'level-up' | null {
  if (result.status === 'already_completed') return null;
  if (result.levelUp) return 'level-up';
  if (result.streakExtended) return 'streak';
  return 'quest-complete';
}

export function CompletionScreen({ navigation, route }: Props) {
  const quest = questById[route.params.questId];
  const { clearActiveAndRevealed } = useQuestStore();
  const { totalXp, level, currentStreak } = useProgressStore();

  const [result, setResult] = useState<CompleteQuestResult | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const hasPlayedRef = useRef(false);

  const handleMarkDone = () => {
    if (!quest) return;
    const r = completeQuest(quest);
    setResult(r);

    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      if (r.status === 'already_completed') {
        playAlreadyCompletedFeedback();
      } else if (r.levelUp) {
        playLevelUpFeedback();
        setOverlayVisible(true);
      } else if (r.streakExtended) {
        playStreakExtendedFeedback();
        setOverlayVisible(true);
      } else {
        playQuestCompletedFeedback();
        setOverlayVisible(true);
      }
    }
  };

  const handleBackToHome = () => {
    clearActiveAndRevealed();
    navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
  };

  if (!quest) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.error}>Quest not found.</Text>
      </SafeAreaView>
    );
  }

  if (result === null) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.questTitle}>{quest.title}</Text>
          <Text style={styles.questDesc}>Complete the quest, then mark it done.</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={handleMarkDone} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Mark as done ✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backLink} onPress={handleBackToHome}>
            <Text style={styles.backLinkText}>← Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (result.status === 'already_completed') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.alreadyIcon}>✅</Text>
          <Text style={styles.alreadyTitle}>Already completed</Text>
          <Text style={styles.alreadySubtitle}>You already did this one. No XP awarded.</Text>
          <TouchableOpacity style={styles.homeBtn} onPress={handleBackToHome} activeOpacity={0.85}>
            <Text style={styles.homeBtnText}>Back to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const celebType = overlayTypeFor(result);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.center}>
        <Text style={styles.celebrationEmoji}>🎉</Text>
        <Text style={styles.completeTitle}>Quest Complete!</Text>
        <Text style={styles.questSubtitle}>{quest.title}</Text>

        <View style={styles.xpBadge}>
          <Text style={styles.xpBadgeLabel}>You earned</Text>
          <Text style={styles.xpBadgeValue}>+{result.xpAwarded} XP</Text>
        </View>

        {currentStreak > 1 ? (
          <View style={styles.streak}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <View>
              <Text style={styles.streakTitle}>{currentStreak}-day streak!</Text>
              <Text style={styles.streakSub}>Keep it going</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.xpBarWrapper}>
          <XPBar level={level} totalXp={totalXp} />
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={handleBackToHome} activeOpacity={0.85}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>

      {celebType !== null && (
        <CelebrationOverlay
          type={celebType}
          visible={overlayVisible}
          xpAwarded={result.xpAwarded}
          newStreak={result.streakAfter}
          newLevel={result.levelAfter}
          onDismiss={() => setOverlayVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  error: { margin: 24, color: '#aaa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  celebrationEmoji: { fontSize: 56 },
  completeTitle: { fontSize: 22, fontWeight: '900', color: '#1a1a1a' },
  questTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  questDesc: { fontSize: 13, color: '#888', textAlign: 'center' },
  questSubtitle: { fontSize: 13, color: '#aaa' },
  xpBadge: {
    backgroundColor: '#FFF3E8', borderRadius: 14, paddingHorizontal: 28, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD0A0', marginVertical: 4,
  },
  xpBadgeLabel: { fontSize: 11, color: '#aaa' },
  xpBadgeValue: { fontSize: 32, fontWeight: '900', color: '#FF8C42' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  streakEmoji: { fontSize: 26 },
  streakTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a' },
  streakSub: { fontSize: 11, color: '#aaa' },
  xpBarWrapper: { width: '100%', marginVertical: 4 },
  doneBtn: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 40, marginTop: 8,
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { fontSize: 16, fontWeight: '800', color: 'white' },
  homeBtn: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 14,
    paddingHorizontal: 40, width: '100%', alignItems: 'center',
    shadowColor: '#FF8C42', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  homeBtnText: { fontSize: 15, fontWeight: '800', color: 'white' },
  backLink: { marginTop: 4 },
  backLinkText: { fontSize: 13, color: '#aaa' },
  alreadyIcon: { fontSize: 48 },
  alreadyTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  alreadySubtitle: { fontSize: 13, color: '#aaa', textAlign: 'center' },
});
