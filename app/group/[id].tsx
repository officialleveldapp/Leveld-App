import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/Button';
import { apiJoinGroup } from '@/lib/api';
import {
  setPendingGroupInvite,
  clearPendingGroupInvite,
  setOpenGroupAfterTabsNav,
} from '@/lib/groupInviteStorage';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizeId(raw: string | string[] | undefined): string {
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw) && raw[0]) return String(raw[0]).trim();
  return '';
}

export default function GroupInviteScreen() {
  const { id: idParam } = useLocalSearchParams<{ id?: string | string[] }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const groupId = normalizeId(idParam);
  const validId = UUID_RE.test(groupId);

  useEffect(() => {
    if (!validId) return;
    if (authLoading) return;

    if (!user) {
      let cancelled = false;
      (async () => {
        await setPendingGroupInvite(groupId);
        if (!cancelled) router.replace('/auth/login');
      })();
      return () => {
        cancelled = true;
      };
    }

    let cancelled = false;

    (async () => {
      setError(null);
      try {
        const { error: joinErr } = await apiJoinGroup(groupId);
        const detail =
          typeof joinErr?.detail === 'string' ? joinErr.detail : '';
        const already =
          detail === 'Already a member.' || /already a member/i.test(detail);
        if (joinErr && !already) {
          const msg = detail || joinErr?.message || 'Could not join this group';
          setError(typeof msg === 'string' ? msg : 'Could not join this group');
          return;
        }
        await clearPendingGroupInvite();
        await setOpenGroupAfterTabsNav(groupId);
        if (!cancelled) router.replace('/(tabs)/groups');
      } catch {
        if (!cancelled) setError('Something went wrong');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user, groupId, validId, router]);

  if (!validId) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>This invite link is not valid.</Text>
        <Button title="Home" onPress={() => router.replace('/')} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.err}>{error}</Text>
        <Button
          title="Go to Groups"
          onPress={() => router.replace('/(tabs)/groups')}
        />
      </View>
    );
  }

  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#4C91FF" />
      <Text style={styles.hint}>
        {authLoading
          ? 'Loading…'
          : !user
            ? 'Opening sign in…'
            : 'Joining group…'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0A0A0A',
  },
  hint: {
    marginTop: 16,
    color: '#999999',
    fontSize: 15,
  },
  err: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
});
