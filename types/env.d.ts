declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_API_URL: string;
      /** iOS OAuth client ID from Google Cloud / GoogleService-Info.plist (CLIENT_ID). */
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
      EXPO_PUBLIC_SUPERWALL_IOS_KEY?: string;
      EXPO_PUBLIC_SUPERWALL_ANDROID_KEY?: string;
      /** Superwall placement after onboarding (default in code: campaign_trigger). */
      EXPO_PUBLIC_SUPERWALL_ONBOARDING_PLACEMENT?: string;
      /** Set to 1 in __DEV__ for Superwall developer network + debug logging. */
      EXPO_PUBLIC_SUPERWALL_DEBUG?: string;
      /** RevenueCat Apple / iOS SDK public API key. */
      EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY?: string;
      /** RevenueCat Google Play SDK public API key. */
      EXPO_PUBLIC_REVENUECAT_GOOGLE_API_KEY?: string;
      EXPO_PUBLIC_RC_PRODUCT_MONTHLY?: string;
      EXPO_PUBLIC_RC_PRODUCT_YEARLY?: string;
      EXPO_PUBLIC_RC_PRODUCT_LIFETIME?: string;
      /** Optional: opens from Pro paywall footer. */
      EXPO_PUBLIC_LEGAL_TERMS_URL?: string;
      EXPO_PUBLIC_LEGAL_PRIVACY_URL?: string;
    }
  }
}

export {};
