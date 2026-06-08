import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AuthScreenLayout } from '@/components/AuthScreenLayout';
import { Button } from '@/components/Button';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { Input } from '@/components/Input';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/types/database';
import { profileNeedsOnboarding } from '@/lib/postRegisterFlow';
import { useGoogleIdToken } from '@/hooks/useGoogleIdToken';
import { resetToWelcome } from '@/lib/resetToWelcome';
import { replaceWithPendingGroupInviteIfAny } from '@/lib/pendingGroupInviteNavigation';
import { ChevronDown, ChevronUp } from 'lucide-react-native';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const { request, response, promptAsync, configured, googleSetupHint } =
    useGoogleIdToken();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmailAuth, setShowEmailAuth] = useState(false);

  useEffect(() => {
    if (
      Platform.OS === 'android' &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    if (!configured) {
      setShowEmailAuth(true);
    }
  }, [configured]);

  const toggleEmailAuth = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowEmailAuth((v) => !v);
  };

  useEffect(() => {
    if (response?.type === 'success' && 'params' in response && response.params?.id_token) {
      const token = response.params.id_token as string;
      (async () => {
        setLoading(true);
        setError('');
        try {
          const { data } = await signInWithGoogle(token);
          const prof = data?.profile as Profile | undefined;
          if (prof && profileNeedsOnboarding(prof)) {
            router.replace('/onboarding');
          } else if (await replaceWithPendingGroupInviteIfAny(router)) {
            /* resumed group invite */
          } else {
            router.replace('/(tabs)');
          }
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

  const handleSignUp = async () => {
    setError('');

    if (!username || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data } = await signUp(email, password, username);
      const prof = data?.profile as Profile | undefined;
      if (prof && profileNeedsOnboarding(prof)) {
        router.replace('/onboarding');
      } else if (await replaceWithPendingGroupInviteIfAny(router)) {
        /* resumed group invite */
      } else {
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreenLayout
      eyebrow="Join Leveld"
      title="Get started"
      subtitle="Sign up with Google or your email."
      onBack={() =>
        Platform.OS === 'web' ? router.replace('/') : resetToWelcome()
      }
      footer={
        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Already training with us? </Text>
          <TouchableOpacity onPress={() => router.push('/auth/login')} hitSlop={8}>
            <Text style={styles.linkText}>Log in</Text>
          </TouchableOpacity>
        </View>
      }
    >
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
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            onPress={toggleEmailAuth}
            style={styles.altAuthPill}
            activeOpacity={0.75}
          >
            <Text style={styles.altAuthText}>
              {showEmailAuth ? 'Hide email sign-up' : 'Use Email Address'}
            </Text>
            {showEmailAuth ? (
              <ChevronUp color="#4C91FF" size={18} />
            ) : (
              <ChevronDown color="#4C91FF" size={18} />
            )}
          </TouchableOpacity>
        </>
      ) : null}

      {showEmailAuth ? (
        <View style={styles.emailSection}>
          <Input
            label="Username"
            placeholder="Choose a username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            isPassword
          />
          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            isPassword
          />

          <Button
            title="Create account with email"
            onPress={handleSignUp}
            loading={loading}
            style={styles.emailSubmitButton}
          />
        </View>
      ) : null}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </AuthScreenLayout>
  );
}

const styles = StyleSheet.create({
  googleBtn: {
    marginTop: 0,
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
    marginBottom: 4,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2A2A2A',
  },
  dividerText: {
    color: '#777777',
    fontSize: 13,
    paddingHorizontal: 12,
  },
  altAuthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 0,
    paddingVertical: 10,
    paddingHorizontal: 8,
    gap: 6,
  },
  altAuthText: {
    color: '#4C91FF',
    fontSize: 15,
    fontWeight: '600',
  },
  emailSection: {
    marginTop: 16,
    gap: 4,
  },
  emailSubmitButton: {
    marginTop: 16,
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
  linkText: {
    color: '#4C91FF',
    fontSize: 14,
    fontWeight: '600',
  },
});
