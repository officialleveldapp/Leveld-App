import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, View, ViewStyle } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';

type AppleSignInButtonProps = {
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
};

export function AppleSignInButton({
  onPress,
  disabled = false,
  style,
}: AppleSignInButtonProps) {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAvailable);
  }, []);

  if (Platform.OS !== 'ios' || !available) return null;

  return (
    <View
      style={[styles.wrap, style, disabled && styles.disabled]}
      pointerEvents={disabled ? 'none' : 'auto'}
    >
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={10}
        style={styles.button}
        onPress={onPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  disabled: {
    opacity: 0.55,
  },
  button: {
    width: '100%',
    height: 52,
  },
});
