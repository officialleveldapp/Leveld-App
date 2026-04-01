import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { getConfiguredProductIds } from '@/lib/revenuecat/constants';

const PT = Purchases.PACKAGE_TYPE;

export type ProPlanTier = 'monthly' | 'annual';

export type ProPlanRow = {
  tier: ProPlanTier;
  pkg: PurchasesPackage;
};

function pickMonthly(
  packages: PurchasesPackage[],
): PurchasesPackage | undefined {
  const ids = getConfiguredProductIds();
  const byStoreId = packages.find((p) => p.product.identifier === ids.monthly);
  if (byStoreId) return byStoreId;
  return packages.find((p) => p.packageType === PT.MONTHLY);
}

function pickAnnual(
  packages: PurchasesPackage[],
): PurchasesPackage | undefined {
  const ids = getConfiguredProductIds();
  const byStoreId = packages.find((p) => p.product.identifier === ids.yearly);
  if (byStoreId) return byStoreId;
  return packages.find((p) => p.packageType === PT.ANNUAL);
}

/**
 * Pro paywall: only **monthly** and **annual** packages (no lifetime / multi-month).
 * Annual is listed first as the default “best value” row.
 */
export function selectMonthlyAndAnnualPackages(
  packages: PurchasesPackage[],
): ProPlanRow[] {
  const monthlyPkg = pickMonthly(packages);
  const annualPkg = pickAnnual(packages);
  const rows: ProPlanRow[] = [];
  if (annualPkg) rows.push({ tier: 'annual', pkg: annualPkg });
  if (monthlyPkg) rows.push({ tier: 'monthly', pkg: monthlyPkg });
  return rows;
}

/** Approx. percent saved vs paying monthly × 12 (0–100). */
export function approxAnnualSavingsPercent(
  monthly: PurchasesPackage | undefined,
  annual: PurchasesPackage | undefined,
): number | null {
  if (!monthly || !annual) return null;
  const m = monthly.product.price;
  const y = annual.product.price;
  if (m <= 0 || y <= 0) return null;
  const yearAtMonthlyRate = m * 12;
  if (yearAtMonthlyRate <= y) return null;
  return Math.round((1 - y / yearAtMonthlyRate) * 100);
}
