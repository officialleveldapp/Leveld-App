/** Superwall placement ids — create matching placements in the Superwall dashboard. */
export const PLACEMENT_CAMPAIGN_TRIGGER = 'campaign_trigger';
export const PLACEMENT_CUSTOM_TEMPLATE = 'leveld_custom_template';

/**
 * Placement registered automatically after onboarding (see `PostOnboardingSuperwallPaywall`).
 * Defaults to `campaign_trigger` so Superwall’s sample campaign works without extra setup.
 * Override with `EXPO_PUBLIC_SUPERWALL_ONBOARDING_PLACEMENT` for production.
 */
export function getPostOnboardingPlacement(): string {
  const fromEnv = process.env.EXPO_PUBLIC_SUPERWALL_ONBOARDING_PLACEMENT?.trim();
  return fromEnv || PLACEMENT_CAMPAIGN_TRIGGER;
}
