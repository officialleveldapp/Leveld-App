import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import {
  apiGetFriends,
  apiSearchUsers,
  apiToggleFollow,
  apiGetUserProfile,
} from '@/lib/api';
import {
  ChevronLeft,
  Search,
  UserPlus,
  Users,
  Check,
} from 'lucide-react-native';

type SearchUser = {
  id: number;
  username: string;
  level?: number;
  xp?: number;
  is_following?: boolean;
  is_follower?: boolean;
  is_friend?: boolean;
};

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [friends, setFriends] = useState<SearchUser[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const loadFriends = useCallback(async () => {
    try {
      const { data } = await apiGetFriends();
      if (data) setFriends(data as SearchUser[]);
    } catch {
      setFriends([]);
    } finally {
      setLoadingFriends(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadFriends();
    }, [loadFriends]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadFriends();
    if (query.trim().length >= 2) {
      try {
        const { data } = await apiSearchUsers(query.trim());
        if (data) setResults(data as SearchUser[]);
      } catch {
        setResults([]);
      }
    }
    setRefreshing(false);
  };

  const runSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await apiSearchUsers(q.trim());
      if (data) setResults(data as SearchUser[]);
      else setResults([]);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const patchResult = (userId: number, patch: Partial<SearchUser>) => {
    setResults((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)),
    );
  };

  const handleRelationshipAction = async (u: SearchUser) => {
    if (String(u.id) === String(profile?.id)) return;
    setActingId(u.id);
    try {
      await apiToggleFollow(u.id);
      const { data } = await apiGetUserProfile(u.id);
      if (data) {
        patchResult(u.id, {
          is_following: data.is_following,
          is_follower: data.is_follower,
          is_friend: data.is_friend,
        });
      }
      await loadFriends();
    } catch {
      Alert.alert('Something went wrong', 'Could not update. Try again.');
    } finally {
      setActingId(null);
    }
  };

  const renderActionButton = (u: SearchUser) => {
    const busy = actingId === u.id;
    if (u.is_friend) {
      return (
        <View style={[styles.pill, styles.pillFriends]}>
          <Check color="#51CF66" size={16} strokeWidth={3} />
          <Text style={styles.pillFriendsText}>Friends</Text>
        </View>
      );
    }
    if (u.is_following && !u.is_friend) {
      return (
        <TouchableOpacity
          style={[styles.pill, styles.pillFollowing]}
          onPress={() =>
            Alert.alert(
              'Unfollow?',
              `Stop following @${u.username}?`,
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Unfollow',
                  style: 'destructive',
                  onPress: () => void handleRelationshipAction(u),
                },
              ],
            )
          }
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#94A3B8" size="small" />
          ) : (
            <Text style={styles.pillFollowingText}>Following</Text>
          )}
        </TouchableOpacity>
      );
    }
    if (!u.is_following && u.is_follower) {
      return (
        <TouchableOpacity
          style={[styles.pill, styles.pillPrimary]}
          onPress={() => void handleRelationshipAction(u)}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={styles.pillPrimaryText}>Follow back</Text>
          )}
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.pill, styles.pillPrimary]}
        onPress={() => void handleRelationshipAction(u)}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <UserPlus color="#FFFFFF" size={16} />
            <Text style={styles.pillPrimaryText}>Add friend</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/groups');
  };

  const initial = (name?: string) => (name?.[0] ? name[0].toUpperCase() : '?');

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft color="#FFFFFF" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Friends</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4C91FF" />
        }
      >
        <Text style={styles.intro}>
          Follow people on Leveld. When you follow each other, you&apos;re friends — invite them to
          groups and see each other&apos;s activity.
        </Text>

        <View style={styles.searchWrap}>
          <Search color="#666" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username"
            placeholderTextColor="#666"
            value={query}
            onChangeText={runSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {query.trim().length >= 2 && (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Results</Text>
            {searching && (
              <ActivityIndicator color="#4C91FF" style={{ marginVertical: 16 }} />
            )}
            {!searching && results.length === 0 && (
              <Text style={styles.muted}>No users match that search.</Text>
            )}
            {results.map((u) => (
              <View key={u.id} style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initial(u.username)}</Text>
                </View>
                <View style={styles.rowMid}>
                  <Text style={styles.name}>{u.username}</Text>
                  <Text style={styles.meta}>
                    Level {u.level ?? 1} · {u.xp ?? 0} XP
                  </Text>
                </View>
                {renderActionButton(u)}
              </View>
            ))}
          </View>
        )}

        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <Users color="#4C91FF" size={20} />
            <Text style={styles.blockTitle}>
              Your friends ({loadingFriends ? '…' : friends.length})
            </Text>
          </View>
          {!loadingFriends && friends.length === 0 && query.trim().length < 2 && (
            <Text style={styles.muted}>
              No friends yet. Search for a username above and tap Add friend — when they follow you
              back, you&apos;ll show up here.
            </Text>
          )}
          {!loadingFriends && friends.length === 0 && query.trim().length >= 2 && (
            <Text style={styles.muted}>
              No mutual friends yet. Add people from search — friends appear when you follow each
              other.
            </Text>
          )}
          {friends.map((u) => (
            <View key={u.id} style={styles.row}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial(u.username)}</Text>
              </View>
              <View style={styles.rowMid}>
                <Text style={styles.name}>{u.username}</Text>
                <Text style={styles.meta}>
                  Level {u.level ?? 1} · {u.xp ?? 0} XP
                </Text>
              </View>
              <View style={[styles.pill, styles.pillFriends]}>
                <Check color="#51CF66" size={16} strokeWidth={3} />
                <Text style={styles.pillFriendsText}>Friends</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: { width: 40 },
  scroll: { paddingHorizontal: 20 },
  intro: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
  },
  block: { marginBottom: 24 },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  blockTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '800',
  },
  muted: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  rowMid: { flex: 1, minWidth: 0 },
  name: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  meta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    minWidth: 100,
    justifyContent: 'center',
  },
  pillPrimary: {
    backgroundColor: '#4C91FF',
  },
  pillPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  pillFollowing: {
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#3F3F3F',
  },
  pillFollowingText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  pillFriends: {
    backgroundColor: '#0D2818',
    borderWidth: 1,
    borderColor: '#1A5C2E',
  },
  pillFriendsText: {
    color: '#51CF66',
    fontSize: 13,
    fontWeight: '800',
  },
});
