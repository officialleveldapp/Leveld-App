import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft, CircleHelp, MessageSquare } from 'lucide-react-native';

const SUPPORT_EMAIL = 'rahbeabass@gmail.com';

export default function HelpSupportScreen() {
  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <ChevronLeft color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <Text style={styles.title}>Help & Support</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <CircleHelp color="#4C91FF" size={18} />
            <Text style={styles.sectionTitle}>Need help?</Text>
          </View>
          <Text style={styles.bodyText}>
            For account, subscriptions, training logs, or any technical issues, contact support and we will help
            you out as quickly as possible.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowTitle}>
            <MessageSquare color="#4C91FF" size={18} />
            <Text style={styles.sectionTitle}>Contact support</Text>
          </View>
          <Text style={styles.bodyText}>
            Email: <Text style={styles.supportText}>{SUPPORT_EMAIL}</Text>
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1E1E',
    borderWidth: 1,
    borderColor: '#2B2B2B',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  headerSpacer: {
    width: 36,
  },
  card: {
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: '#242424',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  rowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bodyText: {
    color: '#B3B3B3',
    fontSize: 14,
    lineHeight: 21,
  },
  supportText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
