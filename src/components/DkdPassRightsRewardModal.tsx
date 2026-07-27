import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { dkdRewardedAdUnitId, dkdShowRewardedPassAd } from '../lib/dkdRewardedPassAds';
import { supabase } from '../lib/supabase';
import { colors, gradients, radius, spacing } from '../theme';
import { AnimatedPressable } from './Motion';

export function DkdPassRightsRewardModal({
  visible,
  onClose,
  onOpenPackages,
  onRewarded,
}: {
  visible: boolean;
  onClose: () => void;
  onOpenPackages: () => void;
  onRewarded: () => void | Promise<void>;
}) {
  const [dkdWorking, setDkdWorking] = useState(false);
  const [dkdSuccess, setDkdSuccess] = useState(false);
  const [dkdError, setDkdError] = useState('');

  const dkdClose = () => {
    if (dkdWorking) return;
    setDkdSuccess(false);
    setDkdError('');
    onClose();
  };

  const dkdEarn = async () => {
    setDkdWorking(true);
    setDkdError('');
    try {
      const dkdAdUnitId = dkdRewardedAdUnitId();
      const { data: dkdSession, error: dkdSessionError } = await supabase.rpc('dkd_gate_start_rewarded_ad_session', {
        dkd_param_ad_unit_id: dkdAdUnitId,
        dkd_param_metadata: { source: 'create_pass_limit_popup', app: 'DraBornGate' },
      });
      if (dkdSessionError) throw dkdSessionError;
      const dkdReward = await dkdShowRewardedPassAd();
      const { error: dkdCompleteError } = await supabase.rpc('dkd_gate_complete_rewarded_ad_session', {
        dkd_param_session_id: dkdSession?.session_id,
        dkd_param_reward_payload: { provider_amount: dkdReward.amount, provider_type: dkdReward.type },
      });
      if (dkdCompleteError) throw dkdCompleteError;
      setDkdSuccess(true);
      await onRewarded();
    } catch (dkdCaught) {
      setDkdError(dkdCaught instanceof Error ? dkdCaught.message : 'Ödüllü video tamamlanamadı.');
    } finally {
      setDkdWorking(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={dkdClose}>
      <View style={dkdStyles.overlay}>
        <View style={dkdStyles.card}>
          <LinearGradient colors={dkdSuccess ? gradients.success : gradients.courier} style={dkdStyles.iconShell}>
            <Ionicons name={dkdSuccess ? 'checkmark-done' : 'play-circle'} size={43} color={dkdSuccess ? colors.background : colors.white} />
          </LinearGradient>

          <Text style={dkdStyles.title}>{dkdSuccess ? '3 Geçiş Hakkı Kazanıldı' : 'Geçiş Hakkın Kalmadı'}</Text>
          <Text style={dkdStyles.text}>{dkdSuccess
            ? 'Ödüllü videoyu tamamladığın için hesabına 3 geçiş hakkı eklendi. Artık talebini gönderebilirsin.'
            : 'Kısa bir Video İzleyerek 3 Geçiş Hakkı Kazanabilir veya sana uygun paketi satın alabilirsin.'}</Text>

          {dkdError ? <View style={dkdStyles.error}><Ionicons name="alert-circle" size={20} color={colors.red} /><Text style={dkdStyles.errorText}>{dkdError}</Text></View> : null}

          {dkdSuccess ? (
            <AnimatedPressable onPress={dkdClose}><LinearGradient colors={gradients.success} style={dkdStyles.primary}><Ionicons name="paper-plane" size={21} color={colors.background} /><Text style={dkdStyles.primaryText}>GEÇİŞ TALEBİNE DÖN</Text></LinearGradient></AnimatedPressable>
          ) : (
            <View style={dkdStyles.actions}>
              <AnimatedPressable onPress={() => { dkdClose(); onOpenPackages(); }} disabled={dkdWorking}>
                <View style={dkdStyles.secondary}><Ionicons name="diamond" size={20} color={colors.magenta} /><Text style={dkdStyles.secondaryText}>PAKET SATIN AL</Text></View>
              </AnimatedPressable>
              <AnimatedPressable onPress={() => void dkdEarn()} disabled={dkdWorking}>
                <LinearGradient colors={gradients.success} style={dkdStyles.primary}>
                  {dkdWorking ? <ActivityIndicator color={colors.background} /> : <Ionicons name="play" size={21} color={colors.background} />}
                  <Text style={dkdStyles.primaryText}>{dkdWorking ? 'VİDEO HAZIRLANIYOR' : 'GEÇİŞ HAKKI KAZAN'}</Text>
                </LinearGradient>
              </AnimatedPressable>
              <AnimatedPressable onPress={dkdClose} disabled={dkdWorking}><Text style={dkdStyles.cancel}>ŞİMDİ DEĞİL</Text></AnimatedPressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const dkdStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,5,12,.84)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: { width: '100%', maxWidth: 430, borderRadius: 28, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: '#081624', padding: 22, alignItems: 'center', gap: 14 },
  iconShell: { width: 82, height: 82, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  title: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center' },
  text: { color: colors.textSoft, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  actions: { width: '100%', gap: 10, marginTop: 4 },
  primary: { width: '100%', minHeight: 57, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 12 },
  primaryText: { color: colors.background, fontSize: 12, fontWeight: '900' },
  secondary: { width: '100%', minHeight: 54, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(222,85,255,.45)', backgroundColor: 'rgba(222,85,255,.08)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryText: { color: colors.magenta, fontSize: 12, fontWeight: '900' },
  cancel: { color: colors.textMuted, fontSize: 11, fontWeight: '900', textAlign: 'center', paddingVertical: 8 },
  error: { width: '100%', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,101,125,.4)', backgroundColor: 'rgba(255,101,125,.08)', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  errorText: { flex: 1, color: colors.red, fontSize: 11, lineHeight: 17 },
});
