import React, { useEffect, useRef, useState } from 'react';
import {
  Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { questById } from '../data/quests';
import { useProgressStore } from '../stores/progressStore';
import { useQuestStore } from '../stores/questStore';
import { useSettingsStore } from '../stores/settingsStore';
import { completeQuest } from '../actions/completeQuest';
import { pickPhotoFromLibrary, takePhoto } from '../lib/photos';
import {
  playAlreadyCompletedFeedback,
  playBadgeUnlockedFeedback,
  playLevelUpFeedback,
  playQuestCompletedFeedback,
  playStreakExtendedFeedback,
} from '../lib/feedback';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
} from '../lib/notifications';
import {
  shouldShowNotificationPrompt,
  recordNotificationPromptShown,
  recordNotificationPromptDismissed,
  recordNotificationPromptAccepted,
} from '../lib/notificationPrompt';
import {
  shouldShowStoreReviewPrompt,
  recordStoreReviewPromptShown,
  recordStoreReviewPromptDismissed,
  recordStoreReviewRequested,
  openGooglePlayListing,
} from '../lib/storeReviewPrompt';
import { todayLocalDate } from '../lib/xp';
import { XPBar } from '../components/XPBar';
import { CelebrationOverlay } from '../components/CelebrationOverlay';
import { NotificationPromptCard } from '../components/NotificationPromptCard';
import { StoreReviewPromptCard } from '../components/StoreReviewPromptCard';
import { Decky } from '../components/Decky';
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
  const { clearActiveAndRevealed, updateCompletedQuestPhoto, completedQuests } = useQuestStore();
  const { totalXp, level, currentStreak } = useProgressStore();
  const {
    dailyReminderEnabled, setDailyReminderEnabled,
    notificationPromptDismissCount,
    notificationPromptDismissedAt,
    notificationPromptLastShownAt,
    storeReviewPromptLastShownAt,
    storeReviewPromptDismissedAt,
    storeReviewPromptDismissCount,
    storeReviewRequestedAt,
    storeReviewCompletedQuestCountAtLastPrompt,
  } = useSettingsStore();

  const [result, setResult] = useState<CompleteQuestResult | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [badgeOverlayVisible, setBadgeOverlayVisible] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [reviewPromptVisible, setReviewPromptVisible] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const hasPlayedRef = useRef(false);
  const badgeOverlayQueuedRef = useRef(false);
  const promptShownRef = useRef(false);
  const reviewPromptShownRef = useRef(false);

  useEffect(() => {
    if (result === null || result.status === 'already_completed') return;

    const today = todayLocalDate();

    // Notification prompt takes priority — only one prompt shown per completion
    if (!promptShownRef.current) {
      const showNotif = shouldShowNotificationPrompt(
        { dailyReminderEnabled, notificationPromptDismissCount, notificationPromptDismissedAt, notificationPromptLastShownAt },
        today,
      );
      if (showNotif) {
        promptShownRef.current = true;
        setPromptVisible(true);
        recordNotificationPromptShown();
        return;
      }
    }

    // Store review prompt second — skipped if notification prompt is showing
    if (!reviewPromptShownRef.current && !promptShownRef.current) {
      const showReview = shouldShowStoreReviewPrompt(
        { storeReviewPromptLastShownAt, storeReviewPromptDismissedAt, storeReviewPromptDismissCount, storeReviewRequestedAt, storeReviewCompletedQuestCountAtLastPrompt },
        today,
        completedQuests.length,
      );
      if (showReview) {
        reviewPromptShownRef.current = true;
        setReviewPromptVisible(true);
        recordStoreReviewPromptShown(completedQuests.length);
      }
    }
  }, [result]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkDone = () => {
    if (!quest) return;
    setOverlayVisible(false);
    setBadgeOverlayVisible(false);
    badgeOverlayQueuedRef.current = false;

    const r = completeQuest(quest);
    setResult(r);

    if (!hasPlayedRef.current) {
      hasPlayedRef.current = true;
      if (r.status === 'already_completed') {
        void playAlreadyCompletedFeedback();
      } else {
        void playQuestCompletedFeedback();
        if (r.levelUp) {
          void playLevelUpFeedback();
          setOverlayVisible(true);
        } else if (r.streakExtended) {
          void playStreakExtendedFeedback();
          setOverlayVisible(true);
        } else if (r.newlyUnlockedBadgeIds.length > 0) {
          badgeOverlayQueuedRef.current = true;
          void playBadgeUnlockedFeedback();
          setBadgeOverlayVisible(true);
        } else {
          setOverlayVisible(true);
        }
      }
    }
  };

  const handleRemindMe = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      Alert.alert('Permission required', 'Enable notifications for QuestDeck in your device settings.');
      return;
    }
    try {
      await scheduleDailyReminder('18:00');
      setDailyReminderEnabled(true);
      recordNotificationPromptAccepted();
      setPromptVisible(false);
    } catch {
      Alert.alert('Could not schedule reminder', 'Something went wrong. Please try again.');
    }
  };

  const handleMaybeLater = () => {
    recordNotificationPromptDismissed();
    setPromptVisible(false);
  };

  const handleRateApp = async () => {
    const opened = await openGooglePlayListing();
    if (opened) {
      recordStoreReviewRequested();
      setReviewPromptVisible(false);
    }
  };

  const handleReviewMaybeLater = () => {
    recordStoreReviewPromptDismissed();
    setReviewPromptVisible(false);
  };

  const handleAddPhoto = () => {
    Alert.alert('Add a memory photo', undefined, [
      {
        text: 'Take a photo',
        onPress: async () => {
          const uri = await takePhoto();
          if (uri && result) {
            setPhotoUri(uri);
            updateCompletedQuestPhoto(result.questId, uri);
          } else if (uri === null) {
            Alert.alert('Permission required', 'Enable camera access in your device settings.');
          }
        },
      },
      {
        text: 'Choose from gallery',
        onPress: async () => {
          const uri = await pickPhotoFromLibrary();
          if (uri && result) {
            setPhotoUri(uri);
            updateCompletedQuestPhoto(result.questId, uri);
          } else if (uri === null) {
            Alert.alert('Permission required', 'Enable photo library access in your device settings.');
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
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
      <ScrollView contentContainerStyle={styles.center} bounces={false}>
        <Decky pose="celebrate" size={72} />
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

        {promptVisible && (
          <NotificationPromptCard
            onRemindMe={handleRemindMe}
            onMaybeLater={handleMaybeLater}
          />
        )}

        {reviewPromptVisible && (
          <StoreReviewPromptCard
            onRate={handleRateApp}
            onMaybeLater={handleReviewMaybeLater}
          />
        )}

        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photoThumb} />
        ) : (
          <TouchableOpacity style={styles.photoBtn} onPress={handleAddPhoto} activeOpacity={0.8}>
            <Text style={styles.photoBtnText}>📷 Add a memory photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.homeBtn} onPress={handleBackToHome} activeOpacity={0.85}>
          <Text style={styles.homeBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>

      {celebType !== null && (
        <CelebrationOverlay
          type={celebType}
          visible={overlayVisible}
          xpAwarded={result.xpAwarded}
          newStreak={result.streakAfter}
          newLevel={result.levelAfter}
          onDismiss={() => {
            setOverlayVisible(false);
            if (
              result.newlyUnlockedBadgeIds.length > 0 &&
              !badgeOverlayQueuedRef.current
            ) {
              badgeOverlayQueuedRef.current = true;
              void playBadgeUnlockedFeedback();
              setBadgeOverlayVisible(true);
            }
          }}
        />
      )}
      <CelebrationOverlay
        type="badge"
        visible={badgeOverlayVisible}
        badgeIds={result.newlyUnlockedBadgeIds}
        onDismiss={() => setBadgeOverlayVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  error: { margin: 24, color: '#aaa' },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
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
  photoBtn: {
    width: '100%', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#FFD0A0', backgroundColor: '#FFF3E8',
  },
  photoBtnText: { fontSize: 14, fontWeight: '700', color: '#FF8C42' },
  photoThumb: {
    width: '100%', height: 180, borderRadius: 14, resizeMode: 'cover',
  },
});
