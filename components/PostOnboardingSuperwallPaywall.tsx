import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { usePlacement, useSuperwall } from 'expo-superwall';
import { useAuth } from '@/contexts/AuthContext';
import { getPostOnboardingPlacement } from '@/lib/placements';
import { clearPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';

const CONFIG_WAIT_MS = 15000;

/**
 * Registers the post-onboarding Superwall placement once the SDK is configured.
 * Superwall may present its paywall UI; on dismiss/skip/error we continue into the app.
 */
export function PostOnboardingSuperwallPaywall() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const dismiss = useSuperwall((s) => s.dismiss);
  const isConfigured = useSuperwall((s) => s.isConfigured);
  const triggeredRef = useRef(false);
  const [phase, setPhase] = useState<'config' | 'registering' | 'stuck'>(
    'config',
  );

  const goHome = useCallback(() => {
    void clearPostOnboardingPaywallPending();
    void refreshProfile();
    router.replace('/(tabs)');
  }, [refreshProfile, router]);

  const { registerPlacement } = usePlacement({
    onDismiss: () => {
      goHome();
    },
    onSkip: () => {
      goHome();
    },
    onError: (msg) => {
      console.warn('[Superwall] post-onboarding:', msg);
      goHome();
    },
  });

  useEffect(() => {
    if (!isConfigured) return;
    if (triggeredRef.current) return;
    triggeredRef.current = true;
    setPhase('registering');

    void registerPlacement({
      placement: getPostOnboardingPlacement(),
      feature: () => {
        goHome();
      },
    });
  }, [isConfigured, registerPlacement, goHome]);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase((prev) => (prev === 'config' ? 'stuck' : prev));
    }, CONFIG_WAIT_MS);
    return () => clearTimeout(t);
  }, []);

  const handleSkipDev = useCallback(() => {
    void dismiss();
    goHome();
  }, [dismiss, goHome]);

  const handleContinueAfterTimeout = useCallback(() => {
    goHome();
  }, [goHome]);

  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#4C91FF" />
      <Text style={styles.title}>Preparing your offer</Text>
      <Text style={styles.sub}>
        {phase === 'config'
          ? 'Connecting to Superwall…'
          : 'If a paywall appears, complete or close it to continue.'}
      </Text>
      {phase === 'stuck' ? (
        <>
          <Text style={styles.stuckHint}>
            Superwall did not finish configuring. Check EXPO_PUBLIC_SUPERWALL_IOS_KEY
            and network, or continue below.
          </Text>
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinueAfterTimeout}
            activeOpacity={0.8}
          >
            <Text style={styles.continueText}>Continue to app</Text>
          </TouchableOpacity>
        </>
      ) : null}
      {__DEV__ ? (
        <TouchableOpacity
          style={styles.devSkip}
          onPress={handleSkipDev}
          activeOpacity={0.7}
        >
          <Text style={styles.devSkipText}>Skip (dev)</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  sub: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  stuckHint: {
    color: '#AA6644',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  continueBtn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#4C91FF',
  },
  continueText: {
    color: '#4C91FF',
    fontSize: 16,
    fontWeight: '600',
  },
  devSkip: {
    position: 'absolute',
    bottom: 32,
    padding: 12,
  },
  devSkipText: {
    color: '#666666',
    fontSize: 13,
  },
});
