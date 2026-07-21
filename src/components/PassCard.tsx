import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, gradients, radius, spacing } from '../theme';
import { CourierPass } from '../types';
import { AnimatedPressable } from './Motion';
import { StatusPill } from './UI';

const platformTone: Record<CourierPass['platform'], string> = {
  'Trendyol Go': '#FF7B42',
  Yemeksepeti: '#FF5570',
  Getir: '#7A67FF',
  DraBornGo: colors.cyan,
  Diğer: colors.textSoft,
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
  return (
    <AnimatedPressable onPress={onPress} disabled={!onPress}>
      <LinearGradient colors={gradients.panel} style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.identityRow}>
            <View
              style={[
                styles.avatar,
                { backgroundColor: `${platformTone[pass.platform]}22` },
              ]}
            >
              <Ionicons name="bicycle" size={21} color={platformTone[pass.platform]} />
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
          <View style={styles.routeIcon}>
            <Ionicons name="location" size={18} color={colors.cyan} />
          </View>
          <View style={styles.routeTextWrap}>
            <Text style={styles.site}>{pass.site}</Text>
            <Text style={styles.route}>
              {pass.gate} • {pass.block} / Daire {pass.apartment}
            </Text>
          </View>
          {pass.status === 'waiting' || pass.status === 'approved' ? (
            <View style={styles.etaWrap}>
              <Text style={styles.etaValue}>{pass.etaMinutes}</Text>
              <Text style={styles.etaLabel}>DK</Text>
            </View>
          ) : null}
        </View>

        {!compact ? (
          <>
            <View style={styles.divider} />
            <View style={styles.bottomRow}>
              <View>
                <Text style={styles.orderLabel}>SİPARİŞ</Text>
                <Text style={styles.orderValue}>{pass.orderNumber}</Text>
              </View>
              {pass.approvalCode ? (
                <View style={styles.codeWrap}>
                  <Text style={styles.codeLabel}>GEÇİŞ KODU</Text>
                  <Text style={styles.codeValue}>{pass.approvalCode}</Text>
                </View>
              ) : (
                <View style={styles.waitingCode}>
                  <Ionicons name="scan" size={16} color={colors.textSoft} />
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
    borderColor: colors.border,
    padding: spacing.md,
    gap: 15,
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
    gap: 11,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  identityText: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  meta: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 3,
    fontWeight: '600',
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  routeIcon: {
    width: 36,
    height: 36,
    borderRadius: 13,
    backgroundColor: 'rgba(55,216,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  routeTextWrap: {
    flex: 1,
  },
  site: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  route: {
    color: colors.textSoft,
    fontSize: 11,
    marginTop: 3,
  },
  etaWrap: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,179,92,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,179,92,0.22)',
  },
  etaValue: {
    color: colors.orange,
    fontWeight: '900',
    fontSize: 16,
    lineHeight: 18,
  },
  etaLabel: {
    color: colors.orange,
    fontWeight: '800',
    fontSize: 8,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  orderLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  orderValue: {
    color: colors.textSoft,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  codeWrap: {
    alignItems: 'flex-end',
  },
  codeLabel: {
    color: colors.green,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  codeValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 2,
    marginTop: 2,
  },
  waitingCode: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  waitingCodeText: {
    color: colors.textSoft,
    fontSize: 11,
    fontWeight: '700',
  },
});
