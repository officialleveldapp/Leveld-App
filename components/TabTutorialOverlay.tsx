import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, BarChart3, Plus, Users, User, Sparkles } from 'lucide-react-native';
import { hasSeenTabTutorial, markTabTutorialSeen } from '@/lib/tutorialStorage';

type StepIcon = typeof Home;

interface TutorialStep {
  /** 0-based index of the highlighted tab, or null for the centered welcome step. */
  tabIndex: number | null;
  icon: StepIcon;
  title: string;
  body: string;
}

const TAB_COUNT = 5;

const STEPS: TutorialStep[] = [
  {
    tabIndex: null,
    icon: Sparkles,
    title: 'Welcome to Leveld',
    body: "Here's a 30-second tour of the five tabs so you know where everything lives.",
  },
  {
    tabIndex: 0,
    icon: Home,
    title: 'Home',
    body: 'Your daily dashboard — streaks, momentum, and quick access to today’s workout.',
  },
  {
    tabIndex: 1,
    icon: BarChart3,
    title: 'Progress',
    body: 'See your stats, charts, and lifetime totals as you keep training.',
  },
  {
    tabIndex: 2,
    icon: Plus,
    title: 'Track',
    body: 'Start a session and log your sets and reps. This is where the work happens.',
  },
  {
    tabIndex: 3,
    icon: Users,
    title: 'Social',
    body: 'Join groups, add friends, and climb the leaderboard together.',
  },
  {
    tabIndex: 4,
    icon: User,
    title: 'Profile',
    body: 'Badges, streaks, notification settings, and your account live here.',
  },
];

export function TabTutorialOverlay() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const seen = await hasSeenTabTutorial();
      if (!cancelled && !seen) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const finish = () => {
    setVisible(false);
    void markTabTutorialSeen();
  };

  if (!visible) return null;

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const StepIconComp = step.icon;

  // Tab bar geometry — mirrors app/(tabs)/_layout.tsx tabBarStyle.
  const tabBarHeight = 58 + insets.bottom;
  const tabBarTop = screenHeight - tabBarHeight;
  const slotWidth = screenWidth / TAB_COUNT;

  const hasTarget = step.tabIndex != null;
  const ringSize = 64;
  const targetCenterX = hasTarget ? slotWidth * (step.tabIndex! + 0.5) : screenWidth / 2;
  // Icons sit near the top of the tab bar (paddingTop: 8, ~28px icon box).
  const targetCenterY = tabBarTop + 8 + 14;

  // Keep the card on-screen with a small horizontal margin.
  const cardWidth = Math.min(screenWidth - 32, 360);
  const pointerLeft = Math.max(
    24,
    Math.min(targetCenterX, screenWidth - 24),
  );

  return (
    <View style={styles.overlay} pointerEvents="auto">
      {/* Scrim */}
      <View style={styles.scrim} />

      {/* Spotlight ring around the active tab */}
      {hasTarget ? (
        <>
          <View
            style={[
              styles.ringGlow,
              {
                width: ringSize + 18,
                height: ringSize + 18,
                borderRadius: (ringSize + 18) / 2,
                left: targetCenterX - (ringSize + 18) / 2,
                top: targetCenterY - (ringSize + 18) / 2,
              },
            ]}
          />
          <View
            style={[
              styles.ring,
              {
                width: ringSize,
                height: ringSize,
                borderRadius: ringSize / 2,
                left: targetCenterX - ringSize / 2,
                top: targetCenterY - ringSize / 2,
              },
            ]}
          />
        </>
      ) : null}

      {/* Floating card */}
      {hasTarget ? (
        <View
          style={[
            styles.cardWrap,
            {
              width: cardWidth,
              left: (screenWidth - cardWidth) / 2,
              bottom: tabBarHeight + 28,
            },
          ]}
        >
          <Card
            step={step}
            stepIndex={stepIndex}
            isLast={isLast}
            StepIconComp={StepIconComp}
            onNext={() => (isLast ? finish() : setStepIndex((i) => i + 1))}
            onSkip={finish}
          />
          {/* Downward pointer toward the tab */}
          <View
            style={[
              styles.pointer,
              { left: pointerLeft - (screenWidth - cardWidth) / 2 - 9 },
            ]}
          />
        </View>
      ) : (
        <View
          style={[
            styles.cardWrapCentered,
            { width: cardWidth, left: (screenWidth - cardWidth) / 2 },
          ]}
        >
          <Card
            step={step}
            stepIndex={stepIndex}
            isLast={isLast}
            StepIconComp={StepIconComp}
            onNext={() => setStepIndex((i) => i + 1)}
            onSkip={finish}
          />
        </View>
      )}
    </View>
  );
}

function Card({
  step,
  stepIndex,
  isLast,
  StepIconComp,
  onNext,
  onSkip,
}: {
  step: TutorialStep;
  stepIndex: number;
  isLast: boolean;
  StepIconComp: StepIcon;
  onNext: () => void;
  onSkip: () => void;
}) {
  const isWelcome = step.tabIndex == null;
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardIcon}>
          <StepIconComp color="#4C91FF" size={20} />
        </View>
        <Text style={styles.cardTitle}>{step.title}</Text>
      </View>
      <Text style={styles.cardBody}>{step.body}</Text>

      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.actions}>
        {!isLast ? (
          <TouchableOpacity onPress={onSkip} hitSlop={8} activeOpacity={0.7}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
        <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.85}>
          <Text style={styles.nextText}>
            {isLast ? 'Done' : isWelcome ? 'Start tour' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#4C91FF',
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
  },
  ringGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(76, 145, 255, 0.18)',
  },
  cardWrap: {
    position: 'absolute',
  },
  cardWrapCentered: {
    position: 'absolute',
    top: '38%',
  },
  pointer: {
    position: 'absolute',
    bottom: -9,
    width: 18,
    height: 18,
    backgroundColor: '#202632',
    transform: [{ rotate: '45deg' }],
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(76, 145, 255, 0.25)',
  },
  card: {
    backgroundColor: '#202632',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 145, 255, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
      },
      android: { elevation: 10 },
    }),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 145, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
    flex: 1,
  },
  cardBody: {
    color: '#C7D2E0',
    fontSize: 14,
    lineHeight: 21,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 18,
    marginBottom: 16,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#3A4250',
  },
  dotActive: {
    backgroundColor: '#4C91FF',
    width: 18,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipText: {
    color: '#94A3B8',
    fontSize: 15,
    fontWeight: '600',
  },
  nextBtn: {
    backgroundColor: '#4C91FF',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 26,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
