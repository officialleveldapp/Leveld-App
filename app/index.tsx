import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  profileNeedsOnboarding,
  isPostOnboardingPaywallPending,
  isPostOnboardingNotificationsPending,
} from '@/lib/postRegisterFlow';
import { Dumbbell, Flame, Users } from 'lucide-react-native';
import { getWelcomeLogoLayout } from '@/lib/welcomeLogoLayout';

const { width } = Dimensions.get('window');
const { layoutSize: LOGO_LAYOUT_SIZE, visualScale: LOGO_VISUAL_SCALE } =
  getWelcomeLogoLayout(width);

const FEATURES = [
  {
    Icon: Dumbbell,
    color: '#4C91FF',
    bg: 'rgba(76, 145, 255, 0.12)',
    title: 'Track workouts',
    description: 'Log sets, reps, and PRs in seconds',
  },
  {
    Icon: Flame,
    color: '#FFB547',
    bg: 'rgba(255, 181, 71, 0.12)',
    title: 'Build streaks',
    description: 'Stay consistent and earn bonus XP',
  },
  {
    Icon: Users,
    color: '#4C91FF',
    bg: 'rgba(76, 145, 255, 0.12)',
    title: 'Compete together',
    description: 'Join groups and challenge friends',
  },
] as const;

export default function WelcomeScreen() {
  const router = useRouter();
  const segments = useSegments();
  const { user, loading, profile } = useAuth();
  const insets = useSafeAreaInsets();

  const fadeIn = useRef(new Animated.Value(loading ? 0 : 1)).current;
  const heroSlide = useRef(new Animated.Value(loading ? 16 : 0)).current;
  const featuresOpacity = useRef(new Animated.Value(loading ? 0 : 1)).current;
  const featuresSlide = useRef(new Animated.Value(loading ? 20 : 0)).current;
  const ctaOpacity = useRef(new Animated.Value(loading ? 0 : 1)).current;

  useEffect(() => {
    if (loading || !user || !profile) return;
    const seg = segments as string[];
    const onWelcomeRoute =
      seg.length === 0 ||
      (seg.length === 1 && (seg[0] === '' || seg[0] === 'index'));
    if (!onWelcomeRoute) return;

    let cancelled = false;
    (async () => {
      if (profileNeedsOnboarding(profile)) {
        if (!cancelled) router.replace('/onboarding');
        return;
      }
      if (await isPostOnboardingPaywallPending()) {
        if (!cancelled) {
          router.replace({
            pathname: '/paywall',
            params: { source: 'onboarding' },
          });
        }
        return;
      }
      if (await isPostOnboardingNotificationsPending()) {
        if (!cancelled) router.replace('/enable-notifications');
        return;
      }
      if (!cancelled) router.replace('/(tabs)');
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, profile, segments, router]);

  useEffect(() => {
    Animated.stagger(120, [
      Animated.parallel([
        Animated.timing(fadeIn, {
          toValue: 1,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(heroSlide, {
          toValue: 0,
          duration: 520,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(featuresOpacity, {
          toValue: 1,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(featuresSlide, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(ctaOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AppLogo size={88} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <View style={styles.glowBlue} pointerEvents="none" />
      <View style={styles.glowGold} pointerEvents="none" />

      <View
        style={[
          styles.content,
          {
            paddingTop: insets.top + 24,
            paddingBottom: Math.max(insets.bottom, 20) + 8,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.hero,
            {
              opacity: fadeIn,
              transform: [{ translateY: heroSlide }],
            },
          ]}
        >
          <View
            style={[
              styles.logoScaleBox,
              { transform: [{ scale: LOGO_VISUAL_SCALE }] },
            ]}
          >
            <AppLogo size={LOGO_LAYOUT_SIZE} />
          </View>
          <Text style={styles.brandName}>Leveld</Text>
          <Text style={styles.headline}>Level up your fitness</Text>
          <Text style={styles.subhead}>
            The simple way to train, track progress, and stay accountable.
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.features,
            {
              opacity: featuresOpacity,
              transform: [{ translateY: featuresSlide }],
            },
          ]}
        >
          {FEATURES.map(({ Icon, color, bg, title, description }) => (
            <View key={title} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: bg }]}>
                <Icon color={color} size={20} strokeWidth={2.25} />
              </View>
              <View style={styles.featureCopy}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>{description}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={[styles.cta, { opacity: ctaOpacity }]}>
          <Button
            title="Get Started"
            onPress={() => router.push('/auth/signup')}
            style={styles.button}
          />
          <Button
            title="Log In"
            variant="outline"
            onPress={() => router.push('/auth/login')}
            style={styles.button}
          />
          <Text style={styles.legal}>
            By continuing you agree to our Terms & Privacy Policy
          </Text>
        </Animated.View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'space-between',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    gap: 16,
  },
  loadingText: {
    color: '#999999',
    fontSize: 16,
  },
  glowBlue: {
    position: 'absolute',
    top: -40,
    alignSelf: 'center',
    width: width * 0.85,
    height: width * 0.85,
    borderRadius: width * 0.425,
    backgroundColor: 'rgba(76, 145, 255, 0.07)',
  },
  glowGold: {
    position: 'absolute',
    top: width * 0.35,
    right: -width * 0.25,
    width: width * 0.55,
    height: width * 0.55,
    borderRadius: width * 0.275,
    backgroundColor: 'rgba(255, 181, 71, 0.04)',
  },
  hero: {
    alignItems: 'center',
    paddingTop: 8,
  },
  logoScaleBox: {
    width: LOGO_LAYOUT_SIZE,
    height: LOGO_LAYOUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headline: {
    color: '#4C91FF',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 10,
  },
  subhead: {
    color: '#8A8A8A',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  features: {
    gap: 14,
    paddingVertical: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    gap: 2,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  featureDescription: {
    color: '#6E6E6E',
    fontSize: 13,
    lineHeight: 18,
  },
  cta: {
    gap: 12,
  },
  button: {
    width: '100%',
  },
  legal: {
    color: '#4A4A4A',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
});
