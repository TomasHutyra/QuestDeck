import React from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
        <View style={styles.packTop}>
          <Text style={styles.packEmoji}>{item.emoji}</Text>
          {isUnlocked ? (
            <View style={styles.badgeActive}>
              <Text style={styles.badgeTextActive}>Active</Text>
            </View>
          ) : (
            <View style={styles.badgeSoon}>
              <Text style={styles.badgeTextSoon}>Coming soon</Text>
            </View>
          )}
        </View>
        <Text style={styles.packName}>{item.name}</Text>
        <Text style={styles.packDesc}>{item.description}</Text>
        <Text style={styles.packCount}>{item.questCount} quests</Text>
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
    borderRadius: 16, padding: 16, gap: 6,
  },
  packUnlocked: {
    backgroundColor: '#FFF3E8', borderWidth: 1.5, borderColor: '#FFD0A0',
  },
  packLocked: {
    backgroundColor: 'white', borderWidth: 1.5, borderColor: '#EEE',
  },
  packTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  packEmoji: { fontSize: 32 },
  packName: { fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  packDesc: { fontSize: 13, color: '#666', lineHeight: 18 },
  packCount: { fontSize: 12, color: '#aaa', fontWeight: '600', marginTop: 2 },
  badgeActive: {
    backgroundColor: '#D4EDDA', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeTextActive: { fontSize: 12, fontWeight: '700', color: '#3DAA6E' },
  badgeSoon: {
    backgroundColor: '#F0ECE8', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
  },
  badgeTextSoon: { fontSize: 12, fontWeight: '700', color: '#999' },
});
