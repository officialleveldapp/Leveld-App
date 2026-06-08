import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface GoogleSignInButtonProps {
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
  style?: ViewStyle;
}

export function GoogleSignInButton({
  onPress,
  disabled = false,
  loading = false,
  label = 'Continue with Google',
  style,
}: GoogleSignInButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, style]}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color="#1f1f1f" />
      ) : (
        <View style={styles.row}>
          <FontAwesome name="google" size={22} color="#4285F4" style={styles.icon} />
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 12,
  },
  label: {
    color: '#1f1f1f',
    fontSize: 16,
    fontWeight: '600',
  },
});
