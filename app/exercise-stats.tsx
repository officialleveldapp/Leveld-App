import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiGetExerciseLifetimeStats } from '@/lib/api';
import type { ExerciseLifetimeStat } from '@/types/database';
import { ChevronLeft, Dumbbell } from 'lucide-react-native';

export default function ExerciseStatsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [rows, setRows] = useState<ExerciseLifetimeStat[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await apiGetExerciseLifetimeStats();
      setRows(data?.exercises ?? []);
    } catch {
      setRows([]);
    } finally {
      setInitialLoad(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  const totalReps = rows.reduce((s, r) => s + r.total_reps, 0);
  const totalSets = rows.reduce((s, r) => s + r.total_sets, 0);

  const renderItem = ({ item }: { item: ExerciseLifetimeStat }) => (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Dumbbell color="#4C91FF" size={20} />
      </View>
      <View style={styles.rowMid}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {item.exercise_name}
        </Text>
        <Text style={styles.exerciseMeta}>
          {item.total_sets.toLocaleString()} set{item.total_sets === 1 ? '' : 's'}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.repValue}>{item.total_reps.toLocaleString()}</Text>
        <Text style={styles.repLabel}>reps</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={12}>
          <ChevronLeft color="#FFFFFF" size={26} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Exercise totals</Text>
        <View style={styles.headerRight} />
      </View>

      {initialLoad ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#4C91FF" />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.exercise_name}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 32 },
            rows.length === 0 && styles.listEmpty,
          ]}
          ListHeaderComponent={
            <View style={styles.introBlock}>
              <Text style={styles.intro}>
                Total reps = sets × reps per set from every workout you&apos;ve logged. Same names
                are grouped together.
              </Text>
              {rows.length > 0 ? (
                <View style={styles.summaryPills}>
                  <View style={styles.pill}>
                    <Text style={styles.pillLabel}>Exercises</Text>
                    <Text style={styles.pillValue}>{rows.length}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillLabel}>Sets</Text>
                    <Text style={styles.pillValue}>{totalSets.toLocaleString()}</Text>
                  </View>
                  <View style={styles.pill}>
                    <Text style={styles.pillLabel}>Reps</Text>
                    <Text style={styles.pillValue}>{totalReps.toLocaleString()}</Text>
                  </View>
                </View>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              No exercise history yet. Complete a session on Track to build your lifetime totals.
            </Text>
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4C91FF" />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  headerRight: { width: 44 },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  introBlock: {
    marginBottom: 20,
  },
  intro: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  summaryPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pill: {
    flex: 1,
    minWidth: '28%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2B2B2B',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  pillLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  pillValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#252525',
    gap: 12,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(76, 145, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMid: {
    flex: 1,
    minWidth: 0,
  },
  exerciseName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
  },
  exerciseMeta: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 4,
  },
  rowRight: {
    alignItems: 'flex-end',
  },
  repValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  repLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});
