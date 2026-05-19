import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';

const SHARE_MESSAGE = 'Hey! Check out FitAI - an AI-powered fitness app that gives you personalized workout plans, diet charts, calorie tracking, and more. Download it now: https://play.google.com/store/apps/details?id=com.piyush.fitai';

const ShareAppScreen = ({ navigation }) => {

  const handleShare = async (platform) => {
    try {
      await Share.share({
        message: SHARE_MESSAGE,
        title: 'Share FitAI',
      });
    } catch (e) {
      Alert.alert('Error', 'Could not open share dialog');
    }
  };

  const platforms = [
    { icon: 'logo-whatsapp', label: 'WhatsApp', color: '#25D366' },
    { icon: 'logo-instagram', label: 'Instagram', color: '#E1306C' },
    { icon: 'logo-twitter', label: 'Twitter / X', color: '#1DA1F2' },
    { icon: 'logo-facebook', label: 'Facebook', color: '#1877F2' },
    { icon: 'chatbubbles-outline', label: 'Messages', color: COLORS.accent },
    { icon: 'share-outline', label: 'More Options', color: COLORS.primary },
  ];

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Share FitAI" subtitle="Spread the fitness" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.emoji}>🎁</Text>
        <Text style={styles.title}>Share FitAI with Friends</Text>
        <Text style={styles.subtitle}>Help your friends and family get fit with AI-powered personalized fitness plans!</Text>

        <View style={styles.grid}>
          {platforms.map((p, i) => (
            <TouchableOpacity key={i} style={styles.shareCard} onPress={handleShare}>
              <View style={[styles.iconCircle, { backgroundColor: p.color + '20' }]}>
                <Ionicons name={p.icon} size={28} color={p.color} />
              </View>
              <Text style={styles.shareLabel}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.copyBtn} onPress={handleShare}>
          <LinearGradient colors={COLORS.gradient1} style={styles.copyBtnGrad}>
            <Ionicons name="share-social" size={20} color={COLORS.white} />
            <Text style={styles.copyBtnText}>Share Now</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 20 },
  emoji: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, textAlign: 'center' },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 8, marginBottom: 32, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 32 },
  shareCard: { alignItems: 'center', width: 90 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  shareLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, textAlign: 'center' },
  copyBtn: { borderRadius: SIZES.radius, overflow: 'hidden', width: '100%' },
  copyBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, gap: 8, borderRadius: SIZES.radius },
  copyBtnText: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
});

export default ShareAppScreen;
