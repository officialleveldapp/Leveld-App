import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Users } from 'lucide-react-native';
import type { ChallengeCelebrationPayload } from '@/lib/challengeCelebrationStorage';

type Props = {
  visible: boolean;
  item: ChallengeCelebrationPayload | null;
  onDismiss: () => void;
};

export function ChallengeCompletedModal({ visible, item, onDismiss }: Props) {
  if (!item) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <LinearGradient colors={['#2A1F0A', '#1A1408']} style={styles.cardInner}>
            <View style={styles.iconWrap}>
              <Trophy color="#FFB547" size={40} />
            </View>
            <Text style={styles.title}>Challenge complete</Text>
            <Text style={styles.challengeName}>{item.challenge_name}</Text>
            <View style={styles.groupRow}>
              <Users color="#8BB4FF" size={14} />
              <Text style={styles.groupName}>{item.group_name}</Text>
            </View>
            <Text style={styles.sub}>
              Nice work — your group can see it on the challenge leaderboard.
            </Text>
            <TouchableOpacity style={styles.btn} onPress={onDismiss} activeOpacity={0.85}>
              <Text style={styles.btnText}>Awesome</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,181,71,0.35)',
  },
  cardInner: {
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,181,71,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#FFB547',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  challengeName: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 14,
  },
  groupName: {
    color: '#B8C8E8',
    fontSize: 14,
    fontWeight: '600',
  },
  sub: {
    color: '#888888',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#4C91FF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    alignSelf: 'stretch',
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
