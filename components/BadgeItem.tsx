import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  CheckCircle,
  Flame,
  Target,
  Zap,
  Trophy,
  Star,
  Award,
} from 'lucide-react-native';
import { Badge } from '@/types/database';

interface BadgeItemProps {
  badge: Badge;
  earned?: boolean;
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

export function BadgeItem({ badge, earned = false }: BadgeItemProps) {
  const IconComponent = iconMap[badge.icon] || Award;

  return (
    <View style={[styles.container, !earned && styles.locked]}>
      <View style={[styles.iconContainer, !earned && styles.iconLocked]}>
        <IconComponent
          color={earned ? '#FFB547' : '#666666'}
          size={32}
          fill={earned ? '#FFB547' : 'transparent'}
        />
      </View>
      <Text style={[styles.name, !earned && styles.lockedText]}>
        {badge.name}
      </Text>
      <Text style={[styles.description, !earned && styles.lockedText]}>
        {badge.description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: 100,
    gap: 8,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2A2A2A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFB547',
  },
  iconLocked: {
    borderColor: '#666666',
  },
  name: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    color: '#999999',
    fontSize: 10,
    textAlign: 'center',
  },
  locked: {
    opacity: 0.5,
  },
  lockedText: {
    color: '#666666',
  },
});
