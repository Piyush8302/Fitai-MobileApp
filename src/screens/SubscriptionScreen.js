import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import { SUBSCRIPTION_PLANS } from '../constants/data';
import Header from '../components/Header';
import GradientButton from '../components/GradientButton';

const SubscriptionScreen = ({ navigation }) => {
  const [selected, setSelected] = useState('premium');

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Go Premium" subtitle="Unlock Full Potential" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroIcon}>👑</Text>
          <Text style={styles.heroTitle}>Upgrade to Premium</Text>
          <Text style={styles.heroSub}>Get unlimited AI plans, personalized coaching & no ads at just ₹29/month</Text>
        </View>

        {/* Plans */}
        {SUBSCRIPTION_PLANS.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[styles.planCard, selected === plan.id && { borderColor: plan.color }]}
            onPress={() => setSelected(plan.id)}
          >
            <LinearGradient
              colors={[selected === plan.id ? plan.color + '15' : COLORS.darkCard, COLORS.darkSurface]}
              style={styles.planGrad}
            >
              {plan.popular && (
                <View style={[styles.popularBadge, { backgroundColor: plan.color }]}>
                  <Text style={styles.popularText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <View>
                  <Text style={[styles.planName, selected === plan.id && { color: plan.color }]}>{plan.name}</Text>
                  <View style={styles.priceRow}>
                    <Text style={[styles.planPrice, { color: plan.color }]}>{plan.price}</Text>
                    <Text style={styles.planPeriod}>{plan.period}</Text>
                  </View>
                </View>
                <View style={[styles.radio, selected === plan.id && { borderColor: plan.color }]}>
                  {selected === plan.id && <View style={[styles.radioInner, { backgroundColor: plan.color }]} />}
                </View>
              </View>

              <View style={styles.features}>
                {plan.features.map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <Ionicons name="checkmark-circle" size={18} color={plan.color} />
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}

        {/* Comparison */}
        <Text style={styles.sectionTitle}>Compare Plans</Text>
        <View style={styles.compareTable}>
          {[
            { feature: 'AI Diet Plans', free: '3/day', premium: 'Unlimited' },
            { feature: 'AI Workouts', free: 'Basic', premium: 'Advanced' },
            { feature: 'AI Chat', free: '3 msgs', premium: 'Unlimited' },
            { feature: 'BMI Analysis', free: 'Basic', premium: 'Detailed' },
            { feature: 'Progress Tracking', free: 'Weekly', premium: 'Real-time' },
            { feature: 'Ads', free: 'Yes', premium: 'No Ads' },
          ].map((row, i) => (
            <View key={i} style={styles.compareRow}>
              <Text style={styles.compareFeature}>{row.feature}</Text>
              <Text style={styles.compareFree}>{row.free}</Text>
              <Text style={styles.comparePremium}>{row.premium}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <View style={styles.bottom}>
        <GradientButton
          title={selected === 'free' ? 'Continue with Free' : `Subscribe ${SUBSCRIPTION_PLANS.find(p => p.id === selected)?.price}${SUBSCRIPTION_PLANS.find(p => p.id === selected)?.period}`}
          colors={selected === 'free' ? [COLORS.darkCard, COLORS.darkSurface] : undefined}
          onPress={() => navigation.goBack()}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },
  hero: { alignItems: 'center', marginBottom: 28, paddingTop: 8 },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },
  heroSub: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  planCard: {
    borderRadius: SIZES.radiusLg, overflow: 'hidden',
    borderWidth: 1.5, borderColor: COLORS.darkBorder, marginBottom: 16,
  },
  planGrad: { padding: 20, borderRadius: SIZES.radiusLg },
  popularBadge: {
    alignSelf: 'flex-start', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4, marginBottom: 12,
  },
  popularText: { fontSize: SIZES.fontXs, color: COLORS.white, ...FONTS.bold, letterSpacing: 1 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  planPrice: { fontSize: SIZES.fontTitle, ...FONTS.extraBold },
  planPeriod: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginLeft: 4 },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.darkBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  radioInner: { width: 12, height: 12, borderRadius: 6 },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium },
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  compareTable: {
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, overflow: 'hidden',
  },
  compareRow: {
    flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  compareFeature: { flex: 2, fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  compareFree: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center' },
  comparePremium: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold, textAlign: 'center' },
  bottom: { paddingHorizontal: 24, paddingBottom: 34, paddingTop: 12, backgroundColor: COLORS.dark },
});

export default SubscriptionScreen;
