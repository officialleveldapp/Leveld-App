import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Tabs, usePathname, useRouter, useSegments } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Home, BarChart3, Plus, Users, User, Timer, Zap } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/contexts/SessionContext';
import { GroupInvitesProvider, useGroupInvites } from '@/contexts/GroupInvitesContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TabTutorialOverlay } from '@/components/TabTutorialOverlay';
function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function SessionBanner() {
  const { isActive, templateName, templateColor, elapsed } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();

  const onTrackTab =
    pathname === '/track' ||
    pathname?.startsWith('/track/') ||
    (segments as string[]).includes('track');
  if (!isActive || onTrackTab) return null;

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
  const insets = useSafeAreaInsets();

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
    <GroupInvitesProvider>
      <TabLayoutWithInvites insets={insets} />
    </GroupInvitesProvider>
  );
}

function TabLayoutWithInvites({ insets }: { insets: { bottom: number } }) {
  const { pendingCount, refreshInvites } = useGroupInvites();

  useFocusEffect(
    useCallback(() => {
      void refreshInvites();
    }, [refreshInvites]),
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#1E1E1E' }}>
      <SessionBanner />
      <View style={{ flex: 1, minHeight: 0 }}>
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
            tabBarIcon: ({ size, color }) => (
              <View style={{ width: 28, height: 28, alignItems: 'center', justifyContent: 'center' }}>
                <Users size={size} color={color} />
                {pendingCount > 0 ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: -1,
                      right: -2,
                      width: 9,
                      height: 9,
                      borderRadius: 5,
                      backgroundColor: '#FF3B30',
                      borderWidth: 1.5,
                      borderColor: '#1E1E1E',
                    }}
                  />
                ) : null}
              </View>
            ),
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
          name="calendar"
          options={{
            href: null,
            headerShown: false,
          }}
        />
      </Tabs>
      </View>
      <TabTutorialOverlay />
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
