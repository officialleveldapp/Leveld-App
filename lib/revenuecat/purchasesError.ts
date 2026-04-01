import type { PurchasesError } from '@revenuecat/purchases-typescript-internal';
import Purchases from 'react-native-purchases';

/** Human-readable message for UI / logging. */
export function getPurchasesErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as PurchasesError).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong with purchases. Please try again.';
}

export function isUserCancelledError(error: unknown): boolean {
  const code = String((error as PurchasesError | undefined)?.code ?? '');
  return code === String(Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR);
}
