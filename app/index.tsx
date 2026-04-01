import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppLogo } from '@/components/AppLogo';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import {
  profileNeedsOnboarding,
  isPostOnboardingPaywallPending,
} from '@/lib/postRegisterFlow';
import { Dumbbell, TrendingUp, Users } from 'lucide-react-native';

const { width } = Dimensions.get('window');

/** Layout box matches the old logo slot; scale blows it up visually without pushing the rest of the screen. */
const LOGO_LAYOUT_SIZE = Math.min(width * 0.38, 152);
const LOGO_VISUAL_SCALE = Math.min(width * 0.62, 280) / LOGO_LAYOUT_SIZE;

export default function WelcomeScreen() {
  const router = useRouter();
  const { user, loading, profile } = useAuth();

  const fadeIn = useRef(new Animated.Value(0)).current;
  const fadeInDown = useRef(new Animated.Value(0)).current;
  const slideDown = useRef(new Animated.Value(-20)).current;

  const iconScale1 = useRef(new Animated.Value(1)).current;
  const iconScale2 = useRef(new Animated.Value(1)).current;
  const iconScale3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (loading || !user || !profile) return;
    let cancelled = false;
    (async () => {
      if (profileNeedsOnboarding(profile)) {
        if (!cancelled) router.replace('/onboarding');
        return;
      }
      if (await isPostOnboardingPaywallPending()) {
        if (!cancelled) router.replace('/paywall');
        return;
      }
      if (!cancelled) router.replace('/(tabs)');
    })();
    return () => {
      cancelled = true;
    };
  }, [user, loading, profile]);

  useEffect(() => {
    // Fade in animations
    Animated.timing(fadeIn, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    Animated.parallel([
      Animated.timing(fadeInDown, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideDown, {
        toValue: 0,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulsing icon animations
    const createPulse = (anim: Animated.Value, duration: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1.15,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1,
            duration,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );

    createPulse(iconScale1, 1200).start();
    createPulse(iconScale2, 1400).start();
    createPulse(iconScale3, 1600).start();
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
      {/* Top section: branding */}
      <View style={styles.topSection}>
        <Animated.View
          style={[
            styles.logoWrap,
            {
              opacity: fadeIn,
              transform: [{ translateY: slideDown }],
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
        </Animated.View>
        <Animated.Text
          style={[
            styles.tagline,
            { opacity: fadeInDown, transform: [{ translateY: slideDown }] },
          ]}
        >
          Level Up Your Fitness
        </Animated.Text>
      </View>

      {/* Middle section: icons + features */}
      <View style={styles.middleSection}>
        <View style={styles.iconRow}>
          <Animated.View
            style={[styles.iconCircle, { transform: [{ scale: iconScale1 }] }]}
          >
            <Dumbbell color="#4C91FF" size={32} />
          </Animated.View>
          <Animated.View
            style={[
              styles.iconCircle,
              styles.iconCircleAccent,
              { transform: [{ scale: iconScale2 }] },
            ]}
          >
            <TrendingUp color="#FFB547" size={32} />
          </Animated.View>
          <Animated.View
            style={[styles.iconCircle, { transform: [{ scale: iconScale3 }] }]}
          >
            <Users color="#4C91FF" size={32} />
          </Animated.View>
        </View>

        <View style={styles.features}>
          <View style={styles.featureItem}>
            <Text style={styles.featureTitle}>Track</Text>
            <Text style={styles.featureText}>
              Log workouts{'\n'}with ease
            </Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Text style={styles.featureTitle}>Streak</Text>
            <Text style={styles.featureText}>
              Stay consistent{'\n'}earn bonus XP
            </Text>
          </View>
          <View style={styles.featureDivider} />
          <View style={styles.featureItem}>
            <Text style={styles.featureTitle}>Compete</Text>
            <Text style={styles.featureText}>
              Challenge friends{'\n'}& groups
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom section: buttons */}
      <View style={styles.bottomSection}>
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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
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

  // ── Top ──
  topSection: {
    flex: 2.5,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 12,
  },
  logoWrap: {
    marginBottom: 4,
    alignItems: 'center',
  },
  /** Fixed layout size so scale doesn't shift siblings; RN transform doesn't expand flex. */
  logoScaleBox: {
    width: LOGO_LAYOUT_SIZE,
    height: LOGO_LAYOUT_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagline: {
    color: '#4C91FF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 4,
  },

  // ── Middle ──
  middleSection: {
    flex: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 32,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E2A3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleAccent: {
    backgroundColor: '#2A2200',
  },
  features: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    width: '100%',
  },
  featureItem: {
    flex: 1,
    alignItems: 'center',
  },
  featureDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#2A2A2A',
    marginTop: 4,
  },
  featureTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureText: {
    color: '#777',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },

  // ── Bottom ──
  bottomSection: {
    flex: 2.5,
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 24,
  },
  button: {
    width: '100%',
  },
  legal: {
    color: '#555',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
