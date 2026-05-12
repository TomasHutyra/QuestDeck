import React from 'react';
import {
  SafeAreaView, StyleSheet, Switch, Text, TouchableOpacity, View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSettingsStore } from '../stores/settingsStore';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props) {
  const {
    soundEnabled, setSoundEnabled,
    hapticsEnabled, setHapticsEnabled,
    reducedMotionEnabled, setReducedMotionEnabled,
  } = useSettingsStore();

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
      </View>
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
    paddingBottom: 8,
  },
  backText: { fontSize: 20, color: '#aaa' },
  title: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  section: { marginTop: 16, paddingHorizontal: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE4C8',
  },
  label: { fontSize: 14, color: '#333' },
});
