import AsyncStorage from '@react-native-async-storage/async-storage';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export interface OcrResult {
  path: string;
  uri: string;
  rawText: string;
  extracted: {
    customerName: string;
    address: string;
    block: string;
    floor: string;
    apartment: string;
    orderNumber: string;
  };
}

export interface ProfilePhotoAsset {
  uri: string;
  base64: string;
  mimeType: string;
}

const emptyExtracted: OcrResult['extracted'] = {
  customerName: '',
  address: '',
  block: '',
  floor: '',
  apartment: '',
  orderNumber: '',
};

function extensionFor(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  return 'jpg';
}

const pendingAvatarKey = (email: string) => `dkd.draborngate.pendingAvatar.${email.trim().toLowerCase()}`;

export async function pickProfilePhoto(source: 'camera' | 'library'): Promise<ProfilePhotoAsset | null> {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error(source === 'camera' ? 'Kamera izni verilmedi.' : 'Fotoğraf erişim izni verilmedi.');

  const options: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.58,
    base64: true,
    cameraType: ImagePicker.CameraType.front,
  };
  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(options)
    : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('Profil fotoğrafı verisi okunamadı.');
  return { uri: asset.uri, base64: asset.base64, mimeType: asset.mimeType || 'image/jpeg' };
}

export async function uploadProfilePhotoAsset(userId: string, asset: ProfilePhotoAsset) {
  const path = `${userId}/profile/avatar.${extensionFor(asset.mimeType)}`;
  const upload = await supabase.storage.from('draborngate-private').upload(path, decode(asset.base64), {
    contentType: asset.mimeType,
    upsert: true,
  });
  if (upload.error) throw upload.error;
  return path;
}

export async function storePendingProfilePhoto(email: string, asset: ProfilePhotoAsset) {
  await AsyncStorage.setItem(pendingAvatarKey(email), JSON.stringify(asset));
}

export async function uploadPendingProfilePhoto(userId: string, email: string) {
  const key = pendingAvatarKey(email);
  const stored = await AsyncStorage.getItem(key);
  if (!stored) return undefined;
  const asset = JSON.parse(stored) as ProfilePhotoAsset;
  const path = await uploadProfilePhotoAsset(userId, asset);
  const { error } = await supabase.rpc('dkd_gate_set_avatar', { p_avatar_url: path });
  if (error) throw error;
  await AsyncStorage.removeItem(key);
  return path;
}

export async function selectAndReadDeliveryImage(userId: string): Promise<OcrResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Fotoğraf erişim izni verilmedi.');
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 0.72, base64: true });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('Görsel verisi okunamadı.');
  const mimeType = asset.mimeType || 'image/jpeg';
  const path = `${userId}/courier/${Date.now()}-${Math.random().toString(36).slice(2)}.${extensionFor(mimeType)}`;
  const upload = await supabase.storage.from('draborngate-private').upload(path, decode(asset.base64), { contentType: mimeType, upsert: false });
  if (upload.error) throw upload.error;

  let rawText = '';
  let extracted = emptyExtracted;
  let errorMessage: string | undefined;
  try {
    const { data, error } = await supabase.functions.invoke('dkd-gate-ocr', { body: { base64Image: asset.base64, mimeType } });
    if (error) throw error;
    if (data?.error) throw new Error(String(data.error));
    rawText = String(data?.rawText || '');
    extracted = { ...emptyExtracted, ...(data?.extracted || {}) };
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : 'OCR tamamlanamadı.';
  }

  await supabase.schema('draborngate').from('dkd_gate_ocr_jobs').insert({
    user_id: userId,
    image_path: path,
    status: rawText ? 'parsed' : 'failed',
    raw_text: rawText || null,
    extracted,
    error_message: errorMessage || null,
  });
  return { path, uri: asset.uri, rawText, extracted };
}

export async function selectAndUploadProfilePhoto(userId: string) {
  const asset = await pickProfilePhoto('library');
  return asset ? uploadProfilePhotoAsset(userId, asset) : null;
}

export async function createPrivateImageUrl(path?: string, expiresIn = 3600) {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from('draborngate-private').createSignedUrl(path, expiresIn);
  if (error) return undefined;
  return data.signedUrl;
}
