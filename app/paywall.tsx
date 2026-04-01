import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/Button';
import {
  shouldUseSuperwallNative,
  describeSuperwallFallback,
} from '@/lib/superwallAvailability';
import { clearPostOnboardingPaywallPending } from '@/lib/postRegisterFlow';
import { CheckCircle, X } from 'lucide-react-native';

const features = [
  'Unlimited workout tracking',
  'Advanced analytics and insights',
  'Custom workout templates',
  'Group challenges and competitions',
  'Priority badge unlocks',
  'Ad-free experience',
];

export default function PaywallScreen() {
  const router = useRouter();

  if (shouldUseSuperwallNative()) {
    try {
      const { PaywallNativeShell } =
        require('@/components/PaywallNativeShell') as typeof import('@/components/PaywallNativeShell');
      return <PaywallNativeShell />;
    } catch (e) {
      console.warn('[Paywall] Native shell unavailable', e);
    }
  }

  const handleSkip = async () => {
    await clearPostOnboardingPaywallPending();
    router.replace('/(tabs)');
  };

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <TouchableOpacity onPress={handleSkip} style={styles.closeButton}>
        <X color="#999999" size={24} />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <AppLogo size={88} containerStyle={styles.headerLogo} />
          <Text style={styles.title}>Level Up to Pro</Text>
          <Text style={styles.subtitle}>
            Unlock premium features and maximize your fitness journey
          </Text>
        </View>

        <View style={styles.expoGoBanner}>
          <Text style={styles.expoGoBannerText}>{describeSuperwallFallback()}</Text>
        </View>

        <View style={styles.priceCard}>
          <LinearGradient
            colors={['#4C91FF', '#3B7DE0']}
            style={styles.priceGradient}
          >
            <Text style={styles.priceLabel}>Premium</Text>
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>$</Text>
              <Text style={styles.price}>9.99</Text>
              <Text style={styles.period}>/month</Text>
            </View>
            <Text style={styles.trial}>7-day free trial</Text>
          </LinearGradient>
        </View>

        <View style={styles.features}>
          <Text style={styles.featuresTitle}>What you get:</Text>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <CheckCircle color="#4C91FF" size={20} />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Continue to app"
            onPress={handleSkip}
            style={styles.button}
          />
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          Cancel anytime. You won&apos;t be charged until your trial ends.
        </Text>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  headerLogo: {
    marginBottom: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    color: '#999999',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  expoGoBanner: {
    backgroundColor: '#2A2200',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#553300',
  },
  expoGoBannerText: {
    color: '#CCAA66',
    fontSize: 13,
    lineHeight: 19,
  },
  priceCard: {
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  priceGradient: {
    padding: 32,
    alignItems: 'center',
  },
  priceLabel: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  currency: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  price: {
    color: '#FFFFFF',
    fontSize: 56,
    fontWeight: '800',
  },
  period: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  trial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    opacity: 0.8,
  },
  features: {
    marginBottom: 32,
  },
  featuresTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 16,
    flex: 1,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    marginBottom: 12,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    color: '#666666',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});
