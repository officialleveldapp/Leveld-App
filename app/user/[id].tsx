import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  InteractionManager,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  UserPlus,
  UserCheck,
  Flame,
  TrendingUp,
  Award,
  Crown,
  Users,
  Dumbbell,
  Copy,
  UserPlus2,
  X,
} from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { usePaywall } from '@/contexts/PaywallContext';
import {
  apiGetUserProfile,
  apiToggleFollow,
  apiCloneTemplate,
  apiGetGroups,
  apiCreateGroupInvite,
} from '@/lib/api';
import type { UserPublicProfile } from '@/types/database';

export default function UserProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, refreshProfile } = useAuth();
  const showPaywall = usePaywall();
  const params = useLocalSearchParams<{ id: string }>();
  const userId = params.id;

  const [user, setUser] = useState<UserPublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [tab, setTab] = useState<'workouts' | 'activity'>('workouts');

  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [copying, setCopying] = useState(false);

  const [inviteVisible, setInviteVisible] = useState(false);
  const [myGroups, setMyGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [invitingGroupId, setInvitingGroupId] = useState<string | null>(null);

  const isSelf = profile?.id != null && String(profile.id) === String(userId);

  const load = useCallback(async () => {
    if (userId == null) return;
    try {
      const { data } = await apiGetUserProfile(userId);
      if (data) setUser(data as UserPublicProfile);
    } catch {
      Alert.alert('Error', 'Failed to load profile.');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/groups');
  };

  const reloadUser = async () => {
    try {
      const { data } = await apiGetUserProfile(userId);
      if (data) setUser(data as UserPublicProfile);
    } catch {
      /* ignore */
    }
  };

  const doToggleFollow = async () => {
    if (!user) return;
    setFollowLoading(true);
    try {
      await apiToggleFollow(Number(user.id));
      await reloadUser();
    } catch {
      Alert.alert('Error', 'Could not update. Please try again.');
    } finally {
      setFollowLoading(false);
    }
  };

  const onRelationshipPress = () => {
    if (!user) return;
    if (user.is_friend) {
      Alert.alert(
        'Unfriend?',
        `You and @${user.username} will no longer be friends. You can follow again anytime.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unfriend', style: 'destructive', onPress: () => void doToggleFollow() },
        ],
      );
    } else if (user.is_following) {
      Alert.alert('Unfollow?', `Stop following @${user.username}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Unfollow', style: 'destructive', onPress: () => void doToggleFollow() },
      ]);
    } else {
      void doToggleFollow();
    }
  };

  const openInvite = async () => {
    setInviteVisible(true);
    setGroupsLoading(true);
    try {
      const { data } = await apiGetGroups();
      setMyGroups(data?.my_groups ?? (Array.isArray(data) ? data : []));
    } catch {
      setMyGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const inviteToGroup = async (groupId: string, groupName: string) => {
    if (!user) return;
    setInvitingGroupId(groupId);
    try {
      const { error } = await apiCreateGroupInvite(groupId, Number(user.id));
      if (error) {
        const err = error as { detail?: string };
        Alert.alert('Could not invite', err?.detail || 'Please try again.');
        return;
      }
      setInviteVisible(false);
      Alert.alert('Invite sent', `@${user.username} was invited to ${groupName}.`);
    } catch {
      Alert.alert('Error', 'Could not send invite. Please try again.');
    } finally {
      setInvitingGroupId(null);
    }
  };

  const handleCloneTemplate = async (templateId: string) => {
    setCopying(true);
    try {
      const { error } = await apiCloneTemplate(templateId);
      if (error) {
        const err = error as { code?: string; detail?: string };
        if (err?.code === 'template_limit') {
          setPreviewTemplate(null);
          InteractionManager.runAfterInteractions(() => {
            setTimeout(
              () => {
                showPaywall(() => {
                  void handleCloneTemplate(templateId);
                });
              },
              Platform.OS === 'ios' ? 400 : 0,
            );
          });
          return;
        }
        Alert.alert('Error', err.detail || 'Failed to copy.');
        return;
      }
      setPreviewTemplate(null);
      Alert.alert('Copied', 'Workout added to your templates.');
    } catch {
      Alert.alert('Error', 'Failed to copy.');
    } finally {
      setCopying(false);
    }
  };

  const getInitial = (name?: string) => (name?.[0] ? name[0].toUpperCase() : '?');

  if (loading) {
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#4C91FF" />
        </View>
      </LinearGradient>
    );
  }

  if (!user) {
    return (
      <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
            <ChevronLeft color="#FFFFFF" size={26} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.muted}>This profile is unavailable.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft color="#FFFFFF" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {user.username}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitial(user.username)}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>{user.level}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{user.total_workouts || 0}</Text>
              <Text style={styles.statLabel}>Workouts</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{user.friends_count || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNum}>{user.followers_count || 0}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
          </View>

          {!isSelf && (
            <View style={styles.actionRow}>
              {user.is_friend ? (
                <TouchableOpacity
                  style={[styles.relBtn, styles.friendsBtn]}
                  onPress={onRelationshipPress}
                  disabled={followLoading}
                >
                  <UserCheck color="#51CF66" size={16} />
                  <Text style={styles.friendsBtnText}>{followLoading ? '...' : 'Friends'}</Text>
                </TouchableOpacity>
              ) : user.is_following ? (
                <TouchableOpacity
                  style={[styles.relBtn, styles.followingBtn]}
                  onPress={onRelationshipPress}
                  disabled={followLoading}
                >
                  <Text style={styles.followingBtnText}>
                    {followLoading ? '...' : 'Following'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.relBtn, styles.followBtn]}
                  onPress={onRelationshipPress}
                  disabled={followLoading}
                >
                  <UserPlus color="#FFFFFF" size={16} />
                  <Text style={styles.followBtnText}>{followLoading ? '...' : 'Follow'}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.relBtn, styles.inviteBtn]}
                onPress={openInvite}
                activeOpacity={0.85}
              >
                <UserPlus2 color="#7FB1FF" size={16} />
                <Text style={styles.inviteBtnText}>Invite to group</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {(user.goal || user.experience_level) && (
          <View style={styles.bioSection}>
            {user.goal ? <Text style={styles.bioGoal}>{user.goal}</Text> : null}
            {user.experience_level ? (
              <View style={styles.bioExpBadge}>
                <Text style={styles.bioExpText}>{user.experience_level}</Text>
              </View>
            ) : null}
          </View>
        )}

        <View style={styles.infoRow}>
          <View style={styles.infoChip}>
            <Flame color="#FF922B" size={14} />
            <Text style={styles.infoChipText}>{user.current_streak || 0} day streak</Text>
          </View>
          <View style={styles.infoChip}>
            <TrendingUp color="#4C91FF" size={14} />
            <Text style={styles.infoChipText}>{user.xp || 0} XP</Text>
          </View>
        </View>

        {user.badges && user.badges.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Badges</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10 }}
            >
              {user.badges.map((ub: any) => (
                <View key={ub.id} style={styles.badgeChip}>
                  <Award color="#FFB547" size={18} />
                  <Text style={styles.badgeChipName}>{ub.badge?.name || 'Badge'}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.tabBar}>
          {(['workouts', 'activity'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tab, tab === t && styles.tabActive]}
              onPress={() => setTab(t)}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'workouts' ? 'Workouts' : 'Activity'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'workouts' &&
          (user.can_view_shared_templates === false ? (
            <View style={styles.gateCard}>
              <Crown color="#FFB547" size={36} />
              <Text style={styles.gateTitle}>Workouts are for Leveld Pro</Text>
              <Text style={styles.gateText}>
                Subscribe to browse and copy this member&apos;s shared workouts.
              </Text>
              <TouchableOpacity
                style={styles.gateBtn}
                onPress={() => showPaywall(async () => {
                  await refreshProfile();
                  await reloadUser();
                })}
                activeOpacity={0.85}
              >
                <Text style={styles.gateBtnText}>Unlock with Pro</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.section}>
              {(!user.templates || user.templates.length === 0) && (
                <Text style={styles.emptyText}>No workouts shared yet</Text>
              )}
              {(user.templates || []).map((t: any) => (
                <View key={t.id} style={styles.templateCard}>
                  <TouchableOpacity
                    style={styles.templateTap}
                    onPress={() => setPreviewTemplate(t)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.templateIcon,
                        { backgroundColor: (t.color || '#4C91FF') + '20' },
                      ]}
                    >
                      <Dumbbell color={t.color || '#4C91FF'} size={20} />
                    </View>
                    <View style={styles.templateInfo}>
                      <Text style={styles.templateName} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={styles.templateMeta}>
                        {t.exercise_count} exercise{t.exercise_count !== 1 ? 's' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.copyChip}
                    onPress={() => setPreviewTemplate(t)}
                    activeOpacity={0.85}
                  >
                    <Copy color="#7FB1FF" size={14} />
                    <Text style={styles.copyChipText}>Copy</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}

        {tab === 'activity' &&
          (user.can_view_activity === false ? (
            <View style={styles.gateCard}>
              <Users color="#4C91FF" size={36} />
              <Text style={styles.gateTitle}>Friends only</Text>
              <Text style={styles.gateText}>
                Recent activity is only visible when you and this member follow each other.
              </Text>
            </View>
          ) : (
            <View style={styles.section}>
              {(!user.recent_workouts || user.recent_workouts.length === 0) && (
                <Text style={styles.emptyText}>No recent activity</Text>
              )}
              {(user.recent_workouts || []).slice(0, 8).map((w: any) => (
                <View key={w.id} style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <Text style={styles.workoutDate}>
                      {new Date(w.workout_date).toLocaleDateString()}
                    </Text>
                    <View style={styles.xpBadge}>
                      <Text style={styles.xpBadgeText}>+{w.xp_earned} XP</Text>
                    </View>
                  </View>
                  <Text style={styles.workoutStats}>
                    {w.total_sets} sets · {w.total_reps} reps · {w.duration_minutes} min
                  </Text>
                  {w.notes ? <Text style={styles.workoutNotes}>{w.notes}</Text> : null}
                </View>
              ))}
            </View>
          ))}
      </ScrollView>

      {/* Invite to group modal */}
      <Modal
        visible={inviteVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setInviteVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Invite @{user.username}</Text>
              <TouchableOpacity onPress={() => setInviteVisible(false)} hitSlop={10}>
                <X color="#94A3B8" size={22} />
              </TouchableOpacity>
            </View>
            {!user.is_friend && (
              <Text style={styles.sheetHint}>
                You can invite people to groups once you&apos;re friends (you both follow each
                other).
              </Text>
            )}
            {groupsLoading ? (
              <ActivityIndicator color="#4C91FF" style={{ marginVertical: 24 }} />
            ) : myGroups.length === 0 ? (
              <Text style={styles.muted}>
                You&apos;re not in any groups yet. Create one to invite friends.
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 360 }}>
                {myGroups.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={styles.groupRow}
                    onPress={() => inviteToGroup(g.id, g.name)}
                    disabled={invitingGroupId === g.id}
                    activeOpacity={0.8}
                  >
                    <View style={styles.groupIcon}>
                      <Users color="#4C91FF" size={18} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.groupName} numberOfLines={1}>
                        {g.name}
                      </Text>
                      <Text style={styles.groupMeta}>
                        {g.member_count ?? 0} member{g.member_count === 1 ? '' : 's'}
                      </Text>
                    </View>
                    {invitingGroupId === g.id ? (
                      <ActivityIndicator color="#4C91FF" size="small" />
                    ) : (
                      <Text style={styles.groupInviteText}>Invite</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Template preview modal */}
      <Modal
        visible={!!previewTemplate}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewTemplate(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewCard}>
            {previewTemplate && (
              <>
                <View style={styles.previewHeader}>
                  <View
                    style={[
                      styles.previewIcon,
                      { backgroundColor: (previewTemplate.color || '#4C91FF') + '20' },
                    ]}
                  >
                    <Dumbbell color={previewTemplate.color || '#4C91FF'} size={24} />
                  </View>
                  <Text style={styles.previewTitle} numberOfLines={1}>
                    {previewTemplate.name}
                  </Text>
                  <TouchableOpacity onPress={() => setPreviewTemplate(null)} hitSlop={10}>
                    <X color="#94A3B8" size={22} />
                  </TouchableOpacity>
                </View>
                <Text style={styles.previewLabel}>
                  {previewTemplate.exercises?.length || previewTemplate.exercise_count || 0}{' '}
                  Exercises
                </Text>
                <ScrollView style={{ maxHeight: 280 }}>
                  {(previewTemplate.exercises || []).map((ex: any, idx: number) => (
                    <View key={idx} style={styles.previewExerciseRow}>
                      <Text style={styles.previewExerciseName}>{ex.name}</Text>
                      <Text style={styles.previewExerciseMeta}>
                        {ex.default_sets} × {ex.default_reps}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
                <TouchableOpacity
                  style={[styles.copyBtn, copying && { opacity: 0.6 }]}
                  onPress={() => handleCloneTemplate(previewTemplate.id)}
                  disabled={copying}
                >
                  <Copy color="#FFFFFF" size={16} />
                  <Text style={styles.copyBtnText}>{copying ? 'Copying...' : 'Copy to my workouts'}</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
  muted: { color: '#64748B', fontSize: 14, textAlign: 'center' },
  profileHeader: { alignItems: 'center', paddingTop: 8 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#1E1E1E',
    borderWidth: 2,
    borderColor: '#4C91FF',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  levelBadgeText: { color: '#4C91FF', fontSize: 12, fontWeight: '800' },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignSelf: 'stretch',
    marginBottom: 16,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNum: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  statLabel: { color: '#999999', fontSize: 11, fontWeight: '600', marginTop: 2 },
  statDivider: { width: 1, alignSelf: 'stretch', backgroundColor: '#2B2B2B', marginVertical: 4 },
  actionRow: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  relBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  followBtn: { backgroundColor: '#4C91FF' },
  followBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  followingBtn: { backgroundColor: '#252525', borderWidth: 1, borderColor: '#3F3F3F' },
  followingBtnText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  friendsBtn: { backgroundColor: '#0D2818', borderWidth: 1, borderColor: '#1A5C2E' },
  friendsBtnText: { color: '#51CF66', fontSize: 14, fontWeight: '800' },
  inviteBtn: { backgroundColor: 'rgba(76, 145, 255, 0.12)', borderWidth: 1, borderColor: '#2F4A6B' },
  inviteBtnText: { color: '#7FB1FF', fontSize: 14, fontWeight: '800' },
  bioSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 20,
  },
  bioGoal: { color: '#E2E8F0', fontSize: 15, fontWeight: '600' },
  bioExpBadge: {
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  bioExpText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  infoRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  infoChipText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  section: { marginTop: 24 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  badgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  badgeChipName: { color: '#E2E8F0', fontSize: 13, fontWeight: '600' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 4,
    gap: 4,
    marginTop: 24,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#4C91FF' },
  tabText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: '#FFFFFF' },
  emptyText: { color: '#64748B', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
  gateCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 24,
    alignItems: 'center',
    marginTop: 24,
  },
  gateTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', marginTop: 12 },
  gateText: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 6,
  },
  gateBtn: {
    backgroundColor: '#4C91FF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 28,
    marginTop: 16,
  },
  gateBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  templateTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  templateIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateInfo: { flex: 1, minWidth: 0 },
  templateName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  templateMeta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  copyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  copyChipText: { color: '#7FB1FF', fontSize: 13, fontWeight: '700' },
  workoutCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 14,
    marginBottom: 8,
  },
  workoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  workoutDate: { color: '#E2E8F0', fontSize: 13, fontWeight: '700' },
  xpBadge: {
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  xpBadgeText: { color: '#7FB1FF', fontSize: 12, fontWeight: '700' },
  workoutStats: { color: '#94A3B8', fontSize: 13 },
  workoutNotes: { color: '#64748B', fontSize: 13, marginTop: 6, fontStyle: 'italic' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#161616',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#2A2A2A',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sheetTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', flex: 1, minWidth: 0 },
  sheetHint: { color: '#FFB547', fontSize: 13, lineHeight: 18, marginBottom: 12 },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginBottom: 8,
  },
  groupIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  groupMeta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  groupInviteText: { color: '#4C91FF', fontSize: 14, fontWeight: '800' },
  previewCard: {
    backgroundColor: '#161616',
    margin: 20,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignSelf: 'center',
    width: '90%',
  },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', flex: 1, minWidth: 0 },
  previewLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '700', marginBottom: 8 },
  previewExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  previewExerciseName: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', flex: 1 },
  previewExerciseMeta: { color: '#64748B', fontSize: 13 },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4C91FF',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  copyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
