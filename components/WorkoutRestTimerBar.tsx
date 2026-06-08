import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { ChevronDown, ChevronUp, SkipForward, Timer } from 'lucide-react-native';

import {
  clampRestSec,
  DEFAULT_REST_SEC,
  getRestTimerAutoAfterExercise,
  getRestTimerSeconds,
  setRestTimerAutoAfterExercise,
  setRestTimerSeconds,
} from '@/lib/restTimerSettings';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SLIDER_MIN = 15;
const SLIDER_MAX = 600;
const SLIDER_STEP = 5;

function formatCountdown(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function snapSlider(v: number): number {
  const rounded = Math.round(v / SLIDER_STEP) * SLIDER_STEP;
  return clampRestSec(rounded);
}

type Props = {
  accentColor: string;
  completedExerciseTick: number;
};

export function WorkoutRestTimerBar({
  accentColor,
  completedExerciseTick,
}: Props) {
  const [durationSec, setDurationSec] = useState(DEFAULT_REST_SEC);
  const [autoAfterExercise, setAutoAfterExercise] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const prevTickRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTick = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopTimer = useCallback(() => {
    clearTick();
    setRemaining(null);
  }, [clearTick]);

  const startTimer = useCallback(
    (fromSeconds?: number) => {
      const total = clampRestSec(fromSeconds ?? durationSec);
      clearTick();
      setRemaining(total);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          if (r == null) return null;
          if (r <= 1) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success,
            );
            return null;
          }
          return r - 1;
        });
      }, 1000);
    },
    [clearTick, durationSec],
  );

  useEffect(() => {
    return () => clearTick();
  }, [clearTick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [sec, auto] = await Promise.all([
        getRestTimerSeconds(),
        getRestTimerAutoAfterExercise(),
      ]);
      if (!cancelled) {
        setDurationSec(sec);
        setAutoAfterExercise(auto);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (prevTickRef.current === null) {
      prevTickRef.current = completedExerciseTick;
      return;
    }
    if (
      completedExerciseTick !== prevTickRef.current &&
      autoAfterExercise &&
      completedExerciseTick > 0
    ) {
      startTimer();
    }
    prevTickRef.current = completedExerciseTick;
  }, [loaded, completedExerciseTick, autoAfterExercise, startTimer]);

  const persistDuration = async (sec: number) => {
    const v = clampRestSec(sec);
    setDurationSec(v);
    await setRestTimerSeconds(v);
  };

  const onSliderChange = (raw: number) => {
    setDurationSec(snapSlider(raw));
  };

  const onSliderComplete = async (raw: number) => {
    const v = snapSlider(raw);
    await persistDuration(v);
    void Haptics.selectionAsync();
  };

  const toggleAuto = async (value: boolean) => {
    setAutoAfterExercise(value);
    await setRestTimerAutoAfterExercise(value);
    void Haptics.selectionAsync();
  };

  const toggleExpanded = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const running = remaining != null;
  const progress =
    running && remaining != null
      ? 1 - remaining / Math.max(1, durationSec)
      : 0;

  return (
    <View style={styles.wrap}>
      {running ? (
        <View style={styles.runningWrap}>
          <View style={styles.runningTop}>
            <Timer color={accentColor} size={18} />
            <Text style={[styles.timeBig, { color: accentColor }]}>
              {formatCountdown(remaining!)}
            </Text>
            <Text style={styles.runningHint}>Rest</Text>
            <TouchableOpacity
              onPress={stopTimer}
              style={styles.skipBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityLabel="Skip rest timer"
            >
              <SkipForward color="#94A3B8" size={20} />
              <Text style={styles.skipLabel}>Skip</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min(1, Math.max(0, progress)) * 100}%`,
                  backgroundColor: accentColor,
                },
              ]}
            />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.idleRow}>
            <Timer color={accentColor} size={17} />
            <View style={styles.idleMid}>
              <Text style={styles.idleTitle}>Rest timer</Text>
              <Text style={styles.idleSub} numberOfLines={1}>
                Next rest: {formatCountdown(durationSec)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => startTimer()}
              style={[styles.startBtn, { borderColor: accentColor }]}
              activeOpacity={0.85}
            >
              <Text style={[styles.startBtnText, { color: accentColor }]}>
                Start
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={toggleExpanded} style={styles.chevBtn} hitSlop={10}>
              {expanded ? (
                <ChevronUp color="#64748B" size={20} />
              ) : (
                <ChevronDown color="#64748B" size={20} />
              )}
            </TouchableOpacity>
          </View>

          {expanded ? (
            <View style={styles.details}>
              <View style={styles.autoRow}>
                <Text style={styles.autoLabel}>
                  Start rest automatically when you check off an exercise
                </Text>
                <Switch
                  value={autoAfterExercise}
                  onValueChange={(v) => void toggleAuto(v)}
                  trackColor={{ false: '#333', true: `${accentColor}88` }}
                  thumbColor={autoAfterExercise ? accentColor : '#888'}
                />
              </View>
              <Text style={styles.sliderLabel}>How long to rest</Text>
              <Text style={styles.sliderHint}>
                Drag the dot to set your preferred time (saved for next workouts)
              </Text>
              <Text style={[styles.sliderReadout, { color: accentColor }]}>
                {formatCountdown(durationSec)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={SLIDER_MIN}
                maximumValue={SLIDER_MAX}
                step={SLIDER_STEP}
                value={durationSec}
                onValueChange={onSliderChange}
                onSlidingComplete={(v) => void onSliderComplete(v)}
                minimumTrackTintColor={accentColor}
                maximumTrackTintColor="#2A2A2A"
                thumbTintColor="#F8FAFC"
              />
              <View style={styles.sliderEnds}>
                <Text style={styles.sliderEndText}>15 sec</Text>
                <Text style={styles.sliderEndText}>10 min</Text>
              </View>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    overflow: 'hidden',
  },
  runningWrap: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  runningTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  runningHint: {
    flex: 1,
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  timeBig: {
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    minWidth: 64,
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  skipLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    width: '100%',
    height: 5,
    backgroundColor: '#2A2A2A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  idleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  idleMid: {
    flex: 1,
    minWidth: 0,
  },
  idleTitle: {
    color: '#E2E8F0',
    fontSize: 15,
    fontWeight: '800',
  },
  idleSub: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  startBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  chevBtn: {
    padding: 4,
  },
  details: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#2A2A2A',
    gap: 6,
  },
  autoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 12,
  },
  autoLabel: {
    flex: 1,
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  sliderLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  sliderHint: {
    color: '#64748B',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  sliderReadout: {
    fontSize: 28,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
    marginBottom: 4,
  },
  slider: {
    width: '100%',
    height: 44,
  },
  sliderEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -4,
    paddingHorizontal: 4,
  },
  sliderEndText: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '600',
  },
});
