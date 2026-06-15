import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { apiCreateGroup, apiCreateGroupChallenge } from '@/lib/api';
import {
  X,
  ChevronLeft,
  Dumbbell,
  Zap,
  Flame,
  Repeat,
  type LucideIcon,
} from 'lucide-react-native';

const CHALLENGE_TYPES: { value: string; label: string; Icon: LucideIcon }[] = [
  { value: 'total_workouts', label: 'Total Workouts', Icon: Dumbbell },
  { value: 'total_xp', label: 'Total XP', Icon: Zap },
  { value: 'streak', label: 'Streak Days', Icon: Flame },
  { value: 'total_reps', label: 'Total Reps', Icon: Repeat },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [wizardChName, setWizardChName] = useState('');
  const [wizardChDesc, setWizardChDesc] = useState('');
  const [wizardChType, setWizardChType] = useState('total_workouts');
  const [wizardChTarget, setWizardChTarget] = useState('10');
  const [wizardChDays, setWizardChDays] = useState('7');
  const [creating, setCreating] = useState(false);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/groups');
    }
  }, [router]);

  const handleSubmit = async (skipChallenge?: boolean) => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await apiCreateGroup({
        name: groupName.trim(),
        description: groupDescription.trim(),
      });
      if (error) {
        Alert.alert('Error', typeof error?.detail === 'string' ? error.detail : 'Failed to create group');
        return;
      }
      if (!data?.id) {
        Alert.alert('Error', 'Failed to create group');
        return;
      }
      if (!skipChallenge && wizardChName.trim()) {
        const today = new Date();
        const endDate = new Date(today);
        endDate.setDate(endDate.getDate() + (parseInt(wizardChDays, 10) || 7));
        const { error: chError } = await apiCreateGroupChallenge(data.id, {
          name: wizardChName.trim(),
          description: wizardChDesc.trim(),
          challenge_type: wizardChType,
          start_date: today.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          target_value: parseInt(wizardChTarget, 10) || 10,
        });
        if (chError) {
          Alert.alert(
            'Group created',
            'Your group is ready. We couldn’t add the starter challenge — add one from the group screen.',
          );
        }
      }
      router.replace('/(tabs)/groups');
    } catch {
      Alert.alert('Error', 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  if (!profile) {
    return (
      <View style={[styles.loadingRoot, { paddingTop: insets.top }]}>
        <ActivityIndicator color="#4C91FF" size="large" />
      </View>
    );
  }

  const title = step === 1 ? 'Group details' : 'First challenge (optional)';

  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.root}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.headerSide} />
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title}
          </Text>
          <TouchableOpacity
            onPress={goBack}
            style={styles.closeBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X color="#FFFFFF" size={26} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.stepLabel}>Step {step} of 2</Text>

          {step === 1 && (
            <View style={styles.section}>
              <Text style={styles.help}>
                Groups are private. Share the invite link so others can join.
              </Text>
              <TouchableOpacity
                style={styles.friendsHint}
                onPress={() => router.push('/friends')}
                activeOpacity={0.88}
              >
                <Text style={styles.friendsHintText}>
                  Add friends on Leveld first — then share your group link so they can join.
                </Text>
                <Text style={styles.friendsHintLink}>Find friends →</Text>
              </TouchableOpacity>
              <Input label="Group name" placeholder="e.g. Morning Warriors" value={groupName} onChangeText={setGroupName} />
              <Input
                label="Description (optional)"
                placeholder="What's this group about?"
                value={groupDescription}
                onChangeText={setGroupDescription}
                multiline
              />
              <View style={styles.navRow}>
                <View style={styles.navBtnGrow}>
                  <Button
                    title="Next"
                    onPress={() => {
                      if (!groupName.trim()) {
                        Alert.alert('Error', 'Please enter a group name');
                        return;
                      }
                      setStep(2);
                    }}
                  />
                </View>
              </View>
            </View>
          )}

          {step === 2 && (
            <View style={styles.section}>
              <Text style={styles.help}>
                Add a starter challenge now, or skip and create one later from the group.
              </Text>
              <Input
                label="Challenge name (optional)"
                placeholder="e.g. 10 workouts this week"
                value={wizardChName}
                onChangeText={setWizardChName}
              />
              <Input
                label="Description (optional)"
                placeholder="What's the goal?"
                value={wizardChDesc}
                onChangeText={setWizardChDesc}
                multiline
              />
              <Text style={styles.sectionLabel}>Challenge type</Text>
              <View style={styles.challengeTypeGrid}>
                {CHALLENGE_TYPES.map((ct) => (
                  <TouchableOpacity
                    key={ct.value}
                    style={[styles.challengeTypeBtn, wizardChType === ct.value && styles.challengeTypeBtnActive]}
                    onPress={() => setWizardChType(ct.value)}
                  >
                    <ct.Icon color={wizardChType === ct.value ? '#FFFFFF' : '#94A3B8'} size={18} />
                    <Text style={[styles.challengeTypeLabel, wizardChType === ct.value && { color: '#FFF' }]}>
                      {ct.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.targetRow}>
                <View style={{ flex: 1 }}>
                  <Input label="Target" placeholder="10" value={wizardChTarget} onChangeText={setWizardChTarget} keyboardType="number-pad" />
                </View>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Duration (days)"
                    placeholder="7"
                    value={wizardChDays}
                    onChangeText={setWizardChDays}
                    keyboardType="number-pad"
                  />
                </View>
              </View>
              <TouchableOpacity
                style={styles.skipLink}
                onPress={() => handleSubmit(true)}
                disabled={creating}
                activeOpacity={0.7}
              >
                <Text style={styles.skipLinkText}>Skip — create group without a challenge</Text>
              </TouchableOpacity>
              <View style={styles.navRow}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)} activeOpacity={0.8}>
                  <ChevronLeft color="#CCC" size={20} />
                  <Text style={styles.backText}>Back</Text>
                </TouchableOpacity>
                <View style={styles.navBtnGrow}>
                  <Button title="Create group" onPress={() => handleSubmit()} loading={creating} />
                </View>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  loadingRoot: { flex: 1, backgroundColor: '#1E1E1E', alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  headerSide: { width: 44 },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },
  stepLabel: { color: '#666', fontSize: 13, fontWeight: '600', marginBottom: 16 },
  section: { gap: 4 },
  help: { color: '#999', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  friendsHint: {
    backgroundColor: '#1A2332',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A3F5C',
  },
  friendsHintText: { color: '#94A3B8', fontSize: 13, lineHeight: 18, marginBottom: 8 },
  friendsHintLink: { color: '#7FB1FF', fontSize: 14, fontWeight: '700' },
  navRow: { flexDirection: 'row', alignItems: 'center', marginTop: 20 },
  navBtnGrow: { flex: 1 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingRight: 8 },
  backText: { color: '#CCC', fontSize: 16, fontWeight: '600' },
  sectionLabel: { color: '#CCC', fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 8 },
  challengeTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  challengeTypeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  challengeTypeBtnActive: { borderColor: '#4C91FF', backgroundColor: '#1E2A3A' },
  challengeTypeLabel: { color: '#999', fontSize: 13, fontWeight: '600' },
  targetRow: { flexDirection: 'row', gap: 12 },
  skipLink: { alignItems: 'center', paddingVertical: 14, marginBottom: 8 },
  skipLinkText: { color: '#4C91FF', fontSize: 15, fontWeight: '600' },
});
