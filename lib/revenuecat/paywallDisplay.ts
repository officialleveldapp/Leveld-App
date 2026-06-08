/**
 * Marketing USD figures shown on custom paywalls. Purchases still use store/RevenueCat packages.
 */
const MONTHLY_USD = 6.99;
const YEARLY_USD = 29.99;

export const paywallPriceCopy = {
  /** e.g. $6.99 */
  monthly: `$${MONTHLY_USD.toFixed(2)}`,
  /** e.g. $29.99 */
  yearly: `$${YEARLY_USD.toFixed(2)}`,
  /** Yearly ÷ 12, for “/mo · billed yearly” subtitle */
  yearlyPerMonth: `$${(YEARLY_USD / 12).toFixed(2)}`,
} as const;

/** Approx. savings vs 12× monthly at the display prices (0–100). */
export function paywallAnnualSavingsPercentDisplay(): number {
  const yearAtMonthly = MONTHLY_USD * 12;
  if (yearAtMonthly <= YEARLY_USD) return 0;
  return Math.round((1 - YEARLY_USD / yearAtMonthly) * 100);
}
