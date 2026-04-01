/**
 * Entitlement identifier — must match RevenueCat dashboard exactly
 * (Project → Entitlements → Identifier).
 */
export const LEVELD_PRO_ENTITLEMENT_ID = 'Leveld Pro';

/**
 * Default store product identifiers for Offerings / packages.
 * Override with EXPO_PUBLIC_RC_PRODUCT_* if your App Store / Play IDs differ.
 */
export function getConfiguredProductIds() {
  return {
    monthly:
      process.env.EXPO_PUBLIC_RC_PRODUCT_MONTHLY?.trim() || 'monthly',
    yearly: process.env.EXPO_PUBLIC_RC_PRODUCT_YEARLY?.trim() || 'yearly',
    lifetime:
      process.env.EXPO_PUBLIC_RC_PRODUCT_LIFETIME?.trim() || 'lifetime',
  } as const;
}
