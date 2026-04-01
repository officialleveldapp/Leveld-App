import React, { useEffect, useState } from 'react';
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
import { Card } from '@/components/Card';
import { XPBar } from '@/components/XPBar';
import { StreakDisplay } from '@/components/StreakDisplay';
import { BadgeItem } from '@/components/BadgeItem';
import { Button } from '@/components/Button';
import { apiGetBadges, apiGetDailyTips, apiGetUserBadges } from '@/lib/api';
import { Badge, DailyTip, UserBadge } from '@/types/database';
import { Trophy, Target, Zap, ArrowRight, Flame } from 'lucide-react-native';
import { useRouter } from 'expo-router';

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

export default function HomeScreen() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyTip, setDailyTip] = useState<string | null>(null);

  useEffect(() => {
    loadBadges();
  }, []);

  const loadBadges = async () => {
    try {
      const [
        { data: badgesData },
        { data: userBadgesData },
        { data: tipsData },
      ] = await Promise.all([
        apiGetBadges(),
        apiGetUserBadges(),
        apiGetDailyTips(),
      ]);

      if (badgesData) setBadges(badgesData.slice(0, 6));
      if (userBadgesData) setUserBadges(userBadgesData);
      if (tipsData) {
        setDailyTip(pickTipForToday(tipsData as DailyTip[]));
      }
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshProfile(), loadBadges()]);
    setRefreshing(false);
  };

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
          <View style={styles.compactStatsRow}>
            <View style={styles.compactStat}>
              <Flame color="#FFB547" size={16} fill="#FFB547" />
              <Text style={styles.compactStatValue}>{profile.current_streak}</Text>
              <Text style={styles.compactStatLabel}>Streak</Text>
            </View>
            <View style={styles.compactDivider} />
            <View style={styles.compactStat}>
              <Trophy color="#FFB547" size={16} />
              <Text style={styles.compactStatValue}>{profile.total_workouts}</Text>
              <Text style={styles.compactStatLabel}>Workouts</Text>
            </View>
            <View style={styles.compactDivider} />
            <View style={styles.compactStat}>
              <Zap color="#4C91FF" size={16} />
              <Text style={styles.compactStatValue}>{profile.xp}</Text>
              <Text style={styles.compactStatLabel}>XP</Text>
            </View>
          </View>
        </Card>

        <View style={styles.momentumRow}>
          <Card style={styles.streakCard}>
            <Text style={styles.cardEyebrow}>Momentum</Text>
            <StreakDisplay streak={profile.current_streak} size="small" />
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

        <Card style={styles.challengeCard}>
          <LinearGradient colors={['#4C91FF', '#2F6ED4']} style={styles.challengeGradient}>
            <View style={styles.challengeTop}>
              <View>
                <Text style={styles.challengeTitle}>Daily Challenge</Text>
                <Text style={styles.challengeText}>
                  Complete a workout to maintain your streak
                </Text>
              </View>
              <View style={styles.challengeIconCircle}>
                <Target color="#FFFFFF" size={22} />
              </View>
            </View>
            <Button
              title="Start Workout"
              variant="secondary"
              onPress={() => router.push('/(tabs)/track')}
              style={styles.challengeButton}
            />
          </LinearGradient>
        </Card>

        <View style={styles.badgesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <TouchableOpacity activeOpacity={0.75}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesScroll}
          >
            {badges.map((badge) => {
              const earned = userBadges.some((ub) => ub.badge_id === badge.id);
              return <BadgeItem key={badge.id} badge={badge} earned={earned} />;
            })}
          </ScrollView>
        </View>
      </ScrollView>
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
    marginBottom: 16,
    paddingBottom: 12,
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
  compactStatsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  compactStat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactStatValue: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 3,
  },
  compactStatLabel: {
    color: '#999999',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  compactDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 3,
    backgroundColor: '#2B2B2B',
  },
  momentumRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
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
  challengeCard: {
    marginBottom: 24,
    padding: 0,
    overflow: 'hidden',
  },
  challengeGradient: {
    padding: 18,
  },
  challengeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  challengeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  challengeText: {
    color: '#FFFFFF',
    fontSize: 13,
    marginTop: 6,
    marginBottom: 0,
    opacity: 0.9,
  },
  challengeButton: {
    minWidth: 160,
    alignSelf: 'flex-start',
  },
  badgesSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  },
});
