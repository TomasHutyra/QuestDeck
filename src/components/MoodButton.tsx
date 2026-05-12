import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { MoodMeta } from '../types';

type Props = {
  mood: MoodMeta;
  onPress: () => void;
};

export function MoodButton({ mood, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.emoji}>{mood.emoji}</Text>
      <Text style={styles.label}>{mood.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },
  emoji: { fontSize: 22, marginBottom: 4 },
  label: { fontSize: 11, fontWeight: '600', color: '#333' },
});
