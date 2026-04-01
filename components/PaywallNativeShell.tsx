import React from 'react';
import { Text, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSuperwall } from 'expo-superwall';
import { useAuth } from '@/contexts/AuthContext';
import { AppLogo } from '@/components/AppLogo';
import { PostOnboardingSuperwallPaywall } from '@/components/PostOnboardingSuperwallPaywall';
import { getPostOnboardingPlacement } from '@/lib/placements';
import { clearPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';
import { X } from 'lucide-react-native';

/** Full-screen wrapper for post-onboarding Superwall (dev / standalone builds only). */
export function PaywallNativeShell() {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const dismiss = useSuperwall((s) => s.dismiss);

  const handleClose = () => {
    void dismiss();
    void clearPostOnboardingPaywallPending();
    void refreshProfile();
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
        <X color="#999999" size={24} />
      </TouchableOpacity>
      <View style={styles.logoRow}>
        <AppLogo size={64} />
      </View>
      <Text style={styles.placementHint}>
        Placement: {getPostOnboardingPlacement()}
      </Text>
      <PostOnboardingSuperwallPaywall />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  logoRow: {
    paddingTop: 56,
    alignItems: 'center',
  },
  placementHint: {
    position: 'absolute',
    top: 56,
    left: 20,
    right: 56,
    color: '#555555',
    fontSize: 11,
    zIndex: 9,
  },
});
