import React, { useEffect, useState, useCallback } from 'react';
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
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import {
  apiGetLeaderboard,
  apiGetFeed,
  apiReactToFeed,
  apiGetGroups,
  apiCreateGroup,
  apiGetGroupDetail,
  apiJoinGroup,
  apiLeaveGroup,
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
  Clock,
  Copy,
  Dumbbell,
  Flame,
  TrendingUp,
  Send,
  Check,
  Globe,
  Lock,
  Target,
  Award,
  Calendar,
  Heart,
} from 'lucide-react-native';

type Screen = 'hub' | 'groupDetail' | 'userProfile' | 'friends' | 'shareWorkout';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CHALLENGE_TYPES = [
  { value: 'total_workouts', label: 'Total Workouts', icon: '🏋️' },
  { value: 'total_xp', label: 'Total XP', icon: '⚡' },
  { value: 'streak', label: 'Streak Days', icon: '🔥' },
  { value: 'total_reps', label: 'Total Reps', icon: '💪' },
];

export default function GroupsScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const [screen, setScreen] = useState<Screen>('hub');
  const [previousScreen, setPreviousScreen] = useState<Screen>('hub');

  // Hub data
  const [feed, setFeed] = useState<any[]>([]);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [discoverGroups, setDiscoverGroups] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'friends'>('all');

  // Create group modal
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);

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

  // Friends/search screen
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  // Share workout
  const [shareCaption, setShareCaption] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [myTemplates, setMyTemplates] = useState<any[]>([]);
  const [sharing, setSharing] = useState(false);

  // Preview template
  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [copying, setCopying] = useState(false);

  useEffect(() => { loadData(); }, []);

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
        setDiscoverGroups(data.discover || []);
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
    await loadData();
    setRefreshing(false);
  };

  // Group CRUD
  const handleCreateGroup = async () => {
    if (!groupName.trim()) { Alert.alert('Error', 'Please enter a group name'); return; }
    setCreatingGroup(true);
    try {
      const { error } = await apiCreateGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
        is_public: true,
      });
      if (error) { Alert.alert('Error', error.detail || 'Failed to create group'); return; }
      setGroupName(''); setGroupDescription(''); setShowCreateGroup(false);
      await loadGroups();
    } catch { Alert.alert('Error', 'Failed to create group'); }
    finally { setCreatingGroup(false); }
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
        try { await apiLeaveGroup(selectedGroup.id); await openGroupDetail(selectedGroup.id); await loadGroups(); }
        catch { Alert.alert('Error', 'Failed to leave group'); }
        finally { setJoiningLeaving(false); }
      }},
    ]);
  };

  // Challenge
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

  // User profile & follow
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

  // Search
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try { const { data } = await apiSearchUsers(q); if (data) setSearchResults(data); }
    catch {}
    finally { setSearching(false); }
  };

  // Clone template
  const handleCloneTemplate = async (templateId: string) => {
    setCopying(true);
    try {
      const { error } = await apiCloneTemplate(templateId);
      if (error) { Alert.alert('Error', error.detail || 'Failed to copy'); return; }
      setPreviewTemplate(null);
      router.push('/(tabs)/track');
    } catch { Alert.alert('Error', 'Failed to copy workout'); }
    finally { setCopying(false); }
  };

  // Share workout
  const openShareWorkout = async () => {
    navigateTo('shareWorkout');
    setShareCaption(''); setSelectedTemplateId(null);
    try { const { data } = await apiGetTemplates(); if (data) setMyTemplates(data); } catch {}
  };

  const handleShare = async () => {
    if (!shareCaption.trim()) { Alert.alert('Error', 'Write something about your workout'); return; }
    setSharing(true);
    try {
      const { error } = await apiCreateFeedPost(shareCaption.trim(), selectedTemplateId || undefined);
      if (error) { Alert.alert('Error', error.detail || 'Failed to share'); return; }
      setScreen('hub'); await loadFeed();
    } catch { Alert.alert('Error', 'Failed to share'); }
    finally { setSharing(false); }
  };

  // Reactions
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
  const filteredFeed =
    feedFilter === 'friends'
      ? feed.filter((item: any) => friendIdSet.has(String(item?.user?.id)))
      : feed;

  // Helpers
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
  //  SCREEN: SHARE WORKOUT
  // ═══════════════════════════════════════════════════
  if (screen === 'shareWorkout') {
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.screenHeader}>
            <TouchableOpacity onPress={goBack} style={styles.backBtn}>
              <ChevronLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Share Workout</Text>
            <View style={{ width: 40 }} />
          </View>
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
          <Button title="Post" onPress={handleShare} loading={sharing} style={styles.shareBtn} />
        </ScrollView>
      </LinearGradient>
    );
  }

  // ═══════════════════════════════════════════════════
  //  SCREEN: FRIENDS / PEOPLE
  // ═══════════════════════════════════════════════════
  if (screen === 'friends') {
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.screenHeader}>
            <TouchableOpacity onPress={() => setScreen('hub')} style={styles.backBtn}>
              <ChevronLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>People</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.searchContainer}>
            <Search color="#666" size={18} />
            <TextInput style={styles.searchInput} placeholder="Search by username..." placeholderTextColor="#666" value={searchQuery} onChangeText={handleSearch} />
          </View>

          {searchQuery.length >= 2 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {searching && <ActivityIndicator color="#4C91FF" style={{ marginVertical: 12 }} />}
              {!searching && searchResults.length === 0 && <Text style={styles.emptyText}>No users found</Text>}
              {searchResults.map((u: any) => (
                <TouchableOpacity key={u.id} style={styles.userRow} onPress={() => openUserProfile(u.id)}>
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

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
            {friends.length === 0 && <Text style={styles.emptyText}>Search for users above to find friends</Text>}
            {friends.map((u: any) => (
              <TouchableOpacity key={u.id} style={styles.userRow} onPress={() => openUserProfile(u.id)}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{getInitial(u.username)}</Text></View>
                <View style={styles.userRowInfo}>
                  <Text style={styles.userRowName}>{u.username}</Text>
                  <Text style={styles.userRowMeta}>Level {u.level} · {u.xp} XP</Text>
                </View>
                <ChevronRight color="#666" size={16} />
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ═══════════════════════════════════════════════════
  //  SCREEN: USER PROFILE (Social Media Style)
  // ═══════════════════════════════════════════════════
  if (screen === 'userProfile') {
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
        {userProfileLoading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4C91FF" /></View>
        ) : viewedUser ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={goBack} style={styles.backBtn}>
                <ChevronLeft color="#FFFFFF" size={24} />
              </TouchableOpacity>
              <Text style={styles.screenTitle}>{viewedUser.username}</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Profile Header */}
            <View style={styles.socialProfileHeader}>
              <View style={styles.socialProfileAvatar}>
                <Text style={styles.socialProfileAvatarText}>{getInitial(viewedUser.username)}</Text>
                <View style={styles.socialLevelBadge}>
                  <Text style={styles.socialLevelText}>{viewedUser.level}</Text>
                </View>
              </View>

              {/* Stats Row */}
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

              {/* Follow / Friends Button */}
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

            {/* Bio / Goal */}
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

            {/* Streak & XP */}
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

            {/* Badges */}
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

            {/* Tabs */}
            <View style={styles.tabBar}>
              {(['workouts', 'activity'] as const).map(tab => (
                <TouchableOpacity key={tab} style={[styles.tab, profileTab === tab && styles.tabActive]} onPress={() => setProfileTab(tab)}>
                  <Text style={[styles.tabText, profileTab === tab && styles.tabTextActive]}>
                    {tab === 'workouts' ? 'Workouts' : 'Activity'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Workouts tab */}
            {profileTab === 'workouts' && viewedUser.templates && (
              <View style={styles.section}>
                {viewedUser.templates.length === 0 && <Text style={styles.emptyText}>No workouts shared yet</Text>}
                {viewedUser.templates.map((t: any) => (
                  <TouchableOpacity key={t.id} activeOpacity={0.7} onPress={() => setPreviewTemplate(t)}>
                    <Card style={styles.templateCardSmall}>
                      <View style={styles.templateCardRow}>
                        <View style={[styles.templateCardIcon, { backgroundColor: (t.color || '#4C91FF') + '20' }]}>
                          <Dumbbell color={t.color || '#4C91FF'} size={20} />
                        </View>
                        <View style={styles.templateCardInfo}>
                          <Text style={styles.templateCardName}>{t.name}</Text>
                          <Text style={styles.templateCardMeta}>{t.exercise_count} exercise{t.exercise_count !== 1 ? 's' : ''}</Text>
                        </View>
                        <ChevronRight color="#666" size={18} />
                      </View>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Activity tab */}
            {profileTab === 'activity' && viewedUser.recent_workouts && (
              <View style={styles.section}>
                {viewedUser.recent_workouts.length === 0 && <Text style={styles.emptyText}>No recent activity</Text>}
                {viewedUser.recent_workouts.slice(0, 8).map((w: any) => (
                  <Card key={w.id} style={styles.workoutCard}>
                    <View style={styles.workoutCardHeader}>
                      <Text style={styles.workoutCardDate}>{new Date(w.workout_date).toLocaleDateString()}</Text>
                      <View style={styles.xpBadge}><Text style={styles.xpBadgeText}>+{w.xp_earned} XP</Text></View>
                    </View>
                    <Text style={styles.workoutCardStats}>{w.total_sets} sets · {w.total_reps} reps · {w.duration_minutes} min</Text>
                    {w.notes ? <Text style={styles.workoutCardNotes}>{w.notes}</Text> : null}
                  </Card>
                ))}
              </View>
            )}
          </ScrollView>
        ) : null}
      </LinearGradient>
    );
  }

  // ═══════════════════════════════════════════════════
  //  SCREEN: GROUP DETAIL (with challenges)
  // ═══════════════════════════════════════════════════
  if (screen === 'groupDetail') {
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
        {groupDetailLoading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4C91FF" /></View>
        ) : selectedGroup ? (
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.screenHeader}>
              <TouchableOpacity onPress={() => { setScreen('hub'); setSelectedGroup(null); }} style={styles.backBtn}>
                <ChevronLeft color="#FFFFFF" size={24} />
              </TouchableOpacity>
              <Text style={styles.screenTitle} numberOfLines={1}>{selectedGroup.name}</Text>
              <View style={{ width: 40 }} />
            </View>

            {/* Group info */}
            <Card style={styles.groupInfoCard}>
              <View style={styles.groupInfoHeader}>
                <View style={styles.groupInfoIcon}><Users color="#4C91FF" size={28} /></View>
                <View style={styles.groupInfoText}>
                  <Text style={styles.groupInfoName}>{selectedGroup.name}</Text>
                  {selectedGroup.description ? <Text style={styles.groupInfoDesc}>{selectedGroup.description}</Text> : null}
                </View>
              </View>
              <View style={styles.groupInfoStats}>
                <View style={styles.groupInfoStat}>
                  <Text style={styles.groupInfoStatNum}>{selectedGroup.member_count || 0}</Text>
                  <Text style={styles.groupInfoStatLabel}>Members</Text>
                </View>
                <View style={styles.groupInfoStat}>
                  <Text style={styles.groupInfoStatNum}>{groupChallenges.filter((c: any) => c.is_active).length}</Text>
                  <Text style={styles.groupInfoStatLabel}>Active Challenges</Text>
                </View>
                <View style={styles.groupInfoStat}>
                  {selectedGroup.is_public ? <Globe color="#4C91FF" size={16} /> : <Lock color="#FFB547" size={16} />}
                  <Text style={styles.groupInfoStatLabel}>{selectedGroup.is_public ? 'Public' : 'Private'}</Text>
                </View>
              </View>
              {selectedGroup.is_member ? (
                <TouchableOpacity style={styles.leaveBtn} onPress={handleLeaveGroup} disabled={joiningLeaving}>
                  <Text style={styles.leaveBtnText}>Leave Group</Text>
                </TouchableOpacity>
              ) : (
                <Button title="Join Group" onPress={handleJoinGroup} loading={joiningLeaving} />
              )}
            </Card>

            {/* Tabs */}
            <View style={styles.tabBar}>
              {(['leaderboard', 'challenges', 'feed', 'members'] as const).map(tab => (
                <TouchableOpacity key={tab} style={[styles.tab, groupTab === tab && styles.tabActive]} onPress={() => setGroupTab(tab)}>
                  <Text style={[styles.tabText, groupTab === tab && styles.tabTextActive]}>
                    {tab === 'leaderboard' ? 'Ranks' : tab === 'challenges' ? 'Challenges' : tab === 'feed' ? 'Feed' : 'Members'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Leaderboard */}
            {groupTab === 'leaderboard' && (
              <View style={styles.section}>
                {groupLeaderboard.map((u: any, idx: number) => (
                  <TouchableOpacity key={u.id} style={[styles.leaderRow, String(u.id) === String(profile.id) && styles.leaderRowMe]} onPress={() => openUserProfile(u.id)}>
                    <View style={styles.rankContainer}>{getRankIcon(idx) || <Text style={styles.rankNum}>{idx + 1}</Text>}</View>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{getInitial(u.username)}</Text></View>
                    <View style={styles.userRowInfo}>
                      <Text style={[styles.userRowName, String(u.id) === String(profile.id) && { color: '#4C91FF' }]}>{u.username}</Text>
                      <Text style={styles.userRowMeta}>Level {u.level}</Text>
                    </View>
                    <Text style={styles.xpText}>{u.xp} XP</Text>
                  </TouchableOpacity>
                ))}
                {groupLeaderboard.length === 0 && <Text style={styles.emptyText}>No members yet</Text>}
              </View>
            )}

            {/* Challenges */}
            {groupTab === 'challenges' && (
              <View style={styles.section}>
                {selectedGroup.is_member && (
                  <TouchableOpacity style={styles.createChallengeBtn} onPress={() => setShowCreateChallenge(true)}>
                    <Plus color="#4C91FF" size={18} />
                    <Text style={styles.createChallengeBtnText}>Create Challenge</Text>
                  </TouchableOpacity>
                )}
                {groupChallenges.length === 0 && <Text style={styles.emptyText}>No challenges yet. Create one to get started!</Text>}
                {groupChallenges.map((ch: any) => {
                  const daysLeft = getDaysLeft(ch.end_date);
                  const progressPct = ch.target_value > 0 ? Math.min(1, (ch.my_progress || 0) / ch.target_value) : 0;
                  const typeInfo = CHALLENGE_TYPES.find(t => t.value === ch.challenge_type);
                  return (
                    <Card key={ch.id} style={styles.challengeCard}>
                      <View style={styles.challengeHeader}>
                        <Text style={styles.challengeIcon}>{typeInfo?.icon || '🎯'}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.challengeName}>{ch.name}</Text>
                          {ch.description ? <Text style={styles.challengeDesc}>{ch.description}</Text> : null}
                        </View>
                        {ch.is_active && <View style={styles.activeBadge}><Text style={styles.activeBadgeText}>{daysLeft}d left</Text></View>}
                        {!ch.is_active && daysLeft === 0 && <View style={styles.endedBadge}><Text style={styles.endedBadgeText}>Ended</Text></View>}
                      </View>

                      <View style={styles.challengeTargetRow}>
                        <Text style={styles.challengeTargetText}>
                          Goal: {ch.target_value} {typeInfo?.label || ch.challenge_type}
                        </Text>
                        <Text style={styles.challengeParticipants}>{ch.participant_count || 0} joined</Text>
                      </View>

                      {ch.is_joined && (
                        <View style={styles.challengeProgressSection}>
                          <View style={styles.challengeProgressBar}>
                            <View style={[styles.challengeProgressFill, { width: `${progressPct * 100}%` }]} />
                          </View>
                          <Text style={styles.challengeProgressText}>
                            {ch.my_progress || 0} / {ch.target_value}
                          </Text>
                        </View>
                      )}

                      {!ch.is_joined && ch.is_active && selectedGroup.is_member && (
                        <TouchableOpacity style={styles.joinChallengeBtn} onPress={() => handleJoinChallenge(ch.id)}>
                          <Text style={styles.joinChallengeBtnText}>Join Challenge</Text>
                        </TouchableOpacity>
                      )}
                    </Card>
                  );
                })}
              </View>
            )}

            {/* Feed */}
            {groupTab === 'feed' && (
              <View style={styles.section}>
                {groupFeed.length === 0 && <Text style={styles.emptyText}>No activity yet</Text>}
                {groupFeed.map((item: any) => renderFeedItem(item))}
              </View>
            )}

            {/* Members */}
            {groupTab === 'members' && (
              <View style={styles.section}>
                {selectedGroup.members?.map((m: any) => {
                  const isOwner = String(m.user?.id) === String(selectedGroup.created_by_id);
                  return (
                    <TouchableOpacity key={m.id} style={styles.userRow} onPress={() => m.user && openUserProfile(m.user.id)}>
                      <View style={styles.avatar}><Text style={styles.avatarText}>{getInitial(m.user?.username)}</Text></View>
                      <View style={styles.userRowInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.userRowName}>{m.user?.username || 'User'}</Text>
                          {isOwner && <Crown color="#FFB547" size={14} />}
                        </View>
                        <Text style={styles.userRowMeta}>Level {m.user?.level || 1} · {m.user?.xp || 0} XP</Text>
                      </View>
                      <ChevronRight color="#666" size={16} />
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        ) : null}

        {/* Create Challenge Modal */}
        <Modal visible={showCreateChallenge} transparent animationType="slide" onRequestClose={() => setShowCreateChallenge(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
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
            </View>
          </View>
        </Modal>
      </LinearGradient>
    );
  }

  // ═══════════════════════════════════════════════════
  //  HELPER: render feed item
  // ═══════════════════════════════════════════════════
  function renderFeedItem(item: any) {
    const liked = item.my_reaction === 'like';
    return (
      <Card key={item.id} style={styles.feedCard}>
        <TouchableOpacity style={styles.feedHeader} onPress={() => item.user && openUserProfile(item.user.id)}>
          <View style={styles.feedUserInfo}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{getInitial(item.user?.username)}</Text></View>
            <View>
              <Text style={styles.feedUsername}>{item.user?.username || 'User'}</Text>
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
          <TouchableOpacity activeOpacity={0.7} onPress={() => setPreviewTemplate(item.template)}>
            <Card style={styles.sharedTemplateCard}>
              <View style={styles.sharedTemplateRow}>
                <Dumbbell color={item.template.color || '#4C91FF'} size={18} />
                <Text style={styles.sharedTemplateName}>{item.template.name}</Text>
                <ChevronRight color="#666" size={16} />
              </View>
            </Card>
          </TouchableOpacity>
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
  //  SCREEN: HUB (default)
  // ═══════════════════════════════════════════════════
  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Social</Text>
            <Text style={styles.subtitle}>Train together. Stay accountable.</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerBtn} onPress={() => { navigateTo('friends'); loadFriends(); }}>
              <Users color="#9CC1FF" size={18} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerBtnPrimary} onPress={openShareWorkout}>
              <Send color="#FFFFFF" size={17} />
            </TouchableOpacity>
          </View>
        </View>

        <LinearGradient colors={['#4C91FF33', '#7A5CFF22', '#0A0A0A']} style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroTitle}>Your Fitness Circle</Text>
              <Text style={styles.heroMeta}>{friends.length} friends • {myGroups.length} groups</Text>
            </View>
            <TouchableOpacity style={styles.heroAction} onPress={() => setShowCreateGroup(true)}>
              <Plus color="#4C91FF" size={16} />
              <Text style={styles.heroActionText}>New Group</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Flame color="#FFB547" size={15} />
              <Text style={styles.heroStatText}>{filteredFeed.length} posts</Text>
            </View>
            <View style={styles.heroStat}>
              <Heart color="#FF4D6D" size={15} />
              <Text style={styles.heroStatText}>{feed.reduce((sum: number, post: any) => sum + (post.likes_count || 0), 0)} likes</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Your Groups */}
        {myGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Groups</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.groupScroller}>
              {myGroups.map((g: any) => (
                <TouchableOpacity key={g.id} activeOpacity={0.8} onPress={() => openGroupDetail(g.id)}>
                  <LinearGradient colors={['#232A3A', '#1B1B1B']} style={styles.groupPillCard}>
                    <View style={styles.groupIconBox}><Users color="#7FB1FF" size={19} /></View>
                    <Text style={styles.groupCardName} numberOfLines={1}>{g.name}</Text>
                    <Text style={styles.groupCardMeta}>{g.member_count || 0} member{(g.member_count || 0) !== 1 ? 's' : ''}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {myGroups.length === 0 && (
          <Card style={styles.emptyCard}>
            <Users color="#333" size={36} />
            <Text style={styles.emptyTitle}>No Groups Yet</Text>
            <Text style={styles.emptyText}>Create a group to work out with friends</Text>
            <Button title="Create Group" onPress={() => setShowCreateGroup(true)} style={{ marginTop: 12, minWidth: 160 }} />
          </Card>
        )}

        {/* Discover Groups */}
        {discoverGroups.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Discover Groups</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.discoverScroller}>
              {discoverGroups.slice(0, 10).map((g: any) => (
                <TouchableOpacity key={g.id} activeOpacity={0.7} onPress={() => openGroupDetail(g.id)} style={styles.discoverCard}>
                  <View style={styles.discoverIconBox}><Users color="#4C91FF" size={22} /></View>
                  <Text style={styles.discoverName} numberOfLines={1}>{g.name}</Text>
                  <Text style={styles.discoverMeta}>{g.member_count || 0} members</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Activity Feed */}
        <View style={styles.section}>
          <View style={styles.feedSectionHeader}>
            <Text style={styles.sectionTitle}>Activity</Text>
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
              <TouchableOpacity style={styles.shareButton} onPress={openShareWorkout}>
                <Plus color="#4C91FF" size={16} />
                <Text style={styles.shareButtonText}>Post</Text>
              </TouchableOpacity>
            </View>
          </View>
          {filteredFeed.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>
                {feedFilter === 'friends'
                  ? 'No friend activity yet. Add friends or switch to All.'
                  : 'Follow people to see their activity, or share your own workout!'}
              </Text>
            </Card>
          ) : (
            filteredFeed.map((item: any) => renderFeedItem(item))
          )}
        </View>
      </ScrollView>

      {/* Preview Template Modal */}
      <Modal visible={!!previewTemplate} transparent animationType="slide" onRequestClose={() => setPreviewTemplate(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.previewModalContent}>
            {previewTemplate && (
              <>
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
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={showCreateGroup} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Group</Text>
              <TouchableOpacity onPress={() => setShowCreateGroup(false)}><X color="#999" size={24} /></TouchableOpacity>
            </View>
            <Input label="Group Name" placeholder="e.g. Morning Warriors" value={groupName} onChangeText={setGroupName} />
            <Input label="Description (optional)" placeholder="What's this group about?" value={groupDescription} onChangeText={setGroupDescription} multiline />
            <Button title="Create Group" onPress={handleCreateGroup} loading={creatingGroup} />
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

// ═══════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E1E1E' },
  loadingText: { color: '#FFFFFF', fontSize: 18 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 100 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { color: '#FFFFFF', fontSize: 32, fontWeight: '800' },
  subtitle: { color: '#8A8F9E', fontSize: 13, marginTop: 3, fontWeight: '600' },
  headerActions: { flexDirection: 'row', gap: 10 },
  headerBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#1E2A3A', alignItems: 'center', justifyContent: 'center' },
  headerBtnPrimary: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#4C91FF', alignItems: 'center', justifyContent: 'center' },
  heroCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2E3750',
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },
  heroMeta: { color: '#A4B0C6', fontSize: 13, marginTop: 4, fontWeight: '600' },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#101C32',
    borderWidth: 1,
    borderColor: '#2D4472',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroActionText: { color: '#9CC1FF', fontSize: 12, fontWeight: '700' },
  heroStats: { flexDirection: 'row', gap: 10 },
  heroStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#171A25',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  heroStatText: { color: '#D3D8E7', fontSize: 12, fontWeight: '700' },

  screenHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2A2A2A', alignItems: 'center', justifyContent: 'center' },
  screenTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },

  section: { marginBottom: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  sectionLabel: { color: '#CCC', fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 8 },

  userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1E1E1E' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#4C91FF', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  userRowInfo: { flex: 1 },
  userRowName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  userRowMeta: { color: '#999', fontSize: 13, marginTop: 2 },
  xpText: { color: '#4C91FF', fontSize: 16, fontWeight: '700' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2A2A2A', borderRadius: 12, paddingHorizontal: 14, marginBottom: 20 },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15, paddingVertical: 12, marginLeft: 10 },

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

  // Groups
  groupCard: { marginBottom: 10 },
  groupScroller: { gap: 10, paddingRight: 8 },
  groupPillCard: { width: 152, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#2D3547' },
  groupRow: { flexDirection: 'row', alignItems: 'center' },
  groupIconBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#1E2A3A', alignItems: 'center', justifyContent: 'center' },
  groupCardInfo: { flex: 1, marginLeft: 14 },
  groupCardName: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  groupCardMeta: { color: '#999', fontSize: 13, marginTop: 2 },

  discoverCard: { width: 140, backgroundColor: '#2A2A2A', borderRadius: 14, padding: 16, alignItems: 'center' },
  discoverScroller: { gap: 12 },
  discoverIconBox: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#1E2A3A', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  discoverName: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 4 },
  discoverMeta: { color: '#999', fontSize: 12 },

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
  tabBar: { flexDirection: 'row', backgroundColor: '#2A2A2A', borderRadius: 12, padding: 3, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabActive: { backgroundColor: '#4C91FF' },
  tabText: { color: '#999', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },

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
  feedSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  feedFilters: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  feedFilterChip: { backgroundColor: '#22262F', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  feedFilterChipActive: { backgroundColor: '#4C91FF' },
  feedFilterText: { color: '#A8AFC2', fontSize: 12, fontWeight: '700' },
  feedFilterTextActive: { color: '#FFFFFF' },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1E2A3A', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16 },
  shareButtonText: { color: '#4C91FF', fontSize: 13, fontWeight: '700' },
  feedCard: { marginBottom: 12, borderWidth: 1, borderColor: '#2A3042', backgroundColor: '#151821' },
  feedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  feedUserInfo: { flexDirection: 'row', alignItems: 'center' },
  feedUsername: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  feedTime: { color: '#999', fontSize: 12, marginTop: 1 },
  levelBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#101C32', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  levelBadgeText: { color: '#4C91FF', fontSize: 12, fontWeight: '700' },
  feedContent: { color: '#FFFFFF', fontSize: 14, lineHeight: 20, marginBottom: 10 },
  feedActions: { flexDirection: 'row', gap: 20 },
  actionButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: '#1C202A' },
  actionButtonLiked: { backgroundColor: '#3A1C26' },
  actionText: { color: '#999', fontSize: 14, fontWeight: '600' },
  actionTextLiked: { color: '#FF8CA0' },


  sharedTemplateCard: { backgroundColor: '#1A1A1A', marginBottom: 10, padding: 12 },
  sharedTemplateRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sharedTemplateName: { color: '#FFFFFF', fontSize: 15, fontWeight: '600', flex: 1 },

  // Template preview modal
  previewModalContent: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '80%' },
  previewIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  previewCreator: { color: '#999', fontSize: 13, marginBottom: 16, marginTop: -8 },
  previewSectionLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  previewExList: { maxHeight: 320, marginBottom: 20 },
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
  templateCardRow: { flexDirection: 'row', alignItems: 'center' },
  templateCardIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  templateCardInfo: { flex: 1 },
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
  templateScroll: { marginBottom: 20 },
  templateChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#2A2A2A', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 10 },
  templateChipText: { color: '#999', fontSize: 14, fontWeight: '600' },
  shareBtn: { marginTop: 8 },

  // Empty
  emptyCard: { alignItems: 'center', paddingVertical: 28, marginBottom: 24 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 10 },
  emptyText: { color: '#999', fontSize: 14, textAlign: 'center', marginTop: 4 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1E1E1E', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 48 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '700' },
});
