import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, X } from 'lucide-react-native';

import { AppLogo } from '@/components/AppLogo';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import {
  approxAnnualSavingsPercent,
  type ProPlanRow,
  selectMonthlyAndAnnualPackages,
} from '@/lib/revenuecat/selectProPlans';
import { getPurchasesErrorMessage } from '@/lib/revenuecat/purchasesError';
import { customerInfoHasLeveldPro } from '@/lib/revenuecat/entitlements';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPurchased?: () => void;
};

/** One line each — keeps the sheet scannable on small phones. */
const BENEFIT_LINES = [
  'Unlimited plans & full exercise library',
  'Advanced stats, PRs & streak insights',
  'Smarter coaching cues as you level up',
  'Premium badges & early features',
];

function legalUrl(kind: 'terms' | 'privacy'): string | undefined {
  const key =
    kind === 'terms'
      ? process.env.EXPO_PUBLIC_LEGAL_TERMS_URL
      : process.env.EXPO_PUBLIC_LEGAL_PRIVACY_URL;
  const u = key?.trim();
  return u || undefined;
}

export function LeveldProPaywallModal({
  visible,
  onClose,
  onPurchased,
}: Props) {
  const insets = useSafeAreaInsets();
  const rc = useRevenueCat();
  const [loading, setLoading] = useState(true);
  const [planRows, setPlanRows] = useState<ProPlanRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const offerings = await rc.fetchOfferings();
      const current = offerings?.current;
      const raw = current?.availablePackages ?? [];
      const rows = selectMonthlyAndAnnualPackages(raw);
      setPlanRows(rows);
      setSelectedId(rows[0]?.pkg.identifier ?? null);
      if (!current) {
        setLoadError(
          'No current offering in RevenueCat. Set an offering as Current in the dashboard.',
        );
      } else if (rows.length === 0) {
        setLoadError(
          'Add a monthly and yearly package to your current offering (or match product IDs in .env).',
        );
      }
    } catch (e) {
      setLoadError(getPurchasesErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [rc]);

  useEffect(() => {
    if (visible && rc.isReady) {
      void load();
    }
  }, [visible, rc.isReady, load]);

  const selectedRow = planRows.find((r) => r.pkg.identifier === selectedId);

  const savingsPercent = useMemo(() => {
    const monthly = planRows.find((r) => r.tier === 'monthly')?.pkg;
    const annual = planRows.find((r) => r.tier === 'annual')?.pkg;
    return approxAnnualSavingsPercent(monthly, annual);
  }, [planRows]);

  const handlePurchase = async () => {
    if (!selectedRow) return;
    setPurchasing(true);
    try {
      const result = await rc.purchasePackage(selectedRow.pkg);
      if (
        result?.customerInfo &&
        customerInfoHasLeveldPro(result.customerInfo)
      ) {
        onPurchased?.();
        onClose();
        return;
      }
      if (result?.customerInfo) {
        Alert.alert(
          'Purchase complete',
          'Your receipt is processing. Pull to refresh profile in a moment if Pro is still inactive.',
        );
      }
    } catch (e) {
      setLoadError(getPurchasesErrorMessage(e));
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    setLoadError(null);
    try {
      const info = await rc.restorePurchases();
      if (info && customerInfoHasLeveldPro(info)) {
        onPurchased?.();
        onClose();
      } else {
        Alert.alert(
          'Restore',
          'No active Leveld Pro subscription found for this Apple ID.',
        );
      }
    } catch (e) {
      setLoadError(getPurchasesErrorMessage(e));
    } finally {
      setPurchasing(false);
    }
  };

  const openLegal = (kind: 'terms' | 'privacy') => {
    const url = legalUrl(kind);
    if (!url) {
      Alert.alert(
        'Link not configured',
        `Set EXPO_PUBLIC_LEGAL_${kind === 'terms' ? 'TERMS' : 'PRIVACY'}_URL in .env`,
      );
      return;
    }
    void Linking.openURL(url);
  };

  const annualRow = planRows.find((r) => r.tier === 'annual');
  const monthlyRow = planRows.find((r) => r.tier === 'monthly');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollInner,
            {
              paddingTop: Math.max(insets.top, 8) + 4,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          bounces
        >
          {/* Light hero: logo → centered copy → centered checklist */}
          <View style={styles.hero}>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={14}
              style={styles.closeFloating}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X color="#1A1A1A" size={22} />
            </TouchableOpacity>

            <View style={styles.heroCenterColumn}>
              <AppLogo size={76} containerStyle={styles.heroLogo} />
              <Text style={styles.headlineCenter}>Leveld Pro</Text>
              <Text style={styles.heroSubCenter} numberOfLines={3}>
                Same membership — pick monthly or yearly billing below.
              </Text>

              <View style={styles.benefitsBlock}>
                {BENEFIT_LINES.map((line) => (
                  <View key={line} style={styles.benefitRow}>
                    <View style={styles.benefitCheck}>
                      <Check color="#FFFFFF" size={12} strokeWidth={3} />
                    </View>
                    <Text style={styles.benefitLine}>{line}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Dark plans */}
          <View style={styles.plansSection}>
            <Text style={styles.plansHint} numberOfLines={2}>
              {monthlyRow && annualRow
                ? 'Yearly = lower cost per month. Monthly = easiest to try.'
                : monthlyRow || annualRow
                  ? 'Add the other plan in RevenueCat to show both tiers.'
                  : 'Connect monthly + annual in your current offering.'}
            </Text>

            {loading ? (
              <View style={styles.loaderBlock}>
                <ActivityIndicator size="large" color="#4C91FF" />
              </View>
            ) : loadError ? (
              <Text style={styles.error}>{loadError}</Text>
            ) : (
              <View style={styles.planList}>
                {planRows.map((row) => {
                  const { pkg, tier } = row;
                  const active = pkg.identifier === selectedId;
                  const isAnnual = tier === 'annual';
                  const subtitle = isAnnual
                    ? pkg.product.pricePerMonthString
                      ? `${pkg.product.pricePerMonthString} avg · billed yearly`
                      : 'Billed once per year'
                    : 'Cancel anytime';

                  return (
                    <Pressable
                      key={pkg.identifier}
                      onPress={() => setSelectedId(pkg.identifier)}
                      style={({ pressed }) => [
                        styles.planCard,
                        active && styles.planCardActive,
                        pressed && styles.planCardPressed,
                      ]}
                    >
                      {isAnnual && savingsPercent != null && savingsPercent > 0 ? (
                        <View style={styles.savePill}>
                          <Text style={styles.savePillText}>
                            {savingsPercent}% off
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.planCardInner}>
                        <View
                          style={[
                            styles.planRadio,
                            active && styles.planRadioOn,
                          ]}
                        >
                          {active ? <View style={styles.planRadioDot} /> : null}
                        </View>
                        <View style={styles.planCopy}>
                          <Text style={styles.planName}>
                            {isAnnual ? 'Yearly' : 'Monthly'}
                          </Text>
                          <Text
                            style={styles.planSubtitle}
                            numberOfLines={1}
                          >
                            {subtitle}
                          </Text>
                        </View>
                        <Text
                          style={styles.planPrice}
                          numberOfLines={1}
                        >
                          {isAnnual
                            ? `${pkg.product.priceString}/yr`
                            : `${pkg.product.priceString}/mo`}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              disabled={
                !selectedRow || !!loadError || loading || purchasing
              }
              onPress={() => void handlePurchase()}
              style={styles.ctaTouchable}
            >
              <LinearGradient
                colors={
                  !selectedRow || !!loadError || loading
                    ? ['#555555', '#444444']
                    : ['#4C91FF', '#2563EB']
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaGradient}
              >
                {purchasing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.ctaLabel}>Continue</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity
                onPress={() => void handleRestore()}
                disabled={purchasing}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <Text style={styles.footerLink}>Restore</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity
                onPress={() => openLegal('terms')}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <Text style={styles.footerLink}>Terms</Text>
              </TouchableOpacity>
              <Text style={styles.footerDot}>·</Text>
              <TouchableOpacity
                onPress={() => openLegal('privacy')}
                hitSlop={{ top: 8, bottom: 8 }}
              >
                <Text style={styles.footerLink}>Privacy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050608',
  },
  scroll: {
    flex: 1,
  },
  // Do not use flexGrow:1 here — it can block scrolling when content is taller than the sheet.
  scrollInner: {},
  hero: {
    position: 'relative',
    backgroundColor: '#F4F6FA',
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 22,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  closeFloating: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 2,
    padding: 6,
  },
  heroCenterColumn: {
    alignItems: 'center',
    width: '100%',
  },
  heroLogo: {
    marginBottom: 14,
  },
  headlineCenter: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0D0D0D',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubCenter: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5C6678',
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 18,
    maxWidth: 320,
  },
  benefitsBlock: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  benefitCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  benefitLine: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2A3140',
    lineHeight: 20,
  },
  plansSection: {
    paddingHorizontal: 18,
    paddingTop: 20,
  },
  plansHint: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  loaderBlock: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  error: {
    color: '#FDA4AF',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
    textAlign: 'center',
  },
  planList: {
    gap: 10,
    marginBottom: 14,
  },
  planCard: {
    borderRadius: 14,
    backgroundColor: '#141922',
    borderWidth: 2,
    borderColor: '#252D3A',
    overflow: 'visible',
  },
  planCardActive: {
    borderColor: '#4C91FF',
    backgroundColor: '#161E2E',
  },
  planCardPressed: {
    opacity: 0.92,
  },
  savePill: {
    position: 'absolute',
    top: -10,
    right: 12,
    backgroundColor: '#2563EB',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 2,
  },
  savePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  planRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioOn: {
    borderColor: '#4C91FF',
  },
  planRadioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#4C91FF',
  },
  planCopy: {
    flex: 1,
    marginRight: 8,
  },
  planName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  planSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
    lineHeight: 15,
  },
  planPrice: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: '800',
    flexShrink: 0,
    marginLeft: 6,
    textAlign: 'right',
  },
  ctaTouchable: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ctaGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingBottom: 8,
  },
  footerLink: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  footerDot: {
    color: '#475569',
    fontSize: 13,
  },
});
