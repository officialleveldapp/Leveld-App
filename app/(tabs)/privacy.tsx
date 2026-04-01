import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ChevronLeft, Mail } from 'lucide-react-native';

const SUPPORT_EMAIL = 'rahbeabass@gmail.com';

export default function PrivacyScreen() {
  return (
    <LinearGradient colors={['#1E1E1E', '#0A0A0A']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <ChevronLeft color="#FFFFFF" size={20} />
          </TouchableOpacity>
          <Text style={styles.title}>Privacy</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>How your data is used</Text>
          <Text style={styles.bodyText}>
            Leveld uses your account details and workout activity to power progress tracking, streaks, badges,
            and performance insights. Data is only used to provide app features and improve reliability.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>What we store</Text>
          <Text style={styles.bodyText}>
            We store your profile information, workouts, templates, and progress metrics. You can request account
            deletion any time from the profile screen.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Need privacy help?</Text>
          <View style={styles.inlineRow}>
            <Mail color="#4C91FF" size={16} />
            <Text style={styles.supportText}>{SUPPORT_EMAIL}</Text>
          </View>
          <Text style={styles.bodyText}>
            Contact us at this email for questions about your data, deletion requests, or privacy concerns.
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
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  bodyText: {
    color: '#B3B3B3',
    fontSize: 14,
    lineHeight: 21,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  supportText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
