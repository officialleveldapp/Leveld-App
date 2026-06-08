import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import {
  CheckCircle,
  Flame,
  Target,
  Zap,
  Trophy,
  Star,
  Award,
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_W } = Dimensions.get('window');

interface BadgePayload {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp_reward: number;
}

interface Props {
  badges: BadgePayload[];
  onDismiss: () => void;
}

const iconMap: Record<string, any> = {
  'check-circle': CheckCircle,
  flame: Flame,
  target: Target,
  zap: Zap,
  trophy: Trophy,
  star: Star,
  award: Award,
};

const PARTICLE_COUNT = 10;
const PARTICLE_COLORS = ['#FFB547', '#4C91FF', '#FF6B6B', '#51CF66', '#CC5DE8', '#FCC419'];

function Particle({ delay, angle, color }: { delay: number; angle: number; color: string }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 800,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const distance = 80 + Math.random() * 40;
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.cos(angle) * distance],
  });
  const translateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.sin(angle) * distance],
  });
  const opacity = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1, 0],
  });
  const scale = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [0, 1.2, 0.3],
  });

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          backgroundColor: color,
          opacity,
          transform: [{ translateX }, { translateY }, { scale }],
        },
      ]}
    />
  );
}

function BadgeCelebration({ badge, onNext }: { badge: BadgePayload; onNext: () => void }) {
  const IconComponent = iconMap[badge.icon] || Award;

  const badgeScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const titleTranslate = useRef(new Animated.Value(20)).current;
  const detailOpacity = useRef(new Animated.Value(0)).current;
  const xpOpacity = useRef(new Animated.Value(0)).current;
  const xpScale = useRef(new Animated.Value(0.5)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Badge icon bounces in
      Animated.spring(badgeScale, {
        toValue: 1,
        damping: 8,
        stiffness: 150,
        useNativeDriver: true,
      }),
      // Title slides up
      Animated.parallel([
        Animated.timing(titleOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(titleTranslate, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      // Details + XP
      Animated.parallel([
        Animated.timing(detailOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.spring(xpScale, {
          toValue: 1,
          damping: 10,
          stiffness: 120,
          useNativeDriver: true,
        }),
        Animated.timing(xpOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: true,
        }),
      ]),
      // Button
      Animated.timing(buttonOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const particles = Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    angle: (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.4,
    delay: 200 + Math.random() * 300,
    color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
  }));

  return (
    <View style={styles.celebrationContainer}>
      {/* Particle burst */}
      <View style={styles.particleContainer}>
        {particles.map((p, i) => (
          <Particle key={i} angle={p.angle} delay={p.delay} color={p.color} />
        ))}
      </View>

      {/* Badge icon */}
      <Animated.View
        style={[styles.badgeCircle, { transform: [{ scale: badgeScale }] }]}
      >
        <LinearGradient
          colors={['#FFB547', '#FF8C00']}
          style={styles.badgeGradient}
        >
          <IconComponent color="#FFFFFF" size={44} fill="#FFFFFF" />
        </LinearGradient>
      </Animated.View>

      {/* Title */}
      <Animated.Text
        style={[
          styles.unlockTitle,
          { opacity: titleOpacity, transform: [{ translateY: titleTranslate }] },
        ]}
      >
        Achievement Unlocked!
      </Animated.Text>

      {/* Badge name + description */}
      <Animated.View style={[styles.detailBlock, { opacity: detailOpacity }]}>
        <Text style={styles.badgeName}>{badge.name}</Text>
        <Text style={styles.badgeDescription}>{badge.description}</Text>
      </Animated.View>

      {/* XP reward */}
      {badge.xp_reward > 0 && (
        <Animated.View
          style={[
            styles.xpBadge,
            { opacity: xpOpacity, transform: [{ scale: xpScale }] },
          ]}
        >
          <Zap color="#FFB547" size={18} fill="#FFB547" />
          <Text style={styles.xpBadgeText}>+{badge.xp_reward} XP</Text>
        </Animated.View>
      )}

      {/* Continue button */}
      <Animated.View style={[styles.buttonWrap, { opacity: buttonOpacity }]}>
        <TouchableOpacity
          style={styles.awesomeButton}
          onPress={onNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#FFB547', '#FF8C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.awesomeGradient}
          >
            <Text style={styles.awesomeText}>Awesome!</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export function AchievementUnlockedModal({ badges, onDismiss }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backdropOpacity, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, []);

  if (!badges.length) return null;

  const handleNext = () => {
    if (currentIndex < badges.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => onDismiss());
    }
  };

  return (
    <Modal transparent animationType="none" visible>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <BadgeCelebration
          key={badges[currentIndex].id}
          badge={badges[currentIndex]}
          onNext={handleNext}
        />
        {badges.length > 1 && (
          <Text style={styles.counter}>
            {currentIndex + 1} / {badges.length}
          </Text>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  celebrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: SCREEN_W,
    paddingHorizontal: 40,
  },
  particleContainer: {
    position: 'absolute',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 28,
    shadowColor: '#FFB547',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 12,
  },
  badgeGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlockTitle: {
    color: '#FFB547',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  detailBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  badgeName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  badgeDescription: {
    color: '#BBBBBB',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 181, 71, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 181, 71, 0.3)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 32,
  },
  xpBadgeText: {
    color: '#FFB547',
    fontSize: 18,
    fontWeight: '800',
  },
  buttonWrap: {
    width: '100%',
  },
  awesomeButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  awesomeGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  awesomeText: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '800',
  },
  counter: {
    position: 'absolute',
    bottom: 60,
    color: '#666666',
    fontSize: 13,
    fontWeight: '600',
  },
});
