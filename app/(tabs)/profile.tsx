import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Alert,
  Linking,
} from 'react-native';
import { legalUrl } from '@/lib/legalUrls';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import {
  useRevenueCat,
  isRevenueCatConfiguredForBuild,
} from '@/contexts/RevenueCatContext';
import { getPurchasesErrorMessage } from '@/lib/revenuecat/purchasesError';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { useCloseModalsWhenPaywallOpens, usePaywall } from '@/contexts/PaywallContext';
import { SubscriptionManagementModal } from '@/components/SubscriptionManagementModal';
import { StreakDisplay } from '@/components/StreakDisplay';
import { BadgeItem } from '@/components/BadgeItem';
import {
  apiGetBadges,
  apiGetUserBadges,
  apiGetFollowers,
  apiGetFollowing,
  apiGetFriends,
  apiGetExerciseLifetimeStats,
} from '@/lib/api';
import { Badge, UserBadge } from '@/types/database';
import {
  Trophy,
  Flame,
  Target,
  Settings,
  Award,
  TrendingUp,
  Trash2,
  AlertTriangle,
  Crown,
  Users,
  ChevronRight,
  Dumbbell,
  Bell,
} from 'lucide-react-native';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, user, loading, signOut, deleteAccount, refreshProfile } = useAuth();
  const rc = useRevenueCat();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [rcBusy, setRcBusy] = useState(false);
  const showPaywall = usePaywall();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const closeAllProfileModals = useCallback(() => {
    setShowSignOutModal(false);
    setShowDeleteModal(false);
    setShowSubscriptionModal(false);
  }, []);

  useCloseModalsWhenPaywallOpens(closeAllProfileModals);

  const [exerciseTotalsPreview, setExerciseTotalsPreview] = useState<{
    exerciseCount: number;
    totalReps: number;
  } | null>(null);

  const loadExerciseTotalsPreview = useCallback(async () => {
    try {
      const { data } = await apiGetExerciseLifetimeStats();
      const list = data?.exercises ?? [];
      const totalReps = list.reduce((acc, r) => acc + r.total_reps, 0);
      setExerciseTotalsPreview({ exerciseCount: list.length, totalReps });
    } catch {
      setExerciseTotalsPreview(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBadges();
      loadFollowCounts();
      refreshProfile();
      void loadExerciseTotalsPreview();
    }, [loadExerciseTotalsPreview]),
  );

  const loadBadges = async () => {
    if (!profile) return;

    try {
      const { data: badgesData } = await apiGetBadges();
      const { data: userBadgesData } = await apiGetUserBadges();

      if (badgesData) setBadges(badgesData);
      if (userBadgesData) setUserBadges(userBadgesData);
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const loadFollowCounts = async () => {
    if (!profile?.id) return;
    try {
      const [{ data: followers }, { data: following }, { data: friends }] = await Promise.all([
        apiGetFollowers(profile.id),
        apiGetFollowing(profile.id),
        apiGetFriends(),
      ]);
      setFollowersCount(followers?.length ?? 0);
      setFollowingCount(following?.length ?? 0);
      setFriendsCount(friends?.length ?? 0);
    } catch {}
  };

  const confirmSignOut = async () => {
    setShowSignOutModal(false);
    await signOut();
  };

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setShowDeleteModal(false);
    } catch (e) {
      console.error('Delete account failed:', e);
      setShowDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (!loading && !user) {
    return <View style={{ flex: 1, backgroundColor: '#1E1E1E' }} />;
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.subtitle}>Your progress at a glance</Text>
          </View>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/edit-profile')}
            hitSlop={8}
          >
            <Settings color="#999999" size={24} />
          </TouchableOpacity>
        </View>

        <Card style={styles.profileCard}>
          <View style={styles.profileTopRow}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {profile.username[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>Lvl {profile.level}</Text>
              </View>
            </View>
            <View style={styles.profileIdentity}>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.xpText}>{profile.xp} XP</Text>
              <View style={styles.goalContainer}>
                <Target color="#4C91FF" size={14} />
                <Text style={styles.goalText} numberOfLines={1}>
                  {profile.goal}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.compactMetricsRow}>
            <TouchableOpacity
              style={styles.compactMetric}
              onPress={() => router.push('/friends?tab=friends')}
              activeOpacity={0.7}
            >
              <Text style={styles.compactMetricValue}>{friendsCount}</Text>
              <Text style={styles.compactMetricLabel}>Friends</Text>
            </TouchableOpacity>
            <View style={styles.compactMetricDivider} />
            <TouchableOpacity
              style={styles.compactMetric}
              onPress={() => router.push('/friends?tab=followers')}
              activeOpacity={0.7}
            >
              <Text style={styles.compactMetricValue}>{followersCount}</Text>
              <Text style={styles.compactMetricLabel}>Followers</Text>
            </TouchableOpacity>
            <View style={styles.compactMetricDivider} />
            <TouchableOpacity
              style={styles.compactMetric}
              onPress={() => router.push('/friends?tab=following')}
              activeOpacity={0.7}
            >
              <Text style={styles.compactMetricValue}>{followingCount}</Text>
              <Text style={styles.compactMetricLabel}>Following</Text>
            </TouchableOpacity>
            <View style={styles.compactMetricDivider} />
            <View style={styles.compactMetric}>
              <Text style={styles.compactMetricValue}>{profile.total_workouts}</Text>
              <Text style={styles.compactMetricLabel}>Workouts</Text>
            </View>
            <View style={styles.compactMetricDivider} />
            <View style={styles.compactMetric}>
              <Text style={styles.compactMetricValue}>{profile.longest_streak}</Text>
              <Text style={styles.compactMetricLabel}>Best Streak</Text>
            </View>
          </View>
        </Card>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/friends')}
          accessibilityRole="button"
          accessibilityLabel="Friends and people on Leveld"
        >
          <Card style={styles.friendsCtaCard}>
            <View style={styles.friendsCtaIcon}>
              <Users color="#4C91FF" size={22} />
            </View>
            <View style={styles.friendsCtaMid}>
              <Text style={styles.friendsCtaTitle}>Friends on Leveld</Text>
              <Text style={styles.friendsCtaSub}>
                {friendsCount === 0
                  ? 'Search by username and add friends for groups & social'
                  : `${friendsCount} friend${friendsCount === 1 ? '' : 's'} · find more people`}
              </Text>
            </View>
            <ChevronRight color="#64748B" size={22} />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/exercise-stats')}
          accessibilityRole="button"
          accessibilityLabel="View lifetime exercise totals"
        >
          <Card style={styles.exerciseTotalsCtaCard}>
            <View style={styles.exerciseTotalsIcon}>
              <Dumbbell color="#4C91FF" size={22} />
            </View>
            <View style={styles.exerciseTotalsMid}>
              <Text style={styles.exerciseTotalsTitle}>Exercise totals</Text>
              <Text style={styles.exerciseTotalsSub}>
                {exerciseTotalsPreview === null
                  ? 'Lifetime reps per exercise from every logged workout'
                  : exerciseTotalsPreview.exerciseCount === 0
                    ? 'Log workouts on Track to build your stats'
                    : `${exerciseTotalsPreview.exerciseCount} exercise${
                        exerciseTotalsPreview.exerciseCount === 1 ? '' : 's'
                      } · ${exerciseTotalsPreview.totalReps.toLocaleString()} total reps`}
              </Text>
            </View>
            <ChevronRight color="#64748B" size={22} />
          </Card>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => router.push('/notification-settings')}
          accessibilityRole="button"
          accessibilityLabel="Notification settings"
        >
          <Card style={styles.exerciseTotalsCtaCard}>
            <View style={styles.exerciseTotalsIcon}>
              <Bell color="#4C91FF" size={22} />
            </View>
            <View style={styles.exerciseTotalsMid}>
              <Text style={styles.exerciseTotalsTitle}>Notifications</Text>
              <Text style={styles.exerciseTotalsSub}>
                Choose which daily reminders you get, their times, and the vibe
              </Text>
            </View>
            <ChevronRight color="#64748B" size={22} />
          </Card>
        </TouchableOpacity>

        <Card style={styles.snapshotCard}>
          <View style={styles.snapshotHeader}>
            <Text style={styles.cardTitle}>Momentum Snapshot</Text>
          </View>
          <View style={styles.snapshotBody}>
            <View style={styles.snapshotStreak}>
              <Text style={styles.snapshotCaption}>Current Streak</Text>
              <StreakDisplay streak={profile.current_streak} size="large" />
            </View>
            <View style={styles.snapshotDivider} />
            <View style={styles.snapshotRecords}>
              <View style={styles.recordItem}>
                <View style={styles.recordIcon}>
                  <TrendingUp color="#4C91FF" size={18} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordLabel}>Highest Level</Text>
                  <Text style={styles.recordValue}>Level {profile.level}</Text>
                </View>
              </View>
              <View style={styles.recordItem}>
                <View style={styles.recordIcon}>
                  <Award color="#FFB547" size={18} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordLabel}>Badges Earned</Text>
                  <Text style={styles.recordValue}>
                    {userBadges.length} / {badges.length}
                  </Text>
                </View>
              </View>
              <View style={styles.recordItem}>
                <View style={styles.recordIcon}>
                  <Trophy color="#4C91FF" size={18} />
                </View>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordLabel}>Total XP</Text>
                  <Text style={styles.recordValue}>{profile.xp}</Text>
                </View>
              </View>
            </View>
          </View>
        </Card>

        <View style={styles.badgesSection}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          <View style={styles.badgesGrid}>
            {badges.map((badge) => {
              const earned = userBadges.some((ub) => ub.badge_id === badge.id);
              return <BadgeItem key={badge.id} badge={badge} earned={earned} />;
            })}
          </View>
        </View>

        <Card style={styles.settingsCard}>
          <View style={styles.rcHeaderRow}>
            <Crown color="#FFB547" size={20} />
            <Text style={[styles.cardTitle, styles.rcCardTitle]}>Leveld Pro</Text>
          </View>
          <Text style={styles.rcStatus}>
            {isRevenueCatConfiguredForBuild()
              ? rc.isEffectivelyPro
                ? 'Active — thanks for supporting Leveld.'
                : rc.isReady
                  ? 'Not subscribed (store or backend).'
                  : 'Loading subscription status…'
              : 'Add EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY and use a dev build for live purchases.'}
          </Text>
          {isRevenueCatConfiguredForBuild() ? (
            <>
              <Button
                title={rc.isEffectivelyPro ? 'Manage subscription' : 'View plans'}
                onPress={() => {
                  if (!rc.isEffectivelyPro) {
                    showPaywall();
                    return;
                  }
                  setShowSubscriptionModal(true);
                }}
                loading={rcBusy}
                style={styles.rcButton}
              />
              <Button
                title="Restore purchases"
                variant="outline"
                onPress={async () => {
                  setRcBusy(true);
                  try {
                    await rc.restorePurchases();
                    Alert.alert(
                      'Restore',
                      rc.hasLeveldProEntitlement
                        ? 'Purchases restored.'
                        : 'No active subscription found for this Apple ID.',
                    );
                  } catch (e) {
                    Alert.alert('Restore', getPurchasesErrorMessage(e));
                  } finally {
                    setRcBusy(false);
                  }
                }}
                disabled={rcBusy}
                style={styles.rcButton}
              />
            </>
          ) : null}
        </Card>

        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.quickActionPill}
              onPress={() => router.push('/edit-profile')}
              activeOpacity={0.8}
            >
              <Text style={styles.quickActionText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionPill}
              onPress={() => void Linking.openURL(legalUrl('privacy'))}
              activeOpacity={0.8}
            >
              <Text style={styles.quickActionText}>Privacy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.quickActionPill}
              onPress={() => void Linking.openURL(legalUrl('terms'))}
              activeOpacity={0.8}
            >
              <Text style={styles.quickActionText}>Terms</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.signOutButton}
          onPress={() => setShowSignOutModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={() => setShowDeleteModal(true)}
          activeOpacity={0.7}
        >
          <Trash2 color="#FF4C4C" size={18} />
          <Text style={styles.deleteAccountText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showSignOutModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sign Out</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to sign out?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSignOutModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={confirmSignOut}
                activeOpacity={0.7}
              >
                <Text style={styles.modalConfirmText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.deleteIconCircle}>
              <AlertTriangle color="#FF4C4C" size={32} />
            </View>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <Text style={styles.modalMessage}>
              This will permanently delete your account and all your data — workouts, templates, personal records, and feed posts. This action cannot be undone.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
                disabled={deleting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={confirmDeleteAccount}
                activeOpacity={0.7}
                disabled={deleting}
              >
                <Text style={styles.modalConfirmText}>
                  {deleting ? 'Deleting...' : 'Delete Forever'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SubscriptionManagementModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 96,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: '#999999',
    fontSize: 13,
    marginTop: 2,
  },
  settingsButton: {
    padding: 8,
  },
  profileCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    marginBottom: 28,
  },
  friendsCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  friendsCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendsCtaMid: { flex: 1, minWidth: 0 },
  friendsCtaTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  friendsCtaSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  exerciseTotalsCtaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 12,
  },
  exerciseTotalsIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseTotalsMid: { flex: 1, minWidth: 0 },
  exerciseTotalsTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  exerciseTotalsSub: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
  },
  profileTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    backgroundColor: '#FFB547',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelBadgeText: {
    color: '#1E1E1E',
    fontSize: 11,
    fontWeight: '800',
  },
  profileIdentity: {
    flex: 1,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '800',
    marginBottom: 2,
  },
  xpText: {
    color: '#4C91FF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  goalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    alignSelf: 'flex-start',
    maxWidth: '95%',
  },
  goalText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  compactMetricsRow: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  compactMetric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactMetricValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 4,
  },
  compactMetricLabel: {
    color: '#999999',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  compactMetricDivider: {
    width: 1,
    alignSelf: 'stretch',
    backgroundColor: '#2B2B2B',
    marginVertical: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 0,
  },
  snapshotCard: {
    marginBottom: 28,
  },
  snapshotHeader: {
    marginBottom: 14,
  },
  snapshotBody: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  snapshotStreak: {
    width: '42%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 8,
  },
  snapshotCaption: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  snapshotDivider: {
    width: 1,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 8,
  },
  snapshotRecords: {
    flex: 1,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E1E1E',
  },
  recordIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recordInfo: {
    flex: 1,
  },
  recordLabel: {
    color: '#999999',
    fontSize: 14,
    fontWeight: '600',
  },
  recordValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  badgesSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  settingsCard: {
    marginBottom: 32,
  },
  rcCardTitle: {
    marginBottom: 0,
  },
  rcHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  rcStatus: {
    color: '#999999',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  rcButton: {
    marginBottom: 10,
  },
  quickActionsSection: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionPill: {
    width: '48%',
    backgroundColor: '#1E1E1E',
    borderColor: '#2B2B2B',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  signOutButton: {
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#FF4C4C',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  signOutText: {
    color: '#FF4C4C',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteAccountButton: {
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 76, 76, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 76, 76, 0.2)',
  },
  deleteAccountText: {
    color: '#FF4C4C',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 76, 76, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalDeleteBtn: {
    flex: 1,
    backgroundColor: '#CC0000',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#2A2A2A',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalMessage: {
    color: '#999999',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#3A3A3A',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  modalConfirmBtn: {
    flex: 1,
    backgroundColor: '#FF4C4C',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  modalConfirmText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
