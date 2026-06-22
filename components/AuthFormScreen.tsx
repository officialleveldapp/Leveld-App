import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, User } from 'lucide-react-native';
import { AuthScreenLayout, type AuthMode } from '@/components/AuthScreenLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Input } from '@/components/Input';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/database';
import { profileNeedsOnboarding } from '@/lib/postRegisterFlow';
import { useGoogleIdToken } from '@/hooks/useGoogleIdToken';
import { replaceWithPendingGroupInviteIfAny } from '@/lib/pendingGroupInviteNavigation';
import { legalUrl } from '@/lib/legalUrls';

const ICON_COLOR = '#777777';
const ICON_SIZE = 18;

type AuthFormScreenProps = {
  initialMode: AuthMode;
};

export function AuthFormScreen({ initialMode }: AuthFormScreenProps) {
  const router = useRouter();
  const { signIn, signUp, signInWithGoogle } = useAuth();
  const { request, response, promptAsync, configured, googleSetupHint } =
    useGoogleIdToken();

  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const switchMode = (next: AuthMode) => {
    if (next === mode) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setError('');
    setMode(next);
  };

  const navigateAfterAuth = async (prof: Profile | undefined) => {
    if (prof && profileNeedsOnboarding(prof)) {
      router.replace('/onboarding');
    } else if (await replaceWithPendingGroupInviteIfAny(router)) {
      /* resumed group invite */
    } else {
      router.replace('/(tabs)');
    }
  };

  useEffect(() => {
    if (response?.type === 'success' && 'params' in response && response.params?.id_token) {
      const token = response.params.id_token as string;
      (async () => {
        setLoading(true);
        setError('');
        try {
          const { data } = await signInWithGoogle(token);
          await navigateAfterAuth(data?.profile as Profile | undefined);
        } catch (err: any) {
          setError(err.message || 'Google sign-in failed');
        } finally {
          setLoading(false);
        }
      })();
    } else if (response?.type === 'error') {
      setError('Google sign-in was cancelled or failed');
    }
  }, [response]);

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { data } = await signIn(email, password);
      await navigateAfterAuth(data?.profile as Profile | undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');

    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data } = await signUp(email, password, name);
      await navigateAfterAuth(data?.profile as Profile | undefined);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const openLegal = (kind: 'terms' | 'privacy') => {
    void Linking.openURL(legalUrl(kind));
  };

  const footer =
    mode === 'login' ? (
      <View style={styles.footerRow}>
        <Text style={styles.footerText}>New to Leveld? </Text>
        <TouchableOpacity onPress={() => switchMode('signup')} hitSlop={8}>
          <Text style={styles.linkText}>Create an account</Text>
        </TouchableOpacity>
      </View>
    ) : (
      <Text style={styles.legalText}>
        By creating an account you agree to our{' '}
        <Text style={styles.linkText} onPress={() => openLegal('terms')}>
          Terms
        </Text>
        {' & '}
        <Text style={styles.linkText} onPress={() => openLegal('privacy')}>
          Privacy Policy
        </Text>
        .
      </Text>
    );

  return (
    <AuthScreenLayout mode={mode} onModeChange={switchMode} footer={footer}>
      {googleSetupHint ? (
        <Text style={styles.hintText}>{googleSetupHint}</Text>
      ) : null}

      {configured ? (
        <GoogleSignInButton
          onPress={() => promptAsync()}
          disabled={!request || loading}
          loading={loading}
          label="Continue with Google"
          style={styles.googleBtn}
        />
      ) : null}

      {configured ? (
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>
      ) : null}

      <View style={styles.form}>
        {mode === 'signup' ? (
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            tone="auth"
            leftIcon={<User color={ICON_COLOR} size={ICON_SIZE} />}
          />
        ) : null}

        <Input
          label="Email"
          placeholder="you@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          tone="auth"
          leftIcon={<Mail color={ICON_COLOR} size={ICON_SIZE} />}
        />

        <Input
          label="Password"
          placeholder={mode === 'login' ? 'Your password' : 'Create a password'}
          value={password}
          onChangeText={setPassword}
          isPassword
          tone="auth"
          leftIcon={<Lock color={ICON_COLOR} size={ICON_SIZE} />}
        />

        {mode === 'login' ? (
          <TouchableOpacity
            onPress={() => router.push('/auth/forgot-password')}
            style={styles.forgotButton}
          >
            <Text style={styles.linkText}>Forgot password?</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={mode === 'login' ? handleLogin : handleSignUp}
          disabled={loading}
          style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {mode === 'login' ? 'Log in' : 'Create account'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  googleBtn: {
    marginTop: 0,
    borderRadius: 10,
  },
  hintText: {
    color: '#999999',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#333333',
  },
  dividerText: {
    color: '#777777',
    fontSize: 13,
    paddingHorizontal: 12,
  },
  form: {
    width: '100%',
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginTop: -4,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: '#4C91FF',
    borderRadius: 10,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#FF4C4C',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 16,
  },
  footerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: '#999999',
    fontSize: 14,
  },
  legalText: {
    color: '#777777',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  linkText: {
    color: '#4C91FF',
    fontSize: 14,
    fontWeight: '600',
  },
});
