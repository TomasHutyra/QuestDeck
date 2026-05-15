import React from 'react';
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/RootStack';
import { MOODS } from '../data/moods';
import { allQuests } from '../data/quests';
import { useQuestStore } from '../stores/questStore';
import { useProgressStore } from '../stores/progressStore';
import { usePackStore } from '../stores/packStore';
import { questSelector } from '../lib/questSelector';
import { XPBar } from '../components/XPBar';
import { MoodButton } from '../components/MoodButton';
import { MoodMeta } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { completedQuests, setLastRevealedQuestIds } = useQuestStore();
  const { totalXp, level } = useProgressStore();
  const { unlockedPackIds } = usePackStore();

  const handleMoodPress = (mood: MoodMeta) => {
    const completedIds = completedQuests.map((cq) => cq.questId);
    const selected = questSelector(mood.id, allQuests, unlockedPackIds, completedIds);
    setLastRevealedQuestIds(selected.map((q) => q.id));
    navigation.navigate('QuestReveal', { mood: mood.id });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Image
          source={require('../../assets/OD_logo.png')}
          style={styles.logo}
        />
        <View style={styles.icons}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Progress')}>
            <Text style={styles.iconEmoji}>⭐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Packs')}>
            <Text style={styles.iconEmoji}>📦</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.iconEmoji}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <XPBar level={level} totalXp={totalXp} />

      <FlatList
        data={MOODS}
        numColumns={2}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <MoodButton mood={item} onPress={() => handleMoodPress(item)} />
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F0' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4,
  },
  logo: { height: 44, aspectRatio: 1491 / 1055, resizeMode: 'contain' },
  icons: { flexDirection: 'row', gap: 8 },
  iconBtn: {
    width: 36, height: 36, backgroundColor: '#fff', borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', elevation: 2,
  },
  iconEmoji: { fontSize: 16 },
  grid: { padding: 12 },
  row: { gap: 10, marginBottom: 10 },
  cell: { flex: 1 },
});
