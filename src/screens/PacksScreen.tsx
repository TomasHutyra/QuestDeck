import React from 'react';
import {
  View, Text, FlatList, StyleSheet, SafeAreaView, TouchableOpacity,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { PACKS } from '../data/packs';
import { usePackStore } from '../stores/packStore';
import { Pack } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Packs'>;

export function PacksScreen({ navigation }: Props) {
  const { unlockedPackIds } = usePackStore();

  const renderItem = ({ item }: { item: Pack }) => {
    const isUnlocked = unlockedPackIds.includes(item.id);
    return (
      <View style={[styles.pack, isUnlocked ? styles.packUnlocked : styles.packLocked]}>
        <Text style={styles.packEmoji}>{item.emoji}</Text>
        <View style={styles.packInfo}>
          <Text style={styles.packName}>{item.name}</Text>
          <Text style={styles.packDesc}>{item.description}</Text>
        </View>
        <View style={[styles.badge, isUnlocked ? styles.badgeActive : styles.badgeLocked]}>
          <Text style={[styles.badgeText, isUnlocked ? styles.badgeTextActive : styles.badgeTextLocked]}>
            {isUnlocked ? 'Active' : '🔒 Soon'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Quest Packs</Text>
      </View>

      <FlatList
        data={PACKS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
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
  list: { padding: 16, gap: 12 },
  pack: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14,
  },
  packUnlocked: {
    backgroundColor: '#FFF3E8', borderWidth: 1.5, borderColor: '#FFD0A0',
  },
  packLocked: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#EEE', opacity: 0.75,
  },
  packEmoji: { fontSize: 28 },
  packInfo: { flex: 1, gap: 2 },
  packName: { fontSize: 13, fontWeight: '800', color: '#1a1a1a' },
  packDesc: { fontSize: 11, color: '#888' },
  badge: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 4 },
  badgeActive: { backgroundColor: '#D4EDDA' },
  badgeLocked: { backgroundColor: '#F0E6D8' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextActive: { color: '#3DAA6E' },
  badgeTextLocked: { color: '#aaa' },
});
