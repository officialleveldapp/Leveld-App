import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Flame } from 'lucide-react-native';

interface StreakDisplayProps {
  streak: number;
  size?: 'small' | 'large';
}

export function StreakDisplay({ streak, size = 'large' }: StreakDisplayProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const isLarge = size === 'large';

  return (
    <View style={[styles.container, isLarge && styles.containerLarge]}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Flame
          color="#FFB547"
          size={isLarge ? 32 : 24}
          fill="#FFB547"
        />
      </Animated.View>
      <Text style={[styles.streakText, isLarge && styles.streakTextLarge]}>
        {streak}
      </Text>
      <Text style={[styles.label, isLarge && styles.labelLarge]}>
        Day Streak
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 4,
  },
  containerLarge: {
    gap: 8,
  },
  streakText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  streakTextLarge: {
    fontSize: 32,
    fontWeight: '800',
  },
  label: {
    color: '#999999',
    fontSize: 12,
    fontWeight: '600',
  },
  labelLarge: {
    fontSize: 14,
  },
});
