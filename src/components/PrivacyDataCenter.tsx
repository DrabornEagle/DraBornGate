import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Alert, Linking, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';
import { colors, radius } from '../theme';
import { AnimatedPressable } from './Motion';
import { Panel } from './UI';

const WEB_ROOT = 'https://www.draborneagle.com/DraBornGate';
const PLAY_SUBSCRIPTIONS = 'https://play.google.com/store/account/subscriptions?package=com.draborneagle.draborngate';

type DeleteStatus = { status?: string; requested_at?: string };

export function PrivacyDataCenter() {
  const [status, setStatus] = useState<DeleteStatus>({ status: 'none' });
  const [working, setWorking] = useState(false);
  const load = async () => { const result = await supabase.rpc('dkd_gate_get_account_deletion_status'); if (!result.error && result.data) setStatus(result.data as DeleteStatus); };
  useEffect(() => { void load(); }, []);
  const open = async (url: string) => { try { await Linking.openURL(url); } catch { Alert.alert('Bağlantı açılamadı', url); } };
  const requestDeletion = () => Alert.alert('Hesabı ve verileri silme talebi', 'Talep sonrası hesap erişimi incelemeye alınır. Yasal olarak tutulması zorunlu kayıtlar dışında hesabınla ilişkili veriler en geç 30 gün içinde silinir veya anonimleştirilir.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Silme talebi oluştur', style: 'destructive', onPress: async () => { setWorking(true); try { const result = await supabase.rpc('dkd_gate_request_account_deletion', { p_reason: 'Uygulama içi Gizlilik ve Veri Merkezi talebi' }); if (result.error) throw result.error; await load(); Alert.alert('Talep alındı', 'Durumu bu ekrandan takip edebilir veya support@draborneagle.com adresine yazabilirsin.'); } catch (error) { Alert.alert('Talep oluşturulamadı', error instanceof Error ? error.message : 'Tekrar dene.'); } finally { setWorking(false); } } },
  ]);
  const cancelDeletion = async () => { setWorking(true); try { const result = await supabase.rpc('dkd_gate_cancel_account_deletion'); if (result.error) throw result.error; await load(); Alert.alert('Talep iptal edildi'); } catch (error) { Alert.alert('İptal edilemedi', error instanceof Error ? error.message : 'Tekrar dene.'); } finally { setWorking(false); } };
  const pending = ['pending', 'processing'].includes(status.status || '');
  return <View style={s.list}>
    <Panel style={s.summary} gradient>
      <Ionicons name="shield-checkmark" size={29} color={colors.green} />
      <View style={s.copy}><Text style={s.title}>Verilerin senin kontrolünde</Text><Text style={s.text}>DraBornGate reklam amacıyla veri satmaz. Kimlik, rol, site, geçiş, isteğe bağlı fotoğraf ve konum verileri yalnızca uygulama işlevleri, güvenlik ve destek için işlenir.</Text></View>
    </Panel>
    <Info icon="person" title="Hesap ve profil" text="Ad soyad, e-posta, telefon, profil fotoğrafı, rol ve kurye bilgileri." />
    <Info icon="location" title="Konum ve site verileri" text="Haritada site pini seçimi ve Akıllı Geçiş doğrulaması sırasında uygulama açıkken konum." />
    <Info icon="receipt" title="Abonelik verileri" text="Kart bilgileri DraBornGate tarafından alınmaz. Ürün, dönem, sipariş ve doğrulama belirteçleri Google Play üzerinden işlenir." />
    <LinkButton icon="document-text" title="Gizlilik Politikası" onPress={() => void open(`${WEB_ROOT}/privacy/`)} />
    <LinkButton icon="reader" title="Kullanım Koşulları" onPress={() => void open(`${WEB_ROOT}/terms/`)} />
    <LinkButton icon="server" title="Veri Güvenliği Özeti" onPress={() => void open(`${WEB_ROOT}/data-safety/`)} />
    <LinkButton icon="card" title="Google Play aboneliklerini yönet" onPress={() => void open(PLAY_SUBSCRIPTIONS)} />
    <LinkButton icon="help-circle" title="Destek ve iletişim" onPress={() => void open(`${WEB_ROOT}/support/`)} />
    <Panel style={[s.deletePanel, pending && s.pending]} gradient>
      <View style={s.row}><Ionicons name={pending ? 'time' : 'trash'} size={25} color={pending ? colors.orange : colors.red} /><View style={s.copy}><Text style={s.title}>{pending ? 'Silme talebi inceleniyor' : 'Hesap ve verileri sil'}</Text><Text style={s.text}>{pending ? `Durum: ${status.status === 'processing' ? 'İşleniyor' : 'Bekliyor'}` : 'Uygulamadan ve web sayfasından hesap silme talebi oluşturabilirsin.'}</Text></View></View>
      {pending ? <AnimatedPressable onPress={() => void cancelDeletion()} disabled={working}><View style={s.cancel}><Text style={s.cancelText}>SİLME TALEBİNİ İPTAL ET</Text></View></AnimatedPressable> : <AnimatedPressable onPress={requestDeletion} disabled={working}><View style={s.delete}><Text style={s.deleteText}>HESABIMI VE VERİLERİMİ SİLME TALEBİ</Text></View></AnimatedPressable>}
      <AnimatedPressable onPress={() => void open(`${WEB_ROOT}/account-deletion/`)}><Text style={s.webText}>Web üzerinden silme seçeneklerini aç</Text></AnimatedPressable>
    </Panel>
  </View>;
}

function Info({ icon, title, text }: { icon: keyof typeof Ionicons.glyphMap; title: string; text: string }) { return <Panel style={s.row} gradient><View style={s.infoIcon}><Ionicons name={icon} size={21} color={colors.cyan} /></View><View style={s.copy}><Text style={s.title}>{title}</Text><Text style={s.text}>{text}</Text></View></Panel>; }
function LinkButton({ icon, title, onPress }: { icon: keyof typeof Ionicons.glyphMap; title: string; onPress: () => void }) { return <AnimatedPressable onPress={onPress}><Panel style={s.link} gradient><Ionicons name={icon} size={22} color={colors.purple} /><Text style={s.linkText}>{title}</Text><Ionicons name="open-outline" size={20} color={colors.textMuted} /></Panel></AnimatedPressable>; }
const s = StyleSheet.create({ list: { gap: 10 }, summary: { flexDirection: 'row', gap: 12, alignItems: 'center', borderColor: 'rgba(67,231,162,.38)' }, copy: { flex: 1 }, title: { color: colors.text, fontSize: 15, fontWeight: '900' }, text: { color: colors.textSoft, fontSize: 11, lineHeight: 17, marginTop: 4 }, row: { flexDirection: 'row', alignItems: 'center', gap: 11 }, infoIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: 'rgba(55,216,255,.12)', alignItems: 'center', justifyContent: 'center' }, link: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 }, linkText: { flex: 1, color: colors.text, fontWeight: '900' }, deletePanel: { gap: 12, borderColor: 'rgba(255,101,125,.42)' }, pending: { borderColor: 'rgba(255,179,92,.5)' }, delete: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,101,125,.55)', backgroundColor: 'rgba(255,101,125,.10)', alignItems: 'center', justifyContent: 'center', padding: 8 }, deleteText: { color: colors.red, fontWeight: '900', fontSize: 11, textAlign: 'center' }, cancel: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: 'rgba(255,179,92,.5)', backgroundColor: 'rgba(255,179,92,.08)', alignItems: 'center', justifyContent: 'center' }, cancelText: { color: colors.orange, fontWeight: '900', fontSize: 11 }, webText: { color: colors.cyan, textAlign: 'center', fontWeight: '800', fontSize: 11 } });
