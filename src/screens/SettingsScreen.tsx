import React, { useState } from 'react';
import {
  Alert, Modal, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSettingsStore } from '../stores/settingsStore';
import {
  requestNotificationPermission,
  scheduleDailyReminder,
  cancelDailyReminder,
} from '../lib/notifications';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

const PRESET_TIMES = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'];

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function SettingsScreen({ navigation }: Props) {
  const {
    soundEnabled, setSoundEnabled,
    hapticsEnabled, setHapticsEnabled,
    reducedMotionEnabled, setReducedMotionEnabled,
    dailyReminderEnabled, setDailyReminderEnabled,
    dailyReminderTime, setDailyReminderTime,
  } = useSettingsStore();

  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const handleReminderToggle = async (value: boolean) => {
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Please enable notifications for QuestDeck in your device settings.',
        );
        return;
      }
      try {
        await scheduleDailyReminder(dailyReminderTime);
        setDailyReminderEnabled(true);
      } catch {
        Alert.alert(
          'Could not schedule reminder',
          'Something went wrong. Please try again.',
        );
        // Leave toggle off — no notification was scheduled
      }
    } else {
      setDailyReminderEnabled(false);
      await cancelDailyReminder();
    }
  };

  const handleTimeSelect = async (time: string) => {
    setTimePickerVisible(false);
    setDailyReminderTime(time);
    if (dailyReminderEnabled) {
      await scheduleDailyReminder(time);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <View style={styles.row}>
          <Text style={styles.label}>Sound effects</Text>
          <Switch value={soundEnabled} onValueChange={setSoundEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Haptic feedback</Text>
          <Switch value={hapticsEnabled} onValueChange={setHapticsEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Reduced motion</Text>
          <Switch value={reducedMotionEnabled} onValueChange={setReducedMotionEnabled} />
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Daily reminder</Text>
          <Switch value={dailyReminderEnabled} onValueChange={handleReminderToggle} />
        </View>
        {dailyReminderEnabled && (
          <TouchableOpacity style={styles.timeRow} onPress={() => setTimePickerVisible(true)}>
            <Text style={styles.timeLabel}>Reminder time</Text>
            <Text style={styles.timeValue}>{formatTime(dailyReminderTime)}</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={timePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setTimePickerVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setTimePickerVisible(false)}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Choose reminder time</Text>
            {PRESET_TIMES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timeOption, t === dailyReminderTime && styles.timeOptionSelected]}
                onPress={() => handleTimeSelect(t)}
              >
                <Text style={[
                  styles.timeOptionText,
                  t === dailyReminderTime && styles.timeOptionTextSelected,
                ]}>
                  {formatTime(t)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#FFE4C8',
  },
  label: { fontSize: 14, color: '#333' },
  timeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14, paddingLeft: 12,
    borderBottomWidth: 1, borderBottomColor: '#FFE4C8',
  },
  timeLabel: { fontSize: 13, color: '#888' },
  timeValue: { fontSize: 13, fontWeight: '700', color: '#FF8C42' },
  modalBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFF8F0', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, gap: 4,
  },
  modalTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  timeOption: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12 },
  timeOptionSelected: { backgroundColor: '#FF8C42' },
  timeOptionText: { fontSize: 15, color: '#333', fontWeight: '600' },
  timeOptionTextSelected: { color: 'white' },
});
