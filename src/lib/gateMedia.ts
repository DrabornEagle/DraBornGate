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

export async function selectAndReadDeliveryImage(userId: string): Promise<OcrResult | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Fotoğraf erişim izni verilmedi.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 0.72,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  if (!asset.base64) throw new Error('Görsel verisi okunamadı.');
  const mimeType = asset.mimeType || 'image/jpeg';
  const ext = extensionFor(mimeType);
  const path = `${userId}/courier/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const upload = await supabase.storage.from('draborngate-private').upload(path, decode(asset.base64), {
    contentType: mimeType,
    upsert: false,
  });
  if (upload.error) throw upload.error;

  let rawText = '';
  let extracted = emptyExtracted;
  let errorMessage: string | undefined;
  try {
    const { data, error } = await supabase.functions.invoke('dkd-gate-ocr', {
      body: { base64Image: asset.base64, mimeType },
    });
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

  if (errorMessage && !rawText) {
    return { path, uri: asset.uri, rawText: '', extracted };
  }
  return { path, uri: asset.uri, rawText, extracted };
}

export async function selectAndUploadProfilePhoto(userId: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error('Fotoğraf erişim izni verilmedi.');
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.72,
    base64: true,
  });
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  const base64 = asset.base64;
  if (!base64) return null;
  const mimeType = asset.mimeType || 'image/jpeg';
  const path = `${userId}/profile/avatar.${extensionFor(mimeType)}`;
  const upload = await supabase.storage.from('draborngate-private').upload(path, decode(base64), {
    contentType: mimeType,
    upsert: true,
  });
  if (upload.error) throw upload.error;
  return path;
}

export async function createPrivateImageUrl(path?: string, expiresIn = 3600) {
  if (!path) return undefined;
  const { data, error } = await supabase.storage.from('draborngate-private').createSignedUrl(path, expiresIn);
  if (error) return undefined;
  return data.signedUrl;
}
