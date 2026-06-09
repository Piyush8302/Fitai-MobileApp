import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, TextInput, Linking, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SubscriptionScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  // UPI payment flow states
  const [step, setStep] = useState('plan'); // plan → paying → utr → done
  const [upiData, setUpiData] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);

  useEffect(() => {
    loadToken();
    fetchStatus();
  }, []);

  useEffect(() => {
    const unsub = navigation.addListener('focus', () => fetchStatus());
    return unsub;
  }, [navigation]);

  const loadToken = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) api.setToken(token);
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get(ENDPOINTS.MY_SUBSCRIPTION);
      if (res.success) setSubStatus(res.data);
    } catch (e) {}
    finally { setLoadingStatus(false); }
  };

  // Step 1: Start UPI payment
  const handlePayUPI = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.UPI_PAY, { plan: selectedPlan });
      if (!res.success) {
        Alert.alert('Error', res.message || 'Could not start payment');
        setLoading(false);
        return;
      }

      setUpiData(res.data);

      // Open UPI app
      const canOpen = await Linking.canOpenURL(res.data.upiUrl);
      if (canOpen) {
        await Linking.openURL(res.data.upiUrl);
        setStep('utr');
      } else {
        Alert.alert(
          'No UPI App',
          'Install Google Pay, PhonePe, or Paytm to pay via UPI.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setStep('plan') },
            { text: 'Enter UTR Manually', onPress: () => setStep('utr') },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Submit UTR
  const handleSubmitUTR = async () => {
    if (!utrInput.trim()) {
      Alert.alert('Enter UTR', 'Please enter the UTR / Transaction ID from your payment app');
      return;
    }
    setSubmittingUtr(true);
    try {
      const res = await api.post(ENDPOINTS.UPI_CONFIRM, {
        subscriptionId: upiData.subscriptionId,
        utrNumber: utrInput.trim(),
      });
      if (res.success) {
        setStep('done');
      } else {
        Alert.alert('Error', res.message || 'Failed to submit');
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to submit UTR. Please try again.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert('Cancel Subscription', 'Your premium will remain active until expiry.', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive',
        onPress: async () => {
          try {
            const res = await api.post(ENDPOINTS.CANCEL_SUB);
            if (res.success) { Alert.alert('Cancelled', res.message); fetchStatus(); }
          } catch (e) { Alert.alert('Error', 'Could not cancel'); }
        },
      },
    ]);
  };

  const plans = [
    {
      id: 'monthly', name: 'Monthly', price: 29, period: '/month',
      features: ['Unlimited AI Chat', 'AI Diet Plans', 'Advanced Analytics', 'Ad-Free', 'Priority Support'],
    },
    {
      id: 'yearly', name: 'Yearly', price: 299, originalPrice: 348, period: '/year', badge: '14% OFF',
      features: ['Everything in Monthly', 'Yearly Reports', 'Workout Challenges', 'Early Access'],
    },
  ];

  const isPremium = subStatus?.isPremium;

  // UTR Confirmation Screen
  if (step === 'utr' && upiData) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <Header title="Confirm Payment" onBack={() => setStep('plan')} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.utrCard}>
            <Text style={styles.utrIcon}>✅</Text>
            <Text style={styles.utrTitle}>Payment Done?</Text>
            <Text style={styles.utrSub}>
              If you paid ₹{upiData.amount} via UPI, enter the UTR / Transaction ID below.
            </Text>

            <View style={styles.utrInfoBox}>
              <Text style={styles.utrInfoLabel}>Paid To</Text>
              <Text style={styles.utrInfoValue}>FitAI Premium</Text>
              <Text style={styles.utrInfoLabel}>Amount</Text>
              <Text style={styles.utrInfoValue}>₹{upiData.amount}</Text>
              <Text style={styles.utrInfoLabel}>Plan</Text>
              <Text style={styles.utrInfoValue}>{upiData.plan === 'yearly' ? 'Yearly' : 'Monthly'}</Text>
            </View>

            <Text style={styles.inputLabel}>UTR / Transaction ID</Text>
            <TextInput
              style={styles.utrInput}
              placeholder="Enter 12-digit UTR number"
              placeholderTextColor={COLORS.textMuted}
              value={utrInput}
              onChangeText={setUtrInput}
              keyboardType="default"
              autoCapitalize="characters"
            />

            <Text style={styles.utrHelp}>
              💡 Open Google Pay → Activity → Tap the payment → Copy UTR/Reference ID
            </Text>

            <TouchableOpacity onPress={handleSubmitUTR} disabled={submittingUtr} style={styles.utrSubmitBtn}>
              <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
                {submittingUtr ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.ctaText}>Submit & Verify</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity onPress={handlePayUPI} style={styles.retryLink}>
              <Ionicons name="refresh" size={16} color={COLORS.primary} />
              <Text style={styles.retryText}>Pay Again</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </LinearGradient>
    );
  }

  // Success Screen
  if (step === 'done') {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <View style={styles.doneContainer}>
          <Text style={styles.doneIcon}>🎉</Text>
          <Text style={styles.doneTitle}>Payment Submitted!</Text>
          <Text style={styles.doneSub}>
            Your payment is being verified. Premium will be activated within a few hours.
          </Text>
          <TouchableOpacity
            onPress={() => { setStep('plan'); navigation.goBack(); }}
            style={[styles.utrSubmitBtn, { marginTop: 30, width: '80%' }]}
          >
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              <Text style={styles.ctaText}>Go Back</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // Main Plan Selection Screen
  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Go Premium" subtitle="Unlock Full Potential" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Hero */}
        <View style={styles.hero}>
          <LinearGradient colors={['#6C63FF20', '#FF6B6B10']} style={styles.heroGlow}>
            <Text style={styles.heroIcon}>{isPremium ? '🎉' : '👑'}</Text>
          </LinearGradient>
          <Text style={styles.heroTitle}>
            {isPremium ? "You're Premium!" : 'Upgrade to Premium'}
          </Text>
          <Text style={styles.heroSub}>
            {isPremium
              ? `${subStatus.plan} plan active. ${subStatus.daysLeft} days remaining.`
              : 'Unlimited AI chat, personalized plans & more'}
          </Text>
        </View>

        {/* Active Sub */}
        {isPremium && (
          <View style={styles.activeCard}>
            <LinearGradient colors={['#4CAF5020', '#4CAF5005']} style={styles.activeGrad}>
              <View style={styles.activeRow}>
                <View style={styles.activeIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeTitle}>Active Premium</Text>
                  <Text style={styles.activeSub}>{subStatus.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan</Text>
                </View>
                <View>
                  <Text style={styles.daysLeft}>{subStatus.daysLeft}</Text>
                  <Text style={styles.daysLabel}>days left</Text>
                </View>
              </View>
              {subStatus.expiry && (
                <Text style={styles.expiryText}>
                  Expires: {new Date(subStatus.expiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Compare Table */}
        {!isPremium && (
          <>
            <Text style={styles.sectionTitle}>Free vs Premium</Text>
            <View style={styles.compareTable}>
              {[
                { feature: 'AI Chat', free: '10/day', premium: 'Unlimited' },
                { feature: 'Diet Plans', free: 'Basic', premium: 'Personalized' },
                { feature: 'Analytics', free: 'Basic', premium: 'Advanced' },
                { feature: 'Support', free: 'Standard', premium: 'Priority' },
                { feature: 'Ads', free: 'Yes', premium: 'No Ads' },
              ].map((row, i) => (
                <View key={i} style={styles.compareRow}>
                  <Text style={styles.compareFeature}>{row.feature}</Text>
                  <Text style={styles.compareFree}>{row.free}</Text>
                  <View style={styles.premiumCell}>
                    <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                    <Text style={styles.comparePremium}>{row.premium}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Plan Cards */}
        {!isPremium && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Choose Plan</Text>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planCard, isSelected && styles.planCardSelected]}
                  onPress={() => setSelectedPlan(plan.id)}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={isSelected ? ['#6C63FF15', '#6C63FF05'] : [COLORS.darkCard, COLORS.darkSurface]}
                    style={styles.planGrad}
                  >
                    {plan.badge && (
                      <View style={styles.badgeContainer}>
                        <LinearGradient colors={COLORS.gradient2} style={styles.badge}>
                          <Text style={styles.badgeText}>{plan.badge}</Text>
                        </LinearGradient>
                      </View>
                    )}
                    <View style={styles.planHeader}>
                      <View>
                        <Text style={[styles.planName, isSelected && { color: COLORS.primary }]}>{plan.name}</Text>
                        <View style={styles.priceRow}>
                          {plan.originalPrice && <Text style={styles.originalPrice}>₹{plan.originalPrice}</Text>}
                          <Text style={[styles.planPrice, { color: isSelected ? COLORS.primary : COLORS.white }]}>₹{plan.price}</Text>
                          <Text style={styles.planPeriod}>{plan.period}</Text>
                        </View>
                      </View>
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                    </View>
                    <View style={styles.features}>
                      {plan.features.map((f, i) => (
                        <View key={i} style={styles.featureRow}>
                          <Ionicons name="checkmark-circle" size={16} color={isSelected ? COLORS.primary : COLORS.success} />
                          <Text style={styles.featureText}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Cancel */}
        {isPremium && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom CTA */}
      {!isPremium && (
        <View style={styles.bottom}>
          <TouchableOpacity onPress={handlePayUPI} disabled={loading} activeOpacity={0.8} style={styles.ctaContainer}>
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color={COLORS.white} />
                  <Text style={styles.ctaText}>
                    Pay ₹{selectedPlan === 'yearly' ? '299' : '29'} via UPI
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.secureText}>
            Google Pay • PhonePe • Paytm • Any UPI App
          </Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  hero: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  heroGlow: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroIcon: { fontSize: 40 },
  heroTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },
  heroSub: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 20 },

  activeCard: { borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.success + '40', marginBottom: 20 },
  activeGrad: { padding: 20, borderRadius: SIZES.radiusLg },
  activeRow: { flexDirection: 'row', alignItems: 'center' },
  activeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.success + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  activeTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  activeSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  daysLeft: { fontSize: SIZES.fontXxl, color: COLORS.success, ...FONTS.extraBold, textAlign: 'right' },
  daysLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'right' },
  expiryText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.darkBorder, paddingTop: 12 },

  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  compareTable: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder, overflow: 'hidden' },
  compareRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder },
  compareFeature: { flex: 2, fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  compareFree: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center' },
  premiumCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  comparePremium: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold, textAlign: 'center' },

  planCard: { borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1.5, borderColor: COLORS.darkBorder, marginBottom: 16 },
  planCardSelected: { borderColor: COLORS.primary },
  planGrad: { padding: 20, borderRadius: SIZES.radiusLg },
  badgeContainer: { alignSelf: 'flex-start', marginBottom: 10 },
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: SIZES.fontXs, color: COLORS.white, ...FONTS.bold, letterSpacing: 1 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 4 },
  originalPrice: { fontSize: SIZES.fontLg, color: COLORS.textMuted, ...FONTS.medium, textDecorationLine: 'line-through' },
  planPrice: { fontSize: SIZES.fontTitle, ...FONTS.extraBold },
  planPeriod: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: COLORS.darkBorder, alignItems: 'center', justifyContent: 'center' },
  radioSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium },

  cancelBtn: { alignSelf: 'center', marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '40' },
  cancelText: { fontSize: SIZES.fontMd, color: COLORS.error, ...FONTS.medium },

  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 34, paddingTop: 12, backgroundColor: COLORS.dark + 'F5', borderTopWidth: 1, borderTopColor: COLORS.darkBorder, alignItems: 'center' },
  ctaContainer: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden', ...SHADOWS.medium },
  ctaGrad: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: SIZES.radius },
  ctaText: { color: COLORS.white, fontSize: SIZES.fontLg, ...FONTS.bold },
  secureText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8 },

  // UTR Screen
  utrCard: { alignItems: 'center', paddingTop: 20 },
  utrIcon: { fontSize: 48, marginBottom: 12 },
  utrTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginBottom: 8 },
  utrSub: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 20 },
  utrInfoBox: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 16, width: '100%', marginBottom: 20, borderWidth: 1, borderColor: COLORS.darkBorder },
  utrInfoLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8 },
  utrInfoValue: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, marginBottom: 4 },
  inputLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, alignSelf: 'flex-start', marginBottom: 8 },
  utrInput: {
    width: '100%', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, padding: 16,
    fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold,
    textAlign: 'center', letterSpacing: 2, marginBottom: 12,
  },
  utrHelp: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 18, marginBottom: 24, paddingHorizontal: 10 },
  utrSubmitBtn: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden' },
  retryLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, padding: 10 },
  retryText: { color: COLORS.primary, fontSize: SIZES.fontMd, ...FONTS.medium },

  // Done Screen
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  doneIcon: { fontSize: 64, marginBottom: 20 },
  doneTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginBottom: 12 },
  doneSub: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 24 },
});

export default SubscriptionScreen;
