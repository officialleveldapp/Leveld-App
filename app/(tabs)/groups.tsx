import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Share,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { useGroupInvites } from '@/contexts/GroupInvitesContext';
import { useCloseModalsWhenPaywallOpens, usePaywall } from '@/contexts/PaywallContext';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { getAndClearOpenGroupAfterTabsNav } from '@/lib/groupInviteStorage';
import {
  apiGetFeed,
  apiReactToFeed,
  apiGetGroups,
  apiGetGroupDetail,
  apiJoinGroup,
  apiLeaveGroup,
  apiUpdateGroup,
  apiDeleteGroup,
  apiRemoveGroupMember,
  apiToggleFollow,
  apiGetFriends,
  apiSearchUsers,
  apiGetUserProfile,
  apiGetGroupFeed,
  apiGetGroupLeaderboard,
  apiGetGroupChallenges,
  apiCreateGroupChallenge,
  apiJoinChallenge,
  apiCloneTemplate,
  apiCreateFeedPost,
  apiGetTemplates,
  apiCreateGroupInvite,
  apiAcceptGroupInvite,
  apiDeclineGroupInvite,
} from '@/lib/api';
import {
  Trophy,
  Medal,
  Plus,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  Crown,
  Search,
  UserPlus,
  UserCheck,
  Copy,
  Dumbbell,
  Flame,
  TrendingUp,
  Send,
  Globe,
  Lock,
  Award,
  Heart,
  MessageSquarePlus,
  Share2,
  Settings,
  Target,
  Clock,
  LogOut,
  Link,
} from 'lucide-react-native';


type Screen = 'hub' | 'groupDetail' | 'userProfile';

const CHALLENGE_TYPES = [
  { value: 'total_workouts', label: 'Total Workouts', icon: '🏋️' },
  { value: 'total_xp', label: 'Total XP', icon: '⚡' },
  { value: 'streak', label: 'Streak Days', icon: '🔥' },
  { value: 'total_reps', label: 'Total Reps', icon: '💪' },
];

export default function GroupsScreen() {
  const { profile, refreshProfile } = useAuth();
  const { invites: pendingGroupInvites, refreshInvites } = useGroupInvites();
  const showPaywall = usePaywall();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [screen, setScreen] = useState<Screen>('hub');
  const [previousScreen, setPreviousScreen] = useState<Screen>('hub');

  // Hub data
  const [feed, setFeed] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends' | 'mine'>('all');
  const [hubTab, setHubTab] = useState<'feed' | 'myGroups'>('feed');

  // Hub search
  const [hubSearchQuery, setHubSearchQuery] = useState('');
  const [hubSearchResults, setHubSearchResults] = useState<any[]>([]);
  const [hubSearching, setHubSearching] = useState(false);

  // Group detail
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [groupDetailLoading, setGroupDetailLoading] = useState(false);
  const [groupFeed, setGroupFeed] = useState<any[]>([]);
  const [groupLeaderboard, setGroupLeaderboard] = useState<any[]>([]);
  const [groupChallenges, setGroupChallenges] = useState<any[]>([]);
  const [groupTab, setGroupTab] = useState<'feed' | 'leaderboard' | 'challenges' | 'members'>('leaderboard');
  const [joiningLeaving, setJoiningLeaving] = useState(false);

  // Create challenge modal
  const [showCreateChallenge, setShowCreateChallenge] = useState(false);
  const [challengeName, setChallengeName] = useState('');
  const [challengeDesc, setChallengeDesc] = useState('');
  const [challengeType, setChallengeType] = useState('total_workouts');
  const [challengeTarget, setChallengeTarget] = useState('10');
  const [challengeDays, setChallengeDays] = useState('7');
  const [creatingChallenge, setCreatingChallenge] = useState(false);

  // User profile
  const [viewedUser, setViewedUser] = useState<any>(null);
  const [userProfileLoading, setUserProfileLoading] = useState(false);
  const [profileTab, setProfileTab] = useState<'workouts' | 'activity'>('workouts');
  const [followLoading, setFollowLoading] = useState(false);

  // Share workout modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareCaption, setShareCaption] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [postTargetGroupId, setPostTargetGroupId] = useState<string | null>(null);
  const [myTemplates, setMyTemplates] = useState<any[]>([]);
  const [sharing, setSharing] = useState(false);

  // Preview template modal
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [copying, setCopying] = useState(false);

  // Group settings modal
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupDesc, setEditGroupDesc] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const [showInviteFriendsModal, setShowInviteFriendsModal] = useState(false);
  const [inviteFriendsCandidates, setInviteFriendsCandidates] = useState<any[]>([]);
  const [inviteFriendsLoading, setInviteFriendsLoading] = useState(false);
  const [modalPendingInviteIds, setModalPendingInviteIds] = useState<number[]>([]);
  const [inviteSendingUserId, setInviteSendingUserId] = useState<number | null>(null);
  const [inviteActionLoadingId, setInviteActionLoadingId] = useState<string | null>(null);

  const closeAllGroupsModals = useCallback(() => {
    setPreviewTemplate(null);
    setShowCreateChallenge(false);
    setShowGroupSettings(false);
    setShowShareModal(false);
    setShowInviteFriendsModal(false);
  }, []);

  useCloseModalsWhenPaywallOpens(closeAllGroupsModals);

  const loadData = async () => {
    await Promise.all([loadFeed(), loadGroups(), loadFriends()]);
  };

  const loadFeed = async () => {
    try {
      const { data } = await apiGetFeed();
      if (data) setFeed(data);
    } catch {}
  };

  const loadGroups = async () => {
    try {
      const { data } = await apiGetGroups();
      if (data) {
        setMyGroups(data.my_groups || []);
      }
    } catch {}
  };

  const loadFriends = async () => {
    try {
      const { data } = await apiGetFriends();
      if (data) setFriends(data);
    } catch {}
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), refreshInvites()]);
    setRefreshing(false);
  };

  const openGroupDetail = async (groupId: string) => {
    setScreen('groupDetail');
    setGroupDetailLoading(true);
    setGroupTab('leaderboard');
    try {
      const [detailRes, feedRes, lbRes, chRes] = await Promise.all([
        apiGetGroupDetail(groupId),
        apiGetGroupFeed(groupId),
        apiGetGroupLeaderboard(groupId),
        apiGetGroupChallenges(groupId),
      ]);
      if (detailRes.data) setSelectedGroup(detailRes.data);
      if (feedRes.data) setGroupFeed(feedRes.data);
      if (lbRes.data) setGroupLeaderboard(lbRes.data);
      if (chRes.data) setGroupChallenges(chRes.data);
    } catch { Alert.alert('Error', 'Failed to load group'); setScreen('hub'); }
    finally { setGroupDetailLoading(false); }
  };

  const openGroupDetailRef = useRef(openGroupDetail);
  openGroupDetailRef.current = openGroupDetail;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadData();
      (async () => {
        const gid = await getAndClearOpenGroupAfterTabsNav();
        if (!gid || cancelled) return;
        await openGroupDetailRef.current(gid);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const handleJoinGroup = async () => {
    if (!selectedGroup) return;
    setJoiningLeaving(true);
    try {
      await apiJoinGroup(selectedGroup.id);
      await openGroupDetail(selectedGroup.id);
      await loadGroups();
    } catch { Alert.alert('Error', 'Failed to join group'); }
    finally { setJoiningLeaving(false); }
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    Alert.alert('Leave Group', `Leave "${selectedGroup.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: async () => {
        setJoiningLeaving(true);
        try {
          await apiLeaveGroup(selectedGroup.id);
          setScreen('hub');
          setSelectedGroup(null);
          await loadGroups();
        }
        catch { Alert.alert('Error', 'Failed to leave group'); }
        finally { setJoiningLeaving(false); }
      }},
    ]);
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    Alert.alert(
      'Delete Group',
      `Permanently delete "${selectedGroup.name}" and all its data? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            const { error } = await apiDeleteGroup(selectedGroup.id);
            if (error) { Alert.alert('Error', error.detail || 'Failed to delete group'); return; }
            setScreen('hub');
            setSelectedGroup(null);
            await loadGroups();
          } catch { Alert.alert('Error', 'Failed to delete group'); }
        }},
      ],
    );
  };

  const handleRemoveMember = (userId: number | string, username: string) => {
    if (!selectedGroup) return;
    Alert.alert(
      'Remove Member',
      `Remove ${username} from "${selectedGroup.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const { error } = await apiRemoveGroupMember(selectedGroup.id, userId);
            if (error) { Alert.alert('Error', error.detail || 'Failed to remove member'); return; }
            await openGroupDetail(selectedGroup.id);
          } catch { Alert.alert('Error', 'Failed to remove member'); }
        }},
      ],
    );
  };

  const handleCreateChallenge = async () => {
    if (!challengeName.trim() || !selectedGroup) return;
    setCreatingChallenge(true);
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + (parseInt(challengeDays) || 7));
    try {
      await apiCreateGroupChallenge(selectedGroup.id, {
        name: challengeName.trim(),
        description: challengeDesc.trim(),
        challenge_type: challengeType,
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        target_value: parseInt(challengeTarget) || 10,
      });
      setShowCreateChallenge(false);
      setChallengeName(''); setChallengeDesc(''); setChallengeTarget('10'); setChallengeDays('7');
      const { data } = await apiGetGroupChallenges(selectedGroup.id);
      if (data) setGroupChallenges(data);
    } catch { Alert.alert('Error', 'Failed to create challenge'); }
    finally { setCreatingChallenge(false); }
  };

  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await apiJoinChallenge(challengeId);
      if (selectedGroup) {
        const { data } = await apiGetGroupChallenges(selectedGroup.id);
        if (data) setGroupChallenges(data);
      }
    } catch { Alert.alert('Error', 'Failed to join challenge'); }
  };

  const buildGroupInviteLines = () => {
    if (!selectedGroup) return [] as string[];
    const lines = [
      `Join "${selectedGroup.name}" on Leveld!`,
      '',
      'Open this link in the Leveld app to join:',
      `leveld://group/${selectedGroup.id}`,
    ];
    const webBase = process.env.EXPO_PUBLIC_WEB_GROUP_INVITE_BASE?.replace(/\/$/, '');
    if (webBase) lines.push('', `${webBase}/${selectedGroup.id}`);
    const storeUrl = process.env.EXPO_PUBLIC_IOS_APP_STORE_URL?.trim();
    if (Platform.OS === 'ios' && storeUrl) {
      lines.push('', `Get the app: ${storeUrl}`);
    }
    return lines;
  };

  const handleShareGroup = async () => {
    if (!selectedGroup) return;
    try {
      await Share.share({
        message: buildGroupInviteLines().join('\n'),
        title: `Join ${selectedGroup.name}`,
      });
    } catch {}
  };

  const inviteFriendInApp = async (userId: number) => {
    if (!selectedGroup) return;
    setInviteSendingUserId(userId);
    try {
      const { error } = await apiCreateGroupInvite(selectedGroup.id, userId);
      if (error) {
        const msg =
          typeof error.detail === 'string'
            ? error.detail
            : Array.isArray(error.detail)
              ? error.detail.map((d: any) => d?.message || '').filter(Boolean).join(' ')
              : 'Could not send invite';
        Alert.alert('Invite', msg || 'Could not send invite');
        return;
      }
      setModalPendingInviteIds((prev) => (prev.includes(userId) ? prev : [...prev, userId]));
    } finally {
      setInviteSendingUserId(null);
    }
  };

  const openInviteFriendsModal = async () => {
    if (!selectedGroup) return;
    setShowInviteFriendsModal(true);
    setInviteFriendsLoading(true);
    try {
      const [{ data: friends }, { data: detail }] = await Promise.all([
        apiGetFriends(),
        apiGetGroupDetail(selectedGroup.id),
      ]);
      if (detail) {
        setSelectedGroup((prev: any) => ({ ...prev, ...detail }));
        const ids = (detail as any).my_pending_invite_user_ids;
        setModalPendingInviteIds(Array.isArray(ids) ? ids.map((n: any) => Number(n)) : []);
      }
      const members = (detail as any)?.members || selectedGroup.members || [];
      const memberIds = new Set(members.map((m: any) => String(m.user?.id)));
      const notInGroup = (friends || []).filter((u: any) => u?.id != null && !memberIds.has(String(u.id)));
      setInviteFriendsCandidates(notInGroup);
    } catch {
      setInviteFriendsCandidates([]);
    } finally {
      setInviteFriendsLoading(false);
    }
  };

  const handleAcceptGroupInvite = async (inviteId: string) => {
    setInviteActionLoadingId(inviteId);
    try {
      const { error, data } = await apiAcceptGroupInvite(inviteId);
      if (error) {
        const msg = typeof error.detail === 'string' ? error.detail : 'Could not join group';
        Alert.alert('Groups', msg);
        return;
      }
      await refreshInvites();
      await loadGroups();
      const gid = data?.group_id as string | undefined;
      if (gid) {
        await openGroupDetail(gid);
      }
    } finally {
      setInviteActionLoadingId(null);
    }
  };

  const handleDeclineGroupInvite = async (inviteId: string) => {
    setInviteActionLoadingId(inviteId);
    try {
      const { error } = await apiDeclineGroupInvite(inviteId);
      if (error) {
        const msg = typeof error.detail === 'string' ? error.detail : 'Could not decline';
        Alert.alert('Groups', msg);
        return;
      }
      await refreshInvites();
    } finally {
      setInviteActionLoadingId(null);
    }
  };

  const openGroupSettings = () => {
    if (!selectedGroup) return;
    setEditGroupName(selectedGroup.name);
    setEditGroupDesc(selectedGroup.description || '');
    setShowGroupSettings(true);
  };

  const handleSaveGroupSettings = async () => {
    if (!selectedGroup || !editGroupName.trim()) return;
    setSavingSettings(true);
    try {
      const { data, error } = await apiUpdateGroup(selectedGroup.id, {
        name: editGroupName.trim(),
        description: editGroupDesc.trim(),
      });
      if (error) { Alert.alert('Error', error.detail || 'Failed to update'); return; }
      if (data) setSelectedGroup(data);
      setShowGroupSettings(false);
      await loadGroups();
    } catch { Alert.alert('Error', 'Failed to update group'); }
    finally { setSavingSettings(false); }
  };

  const navigateTo = (newScreen: Screen) => {
    setPreviousScreen(screen);
    setScreen(newScreen);
  };

  const goBack = () => {
    setScreen(previousScreen);
  };

  const openUserProfile = async (userId: number | string) => {
    if (String(userId) === String(profile?.id)) return;
    navigateTo('userProfile');
    setUserProfileLoading(true);
    setProfileTab('workouts');
    try {
      const { data } = await apiGetUserProfile(userId);
      if (data) setViewedUser(data);
    } catch { Alert.alert('Error', 'Failed to load profile'); goBack(); }
    finally { setUserProfileLoading(false); }
  };

  const handleToggleFollow = async () => {
    if (!viewedUser) return;
    setFollowLoading(true);
    try {
      await apiToggleFollow(viewedUser.id);
      const { data } = await apiGetUserProfile(viewedUser.id);
      if (data) setViewedUser(data);
      await loadFriends();
    } catch { Alert.alert('Error', 'Failed'); }
    finally { setFollowLoading(false); }
  };

  const handleHubSearch = async (q: string) => {
    setHubSearchQuery(q);
    if (q.length < 2) { setHubSearchResults([]); return; }
    setHubSearching(true);
    try { const { data } = await apiSearchUsers(q); if (data) setHubSearchResults(data); }
    catch {}
    finally { setHubSearching(false); }
  };

  const handleCloneTemplate = async (templateId: string) => {
    setCopying(true);
    try {
      const { error } = await apiCloneTemplate(templateId);
      if (error) {
        const err = error as { code?: string; detail?: string };
        if (err?.code === 'template_limit') {
          // Close preview modal first — iOS cannot present the paywall while another Modal is up.
          setPreviewTemplate(null);
          InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
              showPaywall(() => {
                void handleCloneTemplate(templateId);
              });
            }, Platform.OS === 'ios' ? 400 : 0);
          });
          return;
        }
        Alert.alert('Error', err.detail || 'Failed to copy');
        return;
      }
      setPreviewTemplate(null);
      router.push('/(tabs)/track');
    } catch {
      Alert.alert('Error', 'Failed to copy workout');
    } finally {
      setCopying(false);
    }
  };

  const openShareWorkout = async (preselectedGroupId?: string) => {
    setShowShareModal(true);
    setShareCaption(''); setSelectedTemplateId(null);
    setPostTargetGroupId(preselectedGroupId || null);
    try { const { data } = await apiGetTemplates(); if (data) setMyTemplates(data); } catch {}
  };

  const handleShare = async () => {
    if (!shareCaption.trim()) { Alert.alert('Error', 'Write something about your workout'); return; }
    setSharing(true);
    try {
      const { error } = await apiCreateFeedPost(
        shareCaption.trim(),
        selectedTemplateId || undefined,
        undefined,
        postTargetGroupId || undefined,
      );
      if (error) { Alert.alert('Error', error.detail || 'Failed to share'); return; }
      setShowShareModal(false);
      await loadFeed();
      if (postTargetGroupId && selectedGroup?.id === postTargetGroupId) {
        const { data } = await apiGetGroupFeed(postTargetGroupId);
        if (data) setGroupFeed(data);
      }
    } catch { Alert.alert('Error', 'Failed to share'); }
    finally { setSharing(false); }
  };

  const handleReaction = async (feedId: string) => {
    try {
      const { data } = await apiReactToFeed(feedId, 'like');
      if (data) {
        const patchFeed = (items: any[]) =>
          items.map((item: any) =>
            item.id === feedId
              ? { ...item, likes_count: data.likes_count, reactions_summary: data.reactions_summary, my_reaction: data.reaction_type }
              : item
          );
        setFeed(prev => patchFeed(prev));
        setGroupFeed(prev => patchFeed(prev));
      }
    } catch {}
  };

  const getRelativeTime = (isoDate?: string) => {
    if (!isoDate) return 'Just now';
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffMins = Math.max(1, Math.floor(diffMs / 60000));
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d`;
    return new Date(isoDate).toLocaleDateString();
  };

  const friendIdSet = new Set(
    friends
      .map((f: any) => f?.id ?? f?.user?.id ?? f?.friend?.id)
      .filter(Boolean)
      .map((id: any) => String(id))
  );
  const myProfileId = profile?.id != null ? String(profile.id) : '';
  const filteredFeed =
    feedFilter === 'friends'
      ? feed.filter((item: any) => friendIdSet.has(String(item?.user?.id)))
      : feedFilter === 'mine'
        ? feed.filter(
            (item: any) => myProfileId && String(item?.user?.id) === myProfileId,
          )
        : feed;

  const getRankIcon = (rank: number) => {
    if (rank === 0) return <Trophy color="#FFD700" size={20} fill="#FFD700" />;
    if (rank === 1) return <Medal color="#C0C0C0" size={20} />;
    if (rank === 2) return <Medal color="#CD7F32" size={20} />;
    return null;
  };

  const getInitial = (name?: string) => name ? name[0].toUpperCase() : 'U';

  const getDaysLeft = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════
  //  RENDER: Feed Item (reused in hub + group detail)
  // ═══════════════════════════════════════════════════
  function renderFeedItem(item: any) {
    const liked = item.my_reaction === 'like';
    return (
      <Card key={item.id} style={styles.feedCard}>
        <TouchableOpacity style={styles.feedHeader} onPress={() => item.user && openUserProfile(item.user.id)}>
          <View style={styles.feedUserInfo}>
            <View style={[styles.avatar, styles.feedAvatar]}><Text style={styles.avatarText}>{getInitial(item.user?.username)}</Text></View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Text style={styles.feedUsername}>{item.user?.username || 'User'}</Text>
                {item.group && (
                  <TouchableOpacity
                    style={styles.feedGroupBadge}
                    onPress={() => { if (item.group?.id) openGroupDetail(item.group.id); }}
                    activeOpacity={0.7}
                  >
                    <Users color="#7FB1FF" size={10} />
                    <Text style={styles.feedGroupBadgeText} numberOfLines={1}>{item.group.name}</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.feedTime}>{getRelativeTime(item.created_at)}</Text>
            </View>
          </View>
          <View style={styles.levelBadge}>
            <TrendingUp color="#4C91FF" size={11} />
            <Text style={styles.levelBadgeText}>Lvl {item.user?.level || 1}</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.feedContent}>{item.content}</Text>

        {item.template && (
          <Card style={styles.sharedTemplateCard}>
            <View style={styles.sharedTemplateRow}>
              <TouchableOpacity
                style={styles.sharedTemplateTap}
                onPress={() => setPreviewTemplate(item.template)}
                activeOpacity={0.7}
              >
                <Dumbbell color={item.template.color || '#4C91FF'} size={18} />
                <Text style={styles.sharedTemplateName} numberOfLines={1}>
                  {item.template.name}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.templateCopyChip}
                onPress={() => setPreviewTemplate(item.template)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Copy workout"
              >
                <Copy color="#7FB1FF" size={14} />
                <Text style={styles.templateCopyChipText}>Copy</Text>
              </TouchableOpacity>
            </View>
          </Card>
        )}

        <View style={styles.feedActions}>
          <TouchableOpacity
            onPress={() => handleReaction(item.id)}
            style={[styles.actionButton, liked && styles.actionButtonLiked]}
          >
            <Heart
              size={18}
              color={liked ? '#FF4D6D' : '#999999'}
              fill={liked ? '#FF4D6D' : 'transparent'}
            />
            <Text style={[styles.actionText, liked && styles.actionTextLiked]}>{item.likes_count || 0}</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  // ═══════════════════════════════════════════════════
  //  RENDER: Screen Content
  // ═══════════════════════════════════════════════════
  function renderScreenContent() {
    // USER PROFILE
    if (screen === 'userProfile') {
      return (
        <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
          {userProfileLoading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4C91FF" /></View>
          ) : viewedUser ? (
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <ScrollView
              contentContainerStyle={[
                styles.scrollContent,
                {
                  paddingTop: 8,
                  paddingBottom: 100 + insets.bottom,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.screenHeader}>
                <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
                  <ChevronLeft color="#FFFFFF" size={24} />
                </TouchableOpacity>
                <Text style={styles.screenTitle} numberOfLines={1}>
                  {viewedUser.username}
                </Text>
                <View style={{ width: 40 }} />
              </View>

              <View style={styles.socialProfileHeader}>
                <View style={styles.socialProfileAvatar}>
                  <Text style={styles.socialProfileAvatarText}>{getInitial(viewedUser.username)}</Text>
                  <View style={styles.socialLevelBadge}>
                    <Text style={styles.socialLevelText}>{viewedUser.level}</Text>
                  </View>
                </View>

                <View style={styles.socialStatsRow}>
                  <View style={styles.socialStatItem}>
                    <Text style={styles.socialStatNum}>{viewedUser.total_workouts || 0}</Text>
                    <Text style={styles.socialStatLabel}>Workouts</Text>
                  </View>
                  <View style={styles.socialStatDivider} />
                  <View style={styles.socialStatItem}>
                    <Text style={styles.socialStatNum}>{viewedUser.friends_count || 0}</Text>
                    <Text style={styles.socialStatLabel}>Friends</Text>
                  </View>
                  <View style={styles.socialStatDivider} />
                  <View style={styles.socialStatItem}>
                    <Text style={styles.socialStatNum}>{viewedUser.followers_count || 0}</Text>
                    <Text style={styles.socialStatLabel}>Followers</Text>
                  </View>
                </View>

                {viewedUser.is_friend ? (
                  <TouchableOpacity style={styles.friendsBtn} onPress={handleToggleFollow} disabled={followLoading}>
                    <UserCheck color="#51CF66" size={16} />
                    <Text style={styles.friendsBtnText}>Friends</Text>
                  </TouchableOpacity>
                ) : viewedUser.is_following ? (
                  <TouchableOpacity style={styles.followingBtn} onPress={handleToggleFollow} disabled={followLoading}>
                    <Text style={styles.followingBtnText}>{followLoading ? '...' : 'Following'}</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.followBtn} onPress={handleToggleFollow} disabled={followLoading}>
                    <UserPlus color="#FFFFFF" size={16} />
                    <Text style={styles.followBtnText}>{followLoading ? '...' : 'Follow'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {(viewedUser.goal || viewedUser.experience_level) && (
                <View style={styles.bioSection}>
                  {viewedUser.goal && <Text style={styles.bioGoal}>{viewedUser.goal}</Text>}
                  {viewedUser.experience_level && (
                    <View style={styles.bioExpBadge}>
                      <Text style={styles.bioExpText}>{viewedUser.experience_level}</Text>
                    </View>
                  )}
                </View>
              )}

              <View style={styles.socialInfoRow}>
                <View style={styles.socialInfoChip}>
                  <Flame color="#FF922B" size={14} />
                  <Text style={styles.socialInfoChipText}>{viewedUser.current_streak || 0} day streak</Text>
                </View>
                <View style={styles.socialInfoChip}>
                  <TrendingUp color="#4C91FF" size={14} />
                  <Text style={styles.socialInfoChipText}>{viewedUser.xp || 0} XP</Text>
                </View>
              </View>

              {viewedUser.badges && viewedUser.badges.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Badges</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                    {viewedUser.badges.map((ub: any) => (
                      <View key={ub.id} style={styles.badgeChip}>
                        <Award color="#FFB547" size={18} />
                        <Text style={styles.badgeChipName}>{ub.badge?.name || 'Badge'}</Text>
                      </View>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.tabBar}>
                {(['workouts', 'activity'] as const).map(tab => (
                  <TouchableOpacity key={tab} style={[styles.tab, profileTab === tab && styles.tabActive]} onPress={() => setProfileTab(tab)}>
                    <Text style={[styles.tabText, profileTab === tab && styles.tabTextActive]}>
                      {tab === 'workouts' ? 'Workouts' : 'Activity'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {profileTab === 'workouts' &&
                (viewedUser.can_view_shared_templates === false ? (
                  <View style={styles.section}>
                    <Card style={styles.profileGateCard}>
                      <View style={styles.profileGateInner}>
                        <Crown color="#FFB547" size={36} />
                        <Text style={styles.profileGateTitle}>Workouts are for Leveld Pro</Text>
                        <Text style={styles.profileGateText}>
                          Subscribe to browse and copy this member&apos;s shared workouts.
                        </Text>
                        <TouchableOpacity
                          style={styles.profileGateBtn}
                          onPress={() =>
                            showPaywall(async () => {
                              await refreshProfile();
                              if (viewedUser) {
                                try {
                                  const { data } = await apiGetUserProfile(viewedUser.id);
                                  if (data) setViewedUser(data);
                                } catch {}
                              }
                            })
                          }
                          activeOpacity={0.85}
                        >
                          <Text style={styles.profileGateBtnText}>Unlock with Pro</Text>
                        </TouchableOpacity>
                      </View>
                    </Card>
                  </View>
                ) : (
                  viewedUser.templates && (
                    <View style={styles.section}>
                      {viewedUser.templates.length === 0 && (
                        <Text style={styles.emptyText}>No workouts shared yet</Text>
                      )}
                      {viewedUser.templates.map((t: any) => (
                        <Card key={t.id} style={styles.templateCardSmall}>
                          <View style={styles.templateCardRow}>
                            <TouchableOpacity
                              style={styles.templateCardTap}
                              onPress={() => setPreviewTemplate(t)}
                              activeOpacity={0.7}
                            >
                              <View style={[styles.templateCardIcon, { backgroundColor: (t.color || '#4C91FF') + '20' }]}>
                                <Dumbbell color={t.color || '#4C91FF'} size={20} />
                              </View>
                              <View style={[styles.templateCardInfo, styles.templateCardInfoShrink]}>
                                <Text style={styles.templateCardName} numberOfLines={1}>
                                  {t.name}
                                </Text>
                                <Text style={styles.templateCardMeta}>
                                  {t.exercise_count} exercise{t.exercise_count !== 1 ? 's' : ''}
                                </Text>
                              </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.templateCopyChip}
                              onPress={() => setPreviewTemplate(t)}
                              activeOpacity={0.85}
                              accessibilityRole="button"
                              accessibilityLabel="Copy workout"
                            >
                              <Copy color="#7FB1FF" size={14} />
                              <Text style={styles.templateCopyChipText}>Copy</Text>
                            </TouchableOpacity>
                          </View>
                        </Card>
                      ))}
                    </View>
                  )
                ))}

              {profileTab === 'activity' &&
                (viewedUser.can_view_activity === false ? (
                  <View style={styles.section}>
                    <Card style={styles.profileGateCard}>
                      <View style={styles.profileGateInner}>
                        <Users color="#4C91FF" size={36} />
                        <Text style={styles.profileGateTitle}>Friends only</Text>
                        <Text style={styles.profileGateText}>
                          Recent activity is only visible when you and this member follow each other.
                        </Text>
                      </View>
                    </Card>
                  </View>
                ) : (
                  viewedUser.recent_workouts && (
                    <View style={styles.section}>
                      {viewedUser.recent_workouts.length === 0 && (
                        <Text style={styles.emptyText}>No recent activity</Text>
                      )}
                      {viewedUser.recent_workouts.slice(0, 8).map((w: any) => (
                        <Card key={w.id} style={styles.workoutCard}>
                          <View style={styles.workoutCardHeader}>
                            <Text style={styles.workoutCardDate}>
                              {new Date(w.workout_date).toLocaleDateString()}
                            </Text>
                            <View style={styles.xpBadge}>
                              <Text style={styles.xpBadgeText}>+{w.xp_earned} XP</Text>
                            </View>
                          </View>
                          <Text style={styles.workoutCardStats}>
                            {w.total_sets} sets · {w.total_reps} reps · {w.duration_minutes} min
                          </Text>
                          {w.notes ? <Text style={styles.workoutCardNotes}>{w.notes}</Text> : null}
                        </Card>
                      ))}
                    </View>
                  )
                ))}
            </ScrollView>
            </SafeAreaView>
          ) : null}
        </LinearGradient>
      );
    }

    // GROUP DETAIL
    if (screen === 'groupDetail') {
      const isAdmin = selectedGroup?.is_admin;
      const activeChallenges = groupChallenges.filter((c: any) => c.is_active);
      const topMembers = groupLeaderboard.slice(0, 3);
      const groupAge = selectedGroup?.created_at
        ? Math.max(1, Math.floor((Date.now() - new Date(selectedGroup.created_at).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      return (
        <LinearGradient colors={['#0F1117', '#0A0A0A']} style={styles.container}>
          {groupDetailLoading ? (
            <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4C91FF" /></View>
          ) : selectedGroup ? (
            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
            <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
              {/* Hero Header */}
              <LinearGradient
                colors={['#1A2744', '#0F1830', '#0F1117']}
                style={gdStyles.hero}
              >
                <View style={gdStyles.heroNav}>
                  <TouchableOpacity onPress={() => { setScreen('hub'); setSelectedGroup(null); }} style={gdStyles.heroNavBtn}>
                    <ChevronLeft color="#FFFFFF" size={22} />
                  </TouchableOpacity>
                  <View style={gdStyles.heroNavActions}>
                    <TouchableOpacity onPress={handleShareGroup} style={gdStyles.heroNavBtn}>
                      <Share2 color="#FFFFFF" size={18} />
                    </TouchableOpacity>
                    {isAdmin && (
                      <TouchableOpacity onPress={openGroupSettings} style={gdStyles.heroNavBtn}>
                        <Settings color="#FFFFFF" size={18} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <View style={gdStyles.heroContent}>
                  <View style={gdStyles.heroAvatarContainer}>
                    <LinearGradient colors={['#4C91FF', '#3B6FD4']} style={gdStyles.heroAvatar}>
                      <Users color="#FFFFFF" size={26} />
                    </LinearGradient>
                    <View style={gdStyles.privacyBadge}>
                      <Lock color="#FFB547" size={12} />
                    </View>
                  </View>

                  <Text style={gdStyles.heroTitle} numberOfLines={2}>{selectedGroup.name}</Text>
                  {selectedGroup.description ? (
                    <Text style={gdStyles.heroDesc} numberOfLines={3}>{selectedGroup.description}</Text>
                  ) : null}

                  <View style={gdStyles.heroMetaRow}>
                    <View style={gdStyles.heroMetaChip}>
                      <Users color="#8BB4FF" size={13} />
                      <Text style={gdStyles.heroMetaText}>{selectedGroup.member_count || 0} members</Text>
                    </View>
                    <View style={gdStyles.heroMetaChip}>
                      <Target color="#FF922B" size={13} />
                      <Text style={gdStyles.heroMetaText}>{activeChallenges.length} active</Text>
                    </View>
                    {groupAge > 0 && (
                      <View style={gdStyles.heroMetaChip}>
                        <Clock color="#999" size={13} />
                        <Text style={gdStyles.heroMetaText}>
                          {groupAge < 30 ? `${groupAge}d` : groupAge < 365 ? `${Math.floor(groupAge / 30)}mo` : `${Math.floor(groupAge / 365)}y`}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Member Avatars Preview */}
                  {topMembers.length > 0 && (
                    <View style={gdStyles.memberPreview}>
                      <View style={gdStyles.memberAvatarStack}>
                        {topMembers.map((u: any, i: number) => (
                          <View key={u.id} style={[gdStyles.memberStackAvatar, { marginLeft: i === 0 ? 0 : -10, zIndex: 10 - i }]}>
                            <Text style={gdStyles.memberStackText}>{getInitial(u.username)}</Text>
                          </View>
                        ))}
                        {(selectedGroup.member_count || 0) > 3 && (
                          <View style={[gdStyles.memberStackAvatar, gdStyles.memberStackMore, { marginLeft: -10 }]}>
                            <Text style={gdStyles.memberStackMoreText}>+{(selectedGroup.member_count || 0) - 3}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                  {/* CTA */}
                  {selectedGroup.is_member ? (
                    <View style={gdStyles.heroCTARow}>
                      <TouchableOpacity style={gdStyles.inviteBtn} onPress={handleShareGroup}>
                        <Share2 color="#FFFFFF" size={16} />
                        <Text style={gdStyles.inviteBtnText}>Invite</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={gdStyles.membershipBadge}>
                        <UserCheck color="#51CF66" size={14} />
                        <Text style={gdStyles.membershipText}>Joined</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity style={gdStyles.joinBtn} onPress={handleJoinGroup} disabled={joiningLeaving} activeOpacity={0.8}>
                      <LinearGradient colors={['#4C91FF', '#3B6FD4']} style={gdStyles.joinBtnGradient}>
                        {joiningLeaving
                          ? <ActivityIndicator color="#FFF" size="small" />
                          : <>
                              <UserPlus color="#FFFFFF" size={18} />
                              <Text style={gdStyles.joinBtnText}>Join Group</Text>
                            </>
                        }
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              </LinearGradient>

              {selectedGroup.is_member ? (
              <View>
              {/* Sticky Tab Bar */}
              <View style={gdStyles.stickyTabWrap}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={gdStyles.tabScrollContent}>
                  {([
                    { key: 'leaderboard', label: 'Ranks', icon: <Trophy color={groupTab === 'leaderboard' ? '#FFF' : '#888'} size={14} /> },
                    { key: 'feed', label: 'Activity', icon: <TrendingUp color={groupTab === 'feed' ? '#FFF' : '#888'} size={14} /> },
                    { key: 'challenges', label: 'Challenges', icon: <Target color={groupTab === 'challenges' ? '#FFF' : '#888'} size={14} /> },
                    { key: 'members', label: 'Members', icon: <Users color={groupTab === 'members' ? '#FFF' : '#888'} size={14} /> },
                  ] as const).map(tab => (
                    <TouchableOpacity
                      key={tab.key}
                      style={[gdStyles.tabItem, groupTab === tab.key && gdStyles.tabItemActive]}
                      onPress={() => setGroupTab(tab.key)}
                      activeOpacity={0.7}
                    >
                      {tab.icon}
                      <Text style={[gdStyles.tabLabel, groupTab === tab.key && gdStyles.tabLabelActive]}>{tab.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Tab Content */}
              <View style={gdStyles.tabContent}>
                {/* RANKS TAB */}
                {groupTab === 'leaderboard' && (
                  <View>
                    {/* Top 3 Podium */}
                    {topMembers.length >= 2 && (
                      <View style={gdStyles.podium}>
                        {/* 2nd place */}
                        <TouchableOpacity style={gdStyles.podiumSlot} onPress={() => openUserProfile(topMembers[1]?.id)} activeOpacity={0.7}>
                          <View style={[gdStyles.podiumAvatar, gdStyles.podiumSilver]}>
                            <Text style={gdStyles.podiumAvatarText}>{getInitial(topMembers[1]?.username)}</Text>
                          </View>
                          <Medal color="#C0C0C0" size={16} />
                          <Text style={gdStyles.podiumName} numberOfLines={1}>{topMembers[1]?.username}</Text>
                          <Text style={gdStyles.podiumXP}>{topMembers[1]?.xp} XP</Text>
                          <View style={[gdStyles.podiumBar, { height: 50, backgroundColor: '#2A3042' }]} />
                        </TouchableOpacity>
                        {/* 1st place */}
                        <TouchableOpacity style={gdStyles.podiumSlot} onPress={() => openUserProfile(topMembers[0]?.id)} activeOpacity={0.7}>
                          <View style={[gdStyles.podiumAvatar, gdStyles.podiumGold]}>
                            <Text style={gdStyles.podiumAvatarText}>{getInitial(topMembers[0]?.username)}</Text>
                          </View>
                          <Crown color="#FFD700" size={18} />
                          <Text style={gdStyles.podiumName} numberOfLines={1}>{topMembers[0]?.username}</Text>
                          <Text style={gdStyles.podiumXP}>{topMembers[0]?.xp} XP</Text>
                          <View style={[gdStyles.podiumBar, { height: 72, backgroundColor: '#1E2A3A' }]} />
                        </TouchableOpacity>
                        {/* 3rd place */}
                        {topMembers[2] ? (
                          <TouchableOpacity style={gdStyles.podiumSlot} onPress={() => openUserProfile(topMembers[2]?.id)} activeOpacity={0.7}>
                            <View style={[gdStyles.podiumAvatar, gdStyles.podiumBronze]}>
                              <Text style={gdStyles.podiumAvatarText}>{getInitial(topMembers[2]?.username)}</Text>
                            </View>
                            <Medal color="#CD7F32" size={16} />
                            <Text style={gdStyles.podiumName} numberOfLines={1}>{topMembers[2]?.username}</Text>
                            <Text style={gdStyles.podiumXP}>{topMembers[2]?.xp} XP</Text>
                            <View style={[gdStyles.podiumBar, { height: 36, backgroundColor: '#2A2520' }]} />
                          </TouchableOpacity>
                        ) : <View style={gdStyles.podiumSlot} />}
                      </View>
                    )}

                    {/* Remaining ranks */}
                    {groupLeaderboard.slice(3).map((u: any, idx: number) => {
                      const rank = idx + 4;
                      const isMe = String(u.id) === String(profile?.id);
                      return (
                        <TouchableOpacity key={u.id} style={[gdStyles.rankRow, isMe && gdStyles.rankRowMe]} onPress={() => openUserProfile(u.id)} activeOpacity={0.7}>
                          <Text style={[gdStyles.rankNumber, isMe && { color: '#4C91FF' }]}>{rank}</Text>
                          <View style={[styles.avatar, { width: 36, height: 36, borderRadius: 18 }]}>
                            <Text style={[styles.avatarText, { fontSize: 14 }]}>{getInitial(u.username)}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[gdStyles.rankName, isMe && { color: '#4C91FF' }]}>{u.username}</Text>
                            <Text style={gdStyles.rankMeta}>Level {u.level}</Text>
                          </View>
                          <View style={gdStyles.rankXPBadge}>
                            <TrendingUp color="#4C91FF" size={12} />
                            <Text style={gdStyles.rankXPText}>{u.xp}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    {groupLeaderboard.length === 0 && (
                      <View style={gdStyles.emptyState}>
                        <Trophy color="#333" size={40} />
                        <Text style={gdStyles.emptyTitle}>No Rankings Yet</Text>
                        <Text style={gdStyles.emptyDesc}>Members will appear here as they earn XP</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* ACTIVITY TAB */}
                {groupTab === 'feed' && (
                  <View>
                    {selectedGroup?.is_member && (
                      <TouchableOpacity
                        style={styles.createChallengeBtn}
                        onPress={() => openShareWorkout(selectedGroup.id)}
                      >
                        <Send color="#4C91FF" size={16} />
                        <Text style={styles.createChallengeBtnText}>Post to Group</Text>
                      </TouchableOpacity>
                    )}
                    {groupFeed.length === 0 ? (
                      <View style={gdStyles.emptyState}>
                        <TrendingUp color="#333" size={40} />
                        <Text style={gdStyles.emptyTitle}>No Activity Yet</Text>
                        <Text style={gdStyles.emptyDesc}>Be the first to share a workout with this group!</Text>
                      </View>
                    ) : (
                      groupFeed.map((item: any) => renderFeedItem(item))
                    )}
                  </View>
                )}

                {/* CHALLENGES TAB */}
                {groupTab === 'challenges' && (
                  <View>
                    {selectedGroup.is_member && (
                      <TouchableOpacity style={gdStyles.newChallengeBtn} onPress={() => setShowCreateChallenge(true)} activeOpacity={0.8}>
                        <LinearGradient colors={['#1E2A3A', '#162038']} style={gdStyles.newChallengeBtnInner}>
                          <View style={gdStyles.newChallengeIcon}>
                            <Plus color="#4C91FF" size={20} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={gdStyles.newChallengeTitle}>Create Challenge</Text>
                            <Text style={gdStyles.newChallengeSubtitle}>Start a competition for your group</Text>
                          </View>
                          <ChevronRight color="#4C91FF" size={18} />
                        </LinearGradient>
                      </TouchableOpacity>
                    )}

                    {activeChallenges.length > 0 && (
                      <Text style={gdStyles.challengeSectionLabel}>Active Challenges</Text>
                    )}
                    {activeChallenges.map((ch: any) => {
                      const daysLeft = getDaysLeft(ch.end_date);
                      const progressPct = ch.target_value > 0 ? Math.min(1, (ch.my_progress || 0) / ch.target_value) : 0;
                      const typeInfo = CHALLENGE_TYPES.find(t => t.value === ch.challenge_type);
                      return (
                        <View key={ch.id} style={gdStyles.challengeItem}>
                          <View style={gdStyles.challengeItemHeader}>
                            <View style={gdStyles.challengeItemIcon}>
                              <Text style={{ fontSize: 22 }}>{typeInfo?.icon || '🎯'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={gdStyles.challengeItemName}>{ch.name}</Text>
                              <Text style={gdStyles.challengeItemMeta}>
                                {ch.participant_count || 0} participants  ·  {daysLeft}d remaining
                              </Text>
                            </View>
                          </View>
                          {ch.description ? <Text style={gdStyles.challengeItemDesc}>{ch.description}</Text> : null}

                          <View style={gdStyles.challengeGoalRow}>
                            <Text style={gdStyles.challengeGoalLabel}>Goal</Text>
                            <Text style={gdStyles.challengeGoalValue}>{ch.target_value} {typeInfo?.label || ch.challenge_type}</Text>
                          </View>

                          {ch.is_joined && (
                            <View style={gdStyles.challengeProgressWrap}>
                              <View style={gdStyles.challengeProgressTrack}>
                                <LinearGradient
                                  colors={['#4C91FF', '#6BABFF']}
                                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                  style={[gdStyles.challengeProgressFillGrad, { width: `${Math.max(progressPct * 100, 2)}%` }]}
                                />
                              </View>
                              <View style={gdStyles.challengeProgressLabels}>
                                <Text style={gdStyles.challengeProgressCurrent}>{ch.my_progress || 0} / {ch.target_value}</Text>
                                <Text style={gdStyles.challengeProgressPct}>{Math.round(progressPct * 100)}%</Text>
                              </View>
                            </View>
                          )}

                          {!ch.is_joined && selectedGroup.is_member && (
                            <TouchableOpacity style={gdStyles.challengeJoinAction} onPress={() => handleJoinChallenge(ch.id)} activeOpacity={0.8}>
                              <Text style={gdStyles.challengeJoinText}>Join Challenge</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}

                    {groupChallenges.filter((c: any) => !c.is_active).length > 0 && (
                      <>
                        <Text style={[gdStyles.challengeSectionLabel, { marginTop: 24 }]}>Past Challenges</Text>
                        {groupChallenges.filter((c: any) => !c.is_active).map((ch: any) => {
                          const typeInfo = CHALLENGE_TYPES.find(t => t.value === ch.challenge_type);
                          const progressPct = ch.target_value > 0 ? Math.min(1, (ch.my_progress || 0) / ch.target_value) : 0;
                          return (
                            <View key={ch.id} style={[gdStyles.challengeItem, { opacity: 0.6 }]}>
                              <View style={gdStyles.challengeItemHeader}>
                                <View style={gdStyles.challengeItemIcon}>
                                  <Text style={{ fontSize: 22 }}>{typeInfo?.icon || '🎯'}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                  <Text style={gdStyles.challengeItemName}>{ch.name}</Text>
                                  <Text style={gdStyles.challengeItemMeta}>{ch.participant_count || 0} participants  ·  Ended</Text>
                                </View>
                              </View>
                              {ch.is_joined && (
                                <View style={gdStyles.challengeProgressWrap}>
                                  <View style={gdStyles.challengeProgressTrack}>
                                    <View style={[gdStyles.challengeProgressFillSolid, { width: `${Math.max(progressPct * 100, 2)}%` }]} />
                                  </View>
                                  <Text style={gdStyles.challengeProgressCurrent}>{ch.my_progress || 0} / {ch.target_value}</Text>
                                </View>
                              )}
                            </View>
                          );
                        })}
                      </>
                    )}

                    {groupChallenges.length === 0 && (
                      <View style={gdStyles.emptyState}>
                        <Target color="#333" size={40} />
                        <Text style={gdStyles.emptyTitle}>No Challenges</Text>
                        <Text style={gdStyles.emptyDesc}>Create a challenge to compete with your group members</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* MEMBERS TAB */}
                {groupTab === 'members' && (
                  <View>
                    {selectedGroup.is_member && (
                      <TouchableOpacity
                        style={gdStyles.inviteFriendsBanner}
                        onPress={() => void openInviteFriendsModal()}
                        activeOpacity={0.88}
                      >
                        <View style={gdStyles.inviteFriendsBannerIcon}>
                          <UserPlus color="#4C91FF" size={20} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={gdStyles.inviteFriendsBannerTitle}>Invite friends</Text>
                          <Text style={gdStyles.inviteFriendsBannerSub} numberOfLines={2}>
                            Share the group link with Leveld friends who aren&apos;t in this group yet
                          </Text>
                        </View>
                        <ChevronRight color="#64748B" size={20} />
                      </TouchableOpacity>
                    )}

                    {selectedGroup.members?.map((m: any, idx: number) => {
                      const isOwner = String(m.user?.id) === String(selectedGroup.created_by_id);
                      const isAdmin = selectedGroup.is_admin;
                      const memberXP = m.user?.xp || 0;
                      const memberLevel = m.user?.level || 1;
                      const rank = groupLeaderboard.findIndex((u: any) => String(u.id) === String(m.user?.id));
                      return (
                        <View key={m.id} style={gdStyles.memberRow}>
                          <TouchableOpacity
                            style={gdStyles.memberRowInner}
                            onPress={() => m.user && openUserProfile(m.user.id)}
                            activeOpacity={0.7}
                          >
                            <View style={gdStyles.memberAvatar}>
                              <Text style={gdStyles.memberAvatarText}>{getInitial(m.user?.username)}</Text>
                              {isOwner && (
                                <View style={gdStyles.memberCrownBadge}>
                                  <Crown color="#FFD700" size={10} fill="#FFD700" />
                                </View>
                              )}
                            </View>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={gdStyles.memberName}>{m.user?.username || 'User'}</Text>
                                {isOwner && (
                                  <View style={gdStyles.adminTag}>
                                    <Text style={gdStyles.adminTagText}>Admin</Text>
                                  </View>
                                )}
                              </View>
                              <Text style={gdStyles.memberMeta}>
                                Level {memberLevel}  ·  {memberXP} XP
                                {rank >= 0 ? `  ·  #${rank + 1}` : ''}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          {isAdmin && !isOwner && (
                            <TouchableOpacity
                              style={gdStyles.removeMemberBtn}
                              onPress={() => handleRemoveMember(m.user.id, m.user.username)}
                              activeOpacity={0.7}
                            >
                              <X color="#FF4C4C" size={16} />
                            </TouchableOpacity>
                          )}
                          {!isAdmin && <ChevronRight color="#444" size={16} />}
                        </View>
                      );
                    })}

                    {selectedGroup.is_member && (
                      <TouchableOpacity style={gdStyles.inviteMembersBtn} onPress={handleShareGroup} activeOpacity={0.8}>
                        <Share2 color="#4C91FF" size={18} />
                        <Text style={gdStyles.inviteMembersBtnText}>Share group link</Text>
                      </TouchableOpacity>
                    )}

                    {/* Leave / Admin actions at bottom */}
                    {selectedGroup.is_member && (
                      <View style={gdStyles.dangerZone}>
                        <TouchableOpacity style={gdStyles.leaveGroupBtn} onPress={handleLeaveGroup} disabled={joiningLeaving}>
                          <LogOut color="#FF4C4C" size={16} />
                          <Text style={gdStyles.leaveGroupText}>Leave Group</Text>
                        </TouchableOpacity>
                        {selectedGroup.is_admin && (
                          <TouchableOpacity style={gdStyles.deleteGroupBtn} onPress={handleDeleteGroup}>
                            <X color="#FFFFFF" size={16} />
                            <Text style={gdStyles.deleteGroupText}>Delete Group</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                )}
              </View>
              </View>
              ) : (
                <View style={gdStyles.nonMemberPreview}>
                  <View style={gdStyles.nonMemberCard}>
                    <Lock color="#666" size={28} />
                    <Text style={gdStyles.nonMemberTitle}>Member-Only Content</Text>
                    <Text style={gdStyles.nonMemberDesc}>
                      Join this group to see activity, rankings, challenges, and connect with members.
                    </Text>
                    <TouchableOpacity style={gdStyles.nonMemberJoinBtn} onPress={handleJoinGroup} disabled={joiningLeaving} activeOpacity={0.8}>
                      <LinearGradient colors={['#4C91FF', '#3B6FD4']} style={gdStyles.nonMemberJoinGradient}>
                        {joiningLeaving
                          ? <ActivityIndicator color="#FFF" size="small" />
                          : <>
                              <UserPlus color="#FFFFFF" size={18} />
                              <Text style={gdStyles.nonMemberJoinText}>Join Group</Text>
                            </>
                        }
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
            </SafeAreaView>
          ) : null}
        </LinearGradient>
      );
    }

    // HUB (default)
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 12,
              paddingBottom: 100 + insets.bottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Social</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => router.push('/create-group')}>
                <Plus color="#FFFFFF" size={20} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerIconBtn}
                onPress={() => router.push('/friends')}
                accessibilityLabel="Friends and people"
              >
                <UserPlus color="#FFFFFF" size={20} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.headerIconBtnPrimary} onPress={() => openShareWorkout()}>
                <Send color="#FFFFFF" size={18} />
              </TouchableOpacity>
            </View>
          </View>

          {hubSearchQuery.length < 2 && pendingGroupInvites.length > 0 && (
            <View style={styles.groupInvitesHubSection}>
              <Text style={styles.groupInvitesHubTitle}>Group invites</Text>
              {pendingGroupInvites.map((inv) => (
                <Card key={inv.id} style={styles.groupInviteHubCard}>
                  <Text style={styles.groupInviteHubText}>
                    <Text style={styles.groupInviteHubName}>{inv.inviter?.username || 'Someone'}</Text>
                    {' invited you to '}
                    <Text style={styles.groupInviteHubName}>{inv.group?.name || 'a group'}</Text>
                  </Text>
                  <View style={styles.groupInviteHubActions}>
                    <TouchableOpacity
                      style={styles.groupInviteDeclineBtn}
                      onPress={() => void handleDeclineGroupInvite(inv.id)}
                      disabled={inviteActionLoadingId === inv.id}
                      activeOpacity={0.85}
                    >
                      {inviteActionLoadingId === inv.id ? (
                        <ActivityIndicator color="#999" size="small" />
                      ) : (
                        <Text style={styles.groupInviteDeclineText}>Decline</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.groupInviteAcceptBtn}
                      onPress={() => void handleAcceptGroupInvite(inv.id)}
                      disabled={inviteActionLoadingId === inv.id}
                      activeOpacity={0.88}
                    >
                      {inviteActionLoadingId === inv.id ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={styles.groupInviteAcceptText}>Accept</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </Card>
              ))}
            </View>
          )}

          {hubSearchQuery.length < 2 && (
            <TouchableOpacity
              style={styles.friendsPromoRow}
              onPress={() => router.push('/friends')}
              activeOpacity={0.88}
            >
              <UserPlus color="#4C91FF" size={18} />
              <Text style={styles.friendsPromoRowText} numberOfLines={1}>
                Find friends · invite them to groups
              </Text>
              <ChevronRight color="#64748B" size={18} />
            </TouchableOpacity>
          )}

          {/* Hub Search */}
          <View style={styles.searchContainer}>
            <Search color="#666" size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search people..."
              placeholderTextColor="#666"
              value={hubSearchQuery}
              onChangeText={handleHubSearch}
            />
            {hubSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => { setHubSearchQuery(''); setHubSearchResults([]); }}>
                <X color="#666" size={18} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Overlay */}
          {hubSearchQuery.length >= 2 && (
            <View style={styles.section}>
              {hubSearching && <ActivityIndicator color="#4C91FF" style={{ marginVertical: 12 }} />}
              {!hubSearching && hubSearchResults.length === 0 && <Text style={styles.emptyText}>No users found</Text>}
              {hubSearchResults.map((u: any) => (
                <TouchableOpacity key={u.id} style={styles.userRow} onPress={() => { openUserProfile(u.id); setHubSearchQuery(''); setHubSearchResults([]); }}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{getInitial(u.username)}</Text></View>
                  <View style={styles.userRowInfo}>
                    <Text style={styles.userRowName}>{u.username}</Text>
                    <Text style={styles.userRowMeta}>Level {u.level} · {u.xp} XP</Text>
                  </View>
                  <ChevronRight color="#666" size={16} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Hub Tabs */}
          {hubSearchQuery.length < 2 && (
            <>
              <View style={styles.tabBar}>
                <TouchableOpacity style={[styles.tab, hubTab === 'feed' && styles.tabActive]} onPress={() => setHubTab('feed')}>
                  <Text style={[styles.tabText, hubTab === 'feed' && styles.tabTextActive]}>Feed</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tab, hubTab === 'myGroups' && styles.tabActive]} onPress={() => setHubTab('myGroups')}>
                  <Text style={[styles.tabText, hubTab === 'myGroups' && styles.tabTextActive]}>My Groups</Text>
                </TouchableOpacity>
              </View>

              {/* Feed Tab */}
              {hubTab === 'feed' && (
                <View style={styles.section}>
                  <View style={styles.feedFilters}>
                    <TouchableOpacity
                      style={[styles.feedFilterChip, feedFilter === 'all' && styles.feedFilterChipActive]}
                      onPress={() => setFeedFilter('all')}
                    >
                      <Text style={[styles.feedFilterText, feedFilter === 'all' && styles.feedFilterTextActive]}>All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.feedFilterChip, feedFilter === 'friends' && styles.feedFilterChipActive]}
                      onPress={() => setFeedFilter('friends')}
                    >
                      <Text style={[styles.feedFilterText, feedFilter === 'friends' && styles.feedFilterTextActive]}>Friends</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.feedFilterChip, feedFilter === 'mine' && styles.feedFilterChipActive]}
                      onPress={() => setFeedFilter('mine')}
                    >
                      <Text style={[styles.feedFilterText, feedFilter === 'mine' && styles.feedFilterTextActive]}>My posts</Text>
                    </TouchableOpacity>
                  </View>
                  {filteredFeed.length === 0 ? (
                    <Card style={styles.emptyCard}>
                      <Text style={styles.emptyText}>
                        {feedFilter === 'friends'
                          ? 'No friend activity yet. Add friends or switch to All.'
                          : feedFilter === 'mine'
                            ? 'You haven’t posted here yet. Share a workout from Track or post from a group.'
                            : 'Follow people to see their activity, or share your own workout!'}
                      </Text>
                    </Card>
                  ) : (
                    filteredFeed.map((item: any) => renderFeedItem(item))
                  )}
                </View>
              )}

              {/* My Groups Tab */}
              {hubTab === 'myGroups' && (
                <View style={styles.section}>
                  {myGroups.length === 0 ? (
                    <Card style={styles.emptyCard}>
                      <Users color="#333" size={36} />
                      <Text style={styles.emptyTitle}>No Groups Yet</Text>
                      <Text style={styles.emptyText}>Create a group and share the invite link, or open one someone sent you</Text>
                      <Button title="Create Group" onPress={() => router.push('/create-group')} style={{ marginTop: 12, minWidth: 160 }} />
                    </Card>
                  ) : (
                    myGroups.map((g: any) => (
                      <TouchableOpacity key={g.id} activeOpacity={0.8} onPress={() => openGroupDetail(g.id)}>
                        <Card style={styles.groupListCard}>
                          <View style={styles.groupListRow}>
                            <View style={styles.groupIconBox}><Users color="#7FB1FF" size={20} /></View>
                            <View style={styles.groupListInfo}>
                              <Text style={styles.groupListName} numberOfLines={1}>{g.name}</Text>
                              <Text style={styles.groupListMeta}>{g.member_count || 0} member{(g.member_count || 0) !== 1 ? 's' : ''}</Text>
                            </View>
                            <ChevronRight color="#666" size={18} />
                          </View>
                        </Card>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </>
          )}
        </ScrollView>
        </SafeAreaView>

        {/* FAB */}
        <TouchableOpacity
          style={[styles.fab, { bottom: 24 + insets.bottom }]}
          onPress={() => openShareWorkout()}
          activeOpacity={0.85}
        >
          <MessageSquarePlus color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // ═══════════════════════════════════════════════════
  //  MAIN RETURN: screen content + always-mounted modals
  // ═══════════════════════════════════════════════════
  return (
    <View style={{ flex: 1 }}>
      {renderScreenContent()}

      {/* Preview Template Modal -- always mounted */}
      <Modal visible={!!previewTemplate} transparent animationType="fade" onRequestClose={() => setPreviewTemplate(null)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setPreviewTemplate(null)} />
          <View style={styles.centeredModalContent}>
            {previewTemplate && (
              <View>
                <View style={styles.modalHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={[styles.previewIcon, { backgroundColor: (previewTemplate.color || '#4C91FF') + '20' }]}>
                      <Dumbbell color={previewTemplate.color || '#4C91FF'} size={24} />
                    </View>
                    <Text style={styles.modalTitle} numberOfLines={1}>{previewTemplate.name}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setPreviewTemplate(null)}><X color="#999" size={24} /></TouchableOpacity>
                </View>
                {previewTemplate.user && <Text style={styles.previewCreator}>By {previewTemplate.user.username || 'Unknown'}</Text>}
                <Text style={styles.previewSectionLabel}>{previewTemplate.exercises?.length || previewTemplate.exercise_count || 0} Exercises</Text>
                <ScrollView style={styles.previewExList} showsVerticalScrollIndicator={false}>
                  {(previewTemplate.exercises || []).map((ex: any, idx: number) => (
                    <View key={ex.id || idx} style={styles.previewExRow}>
                      <View style={styles.previewExNum}><Text style={styles.previewExNumText}>{idx + 1}</Text></View>
                      <View style={styles.previewExInfo}>
                        <Text style={styles.previewExName}>{ex.name}</Text>
                        <Text style={styles.previewExMeta}>{ex.default_sets} sets × {ex.default_reps} reps</Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity style={[styles.copyBtn, copying && { opacity: 0.6 }]} onPress={() => handleCloneTemplate(previewTemplate.id)} disabled={copying}>
                  <Copy color="#FFFFFF" size={18} />
                  <Text style={styles.copyBtnText}>{copying ? 'Copying...' : 'Copy to My Workouts'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Create Challenge Modal -- always mounted */}
      <Modal visible={showCreateChallenge} transparent animationType="fade" onRequestClose={() => setShowCreateChallenge(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowCreateChallenge(false)} />
          <View style={styles.centeredModalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Create Challenge</Text>
                <TouchableOpacity onPress={() => setShowCreateChallenge(false)}><X color="#999" size={24} /></TouchableOpacity>
              </View>
              <Input label="Challenge Name" placeholder="e.g. 30 Workouts in 30 Days" value={challengeName} onChangeText={setChallengeName} />
              <Input label="Description (optional)" placeholder="What's the challenge about?" value={challengeDesc} onChangeText={setChallengeDesc} />
              <Text style={styles.sectionLabel}>Challenge Type</Text>
              <View style={styles.challengeTypeGrid}>
                {CHALLENGE_TYPES.map(ct => (
                  <TouchableOpacity
                    key={ct.value}
                    style={[styles.challengeTypeBtn, challengeType === ct.value && styles.challengeTypeBtnActive]}
                    onPress={() => setChallengeType(ct.value)}
                  >
                    <Text style={styles.challengeTypeIcon}>{ct.icon}</Text>
                    <Text style={[styles.challengeTypeLabel, challengeType === ct.value && { color: '#FFF' }]}>{ct.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Input label="Target" placeholder="10" value={challengeTarget} onChangeText={setChallengeTarget} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input label="Duration (days)" placeholder="7" value={challengeDays} onChangeText={setChallengeDays} keyboardType="number-pad" />
                </View>
              </View>
              <Button title="Create Challenge" onPress={handleCreateChallenge} loading={creatingChallenge} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Group Settings Modal -- always mounted */}
      <Modal visible={showGroupSettings} transparent animationType="fade" onRequestClose={() => setShowGroupSettings(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowGroupSettings(false)} />
          <View style={styles.centeredModalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Settings color="#4C91FF" size={20} />
                  <Text style={styles.modalTitle}>Group Settings</Text>
                </View>
                <TouchableOpacity onPress={() => setShowGroupSettings(false)}><X color="#999" size={24} /></TouchableOpacity>
              </View>

              <Input label="Group Name" placeholder="Group name" value={editGroupName} onChangeText={setEditGroupName} />
              <Input label="Description" placeholder="Describe your group..." value={editGroupDesc} onChangeText={setEditGroupDesc} multiline />

              <View style={gdStyles.settingRow}>
                <View style={gdStyles.settingInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Lock color="#FFB547" size={18} />
                    <Text style={gdStyles.settingLabel}>Private group</Text>
                  </View>
                  <Text style={gdStyles.settingDesc}>
                    Not listed publicly. People can only join with your invite link.
                  </Text>
                </View>
              </View>

              <View style={gdStyles.settingRow}>
                <View style={gdStyles.settingInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Link color="#999" size={18} />
                    <Text style={gdStyles.settingLabel}>Invite Link</Text>
                  </View>
                  <Text style={gdStyles.settingDesc} numberOfLines={1}>
                    leveld://group/{selectedGroup?.id?.slice(0, 8)}...
                  </Text>
                </View>
                <TouchableOpacity style={gdStyles.copyLinkBtn} onPress={handleShareGroup}>
                  <Share2 color="#4C91FF" size={16} />
                </TouchableOpacity>
              </View>

              <Button title={savingSettings ? 'Saving...' : 'Save Changes'} onPress={handleSaveGroupSettings} loading={savingSettings} style={{ marginTop: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Invite friends (from group Members tab) */}
      <Modal
        visible={showInviteFriendsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInviteFriendsModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <TouchableOpacity
            style={styles.modalDismiss}
            activeOpacity={1}
            onPress={() => setShowInviteFriendsModal(false)}
          />
          <View style={styles.centeredModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite a friend</Text>
              <TouchableOpacity onPress={() => setShowInviteFriendsModal(false)}>
                <X color="#999" size={24} />
              </TouchableOpacity>
            </View>
            <Text style={styles.inviteFriendsModalHint}>
              Mutual friends who aren&apos;t in this group yet get an in-app invite (they&apos;ll see it under
              Social). Anyone can still join with &quot;Share group link&quot; from the group screen.
            </Text>
            {inviteFriendsLoading ? (
              <ActivityIndicator color="#4C91FF" style={{ marginVertical: 24 }} />
            ) : inviteFriendsCandidates.length === 0 ? (
              <View style={{ gap: 14, marginTop: 8 }}>
                <Text style={styles.emptyText}>
                  Everyone you&apos;re friends with is already here, or you haven&apos;t added friends yet.
                </Text>
                <Button
                  title="Find friends on Leveld"
                  onPress={() => {
                    setShowInviteFriendsModal(false);
                    router.push('/friends');
                  }}
                />
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                {inviteFriendsCandidates.map((u: any) => {
                  const invited = modalPendingInviteIds.includes(Number(u.id));
                  const sending = inviteSendingUserId === u.id;
                  return (
                    <View key={u.id} style={styles.inviteFriendModalRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{getInitial(u.username)}</Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.userRowName} numberOfLines={1}>
                          {u.username}
                        </Text>
                        <Text style={styles.userRowMeta}>
                          Level {u.level} · {u.xp} XP
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.inviteFriendSendBtn, invited && styles.inviteFriendSentBtn]}
                        onPress={() => void inviteFriendInApp(u.id)}
                        disabled={invited || sending}
                        activeOpacity={0.85}
                      >
                        {sending ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : invited ? (
                          <>
                            <UserCheck color="#A8E6A8" size={16} />
                            <Text style={styles.inviteFriendSendBtnText}>Invited</Text>
                          </>
                        ) : (
                          <>
                            <UserPlus color="#FFF" size={15} />
                            <Text style={styles.inviteFriendSendBtnText}>Invite</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Share Workout Modal -- always mounted */}
      <Modal visible={showShareModal} transparent animationType="fade" onRequestClose={() => setShowShareModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalDismiss} activeOpacity={1} onPress={() => setShowShareModal(false)} />
          <View style={styles.centeredModalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>New Post</Text>
                <TouchableOpacity onPress={() => setShowShareModal(false)}><X color="#999" size={24} /></TouchableOpacity>
              </View>

              {/* Post Target Selector */}
              <Text style={styles.sectionLabel}>Post to</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  style={[
                    styles.postTargetChip,
                    !postTargetGroupId && styles.postTargetChipActive,
                  ]}
                  onPress={() => setPostTargetGroupId(null)}
                >
                  <Globe color={!postTargetGroupId ? '#FFFFFF' : '#999'} size={14} />
                  <Text style={[styles.postTargetChipText, !postTargetGroupId && styles.postTargetChipTextActive]}>General</Text>
                </TouchableOpacity>
                {myGroups.map((g: any) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.postTargetChip,
                      postTargetGroupId === g.id && styles.postTargetChipActive,
                    ]}
                    onPress={() => setPostTargetGroupId(postTargetGroupId === g.id ? null : g.id)}
                  >
                    <Users color={postTargetGroupId === g.id ? '#FFFFFF' : '#999'} size={14} />
                    <Text style={[styles.postTargetChipText, postTargetGroupId === g.id && styles.postTargetChipTextActive]} numberOfLines={1}>{g.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Input label="What did you crush today?" placeholder="Just finished an intense push day..." value={shareCaption} onChangeText={setShareCaption} multiline />
              <Text style={styles.sectionLabel}>Attach a Workout (optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templateScroll}>
                {myTemplates.map((t: any) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.templateChip, selectedTemplateId === t.id && { borderColor: t.color, backgroundColor: t.color + '20' }]}
                    onPress={() => setSelectedTemplateId(selectedTemplateId === t.id ? null : t.id)}
                  >
                    <Dumbbell color={selectedTemplateId === t.id ? t.color : '#999'} size={16} />
                    <Text style={[styles.templateChipText, selectedTemplateId === t.id && { color: t.color }]}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <Button title={sharing ? 'Posting...' : 'Post'} onPress={handleShare} loading={sharing} style={styles.shareBtn} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1E1E' },
  loadingText: { color: '#FFFFFF', fontSize: 18 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 28, paddingBottom: 100 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconBtnPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsPromoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    gap: 10,
  },
  friendsPromoRowText: {
    flex: 1,
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
  },

  groupInvitesHubSection: { marginBottom: 16, gap: 10 },
  groupInvitesHubTitle: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  groupInviteHubCard: {
    padding: 14,
    backgroundColor: '#151821',
    borderColor: '#2A3042',
    gap: 12,
  },
  groupInviteHubText: { color: '#CBD5E1', fontSize: 15, lineHeight: 22 },
  groupInviteHubName: { color: '#FFFFFF', fontWeight: '700' },
  groupInviteHubActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  groupInviteDeclineBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#2A2A2A',
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInviteDeclineText: { color: '#CBD5E1', fontSize: 14, fontWeight: '700' },
  groupInviteAcceptBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#4C91FF',
    minWidth: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupInviteAcceptText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },

  // Screen header
  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  screenTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    paddingHorizontal: 8,
    minWidth: 0,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 14, paddingVertical: 10, marginLeft: 8 },

  // Sections
  section: { marginBottom: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  sectionLabel: { color: '#CCC', fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 8 },

  // User rows
  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4C91FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  feedAvatar: { marginRight: 0 },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  userRowInfo: { flex: 1 },
  userRowName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  userRowMeta: { color: '#999', fontSize: 13, marginTop: 2 },
  xpText: { color: '#4C91FF', fontSize: 16, fontWeight: '700' },

  // Social profile
  socialProfileHeader: { alignItems: 'center', marginBottom: 20 },
  socialProfileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4C91FF', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  socialProfileAvatarText: { color: '#FFFFFF', fontSize: 30, fontWeight: '800' },
  socialLevelBadge: { position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, backgroundColor: '#FFB547', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#1E1E1E' },
  socialLevelText: { color: '#000', fontSize: 12, fontWeight: '800' },
  socialStatsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 16, padding: 16, marginBottom: 16, width: '100%' },
  socialStatItem: { flex: 1, alignItems: 'center' },
  socialStatNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  socialStatLabel: { color: '#999', fontSize: 12, marginTop: 2 },
  socialStatDivider: { width: 1, height: 30, backgroundColor: '#3A3A3A' },
  followBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4C91FF', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, width: '100%' },
  followBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  followingBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#4C91FF', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, width: '100%' },
  followingBtnText: { color: '#4C91FF', fontSize: 16, fontWeight: '700' },
  friendsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0D2818', borderWidth: 1, borderColor: '#1A5C2E', paddingVertical: 12, paddingHorizontal: 32, borderRadius: 12, width: '100%' },
  friendsBtnText: { color: '#51CF66', fontSize: 16, fontWeight: '700' },

  bioSection: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' },
  bioGoal: { color: '#CCC', fontSize: 15 },
  bioExpBadge: { backgroundColor: '#2A2A2A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  bioExpText: { color: '#999', fontSize: 12, fontWeight: '600' },
  socialInfoRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  socialInfoChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2A2A2A', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  socialInfoChipText: { color: '#CCC', fontSize: 13, fontWeight: '600' },
  badgeChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,181,71,0.1)', borderWidth: 1, borderColor: 'rgba(255,181,71,0.2)', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
  badgeChipName: { color: '#FFB547', fontSize: 13, fontWeight: '600' },

  // Groups - My Groups list
  groupListCard: { marginBottom: 10 },
  groupListRow: { flexDirection: 'row', alignItems: 'center' },
  groupIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1E2A3A', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  groupListInfo: { flex: 1 },
  groupListName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  groupListMeta: { color: '#999', fontSize: 13, marginTop: 2 },

  // Group detail
  groupInfoCard: { marginBottom: 20 },
  groupInfoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  groupInfoIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#1E2A3A', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  groupInfoText: { flex: 1 },
  groupInfoName: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  groupInfoDesc: { color: '#999', fontSize: 14, marginTop: 4, lineHeight: 20 },
  groupInfoStats: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  groupInfoStat: { flex: 1, backgroundColor: '#1E1E1E', borderRadius: 12, paddingVertical: 14, alignItems: 'center', gap: 4 },
  groupInfoStatNum: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
  groupInfoStatLabel: { color: '#999', fontSize: 12 },
  leaveBtn: { paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#FF4C4C', alignItems: 'center' },
  leaveBtnText: { color: '#FF4C4C', fontSize: 15, fontWeight: '600' },

  // Tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 3, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#4C91FF' },
  tabText: { color: '#999', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

  profileGateCard: { paddingVertical: 28, paddingHorizontal: 20, alignItems: 'center' },
  profileGateInner: { alignItems: 'center', gap: 12, width: '100%' },
  profileGateTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  profileGateText: { color: '#999', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  profileGateBtn: {
    marginTop: 4,
    backgroundColor: '#4C91FF',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    alignSelf: 'center',
  },
  profileGateBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Leaderboard
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  leaderRowMe: { backgroundColor: '#1E2A3A', marginHorizontal: -16, paddingHorizontal: 16, borderRadius: 8 },
  rankContainer: { width: 32, alignItems: 'center', marginRight: 8 },
  rankNum: { color: '#999', fontSize: 14, fontWeight: '700' },

  // Challenges
  createChallengeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E2A3A', paddingVertical: 14, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#2A3A4A', borderStyle: 'dashed' },
  createChallengeBtnText: { color: '#4C91FF', fontSize: 15, fontWeight: '600' },
  challengeCard: { marginBottom: 12 },
  challengeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  challengeIcon: { fontSize: 24 },
  challengeName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  challengeDesc: { color: '#999', fontSize: 13, marginTop: 2 },
  activeBadge: { backgroundColor: '#0D2818', borderWidth: 1, borderColor: '#1A5C2E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  activeBadgeText: { color: '#51CF66', fontSize: 11, fontWeight: '700' },
  endedBadge: { backgroundColor: '#2A1A1A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  endedBadgeText: { color: '#999', fontSize: 11, fontWeight: '600' },
  challengeTargetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  challengeTargetText: { color: '#CCC', fontSize: 13 },
  challengeParticipants: { color: '#999', fontSize: 12 },
  challengeProgressSection: { gap: 6 },
  challengeProgressBar: { height: 6, backgroundColor: '#2A2A2A', borderRadius: 3, overflow: 'hidden' },
  challengeProgressFill: { height: '100%', backgroundColor: '#4C91FF', borderRadius: 3 },
  challengeProgressText: { color: '#999', fontSize: 12, textAlign: 'right' },
  joinChallengeBtn: { backgroundColor: '#4C91FF', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  joinChallengeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  challengeTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  challengeTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#2A2A2A', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#333' },
  challengeTypeBtnActive: { borderColor: '#4C91FF', backgroundColor: '#1E2A3A' },
  challengeTypeIcon: { fontSize: 16 },
  challengeTypeLabel: { color: '#999', fontSize: 13, fontWeight: '600' },

  // Feed
  feedFilters: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  feedFilterChip: { backgroundColor: '#22262F', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 7 },
  feedFilterChipActive: { backgroundColor: '#4C91FF' },
  feedFilterText: { color: '#A8AFC2', fontSize: 13, fontWeight: '700' },
  feedFilterTextActive: { color: '#FFFFFF' },
  feedCard: { marginBottom: 12, borderWidth: 1, borderColor: '#2A3042', backgroundColor: '#151821' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  feedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
    gap: 12,
    minWidth: 0,
  },
  feedUsername: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  feedGroupBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1A2744', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#2D4472' },
  feedGroupBadgeText: { color: '#7FB1FF', fontSize: 11, fontWeight: '600', maxWidth: 80, flexShrink: 1 },
  feedTime: { color: '#999', fontSize: 12, marginTop: 1 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#101C32', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, flexShrink: 0, marginTop: 2 },
  levelBadgeText: { color: '#4C91FF', fontSize: 12, fontWeight: '700' },
  feedContent: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  feedActions: { flexDirection: 'row', gap: 20 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#1C202A' },
  actionButtonLiked: { backgroundColor: '#3A1C26' },
  actionText: { color: '#999', fontSize: 14, fontWeight: '600' },
  actionTextLiked: { color: '#FF8CA0' },

  sharedTemplateCard: { backgroundColor: '#1A1A1A', marginBottom: 10, padding: 12 },
  sharedTemplateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sharedTemplateTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  sharedTemplateName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1 },
  templateCopyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#1A2332',
  },
  templateCopyChipText: { color: '#7FB1FF', fontSize: 13, fontWeight: '700' },

  // Template preview
  previewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewCreator: { color: '#999', fontSize: 13, marginBottom: 16, marginTop: -8 },
  previewSectionLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  previewExList: { maxHeight: 280, marginBottom: 20 },
  previewExRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 14, marginBottom: 8 },
  previewExNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3A3A3A', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  previewExNumText: { color: '#999', fontSize: 14, fontWeight: '700' },
  previewExInfo: { flex: 1 },
  previewExName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  previewExMeta: { color: '#999', fontSize: 13, marginTop: 2 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4C91FF', borderRadius: 14, paddingVertical: 16 },
  copyBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  // Template card
  templateCardSmall: { marginBottom: 10 },
  templateCardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  templateCardTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  templateCardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  templateCardInfo: { flex: 1 },
  templateCardInfoShrink: { minWidth: 0 },
  templateCardName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  templateCardMeta: { color: '#999', fontSize: 13, marginTop: 2 },

  // Workout card
  workoutCard: { marginBottom: 10 },
  workoutCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  workoutCardDate: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  xpBadge: { backgroundColor: '#1E1E1E', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  xpBadgeText: { color: '#4C91FF', fontSize: 12, fontWeight: '700' },
  workoutCardStats: { color: '#999', fontSize: 13 },
  workoutCardNotes: { color: '#777', fontSize: 13, marginTop: 4, fontStyle: 'italic' },

  // Share
  postTargetChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#2A2A2A', backgroundColor: '#1E1E1E', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9, marginRight: 10 },
  postTargetChipActive: { borderColor: '#4C91FF', backgroundColor: '#1E2A3A' },
  postTargetChipText: { color: '#999', fontSize: 14, fontWeight: '600', maxWidth: 120 },
  postTargetChipTextActive: { color: '#FFFFFF' },
  templateScroll: { marginBottom: 20 },
  templateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 10 },
  templateChipText: { color: '#999', fontSize: 14, fontWeight: '600' },
  shareBtn: { marginTop: 8 },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 28, marginBottom: 24 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 10 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 4 },

  // Modals -- centered
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center' },
  modalDismiss: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  centeredModalContent: { backgroundColor: '#1E1E1E', borderRadius: 20, width: '90%', maxHeight: '80%', padding: 24 },
  inviteFriendsModalHint: {
    color: '#888',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  inviteFriendModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  inviteFriendSendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#4C91FF',
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 10,
    minWidth: 96,
    justifyContent: 'center',
  },
  inviteFriendSentBtn: {
    backgroundColor: '#1E3A2A',
    borderWidth: 1,
    borderColor: '#2A5C3A',
  },
  inviteFriendSendBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1 },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4C91FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});

// ═══════════════════════════════════════════════════
//  Group Detail Styles
// ═══════════════════════════════════════════════════
const gdStyles = StyleSheet.create({
  // Hero
  hero: { paddingTop: 14, paddingBottom: 16 },
  heroNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  heroNavBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  heroNavActions: { flexDirection: 'row', gap: 8 },
  heroContent: { alignItems: 'center', paddingHorizontal: 20 },
  heroAvatarContainer: { marginBottom: 10 },
  heroAvatar: { width: 60, height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  privacyBadge: { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0F1117' },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  heroDesc: { color: '#8E95A8', fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 10, maxWidth: '90%' },
  heroMetaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 12 },
  heroMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  heroMetaText: { color: '#8E95A8', fontSize: 12, fontWeight: '600' },

  // Member preview stack
  memberPreview: { marginBottom: 12 },
  memberAvatarStack: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  memberStackAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B6FD4', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0F1117' },
  memberStackText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  memberStackMore: { backgroundColor: '#2A2A3A' },
  memberStackMoreText: { color: '#999', fontSize: 10, fontWeight: '700' },

  // CTA
  heroCTARow: { flexDirection: 'row', gap: 10, width: '100%' },
  inviteBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#4C91FF', paddingVertical: 13, borderRadius: 14 },
  inviteBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  membershipBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(81,207,102,0.1)', borderWidth: 1, borderColor: 'rgba(81,207,102,0.25)', paddingHorizontal: 18, paddingVertical: 13, borderRadius: 14 },
  membershipText: { color: '#51CF66', fontSize: 14, fontWeight: '700' },
  joinBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
  joinBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  joinBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },

  // Sticky tabs
  stickyTabWrap: { backgroundColor: '#0F1117', borderBottomWidth: 1, borderBottomColor: '#1E2030', paddingVertical: 6 },
  tabScrollContent: { paddingHorizontal: 16, gap: 6 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: 'transparent' },
  tabItemActive: { backgroundColor: '#4C91FF' },
  tabLabel: { color: '#888', fontSize: 13, fontWeight: '600' },
  tabLabelActive: { color: '#FFFFFF' },

  // Tab content
  tabContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 },

  // Podium
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', marginBottom: 28, paddingTop: 10 },
  podiumSlot: { flex: 1, alignItems: 'center', gap: 4 },
  podiumAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  podiumGold: { backgroundColor: '#3B6FD4', borderWidth: 2, borderColor: '#FFD700' },
  podiumSilver: { backgroundColor: '#2A3042', borderWidth: 2, borderColor: '#C0C0C0' },
  podiumBronze: { backgroundColor: '#2A2520', borderWidth: 2, borderColor: '#CD7F32' },
  podiumAvatarText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  podiumName: { color: '#FFF', fontSize: 12, fontWeight: '600', maxWidth: 80, textAlign: 'center' },
  podiumXP: { color: '#8BB4FF', fontSize: 11, fontWeight: '700' },
  podiumBar: { width: '75%', borderRadius: 6, marginTop: 4 },

  // Rank rows
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#1A1D28' },
  rankRowMe: { backgroundColor: 'rgba(76,145,255,0.06)', marginHorizontal: -20, paddingHorizontal: 20, borderRadius: 0 },
  rankNumber: { width: 28, color: '#555', fontSize: 15, fontWeight: '700', textAlign: 'center' },
  rankName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  rankMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  rankXPBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(76,145,255,0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  rankXPText: { color: '#4C91FF', fontSize: 13, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  emptyDesc: { color: '#666', fontSize: 14, textAlign: 'center', maxWidth: '80%' },

  // Challenges
  newChallengeBtn: { marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  newChallengeBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#2A3A5A' },
  newChallengeIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(76,145,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  newChallengeTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  newChallengeSubtitle: { color: '#666', fontSize: 12, marginTop: 2 },
  challengeSectionLabel: { color: '#8E95A8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 12 },
  challengeItem: { backgroundColor: '#151821', borderWidth: 1, borderColor: '#1E2438', borderRadius: 16, padding: 16, marginBottom: 12 },
  challengeItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  challengeItemIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', justifyContent: 'center' },
  challengeItemName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  challengeItemMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  challengeItemDesc: { color: '#888', fontSize: 13, lineHeight: 18, marginBottom: 10 },
  challengeGoalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 10, marginBottom: 12 },
  challengeGoalLabel: { color: '#666', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  challengeGoalValue: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  challengeProgressWrap: { gap: 6 },
  challengeProgressTrack: { height: 8, backgroundColor: '#1E2030', borderRadius: 4, overflow: 'hidden' },
  challengeProgressFillGrad: { height: '100%', borderRadius: 4 },
  challengeProgressFillSolid: { height: '100%', borderRadius: 4, backgroundColor: '#555' },
  challengeProgressLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  challengeProgressCurrent: { color: '#888', fontSize: 12, fontWeight: '600' },
  challengeProgressPct: { color: '#4C91FF', fontSize: 12, fontWeight: '700' },
  challengeJoinAction: { backgroundColor: '#4C91FF', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  challengeJoinText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },

  // Members
  inviteFriendsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#151821',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#252A38',
  },
  inviteFriendsBannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(76,145,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteFriendsBannerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  inviteFriendsBannerSub: {
    color: '#8890A8',
    fontSize: 12,
    lineHeight: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingRight: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1A1D28',
  },
  memberRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
    minWidth: 0,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#3B6FD4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  memberAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  memberCrownBadge: { position: 'absolute', top: -4, right: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: '#1A1500', borderWidth: 2, borderColor: '#0F1117', alignItems: 'center', justifyContent: 'center' },
  memberName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  memberMeta: { color: '#666', fontSize: 12, marginTop: 2 },
  adminTag: { backgroundColor: 'rgba(255,181,71,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  adminTagText: { color: '#FFB547', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  inviteMembersBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderWidth: 1, borderColor: '#2A3A5A', borderStyle: 'dashed', borderRadius: 14, marginTop: 16 },
  inviteMembersBtnText: { color: '#4C91FF', fontSize: 15, fontWeight: '600' },
  dangerZone: { marginTop: 32, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#1E1E28', gap: 12 },
  leaveGroupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,76,76,0.25)', backgroundColor: 'rgba(255,76,76,0.06)' },
  leaveGroupText: { color: '#FF4C4C', fontSize: 15, fontWeight: '600' },
  deleteGroupBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, backgroundColor: '#FF4C4C' },
  deleteGroupText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  removeMemberBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,76,76,0.1)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // Settings modal rows
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#2A2A2A', borderRadius: 14, padding: 16, marginBottom: 12 },
  settingInfo: { flex: 1, marginRight: 12, gap: 4 },
  settingLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  settingDesc: { color: '#888', fontSize: 12, marginTop: 2 },
  copyLinkBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(76,145,255,0.12)', alignItems: 'center', justifyContent: 'center' },

  // Non-member preview
  nonMemberPreview: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  nonMemberCard: { alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, paddingVertical: 40, paddingHorizontal: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  nonMemberTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  nonMemberDesc: { color: '#888', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, maxWidth: '90%' },
  nonMemberJoinBtn: { borderRadius: 14, overflow: 'hidden', width: '100%' },
  nonMemberJoinGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 14 },
  nonMemberJoinText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
