import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { AppLogo } from '@/components/AppLogo';
import { resetToWelcome } from '@/lib/resetToWelcome';

export type AuthMode = 'login' | 'signup';

type AuthScreenLayoutProps = {
  mode: AuthMode;
  onModeChange: (mode: AuthMode) => void;
  footer: React.ReactNode;
  children: React.ReactNode;
};

const COPY = {
  login: {
    title: 'Welcome back',
    subtitle: 'Pick up your streak where you left off.',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Start tracking, earning XP, and leveling up.',
  },
} as const;

export function AuthScreenLayout({
  mode,
  onModeChange,
  footer,
  children,
}: AuthScreenLayoutProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const horizontalPad = Math.max(24, (width - Math.min(400, width - 48)) / 2);
  const logoSize = Math.min(72, Math.max(56, width * 0.17));
  const { title, subtitle } = COPY[mode];

  const goBackToLanding = () => {
    if (Platform.OS === 'web') {
      router.replace('/');
    } else {
      resetToWelcome();
    }
  };

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity
          onPress={goBackToLanding}
          style={[
            styles.backButton,
            {
              top: insets.top + 8,
              left: horizontalPad,
            },
          ]}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          activeOpacity={0.7}
        >
          <ArrowLeft color="#FFFFFF" size={24} />
        </TouchableOpacity>

        <ScrollView
          contentContainerStyle={[
            styles.scrollInner,
            {
              paddingTop: insets.top + 44,
              paddingBottom: Math.max(insets.bottom, 24),
              paddingHorizontal: horizontalPad,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          <View style={[styles.panel, { maxWidth: Math.min(400, width - 48) }]}>
            <View style={styles.brandBlock}>
              <AppLogo size={logoSize} />
              <Text style={styles.brandName}>Leveld</Text>
            </View>

            <View style={styles.toggleTrack}>
              <TouchableOpacity
                onPress={() => onModeChange('login')}
                style={[styles.toggleSegment, mode === 'login' && styles.toggleActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.toggleText, mode === 'login' && styles.toggleTextActive]}
                >
                  Log in
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onModeChange('signup')}
                style={[styles.toggleSegment, mode === 'signup' && styles.toggleActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.toggleText, mode === 'signup' && styles.toggleTextActive]}
                >
                  Sign up
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.body}>{children}</View>

            <View style={styles.footerWrap}>{footer}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
  },
  scrollInner: {
    flexGrow: 1,
    alignItems: 'center',
  },
  panel: {
    width: '100%',
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: 28,
  },
  brandName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 10,
    letterSpacing: -0.3,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: '#171717',
    borderRadius: 12,
    padding: 4,
    marginBottom: 28,
  },
  toggleSegment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  toggleActive: {
    backgroundColor: '#4C91FF',
  },
  toggleText: {
    color: '#888888',
    fontSize: 15,
    fontWeight: '600',
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
  header: {
    marginBottom: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: '#999999',
    fontSize: 15,
    lineHeight: 22,
  },
  body: {
    width: '100%',
  },
  footerWrap: {
    marginTop: 24,
    alignItems: 'center',
  },
});
