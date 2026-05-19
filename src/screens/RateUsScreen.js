import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';

const RateUsScreen = ({ navigation }) => {
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (rating === 0) { Alert.alert('Please Rate', 'Tap a star to rate us'); return; }
    setSubmitted(true);
    if (rating >= 4) {
      Alert.alert(
        'Thank You!',
        'We\'re glad you love FitAI! Would you like to rate us on the Play Store?',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Rate Now', onPress: () => {
            const url = Platform.OS === 'android'
              ? 'market://details?id=com.piyush.fitai'
              : 'itms-apps://itunes.apple.com/app/id123456789';
            Linking.openURL(url).catch(() => {});
          }},
        ]
      );
    } else {
      Alert.alert('Thank You', 'We appreciate your feedback and will work to improve your experience.');
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Rate FitAI" subtitle="Your feedback matters" onBack={() => navigation.goBack()} />
      <View style={styles.content}>
        <Text style={styles.emoji}>{submitted ? (rating >= 4 ? '🎉' : '🙏') : '⭐'}</Text>
        <Text style={styles.title}>{submitted ? 'Thanks for your rating!' : 'How would you rate FitAI?'}</Text>
        <Text style={styles.subtitle}>
          {submitted ? 'Your feedback helps us improve' : 'Tap a star to rate your experience'}
        </Text>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => !submitted && setRating(star)} style={styles.starBtn}>
              <Text style={styles.star}>{star <= rating ? '⭐' : '☆'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {rating > 0 && (
          <Text style={styles.ratingText}>
            {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent!'}
          </Text>
        )}

        {!submitted && (
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <LinearGradient colors={COLORS.gradient1} style={styles.submitGrad}>
              <Text style={styles.submitText}>Submit Rating</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emoji: { fontSize: 64, marginBottom: 20 },
  title: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, textAlign: 'center' },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 8, marginBottom: 32 },
  starsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  starBtn: { padding: 8 },
  star: { fontSize: 40 },
  ratingText: { fontSize: SIZES.fontLg, color: COLORS.primary, ...FONTS.bold, marginBottom: 32 },
  submitBtn: { borderRadius: SIZES.radius, overflow: 'hidden', width: '100%' },
  submitGrad: { paddingVertical: 16, alignItems: 'center', borderRadius: SIZES.radius },
  submitText: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
});

export default RateUsScreen;
