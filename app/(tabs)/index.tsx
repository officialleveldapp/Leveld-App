import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@/contexts/AuthContext';
import { useCloseModalsWhenPaywallOpens } from '@/contexts/PaywallContext';
import { Card } from '@/components/Card';
import { XPBar } from '@/components/XPBar';
import { StreakDisplay } from '@/components/StreakDisplay';
import { BadgeItem } from '@/components/BadgeItem';
import { Button } from '@/components/Button';
import {
  apiGetBadges,
  apiGetDailyTips,
  apiGetUserBadges,
  apiBadgeSync,
  apiGetFeed,
  apiGetMyChallengeParticipations,
} from '@/lib/api';
import {
  getPendingChallengeCelebrations,
  clearPendingChallengeCelebrations,
  type ChallengeCelebrationPayload,
} from '@/lib/challengeCelebrationStorage';
import { ChallengeCompletedModal } from '@/components/ChallengeCompletedModal';
import { Badge, DailyTip, UserBadge } from '@/types/database';
import { AchievementUnlockedModal } from '@/components/AchievementUnlockedModal';
import { Trophy, Zap, ArrowRight, Heart, TrendingUp, Users } from 'lucide-react-native';
import { useRouter, useFocusEffect } from 'expo-router';

function pickTipForToday(tips: DailyTip[]): string | null {
  if (!tips.length) return null;
  const now = new Date();
  const dayIndex = Math.floor(
    (Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) -
      Date.UTC(now.getUTCFullYear(), 0, 0)) /
      86400000
  );
  return tips[dayIndex % tips.length]?.text || null;
}

function getRelativeTime(isoDate?: string) {
  if (!isoDate) return 'Just now';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  return new Date(isoDate).toLocaleDateString();
}

function labelForChallengeType(t: string): string {
  switch (t) {
    case 'total_workouts':
      return 'Workouts';
    case 'total_xp':
      return 'XP';
    case 'streak':
      return 'Streak';
    case 'total_reps':
      return 'Reps';
    default:
      return t;
  }
}

/** YYYY-MM-DD in local calendar (matches server date windows for challenge active range). */
function localCalendarDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Mirrors backend Challenge.is_active; falls back to date range if `is_active` is missing. */
function participationChallengeIsActive(p: { challenge?: { is_active?: boolean; start_date?: string; end_date?: string } }): boolean {
  const c = p.challenge;
  if (!c) return false;
  if (typeof c.is_active === 'boolean') return c.is_active;
  const start = c.start_date;
  const end = c.end_date;
  if (!start || !end) return false;
  const today = localCalendarDateString(new Date());
  return start <= today && today <= end;
}

/** Home carousel: show a few tiles; full list is in Groups. */
const HOME_CHALLENGES_PREVIEW_LIMIT = 5;

/** Home feed: keep the section short. */
const HOME_FEED_MAX_POSTS = 3;

export default function HomeScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyTip, setDailyTip] = useState<string | null>(null);
  const [recentFeed, setRecentFeed] = useState<any[]>([]);
  const [celebrationBadges, setCelebrationBadges] = useState<
    { id: string; name: string; description: string; icon: string; xp_reward: number }[]
  >([]);
  const [groupChallenges, setGroupChallenges] = useState<any[]>([]);
  const [inAnyGroup, setInAnyGroup] = useState(false);
  const [challengesSectionReady, setChallengesSectionReady] = useState(false);
  const [challengeCelebrationQueue, setChallengeCelebrationQueue] = useState<
    ChallengeCelebrationPayload[]
  >([]);

  const closeAllHomeModals = useCallback(() => {
    setCelebrationBadges([]);
    setChallengeCelebrationQueue([]);
  }, []);

  useCloseModalsWhenPaywallOpens(closeAllHomeModals);

  useEffect(() => {
    loadHomeData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshProfile();
      loadHomeData();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        const pending = await getPendingChallengeCelebrations();
        if (cancelled || !pending.length) return;
        await clearPendingChallengeCelebrations();
        setChallengeCelebrationQueue((q) => [...q, ...pending]);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const loadHomeData = async () => {
    try {
      const [
        { data: badgesData },
        { data: userBadgesData },
        { data: tipsData },
        { data: syncData },
        { data: feedData },
      ] = await Promise.all([
        apiGetBadges(),
        apiGetUserBadges(),
        apiGetDailyTips(),
        apiBadgeSync(),
        apiGetFeed(),
      ]);

      if (Array.isArray(badgesData)) setBadges(badgesData.slice(0, 6));
      if (userBadgesData) setUserBadges(userBadgesData);
      if (tipsData) {
        setDailyTip(pickTipForToday(tipsData as DailyTip[]));
      }
      if (Array.isArray(feedData)) {
        setRecentFeed(
          feedData.filter((p: any) => !p.group_id).slice(0, HOME_FEED_MAX_POSTS),
        );
      }

      const newlyEarned = syncData?.newly_earned_badges ?? [];
      if (newlyEarned.length > 0) {
        setCelebrationBadges(newlyEarned);
        const freshUserBadges = (await apiGetUserBadges()).data;
        if (freshUserBadges) setUserBadges(freshUserBadges);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    }

    try {
      const { data: challengeData, error: challengeError } =
        await apiGetMyChallengeParticipations();
      if (challengeError) {
        console.warn('[Home] Challenge participations:', challengeError);
      }
      if (challengeData) {
        setInAnyGroup(Boolean(challengeData.in_any_group));
        setGroupChallenges(challengeData.participations || []);
      }
    } catch (e) {
      console.warn('[Home] Challenge participations request failed:', e);
    } finally {
      setChallengesSectionReady(true);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), loadHomeData()]);
    setRefreshing(false);
  };

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const activeGroupChallenges = groupChallenges.filter(
    (p: any) => !p.completed && participationChallengeIsActive(p),
  );
  const completedGroupChallenges = groupChallenges.filter((p: any) => p.completed);
  const staleParticipations = groupChallenges.filter(
    (p: any) => !p.completed && p.challenge && !participationChallengeIsActive(p),
  );

  const previewActive = activeGroupChallenges.slice(0, HOME_CHALLENGES_PREVIEW_LIMIT);
  const previewCompleted = completedGroupChallenges.slice(0, HOME_CHALLENGES_PREVIEW_LIMIT);
  const previewStale = staleParticipations.slice(0, HOME_CHALLENGES_PREVIEW_LIMIT);
  const activeOverflow = Math.max(0, activeGroupChallenges.length - HOME_CHALLENGES_PREVIEW_LIMIT);
  const completedOverflow = Math.max(
    0,
    completedGroupChallenges.length - HOME_CHALLENGES_PREVIEW_LIMIT,
  );
  const staleOverflow = Math.max(0, staleParticipations.length - HOME_CHALLENGES_PREVIEW_LIMIT);

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.username}>{profile.username}</Text>
          </View>
          <TouchableOpacity
            style={styles.trackNowPill}
            onPress={() => router.push('/(tabs)/track')}
            activeOpacity={0.85}
          >
            <Text style={styles.trackNowText}>Track now</Text>
            <ArrowRight color="#FFFFFF" size={14} />
          </TouchableOpacity>
        </View>

        <Card style={styles.xpCard}>
          <View style={styles.xpTopRow}>
            <Text style={styles.xpTitle}>Level Progress</Text>
            <View style={styles.levelChip}>
              <Text style={styles.levelChipText}>Lvl {profile.level}</Text>
            </View>
          </View>
          <XPBar currentXP={profile.xp} level={profile.level} />
        </Card>

        <View style={styles.momentumRow}>
          <Card style={styles.streakCard}>
            <Text style={styles.cardEyebrow}>Momentum</Text>
            <StreakDisplay streak={profile.current_streak} size="small" />
            <View style={styles.streakDivider} />
            <View style={styles.streakSecondary}>
              <Trophy color="#999999" size={13} />
              <Text style={styles.streakSecondaryText}>
                {profile.total_workouts} {profile.total_workouts === 1 ? 'workout' : 'workouts'}
              </Text>
            </View>
          </Card>

          {dailyTip ? (
            <Card style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Zap color="#FFB547" size={18} fill="#FFB547" />
              </View>
              <Text style={styles.tipLabel}>Daily Tip</Text>
              <Text style={styles.tipText} numberOfLines={4}>
                {dailyTip}
              </Text>
            </Card>
          ) : (
            <Card style={styles.tipCard}>
              <View style={styles.tipIcon}>
                <Zap color="#4C91FF" size={18} />
              </View>
              <Text style={styles.tipLabel}>Quick Win</Text>
              <Text style={styles.tipText}>Complete one short workout to keep momentum today.</Text>
            </Card>
          )}
        </View>

        <View style={styles.badgesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <TouchableOpacity
              style={styles.seeAllRow}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.seeAll}>See All</Text>
              <ArrowRight color="#4C91FF" size={14} />
            </TouchableOpacity>
          </View>
          {badges.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesScroll}
            >
              {badges.map((badge) => {
                const earned = userBadges.some(
                  (ub) => String(ub.badge_id) === String(badge.id),
                );
                return (
                  <BadgeItem
                    key={badge.id}
                    badge={badge}
                    earned={earned}
                    onPress={
                      earned
                        ? () =>
                            setCelebrationBadges([
                              {
                                id: badge.id,
                                name: badge.name,
                                description: badge.description,
                                icon: badge.icon,
                                xp_reward: badge.xp_reward,
                              },
                            ])
                        : undefined
                    }
                  />
                );
              })}
            </ScrollView>
          ) : (
            <Card style={styles.badgesEmpty}>
              <Trophy color="#444444" size={28} />
              <Text style={styles.badgesEmptyText}>
                Complete workouts to unlock achievements
              </Text>
            </Card>
          )}
        </View>

        <View style={styles.challengesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Challenges</Text>
            <TouchableOpacity
              style={styles.seeAllRow}
              activeOpacity={0.75}
              onPress={() => router.push('/(tabs)/groups')}
            >
              <Text style={styles.seeAll}>Groups</Text>
              <ArrowRight color="#4C91FF" size={14} />
            </TouchableOpacity>
          </View>
          {!challengesSectionReady ? (
            <Card style={styles.groupChallengesCard}>
              <Text style={styles.gcEmptySub}>Loading challenges…</Text>
            </Card>
          ) : !inAnyGroup ? (
            <Card style={styles.groupChallengesCard}>
              <View style={styles.gcEmpty}>
                <Text style={styles.gcEmptyTitle}>Join a group to participate</Text>
                <Text style={styles.gcEmptySub}>
                  Ask a friend for a group invite link, then open it in Leveld to join.
                </Text>
                <Button
                  title="Open Groups"
                  onPress={() => router.push('/(tabs)/groups')}
                  style={styles.gcCta}
                />
              </View>
            </Card>
          ) : groupChallenges.length === 0 ? (
            <Card style={styles.groupChallengesCard}>
              <View style={styles.gcEmpty}>
                <Text style={styles.gcEmptyTitle}>No challenges yet</Text>
                <Text style={styles.gcEmptySub}>
                  Open a group, go to Challenges, and join one to see it here.
                </Text>
                <Button
                  title="Go to groups"
                  variant="outline"
                  onPress={() => router.push('/(tabs)/groups')}
                  style={styles.gcCta}
                />
              </View>
            </Card>
          ) : (
            <View style={styles.gcBody}>
              {previewActive.length > 0 ? (
                <View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.gcCarousel}
                  >
                    {previewActive.map((p: any) => {
                      const target = p.challenge?.target_value ?? 1;
                      const prog = Math.min(p.progress ?? 0, target);
                      const pct = Math.min(100, (prog / Math.max(1, target)) * 100);
                      return (
                        <Card key={p.id} style={styles.gcSlideCard}>
                          <View style={styles.gcSlideTop}>
                            <Text style={styles.gcChallengeName} numberOfLines={2}>
                              {p.challenge?.name}
                            </Text>
                            <View style={styles.gcGroupTag}>
                              <Users color="#7FB1FF" size={11} />
                              <Text style={styles.gcGroupTagText} numberOfLines={1}>
                                {p.group?.name}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.gcMeta}>
                            {labelForChallengeType(p.challenge?.challenge_type)} · Ends{' '}
                            {p.challenge?.end_date
                              ? new Date(p.challenge.end_date).toLocaleDateString()
                              : '—'}
                          </Text>
                          <View style={styles.gcBarOuter}>
                            <View style={[styles.gcBarInner, { width: `${pct}%` }]} />
                          </View>
                          <Text style={styles.gcProgressText}>
                            {prog} / {target}
                          </Text>
                        </Card>
                      );
                    })}
                  </ScrollView>
                  {activeOverflow > 0 ? (
                    <Text style={styles.gcMoreHint}>
                      +{activeOverflow} more in Groups
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {previewCompleted.length > 0 ? (
                <View style={styles.gcSubSection}>
                  <Text style={styles.gcCompletedHeading}>Completed challenges</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.gcCarousel}
                  >
                    {previewCompleted.map((p: any) => (
                      <Card key={p.id} style={styles.gcSlideCardMuted}>
                        <View style={styles.gcCompletedSlideInner}>
                          <Trophy color="#FFB547" size={18} />
                          <View style={{ flex: 1, minWidth: 0 }}>
                            <Text style={styles.gcCompletedName} numberOfLines={2}>
                              {p.challenge?.name}
                            </Text>
                            <Text style={styles.gcCompletedGroup} numberOfLines={1}>
                              {p.group?.name}
                            </Text>
                          </View>
                        </View>
                      </Card>
                    ))}
                  </ScrollView>
                  {completedOverflow > 0 ? (
                    <Text style={styles.gcMoreHint}>
                      +{completedOverflow} more in Groups
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {previewStale.length > 0 ? (
                <View style={styles.gcSubSection}>
                  <Text style={styles.gcStaleHeading}>Ended</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.gcCarousel}
                  >
                    {previewStale.map((p: any) => (
                      <Card key={p.id} style={styles.gcSlideCardMuted}>
                        <Text style={styles.gcStaleCardTitle} numberOfLines={2}>
                          {p.challenge?.name}
                        </Text>
                        <Text style={styles.gcStaleCardGroup} numberOfLines={1}>
                          {p.group?.name}
                        </Text>
                      </Card>
                    ))}
                  </ScrollView>
                  {staleOverflow > 0 ? (
                    <Text style={styles.gcMoreHint}>+{staleOverflow} more in Groups</Text>
                  ) : null}
                </View>
              ) : null}

              {activeGroupChallenges.length === 0 &&
              completedGroupChallenges.length === 0 &&
              staleParticipations.length === 0 ? (
                <Card style={styles.groupChallengesCard}>
                  <Text style={styles.gcEmptySub}>
                    None of your joined challenges are active right now, and you haven’t completed
                    one yet.
                  </Text>
                </Card>
              ) : null}
            </View>
          )}
        </View>

        {/* Your Feed */}
        <View style={styles.feedSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Feed</Text>
            <TouchableOpacity
              style={styles.seeAllRow}
              onPress={() => router.push('/(tabs)/groups')}
              activeOpacity={0.75}
            >
              <Text style={styles.seeAll}>See All</Text>
              <ArrowRight color="#4C91FF" size={14} />
            </TouchableOpacity>
          </View>
          {recentFeed.length > 0 ? (
            recentFeed.slice(0, HOME_FEED_MAX_POSTS).map((item: any) => (
              <Card key={item.id} style={styles.feedCard}>
                <View style={styles.feedCardHeader}>
                  <View style={styles.feedAvatar}>
                    <Text style={styles.feedAvatarText}>
                      {(item.user?.username || 'U')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.feedUsername}>{item.user?.username || 'User'}</Text>
                      {item.group && (
                        <View style={styles.feedGroupTag}>
                          <Users color="#7FB1FF" size={10} />
                          <Text style={styles.feedGroupTagText}>{item.group.name}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.feedTime}>{getRelativeTime(item.created_at)}</Text>
                  </View>
                  <View style={styles.feedLevelChip}>
                    <TrendingUp color="#4C91FF" size={10} />
                    <Text style={styles.feedLevelText}>Lvl {item.user?.level || 1}</Text>
                  </View>
                </View>
                <Text style={styles.feedContent} numberOfLines={2}>{item.content}</Text>
                <View style={styles.feedLikeRow}>
                  <Heart
                    size={14}
                    color={item.my_reaction === 'like' ? '#FF4D6D' : '#666'}
                    fill={item.my_reaction === 'like' ? '#FF4D6D' : 'transparent'}
                  />
                  <Text style={styles.feedLikeCount}>{item.likes_count || 0}</Text>
                </View>
              </Card>
            ))
          ) : (
            <Card style={styles.feedEmpty}>
              <Text style={styles.feedEmptyText}>Follow people to see their posts here</Text>
            </Card>
          )}
        </View>
      </ScrollView>

      {celebrationBadges.length > 0 && (
        <AchievementUnlockedModal
          badges={celebrationBadges}
          onDismiss={() => setCelebrationBadges([])}
        />
      )}

      <ChallengeCompletedModal
        visible={challengeCelebrationQueue.length > 0}
        item={challengeCelebrationQueue[0] ?? null}
        onDismiss={() =>
          setChallengeCelebrationQueue((q) => q.slice(1))
        }
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
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  greeting: {
    color: '#999999',
    fontSize: 16,
    fontWeight: '600',
  },
  username: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  trackNowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2B2B2B',
    borderWidth: 1,
    borderColor: '#383838',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  trackNowText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  xpCard: {
    marginBottom: 28,
  },
  xpTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  xpTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  levelChip: {
    backgroundColor: '#1E1E1E',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  levelChipText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  momentumRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 28,
  },
  streakCard: {
    width: '36%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  cardEyebrow: {
    color: '#999999',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  streakDivider: {
    width: 32,
    height: 1,
    backgroundColor: '#3A3A3A',
    marginTop: 10,
    marginBottom: 6,
  },
  streakSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  streakSecondaryText: {
    color: '#999999',
    fontSize: 11,
    fontWeight: '600',
  },
  tipCard: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  tipIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  tipLabel: {
    color: '#FFB547',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  tipText: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  challengesSection: {
    marginBottom: 32,
  },
  groupChallengesCard: {
    padding: 16,
  },
  gcBody: {
    gap: 20,
  },
  gcCarousel: {
    gap: 12,
    paddingRight: 20,
    paddingVertical: 4,
  },
  gcSlideCard: {
    width: 264,
  },
  gcSlideCardMuted: {
    width: 264,
    opacity: 0.92,
  },
  gcSlideTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  gcCompletedSlideInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gcSubSection: {
    gap: 10,
  },
  gcMoreHint: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    paddingLeft: 2,
  },
  gcStaleCardTitle: {
    color: '#AAAAAA',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  gcStaleCardGroup: {
    color: '#666666',
    fontSize: 12,
    fontWeight: '600',
  },
  gcEmpty: {
    gap: 8,
  },
  gcEmptyTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  gcEmptySub: {
    color: '#888888',
    fontSize: 13,
    lineHeight: 19,
  },
  gcCta: {
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  gcChallengeName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    minWidth: 0,
  },
  gcGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '42%',
  },
  gcGroupTagText: {
    color: '#8BB4FF',
    fontSize: 11,
    fontWeight: '600',
  },
  gcMeta: {
    color: '#666666',
    fontSize: 11,
    marginBottom: 8,
  },
  gcBarOuter: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2A2A2A',
    overflow: 'hidden',
  },
  gcBarInner: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: '#4C91FF',
  },
  gcProgressText: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
  gcCompletedHeading: {
    color: '#FFB547',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  gcCompletedName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  gcCompletedGroup: {
    color: '#777777',
    fontSize: 12,
    marginTop: 2,
  },
  gcStaleHeading: {
    color: '#666666',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgesSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    color: '#4C91FF',
    fontSize: 14,
    fontWeight: '600',
  },
  badgesScroll: {
    gap: 16,
    paddingRight: 20,
    minHeight: 100,
  },
  badgesEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  badgesEmptyText: {
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Feed
  feedSection: {
    marginBottom: 32,
  },
  seeAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedCard: {
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#2A3042',
    backgroundColor: '#151821',
  },
  feedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4C91FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  feedAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  feedUsername: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  feedGroupTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#1A2744',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2D4472',
  },
  feedGroupTagText: {
    color: '#7FB1FF',
    fontSize: 10,
    fontWeight: '600',
  },
  feedTime: {
    color: '#999',
    fontSize: 11,
    marginTop: 1,
  },
  feedLevelChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#101C32',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  feedLevelText: {
    color: '#4C91FF',
    fontSize: 10,
    fontWeight: '700',
  },
  feedContent: {
    color: '#FFFFFF',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 8,
  },
  feedLikeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedLikeCount: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
  },
  feedEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  feedEmptyText: {
    color: '#666',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
