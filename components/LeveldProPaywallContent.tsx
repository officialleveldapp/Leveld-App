import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Crown, X } from 'lucide-react-native';
import { AppLogo } from '@/components/AppLogo';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { useAuth } from '@/contexts/AuthContext';
import { paywallAnnualSavingsPercentDisplay, paywallPriceCopy } from '@/lib/revenuecat/paywallDisplay';
import { type ProPlanRow, selectMonthlyAndAnnualPackages } from '@/lib/revenuecat/selectProPlans';
import { getPurchasesErrorMessage } from '@/lib/revenuecat/purchasesError';
import { customerInfoHasLeveldPro } from '@/lib/revenuecat/entitlements';

const BENEFIT_LINES = [
  'Unlimited workout plans & templates',
  'Full exercise library with coaching cues',
  'Advanced stats, PRs & streak insights',
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

export type LeveldProPaywallContentProps = {
  /** Post-onboarding: hide close + “Maybe later” briefly so users engage with the offer. */
  closeButtonDelayMs?: number;
  onDismiss: () => Promise<void>;
  /** Active Leveld Pro after purchase or restore */
  onProUnlocked: () => Promise<void>;
  /** Store returned info but entitlement not active yet */
  onPurchaseReceiptProcessing: () => Promise<void>;
};

export function LeveldProPaywallContent({
  closeButtonDelayMs = 0,
  onDismiss,
  onProUnlocked,
  onPurchaseReceiptProcessing,
}: LeveldProPaywallContentProps) {
  const insets = useSafeAreaInsets();
  const rc = useRevenueCat();
  const { refreshProfile } = useAuth();

  const [showDismissUi, setShowDismissUi] = useState(closeButtonDelayMs <= 0);

  useEffect(() => {
    if (closeButtonDelayMs <= 0) return;
    const t = setTimeout(() => setShowDismissUi(true), closeButtonDelayMs);
    return () => clearTimeout(t);
  }, [closeButtonDelayMs]);

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
          'No current offering configured. Set an offering as Current in the RevenueCat dashboard.',
        );
      } else if (rows.length === 0) {
        setLoadError(
          'Add a monthly and yearly package to your current offering.',
        );
      }
    } catch (e) {
      setLoadError(getPurchasesErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [rc]);

  useEffect(() => {
    if (rc.isReady) void load();
  }, [rc.isReady, load]);

  const selectedRow = planRows.find((r) => r.pkg.identifier === selectedId);

  const savingsPercent = paywallAnnualSavingsPercentDisplay();

  const handleSkip = async () => {
    await onDismiss();
  };

  const handlePurchase = async () => {
    if (!selectedRow) return;
    setPurchasing(true);
    try {
      const result = await rc.purchasePackage(selectedRow.pkg);
      if (result?.customerInfo && customerInfoHasLeveldPro(result.customerInfo)) {
        await refreshProfile();
        await onProUnlocked();
        return;
      }
      if (result?.customerInfo) {
        Alert.alert(
          'Purchase complete',
          'Your receipt is processing. You can start using the app now.',
        );
        await onPurchaseReceiptProcessing();
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
        await refreshProfile();
        await onProUnlocked();
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
    if (url) void Linking.openURL(url);
  };

  return (
    <LinearGradient colors={['#0B0E14', '#050608']} style={styles.container}>
      {showDismissUi ? (
        <TouchableOpacity
          onPress={() => void handleSkip()}
          style={[styles.closeButton, { top: Math.max(insets.top, 20) + 4 }]}
          hitSlop={14}
        >
          <X color="#94A3B8" size={22} />
        </TouchableOpacity>
      ) : null}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 20) + 44,
            paddingBottom: insets.bottom + 24,
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.heroSection}>
          <AppLogo size={140} containerStyle={styles.heroLogo} />
          <View style={styles.proBadge}>
            <Crown color="#FFB547" size={16} />
            <Text style={styles.proBadgeText}>PRO</Text>
          </View>
          <Text style={styles.title}>Unlock Your Full Potential</Text>
          <Text style={styles.subtitle}>
            Get unlimited access to every feature in Leveld
          </Text>
        </View>

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

        <View style={styles.plansSection}>
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
                  ? `${paywallPriceCopy.yearlyPerMonth}/mo · billed yearly`
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
                    {isAnnual && savingsPercent > 0 ? (
                      <View style={styles.savePill}>
                        <Text style={styles.savePillText}>
                          Save {savingsPercent}%
                        </Text>
                      </View>
                    ) : null}
                    {isAnnual ? (
                      <View style={styles.bestValuePill}>
                        <Text style={styles.bestValueText}>Best Value</Text>
                      </View>
                    ) : null}
                    <View style={styles.planCardInner}>
                      <View style={[styles.planRadio, active && styles.planRadioOn]}>
                        {active ? <View style={styles.planRadioDot} /> : null}
                      </View>
                      <View style={styles.planCopy}>
                        <Text style={styles.planName}>
                          {isAnnual ? 'Yearly' : 'Monthly'}
                        </Text>
                        <Text style={styles.planSubtitle} numberOfLines={1}>
                          {subtitle}
                        </Text>
                      </View>
                      <Text style={styles.planPrice} numberOfLines={1}>
                        {isAnnual
                          ? `${paywallPriceCopy.yearly}/yr`
                          : `${paywallPriceCopy.monthly}/mo`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!selectedRow || !!loadError || loading || purchasing}
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
                <Text style={styles.ctaLabel}>
                  {selectedRow
                    ? `Subscribe \u2013 ${
                        selectedRow.tier === 'annual'
                          ? `${paywallPriceCopy.yearly}/yr`
                          : `${paywallPriceCopy.monthly}/mo`
                      }`
                    : 'Subscribe'}
                </Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {showDismissUi ? (
            <TouchableOpacity onPress={() => void handleSkip()} style={styles.skipButton}>
              <Text style={styles.skipText}>Maybe later</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.skipPlaceholder} />
          )}

          <View style={styles.footerLinks}>
            <TouchableOpacity
              onPress={() => void handleRestore()}
              disabled={purchasing}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Text style={styles.footerLink}>Restore</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>&middot;</Text>
            <TouchableOpacity
              onPress={() => openLegal('terms')}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Text style={styles.footerLink}>Terms</Text>
            </TouchableOpacity>
            <Text style={styles.footerDot}>&middot;</Text>
            <TouchableOpacity
              onPress={() => openLegal('privacy')}
              hitSlop={{ top: 8, bottom: 8 }}
            >
              <Text style={styles.footerLink}>Privacy</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.disclaimer}>
            Payment is charged to your Apple ID account at confirmation.
            Subscription auto-renews unless cancelled at least 24 hours
            before the current period ends.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 22,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 28,
  },
  heroLogo: {
    marginBottom: 20,
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 181, 71, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  proBadgeText: {
    color: '#FFB547',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },
  benefitsBlock: {
    width: '100%',
    maxWidth: 340,
    alignSelf: 'center',
    gap: 12,
    marginBottom: 28,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  benefitCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  benefitLine: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#E2E8F0',
    lineHeight: 20,
  },
  plansSection: {
    width: '100%',
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
    marginBottom: 16,
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
    fontSize: 11,
    fontWeight: '800',
  },
  bestValuePill: {
    position: 'absolute',
    top: -10,
    left: 12,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    zIndex: 2,
  },
  bestValueText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  planCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
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
    fontSize: 16,
    fontWeight: '800',
    flexShrink: 0,
    marginLeft: 6,
    textAlign: 'right',
  },
  ctaTouchable: {
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 12,
  },
  ctaGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  skipPlaceholder: {
    height: 47,
    marginBottom: 8,
  },
  skipText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  footerLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  footerLink: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
  footerDot: {
    color: '#334155',
    fontSize: 13,
  },
  disclaimer: {
    color: '#334155',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
