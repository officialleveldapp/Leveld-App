import React, { useCallback, useMemo, useState } from 'react';
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
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { usePaywall } from '@/contexts/PaywallContext';
import { useRevenueCatOptional } from '@/contexts/RevenueCatContext';
import { ProLockScreen } from '@/components/ProLockScreen';
import {
  apiGetFriends,
  apiGetFollowers,
  apiGetFollowing,
  apiSearchUsers,
  apiToggleFollow,
} from '@/lib/api';
import { ChevronLeft, Search, UserPlus, Users, Check } from 'lucide-react-native';

type UserRow = {
  id: number;
  username: string;
  level?: number;
  xp?: number;
  avatar_url?: string;
  is_following?: boolean;
  is_follower?: boolean;
  is_friend?: boolean;
};

type TabKey = 'friends' | 'following' | 'followers';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'following', label: 'Following' },
  { key: 'followers', label: 'Followers' },
];

type RelState = 'friend' | 'following' | 'follow_back' | 'add';

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const showPaywall = usePaywall();
  const rc = useRevenueCatOptional();
  const proActive = Boolean(rc?.isEffectivelyPro || profile?.is_pro);
  const params = useLocalSearchParams<{ tab?: string }>();

  const initialTab: TabKey =
    params.tab === 'following' || params.tab === 'followers' ? params.tab : 'friends';
  const [tab, setTab] = useState<TabKey>(initialTab);

  const [friends, setFriends] = useState<UserRow[]>([]);
  const [following, setFollowing] = useState<UserRow[]>([]);
  const [followers, setFollowers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [actingId, setActingId] = useState<number | null>(null);

  const myId = profile?.id;

  const loadAll = useCallback(async () => {
    try {
      const [fr, fo, fl] = await Promise.all([
        apiGetFriends(),
        myId != null ? apiGetFollowing(myId) : Promise.resolve({ data: [] as UserRow[] }),
        myId != null ? apiGetFollowers(myId) : Promise.resolve({ data: [] as UserRow[] }),
      ]);
      setFriends((fr.data as UserRow[]) ?? []);
      setFollowing((fo.data as UserRow[]) ?? []);
      setFollowers((fl.data as UserRow[]) ?? []);
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, [myId]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll]),
  );

  const followingIds = useMemo(() => new Set(following.map((u) => u.id)), [following]);
  const friendIds = useMemo(() => new Set(friends.map((u) => u.id)), [friends]);

  const runSearch = async (q: string) => {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await apiSearchUsers(q.trim());
      setResults((data as UserRow[]) ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    if (query.trim().length >= 2) await runSearch(query);
    setRefreshing(false);
  };

  const applyFollowToggle = async (u: UserRow) => {
    if (myId != null && String(u.id) === String(myId)) return;
    setActingId(u.id);
    try {
      await apiToggleFollow(u.id);
      await loadAll();
      if (query.trim().length >= 2) await runSearch(query);
    } catch {
      Alert.alert('Something went wrong', 'Could not update. Please try again.');
    } finally {
      setActingId(null);
    }
  };

  const confirmUnfollow = (u: UserRow, asFriend: boolean) => {
    Alert.alert(
      asFriend ? 'Unfriend?' : 'Unfollow?',
      asFriend
        ? `You and @${u.username} will no longer be friends. You can follow again anytime.`
        : `Stop following @${u.username}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: asFriend ? 'Unfriend' : 'Unfollow',
          style: 'destructive',
          onPress: () => void applyFollowToggle(u),
        },
      ],
    );
  };

  const relStateFor = (u: UserRow): RelState => {
    // Search results carry explicit flags from the API.
    if (u.is_friend != null || u.is_following != null || u.is_follower != null) {
      if (u.is_friend) return 'friend';
      if (u.is_following) return 'following';
      if (u.is_follower) return 'follow_back';
      return 'add';
    }
    // List rows: derive from loaded sets.
    if (friendIds.has(u.id)) return 'friend';
    if (followingIds.has(u.id)) return 'following';
    return 'follow_back';
  };

  const renderActionButton = (u: UserRow) => {
    const busy = actingId === u.id;
    const state = relStateFor(u);

    if (busy) {
      return (
        <View style={[styles.pill, styles.pillFollowing]}>
          <ActivityIndicator color="#94A3B8" size="small" />
        </View>
      );
    }

    if (state === 'friend') {
      return (
        <TouchableOpacity
          style={[styles.pill, styles.pillFriends]}
          onPress={() => confirmUnfollow(u, true)}
        >
          <Check color="#51CF66" size={16} strokeWidth={3} />
          <Text style={styles.pillFriendsText}>Friends</Text>
        </TouchableOpacity>
      );
    }
    if (state === 'following') {
      return (
        <TouchableOpacity
          style={[styles.pill, styles.pillFollowing]}
          onPress={() => confirmUnfollow(u, false)}
        >
          <Text style={styles.pillFollowingText}>Following</Text>
        </TouchableOpacity>
      );
    }
    if (state === 'follow_back') {
      return (
        <TouchableOpacity
          style={[styles.pill, styles.pillPrimary]}
          onPress={() => void applyFollowToggle(u)}
        >
          <Text style={styles.pillPrimaryText}>Follow back</Text>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity
        style={[styles.pill, styles.pillPrimary]}
        onPress={() => void applyFollowToggle(u)}
      >
        <UserPlus color="#FFFFFF" size={16} />
        <Text style={styles.pillPrimaryText}>Add friend</Text>
      </TouchableOpacity>
    );
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  const initial = (name?: string) => (name?.[0] ? name[0].toUpperCase() : '?');

  const renderRow = (u: UserRow) => (
    <TouchableOpacity
      key={u.id}
      style={styles.row}
      activeOpacity={0.8}
      onPress={() => router.push(`/user/${u.id}`)}
    >
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
    </TouchableOpacity>
  );

  const activeList = tab === 'friends' ? friends : tab === 'following' ? following : followers;

  const emptyCopy: Record<TabKey, string> = {
    friends:
      'No friends yet. Search a username above and tap Add friend — when they follow you back, you\u2019re friends.',
    following: 'You\u2019re not following anyone yet. Search above to find people on Leveld.',
    followers: 'No followers yet. Share your username so people can find and follow you.',
  };

  const searching2 = query.trim().length >= 2;

  if (!proActive) {
    return (
      <ProLockScreen
        icon={Users}
        title="Friends are a Pro feature"
        subtitle="Connect with friends, follow their progress, and train together."
        features={[
          'Find and add friends by username',
          'See your friends, followers, and following',
          'View friends’ shared workouts and activity',
          'Invite friends to groups and challenges',
        ]}
        onUnlock={() => showPaywall()}
        onClose={goBack}
      />
    );
  }

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
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4C91FF" />
        }
      >
        <View style={styles.searchWrap}>
          <Search color="#666" size={18} />
          <TextInput
            style={styles.searchInput}
            placeholder="Add friends by username"
            placeholderTextColor="#666"
            value={query}
            onChangeText={runSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {searching2 ? (
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Results</Text>
            {searching && <ActivityIndicator color="#4C91FF" style={{ marginVertical: 16 }} />}
            {!searching && results.length === 0 && (
              <Text style={styles.muted}>No users match that search.</Text>
            )}
            {results.map(renderRow)}
          </View>
        ) : (
          <>
            <View style={styles.segment}>
              {TABS.map((t) => {
                const active = tab === t.key;
                const count =
                  t.key === 'friends'
                    ? friends.length
                    : t.key === 'following'
                      ? following.length
                      : followers.length;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                    onPress={() => setTab(t.key)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                      {t.label}
                      {loading ? '' : ` ${count}`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {loading ? (
              <ActivityIndicator color="#4C91FF" style={{ marginTop: 32 }} />
            ) : activeList.length === 0 ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIcon}>
                  <Users color="#4C91FF" size={28} />
                </View>
                <Text style={styles.emptyText}>{emptyCopy[tab]}</Text>
              </View>
            ) : (
              <View style={styles.block}>{activeList.map(renderRow)}</View>
            )}
          </>
        )}
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
  scroll: { paddingHorizontal: 20, paddingTop: 4 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 16 },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 9,
    alignItems: 'center',
  },
  segmentBtnActive: { backgroundColor: '#4C91FF' },
  segmentText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  segmentTextActive: { color: '#FFFFFF' },
  block: { marginBottom: 24 },
  blockTitle: {
    color: '#E2E8F0',
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  muted: { color: '#64748B', fontSize: 14, lineHeight: 20 },
  emptyWrap: { alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
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
    minWidth: 104,
    justifyContent: 'center',
  },
  pillPrimary: { backgroundColor: '#4C91FF' },
  pillPrimaryText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  pillFollowing: {
    backgroundColor: '#252525',
    borderWidth: 1,
    borderColor: '#3F3F3F',
  },
  pillFollowingText: { color: '#94A3B8', fontSize: 13, fontWeight: '700' },
  pillFriends: {
    backgroundColor: '#0D2818',
    borderWidth: 1,
    borderColor: '#1A5C2E',
  },
  pillFriendsText: { color: '#51CF66', fontSize: 13, fontWeight: '800' },
});
