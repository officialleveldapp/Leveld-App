import type { CustomerInfo } from 'react-native-purchases';

import { LEVELD_PRO_ENTITLEMENT_ID } from '@/lib/revenuecat/constants';

/**
 * Whether RevenueCat reports an active **Leveld Pro** entitlement.
 * Matches dashboard identifier exactly — see `LEVELD_PRO_ENTITLEMENT_ID`.
 *
 * @example
 * ```ts
 * const info = await Purchases.getCustomerInfo();
 * if (customerInfoHasLeveldPro(info)) {
 *   // grant premium access
 * }
 * ```
 */
export function customerInfoHasLeveldPro(
  customerInfo: CustomerInfo | null | undefined,
): boolean {
  if (!customerInfo) return false;
  return (
    typeof customerInfo.entitlements.active[LEVELD_PRO_ENTITLEMENT_ID] !==
    'undefined'
  );
}
