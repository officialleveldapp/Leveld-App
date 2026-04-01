import React from 'react';
import {
  Image,
  type ImageStyle,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';

const SOURCE = require('@/assets/images/logo.png');

type Props = {
  /** Square box size; image uses `contain` inside. */
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
};

export function AppLogo({ size = 96, style, containerStyle }: Props) {
  const dim = { width: size, height: size };
  return (
    <View style={[dim, styles.center, containerStyle]}>
      <Image
        source={SOURCE}
        style={[dim, styles.img, style]}
        accessibilityLabel="Leveld"
        accessibilityRole="image"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: {
    resizeMode: 'contain',
  },
});
