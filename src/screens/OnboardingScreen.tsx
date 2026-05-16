import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { useSettingsStore } from '../stores/settingsStore';
import { Decky } from '../components/Decky';

type Props = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;

const SLIDES = [
  {
    emoji: '🎭',
    title: 'Pick a mood',
    body: 'Bored? At home? Out with friends? Choose how you feel right now.',
  },
  {
    emoji: '🃏',
    title: 'Draw 3 quest cards',
    body: 'Tap to flip and reveal three real-world activity cards picked just for you.',
  },
  {
    emoji: '🌍',
    title: 'Do something real',
    body: 'Pick one quest, go do it, and earn XP. No screens required.',
  },
];

export function OnboardingScreen({ navigation }: Props) {
  const [index, setIndex] = useState(0);
  const setOnboardingSeen = useSettingsStore((s) => s.setOnboardingSeen);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];

  const handleNext = () => {
    if (isLast) {
      setOnboardingSeen(true);
      navigation.replace('Home');
    } else {
      setIndex(index + 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.skip}>
        <TouchableOpacity onPress={() => { setOnboardingSeen(true); navigation.replace('Home'); }}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.slide}>
        <View style={styles.mascotRow}>
          <Decky pose="wave" size={72} />
        </View>
        <Text style={styles.emoji}>{slide.emoji}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </View>

      <View style={styles.bottom}>
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleNext}>
          <Text style={styles.btnText}>{isLast ? 'Get Started' : 'Next'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  skip: { alignItems: 'flex-end', paddingHorizontal: 24, paddingTop: 8 },
  skipText: { fontSize: 14, color: '#bbb', fontWeight: '600' },
  slide: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 40, gap: 16,
  },
  mascotRow: { alignItems: 'center', marginBottom: 12 },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '900', color: '#1a1a1a', textAlign: 'center' },
  body: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
  bottom: { paddingHorizontal: 24, paddingBottom: 32, gap: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#E0D8D0' },
  dotActive: { backgroundColor: '#FF8C42', width: 20 },
  btn: {
    backgroundColor: '#FF8C42', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { fontSize: 17, fontWeight: '800', color: 'white' },
});
