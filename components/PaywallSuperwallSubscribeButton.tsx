import React from 'react';
import { ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlacement } from 'expo-superwall';
import { Button } from '@/components/Button';
import { useAuth } from '@/contexts/AuthContext';
import { getPostOnboardingPlacement } from '@/lib/placements';

type Props = {
  style?: ViewStyle;
};

export function PaywallSuperwallSubscribeButton({ style }: Props) {
  const router = useRouter();
  const { refreshProfile } = useAuth();
  const { registerPlacement } = usePlacement({
    onDismiss: () => {
      void refreshProfile();
      router.replace('/(tabs)');
    },
  });

  return (
    <Button
      title="Start Free Trial"
      onPress={() =>
        void registerPlacement({ placement: getPostOnboardingPlacement() })
      }
      style={style}
    />
  );
}
