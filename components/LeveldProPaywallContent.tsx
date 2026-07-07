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
import { useRevenueCat, isRevenueCatConfiguredForBuild } from '@/contexts/RevenueCatContext';
import { useAuth } from '@/contexts/AuthContext';
import { paywallPriceCopy } from '@/lib/revenuecat/paywallDisplay';
import {
  type ProPlanRow,
  selectMonthlyAndAnnualPackages,
  approxAnnualSavingsPercent,
} from '@/lib/revenuecat/selectProPlans';
import { getPurchasesErrorMessage } from '@/lib/revenuecat/purchasesError';
import { customerInfoHasLeveldPro } from '@/lib/revenuecat/entitlements';

const BENEFIT_LINES = [
  'Unlimited workout plans & templates',
  'Full exercise library with coaching cues',
  'Advanced stats, PRs & streak insights',
  'Premium badges & early features',
];

import { legalUrl } from '@/lib/legalUrls';

/** How long to wait for the RevenueCat SDK before showing a connection error. */
const RC_READY_TIMEOUT_MS = 12000;
const NOT_AVAILABLE_MSG =
  'In-app purchases aren\u2019t available on this device right now. Please try again later.';
const TIMEOUT_MSG =
  'Couldn\u2019t reach the App Store. Check your connection and try again.';

/** Real localized store price (e.g. "$6.99"), falling back to marketing copy if missing. */
function planPriceString(row: ProPlanRow): string {
  const ps = row.pkg.product.priceString?.trim();
  if (ps) return ps;
  return row.tier === 'annual' ? paywallPriceCopy.yearly : paywallPriceCopy.monthly;
}

/** App Store product title, e.g. "Leveld Pro Monthly". */
function subscriptionTitle(row: ProPlanRow): string {
  const storeTitle = row.pkg.product.title?.trim();
  if (storeTitle) return storeTitle;
  return row.tier === 'annual' ? 'Leveld Pro (Annual)' : 'Leveld Pro (Monthly)';
}

function subscriptionLengthLabel(tier: ProPlanRow['tier']): string {
  return tier === 'annual' ? '1 year' : '1 month';
}

function subscriptionPriceLine(row: ProPlanRow): string {
  const price = planPriceString(row);
  if (row.tier === 'annual') {
    return `${price}/year (${annualPerMonthString(row)}/month)`;
  }
  return `${price}/month`;
}

/** Per-month equivalent of an annual plan, in the product's own currency. */
function annualPerMonthString(row: ProPlanRow): string {
  const product = row.pkg.product;
  const price = typeof product.price === 'number' ? product.price : 0;
  if (price > 0) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: product.currencyCode || 'USD',
      }).format(price / 12);
    } catch {
      // Intl unavailable — fall back to marketing copy below.
    }
  }
  return paywallPriceCopy.yearlyPerMonth;
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
  const [showCongrats, setShowCongrats] = useState(false);
  const [continuing, setContinuing] = useState(false);

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
    if (!isRevenueCatConfiguredForBuild()) {
      setLoading(false);
      setLoadError(NOT_AVAILABLE_MSG);
      return;
    }
    if (rc.isReady) {
      void load();
      return;
    }
    // Configured but the SDK hasn't finished initializing — never spin forever.
    const t = setTimeout(() => {
      setLoading(false);
      setLoadError(TIMEOUT_MSG);
    }, RC_READY_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [rc.isReady, load]);

  const handleRetry = useCallback(() => {
    if (!isRevenueCatConfiguredForBuild()) {
      setLoading(false);
      setLoadError(NOT_AVAILABLE_MSG);
      return;
    }
    if (rc.isReady) {
      void load();
    } else {
      setLoadError(null);
      setLoading(true);
    }
  }, [rc.isReady, load]);

  const selectedRow = planRows.find((r) => r.pkg.identifier === selectedId);

  const monthlyRow = planRows.find((r) => r.tier === 'monthly');
  const annualRow = planRows.find((r) => r.tier === 'annual');
  const savingsPercent = approxAnnualSavingsPercent(monthlyRow?.pkg, annualRow?.pkg) ?? 0;

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
        setShowCongrats(true);
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

  const handleContinue = async () => {
    if (continuing) return;
    setContinuing(true);
    try {
      await onProUnlocked();
    } finally {
      setContinuing(false);
    }
  };

  const openLegal = (kind: 'terms' | 'privacy') => {
    void Linking.openURL(legalUrl(kind));
  };

  if (showCongrats) {
    return (
      <LinearGradient colors={['#0B0E14', '#050608']} style={styles.container}>
        <ScrollView
          contentContainerStyle={[
            styles.congratsContent,
            {
              paddingTop: Math.max(insets.top, 20) + 24,
              paddingBottom: insets.bottom + 24,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.congratsHero}>
            <View style={styles.congratsIcon}>
              <Crown color="#FFB547" size={44} />
            </View>
            <View style={styles.proBadge}>
              <Crown color="#FFB547" size={16} />
              <Text style={styles.proBadgeText}>PRO</Text>
            </View>
            <Text style={styles.congratsTitle}>You&rsquo;re Leveld Pro!</Text>
            <Text style={styles.subtitle}>
              Your subscription is active. Here&rsquo;s everything you just
              unlocked.
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

          <TouchableOpacity
            activeOpacity={0.9}
            disabled={continuing}
            onPress={() => void handleContinue()}
            style={styles.ctaTouchable}
          >
            <LinearGradient
              colors={['#4C91FF', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {continuing ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.ctaLabel}>Get Started</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

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
            <View style={styles.errorBlock}>
              <Text style={styles.error}>{loadError}</Text>
              <TouchableOpacity
                onPress={handleRetry}
                style={styles.retryButton}
                activeOpacity={0.85}
              >
                <Text style={styles.retryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.planList}>
              {planRows.map((row) => {
                const { pkg, tier } = row;
                const active = pkg.identifier === selectedId;
                const isAnnual = tier === 'annual';
                const subtitle = isAnnual
                  ? `${annualPerMonthString(row)}/mo · billed yearly`
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
                          {subscriptionTitle(row)}
                        </Text>
                        <Text style={styles.planSubtitle} numberOfLines={2}>
                          {subscriptionLengthLabel(tier)} · {subtitle}
                        </Text>
                      </View>
                      <Text style={styles.planPrice} numberOfLines={2}>
                        {subscriptionPriceLine(row)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {selectedRow && !loading && !loadError ? (
            <View style={styles.subscriptionSummary}>
              <Text style={styles.subscriptionSummaryTitle}>
                Auto-renewable subscription
              </Text>
              <Text style={styles.subscriptionSummaryLine}>
                <Text style={styles.subscriptionSummaryLabel}>Title: </Text>
                {subscriptionTitle(selectedRow)}
              </Text>
              <Text style={styles.subscriptionSummaryLine}>
                <Text style={styles.subscriptionSummaryLabel}>Length: </Text>
                {subscriptionLengthLabel(selectedRow.tier)}
              </Text>
              <Text style={styles.subscriptionSummaryLine}>
                <Text style={styles.subscriptionSummaryLabel}>Price: </Text>
                {subscriptionPriceLine(selectedRow)}
              </Text>
            </View>
          ) : null}

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
                    ? `Subscribe \u2013 ${planPriceString(selectedRow)}/${
                        selectedRow.tier === 'annual' ? 'yr' : 'mo'
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
              <Text style={styles.footerLink}>Terms of Use (EULA)</Text>
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
            before the current period ends. Manage or cancel in Apple ID
            Account Settings. By subscribing you agree to our{' '}
            <Text style={styles.disclaimerLink} onPress={() => openLegal('terms')}>
              Terms of Use (EULA)
            </Text>
            {' and '}
            <Text style={styles.disclaimerLink} onPress={() => openLegal('privacy')}>
              Privacy Policy
            </Text>
            .
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
  errorBlock: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  error: {
    color: '#FDA4AF',
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 28,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4C91FF',
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
  },
  retryText: {
    color: '#7FB1FF',
    fontSize: 15,
    fontWeight: '800',
  },
  planList: {
    gap: 10,
    marginBottom: 16,
  },
  subscriptionSummary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#252D3A',
    backgroundColor: '#10141C',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    gap: 4,
  },
  subscriptionSummaryTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  subscriptionSummaryLine: {
    color: '#E2E8F0',
    fontSize: 13,
    lineHeight: 18,
  },
  subscriptionSummaryLabel: {
    color: '#94A3B8',
    fontWeight: '600',
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
  disclaimerLink: {
    color: '#64748B',
    textDecorationLine: 'underline',
  },
  congratsContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  congratsHero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  congratsIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 181, 71, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.3)',
  },
  congratsTitle: {
    color: '#F8FAFC',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.4,
  },
});
