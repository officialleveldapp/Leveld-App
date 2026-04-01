import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { AppLogo } from '@/components/AppLogo';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <AppLogo size={56} containerStyle={styles.logo} />
        <Text style={styles.text}>This screen doesn't exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#1E1E1E',
  },
  logo: {
    marginBottom: 20,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 600,
  },
  link: {
    marginTop: 15,
    paddingVertical: 15,
  },
  linkText: {
    color: '#4C91FF',
    fontSize: 16,
    fontWeight: '600',
  },
});
