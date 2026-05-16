import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

const MEMORIES_DIR = `${FileSystem.documentDirectory}memories/`;

async function ensureMemoriesDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(MEMORIES_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(MEMORIES_DIR, { intermediates: true });
  }
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export async function copyPhotoToAppStorage(sourceUri: string): Promise<string> {
  await ensureMemoriesDir();
  const dest = `${MEMORIES_DIR}memory_${Date.now()}_${randomSuffix()}.jpg`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

export async function pickPhotoFromLibrary(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return copyPhotoToAppStorage(result.assets[0].uri);
}

export async function takePhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: false,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return copyPhotoToAppStorage(result.assets[0].uri);
}
