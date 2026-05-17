import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type Props = {
  onRate: () => void;
  onMaybeLater: () => void;
};

export function StoreReviewPromptCard({ onRate, onMaybeLater }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.icon}>⭐</Text>
      <Text style={styles.title}>Enjoying QuestDeck?</Text>
      <Text style={styles.subtitle}>A quick Google Play rating helps more people discover it.</Text>
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.primaryBtn} onPress={onRate}>
          <Text style={styles.primaryText}>Rate QuestDeck</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={onMaybeLater}>
          <Text style={styles.secondaryText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF8F0',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#FFD0A0',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  icon: { fontSize: 28 },
  title: { fontSize: 15, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 18 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 8 },
  primaryBtn: {
    backgroundColor: '#FF8C42',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  primaryText: { fontSize: 13, fontWeight: '800', color: 'white' },
  secondaryBtn: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1.5,
    borderColor: '#FFD0A0',
  },
  secondaryText: { fontSize: 13, fontWeight: '700', color: '#888' },
});
