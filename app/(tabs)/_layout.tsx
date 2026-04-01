import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Home, BarChart3, Plus, Users, User, Timer, Zap } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SessionBanner() {
  const { isActive, templateName, templateColor, elapsed } = useSession();
  const router = useRouter();

  if (!isActive) return null;

  return (
    <TouchableOpacity
      style={[styles.banner, { borderBottomColor: templateColor || '#4C91FF' }]}
      activeOpacity={0.8}
      onPress={() => router.push('/(tabs)/track')}
    >
      <Zap color={templateColor || '#4C91FF'} size={16} />
      <Text style={styles.bannerText} numberOfLines={1}>
        {templateName || 'Workout'} in progress
      </Text>
      <View style={styles.bannerTimer}>
        <Timer color="#FFFFFF" size={14} />
        <Text style={styles.bannerTimerText}>{formatTime(elapsed)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  /** `Redirect` uses focus effects and can thrash `replace` → max update depth; navigate once per sign-out. */
  const sentHomeRef = useRef(false);

  useEffect(() => {
    if (loading) return;
    if (user) {
      sentHomeRef.current = false;
      return;
    }
    if (sentHomeRef.current) return;
    sentHomeRef.current = true;
    router.replace('/');
  }, [user, loading, router]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#1E1E1E',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#4C91FF" />
      </View>
    );
  }

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: '#1E1E1E',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator color="#4C91FF" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#1E1E1E' }}>
      <SessionBanner />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#1E1E1E',
            borderTopColor: '#2A2A2A',
            borderTopWidth: 1,
            height: 58 + insets.bottom,
            paddingBottom: Math.max(insets.bottom, 8),
            paddingTop: 8,
          },
          tabBarActiveTintColor: '#4C91FF',
          tabBarInactiveTintColor: '#666666',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ size, color }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="progress"
          options={{
            title: 'Progress',
            tabBarIcon: ({ size, color }) => (
              <BarChart3 size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="track"
          options={{
            title: 'Track',
            tabBarIcon: ({ size, color }) => <Plus size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="groups"
          options={{
            title: 'Groups',
            tabBarIcon: ({ size, color }) => <Users size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="privacy"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="help-support"
          options={{
            href: null,
            headerShown: false,
          }}
        />
        <Tabs.Screen
          name="calendar"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A2A1A',
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 54, // account for status bar
    borderBottomWidth: 2,
    gap: 8,
  },
  bannerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  bannerTimer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bannerTimerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
