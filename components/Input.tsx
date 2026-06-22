import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
} from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  isPassword?: boolean;
  containerStyle?: any;
  leftIcon?: React.ReactNode;
  tone?: 'default' | 'auth';
}

export function Input({
  label,
  error,
  isPassword,
  style,
  containerStyle,
  leftIcon,
  tone = 'default',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isAuth = tone === 'auth';

  return (
    <View style={[styles.container, isAuth && styles.authContainer, containerStyle || style]}>
      {label && <Text style={[styles.label, isAuth && styles.authLabel]}>{label}</Text>}
      <View
        style={[
          styles.inputContainer,
          isAuth && styles.authInputContainer,
          error && styles.inputError,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <TextInput
          style={[styles.input, isAuth && styles.authInput, leftIcon ? styles.inputWithIcon : null]}
          placeholderTextColor={isAuth ? '#777777' : '#666666'}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword ? (
              <EyeOff color="#666666" size={20} />
            ) : (
              <Eye color="#666666" size={20} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  authContainer: {
    marginBottom: 14,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  authLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2A2A2A',
  },
  authInputContainer: {
    backgroundColor: '#262626',
    borderRadius: 10,
    borderWidth: 0,
    minHeight: 48,
  },
  inputError: {
    borderColor: '#FF4C4C',
  },
  leftIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  authInput: {
    fontSize: 15,
    paddingVertical: 13,
    paddingHorizontal: 12,
  },
  inputWithIcon: {
    paddingLeft: 8,
  },
  eyeIcon: {
    paddingHorizontal: 12,
  },
  errorText: {
    color: '#FF4C4C',
    fontSize: 12,
    marginTop: 4,
  },
});
