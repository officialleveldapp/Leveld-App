import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Crown, Check, X, LucideIcon } from 'lucide-react-native';

interface ProLockScreenProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  features: string[];
  onUnlock: () => void;
  ctaLabel?: string;
  onClose?: () => void;
}

/** Full-screen upsell shown in place of a Pro-only feature for non-subscribers. */
export function ProLockScreen({
  icon: Icon,
  title,
  subtitle,
  features,
  onUnlock,
  ctaLabel = 'Unlock with Leveld Pro',
  onClose,
}: ProLockScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      {onClose ? (
        <TouchableOpacity
          onPress={onClose}
          style={[styles.closeButton, { top: insets.top + 8 }]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <X color="#FFFFFF" size={22} />
        </TouchableOpacity>
      ) : null}
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={['#4C91FF', '#6BABFF']}
            style={styles.iconBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Icon color="#FFFFFF" size={36} />
          </LinearGradient>
          <View style={styles.proPill}>
            <Crown color="#0A0A0A" size={12} />
            <Text style={styles.proPillText}>PRO</Text>
          </View>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <View style={styles.featureList}>
          {features.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Check color="#4C91FF" size={14} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity activeOpacity={0.85} onPress={onUnlock} style={styles.ctaWrap}>
          <LinearGradient
            colors={['#4C91FF', '#6BABFF']}
            style={styles.cta}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Crown color="#FFFFFF" size={18} />
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  closeButton: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: 'center',
    flexGrow: 1,
    justifyContent: 'center',
  },
  iconWrap: { marginBottom: 24, alignItems: 'center' },
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  proPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFB547',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: -12,
  },
  proPillText: { color: '#0A0A0A', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
    maxWidth: 320,
  },
  featureList: { alignSelf: 'stretch', gap: 14, marginBottom: 32 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureCheck: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(76, 145, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { color: '#E5E7EB', fontSize: 15, flex: 1, fontWeight: '500' },
  ctaWrap: { alignSelf: 'stretch' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
