import Purchases, { type PurchasesPackage } from 'react-native-purchases';

const PT = Purchases.PACKAGE_TYPE;
const ORDER: Record<string, number> = {
  [PT.WEEKLY]: 0,
  [PT.MONTHLY]: 1,
  [PT.TWO_MONTH]: 2,
  [PT.THREE_MONTH]: 3,
  [PT.SIX_MONTH]: 4,
  [PT.ANNUAL]: 5,
  [PT.LIFETIME]: 6,
  [PT.CUSTOM]: 7,
  [PT.UNKNOWN]: 8,
};

/** Stable ordering for plan pickers (monthly → annual → lifetime style). */
export function sortPackagesForDisplay(
  packages: PurchasesPackage[],
): PurchasesPackage[] {
  return [...packages].sort((a, b) => {
    const ra = ORDER[a.packageType] ?? 99;
    const rb = ORDER[b.packageType] ?? 99;
    if (ra !== rb) return ra - rb;
    return a.identifier.localeCompare(b.identifier);
  });
}
