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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppLogo } from '@/components/AppLogo';
import { getWelcomeLogoLayout } from '@/lib/welcomeLogoLayout';
import { ArrowLeft } from 'lucide-react-native';

/** Auth card logo: smaller than welcome hero; same base layout from `getWelcomeLogoLayout`. */
const AUTH_LOGO_SIZE_FACTOR = 0.7;

type AuthScreenLayoutProps = {
  title: string;
  subtitle: string;
  eyebrow?: string;
  onBack: () => void;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export function AuthScreenLayout({
  title,
  subtitle,
  eyebrow,
  onBack,
  footer,
  children,
}: AuthScreenLayoutProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelMaxWidth = Math.min(420, width - 48);
  const { layoutSize, visualScale, visualSize } = getWelcomeLogoLayout(width);
  const authVisualScale = visualScale * AUTH_LOGO_SIZE_FACTOR;
  const authVisualSize = visualSize * AUTH_LOGO_SIZE_FACTOR;

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <TouchableOpacity
          onPress={onBack}
          style={[
            styles.backButton,
            {
              top: insets.top + 8,
              left: 24,
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
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          <View style={[styles.panel, { maxWidth: panelMaxWidth }]}>
            <View style={[styles.logoStage, { height: authVisualSize }]}>
              <View
                style={[
                  styles.logoScaleBox,
                  {
                    width: layoutSize,
                    height: layoutSize,
                    transform: [{ scale: authVisualScale }],
                  },
                ]}
              >
                <AppLogo size={layoutSize} />
              </View>
            </View>

            {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}

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
  scrollInner: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    zIndex: 10,
  },
  panel: {
    width: '100%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: 'rgba(30, 30, 30, 0.92)',
    paddingTop: 6,
    paddingBottom: 14,
    paddingHorizontal: 16,
    overflow: 'visible',
  },
  logoStage: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 0,
  },
  logoScaleBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: '#4C91FF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subtitle: {
    color: '#999999',
    fontSize: 15,
    lineHeight: 21,
  },
  body: {
    width: '100%',
  },
  footerWrap: {
    marginTop: 12,
    alignItems: 'center',
  },
});
