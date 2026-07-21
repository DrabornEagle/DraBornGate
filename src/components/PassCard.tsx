import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';
import { CourierPass } from '../types';
import { AnimatedPressable, FloatingView } from './Motion';
import { RacingMotorcycle } from './RacingMotorcycle';
import { StatusPill } from './UI';

const platformTone: Record<CourierPass['platform'], string> = {
  'Trendyol Go': '#FF8A4C',
  Yemeksepeti: '#FF557D',
  Getir: '#9075FF',
  DraBornGo: colors.cyan,
  Diğer: colors.textSoft,
};

const platformGradient: Record<
  CourierPass['platform'],
  readonly [string, string, string]
> = {
  'Trendyol Go': ['rgba(102,50,28,0.98)', 'rgba(38,42,67,0.98)', 'rgba(10,29,47,0.98)'],
  Yemeksepeti: ['rgba(105,30,55,0.98)', 'rgba(53,35,67,0.98)', 'rgba(10,29,47,0.98)'],
  Getir: ['rgba(72,55,140,0.98)', 'rgba(39,42,90,0.98)', 'rgba(10,29,47,0.98)'],
  DraBornGo: ['rgba(16,91,128,0.98)', 'rgba(42,48,112,0.98)', 'rgba(10,29,47,0.98)'],
  Diğer: ['rgba(39,65,83,0.98)', 'rgba(23,45,67,0.98)', 'rgba(10,29,47,0.98)'],
};

export function PassCard({
  pass,
  onPress,
  compact = false,
}: {
  pass: CourierPass;
  onPress?: () => void;
  compact?: boolean;
}) {
  const tone = platformTone[pass.platform];

  return (
    <AnimatedPressable onPress={onPress} disabled={!onPress}>
      <LinearGradient
        colors={platformGradient[pass.platform]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, { borderColor: `${tone}70` }]}
      >
        <View style={[styles.colorRail, { backgroundColor: tone }]} />
        <View style={styles.decorativeCircle} />

        <View style={styles.topRow}>
          <View style={styles.identityRow}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: `${tone}22`,
                  borderColor: `${tone}60`,
                },
              ]}
            >
              <RacingMotorcycle color={tone} size={49} />
            </View>
            <View style={styles.identityText}>
              <Text style={styles.name} numberOfLines={1}>
                {pass.courierName}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {pass.platform} • {pass.plate}
              </Text>
            </View>
          </View>
          <StatusPill status={pass.status} />
        </View>

        <View style={styles.routeRow}>
          <FloatingView
            distance={3}
            duration={1450}
            style={[styles.routeIcon, { borderColor: `${tone}50` }]}
          >
            <Ionicons name="location" size={21} color={tone} />
          </FloatingView>
          <View style={styles.routeTextWrap}>
            <Text style={styles.site}>{pass.site}</Text>
            <Text style={styles.route}>
              {pass.gate} • {pass.block} / Daire {pass.apartment}
            </Text>
          </View>
          {pass.status === 'waiting' || pass.status === 'approved' ? (
            <View style={styles.etaWrap}>
              <Text style={styles.etaValue}>{pass.etaMinutes}</Text>
              <Text style={styles.etaLabel}>DAKİKA</Text>
            </View>
          ) : null}
        </View>

        {!compact ? (
          <>
            <View style={styles.divider} />
            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.orderLabel}>SİPARİŞ NUMARASI</Text>
                <Text style={styles.orderValue}>{pass.orderNumber}</Text>
              </View>
              {pass.approvalCode ? (
                <View style={styles.codeWrap}>
                  <Text style={styles.codeLabel}>GEÇİŞ KODU</Text>
                  <Text style={styles.codeValue}>{pass.approvalCode}</Text>
                </View>
              ) : (
                <View style={styles.waitingCode}>
                  <Ionicons name="scan" size={19} color={colors.textSoft} />
                  <Text style={styles.waitingCodeText}>Kod bekleniyor</Text>
                </View>
              )}
            </View>
          </>
        ) : null}
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    gap: 17,
    overflow: 'hidden',
  },
  colorRail: {
    position: 'absolute',
    left: 0,
    top: 20,
    bottom: 20,
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 150,
    right: -95,
    bottom: -95,
    borderWidth: 18,
    borderColor: 'rgba(255,255,255,0.025)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  identityRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 62,
    height: 58,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  identityText: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '900',
  },
  meta: {
    color: colors.textSoft,
    fontSize: 13,
    marginTop: 4,
    fontWeight: '700',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  routeIcon: {
    width: 42,
    height: 42,
    borderRadius: 15,
    backgroundColor: 'rgba(55,216,255,0.12)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTextWrap: {
    flex: 1,
  },
  site: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  route: {
    color: colors.textSoft,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  etaWrap: {
    minWidth: 52,
    height: 52,
    paddingHorizontal: 7,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,179,92,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,179,92,0.36)',
  },
  etaValue: {
    color: colors.orange,
    fontWeight: '900',
    fontSize: 19,
    lineHeight: 21,
  },
  etaLabel: {
    color: colors.orange,
    fontWeight: '900',
    fontSize: 7,
    letterSpacing: 0.4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  orderLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  orderValue: {
    color: colors.textSoft,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 4,
  },
  codeWrap: {
    alignItems: 'flex-end',
  },
  codeLabel: {
    color: colors.green,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  codeValue: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '900',
    letterSpacing: 2.2,
    marginTop: 2,
  },
  waitingCode: {
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  waitingCodeText: {
    color: colors.textSoft,
    fontSize: 13,
    fontWeight: '800',
  },
});
