import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

function extensionFor(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

export async function selectAndUploadSubscriptionReceipt(userId: string, siteId: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Dekont seçmek için fotoğraf erişim izni gerekli.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.82,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  if (!asset.base64) throw new Error('Dekont görseli okunamadı.');
  const mimeType = asset.mimeType || 'image/jpeg';
  const path = `${userId}/subscriptions/${siteId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensionFor(mimeType)}`;
  const { error } = await supabase.storage.from('draborngate-private').upload(path, decode(asset.base64), {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;
  return { path, uri: asset.uri };
}
