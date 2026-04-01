import React, { useState } from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { Button } from '@/components/Button';
import { useRevenueCat } from '@/contexts/RevenueCatContext';
import { getPurchasesErrorMessage } from '@/lib/revenuecat/purchasesError';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const STORE_LABEL =
  Platform.OS === 'android'
    ? 'Google Play'
    : 'Apple';

export function SubscriptionManagementModal({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const rc = useRevenueCat();
  const [busy, setBusy] = useState<'store' | 'center' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStore = async () => {
    setError(null);
    setBusy('store');
    try {
      await rc.openStoreSubscriptionManagement();
      await rc.refreshCustomerInfo();
      onClose();
    } catch (e) {
      setError(getPurchasesErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const handleCustomerCenter = async () => {
    setError(null);
    setBusy('center');
    try {
      await rc.presentCustomerCenter();
      await rc.refreshCustomerInfo();
      onClose();
    } catch (e) {
      setError(getPurchasesErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.sheet,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Leveld Pro</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={12}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Close"
          >
            <X color="#4C91FF" size={26} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sectionLabel}>Cancel or change subscription</Text>
          <Text style={styles.body}>
            Subscriptions are billed by {STORE_LABEL}. To turn off auto-renew,
            switch plans, or cancel, use your account&apos;s subscription page.
            You keep Pro access until the end of the current billing period.
          </Text>

          <Button
            title={
              Platform.OS === 'android'
                ? 'Open Play subscription settings'
                : 'Open subscription settings'
            }
            onPress={() => void handleStore()}
            loading={busy === 'store'}
            disabled={busy !== null}
            style={styles.primaryBtn}
          />

          <Text style={styles.sectionLabel}>In-app help</Text>
          <Text style={styles.bodyMuted}>
            For refunds where supported, missing purchases, and other billing
            options from RevenueCat.
          </Text>

          <Button
            title="Customer center"
            variant="outline"
            onPress={() => void handleCustomerCenter()}
            loading={busy === 'center'}
            disabled={busy !== null}
            style={styles.secondaryBtn}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    flex: 1,
    backgroundColor: '#121212',
    paddingHorizontal: 22,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#F8FAFC',
    marginBottom: 8,
    marginTop: 8,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#94A3B8',
    marginBottom: 20,
  },
  bodyMuted: {
    fontSize: 14,
    lineHeight: 20,
    color: '#64748B',
    marginBottom: 14,
  },
  primaryBtn: {
    marginBottom: 8,
  },
  secondaryBtn: {
    marginBottom: 16,
  },
  error: {
    color: '#FDA4AF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
});
