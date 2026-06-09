import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions, Linking, TextInput, Clipboard, Platform,
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
  const [step, setStep] = useState('plan'); // plan → manual → utr → done
  const [upiData, setUpiData] = useState(null);
  const [utrInput, setUtrInput] = useState('');
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userUpiId, setUserUpiId] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

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

  // Create payment record on backend
  const createPayment = async () => {
    const res = await api.post(ENDPOINTS.UPI_PAY, { plan: selectedPlan });
    if (!res.success) throw new Error(res.message || 'Could not start payment');
    return res.data;
  };

  // Option 1: Open UPI App directly
  const handlePayUPIApp = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await createPayment();
      setUpiData(data);

      const canOpen = await Linking.canOpenURL(data.upiUrl);
      if (canOpen) {
        await Linking.openURL(data.upiUrl);
        // After UPI app returns, go to UTR step
        setStep('utr');
      } else {
        Alert.alert('No UPI App', 'Install Google Pay, PhonePe or Paytm.', [
          { text: 'Pay Manually Instead', onPress: () => setStep('manual') },
          { text: 'Cancel', style: 'cancel' },
        ]);
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Option 2: Pay manually — show UPI ID
  const handlePayManual = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await createPayment();
      setUpiData(data);
      setStep('manual');
    } catch (error) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const copyUpiId = () => {
    if (upiData?.upiId) {
      Clipboard.setString(upiData.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Submit UTR
  const handleSubmitUTR = async () => {
    if (!utrInput.trim()) {
      Alert.alert('Enter UTR', 'Enter the UTR / Transaction ID from your payment app');
      return;
    }
    setSubmittingUtr(true);
    try {
      const res = await api.post(ENDPOINTS.UPI_CONFIRM, {
        subscriptionId: upiData.subscriptionId,
        utrNumber: utrInput.trim(),
      });
      if (res.success) setStep('done');
      else Alert.alert('Error', res.message || 'Failed');
    } catch (e) {
      Alert.alert('Error', 'Failed to submit. Try again.');
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
  const currentPrice = selectedPlan === 'yearly' ? 299 : 29;

  // Send payment request to user's UPI ID
  const handleSendUpiRequest = async () => {
    if (!userUpiId.trim() || !userUpiId.includes('@')) {
      Alert.alert('Invalid UPI ID', 'Enter a valid UPI ID like yourname@ybl, yourname@oksbi');
      return;
    }
    setSendingRequest(true);
    try {
      // Create payment if not already created
      let data = upiData;
      if (!data) {
        data = await createPayment();
        setUpiData(data);
      }
      // Open UPI intent — this opens the user's UPI app with ₹amount pre-filled
      await Linking.openURL(data.upiUrl);
      // After they come back, go to UTR step
      setStep('utr');
    } catch (e) {
      Alert.alert('Error', 'Could not open UPI app. Try Option 1 instead.');
    } finally {
      setSendingRequest(false);
    }
  };

  // ===== Manual Pay Screen — user enters their UPI ID =====
  if (step === 'manual') {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <Header title="Pay via UPI ID" onBack={() => setStep('plan')} />
        <ScrollView contentContainerStyle={[styles.scroll, { alignItems: 'center', paddingTop: 20 }]}>
          <Text style={styles.manualIcon}>📱</Text>
          <Text style={styles.manualTitle}>Enter Your UPI ID</Text>
          <Text style={styles.manualSub}>
            Enter your UPI ID and we'll send a payment request of ₹{currentPrice} to your UPI app.
          </Text>

          <View style={styles.upiBox}>
            <Text style={styles.upiBoxLabel}>Your UPI ID</Text>
            <TextInput
              style={styles.upiInput}
              placeholder="e.g. yourname@ybl, name@oksbi"
              placeholderTextColor={COLORS.textMuted}
              value={userUpiId}
              onChangeText={setUserUpiId}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.amountRow}>
              <Text style={styles.upiBoxLabel}>Amount</Text>
              <Text style={styles.upiAmountText}>₹{currentPrice}</Text>
            </View>
            <Text style={styles.upiBoxLabel}>Plan</Text>
            <Text style={styles.upiNameText}>{selectedPlan === 'yearly' ? 'Yearly' : 'Monthly'} Premium</Text>
          </View>

          <TouchableOpacity onPress={handleSendUpiRequest} disabled={sendingRequest} style={styles.paidBtn}>
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              {sendingRequest ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Ionicons name="send" size={18} color={COLORS.white} />
                  <Text style={styles.ctaText}>Pay ₹{currentPrice}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.utrHelp}>
            Payment request will open in your Google Pay, PhonePe, or default UPI app
          </Text>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ===== UTR Entry Screen =====
  if (step === 'utr' && upiData) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <Header title="Confirm Payment" onBack={() => setStep('plan')} />
        <ScrollView contentContainerStyle={[styles.scroll, { alignItems: 'center', paddingTop: 20 }]}>
          <Text style={styles.manualIcon}>✅</Text>
          <Text style={styles.manualTitle}>Payment Done?</Text>
          <Text style={styles.manualSub}>Enter the UTR / Transaction ID from your payment app to verify.</Text>

          <View style={styles.upiBox}>
            <Text style={styles.upiBoxLabel}>Paid To</Text>
            <Text style={styles.upiNameText}>FitAI Premium</Text>
            <Text style={styles.upiBoxLabel}>Amount</Text>
            <Text style={styles.upiAmountText}>₹{upiData.amount}</Text>
          </View>

          <Text style={[styles.upiBoxLabel, { alignSelf: 'flex-start', marginBottom: 8 }]}>UTR / Transaction ID</Text>
          <TextInput
            style={styles.utrInput}
            placeholder="Enter UTR number"
            placeholderTextColor={COLORS.textMuted}
            value={utrInput}
            onChangeText={setUtrInput}
            autoCapitalize="characters"
          />

          <Text style={styles.utrHelp}>
            💡 Google Pay → Activity → Tap payment → Copy UTR{'\n'}
            💡 PhonePe → History → Tap payment → Copy Ref ID
          </Text>

          <TouchableOpacity onPress={handleSubmitUTR} disabled={submittingUtr} style={styles.paidBtn}>
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              {submittingUtr ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.ctaText}>Submit & Verify</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setStep('manual')} style={styles.retryLink}>
            <Ionicons name="arrow-back" size={16} color={COLORS.primary} />
            <Text style={styles.retryText}>Show UPI ID Again</Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    );
  }

  // ===== Success Screen =====
  if (step === 'done') {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <View style={styles.doneContainer}>
          <Text style={styles.doneIcon}>🎉</Text>
          <Text style={styles.doneTitle}>Payment Submitted!</Text>
          <Text style={styles.doneSub}>
            Your payment is being verified.{'\n'}Premium will be activated shortly.
          </Text>
          <View style={styles.doneSteps}>
            <View style={styles.doneStep}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.doneStepText}>Payment sent via UPI</Text>
            </View>
            <View style={styles.doneStep}>
              <Ionicons name="hourglass-outline" size={20} color={COLORS.warning} />
              <Text style={styles.doneStepText}>Verification in progress...</Text>
            </View>
            <View style={styles.doneStep}>
              <Ionicons name="diamond-outline" size={20} color={COLORS.textMuted} />
              <Text style={[styles.doneStepText, { color: COLORS.textMuted }]}>Premium activation</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => { setStep('plan'); navigation.goBack(); }} style={styles.doneBtn}>
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              <Text style={styles.ctaText}>Go Back to App</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ===== Main Plan Selection Screen =====
  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Go Premium" subtitle="Unlock Full Potential" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <LinearGradient colors={['#6C63FF20', '#FF6B6B10']} style={styles.heroGlow}>
            <Text style={styles.heroIcon}>{isPremium ? '🎉' : '👑'}</Text>
          </LinearGradient>
          <Text style={styles.heroTitle}>{isPremium ? "You're Premium!" : 'Upgrade to Premium'}</Text>
          <Text style={styles.heroSub}>
            {isPremium ? `${subStatus.plan} plan active. ${subStatus.daysLeft} days remaining.` : 'Unlimited AI chat, personalized plans & more'}
          </Text>
        </View>

        {isPremium && (
          <View style={styles.activeCard}>
            <LinearGradient colors={['#4CAF5020', '#4CAF5005']} style={styles.activeGrad}>
              <View style={styles.activeRow}>
                <View style={styles.activeIcon}><Ionicons name="checkmark-circle" size={24} color={COLORS.success} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeTitle}>Active Premium</Text>
                  <Text style={styles.activeSub}>{subStatus.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan</Text>
                </View>
                <View>
                  <Text style={styles.daysLeft}>{subStatus.daysLeft}</Text>
                  <Text style={styles.daysLabel}>days left</Text>
                </View>
              </View>
            </LinearGradient>
          </View>
        )}

        {!isPremium && (
          <>
            <Text style={styles.sectionTitle}>Free vs Premium</Text>
            <View style={styles.compareTable}>
              {[
                { feature: 'AI Chat', free: '10/day', premium: 'Unlimited' },
                { feature: 'Diet Plans', free: 'Basic', premium: 'Personalized' },
                { feature: 'Analytics', free: 'Basic', premium: 'Advanced' },
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

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Choose Plan</Text>
            {plans.map((plan) => {
              const isSelected = selectedPlan === plan.id;
              return (
                <TouchableOpacity key={plan.id} style={[styles.planCard, isSelected && styles.planCardSelected]} onPress={() => setSelectedPlan(plan.id)} activeOpacity={0.8}>
                  <LinearGradient colors={isSelected ? ['#6C63FF15', '#6C63FF05'] : [COLORS.darkCard, COLORS.darkSurface]} style={styles.planGrad}>
                    {plan.badge && (
                      <View style={styles.badgeContainer}>
                        <LinearGradient colors={COLORS.gradient2} style={styles.badge}><Text style={styles.badgeText}>{plan.badge}</Text></LinearGradient>
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
                      <View style={[styles.radio, isSelected && styles.radioSelected]}>{isSelected && <View style={styles.radioInner} />}</View>
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

        {isPremium && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Bottom CTA — Two Options */}
      {!isPremium && (
        <View style={styles.bottom}>
          <TouchableOpacity onPress={handlePayUPIApp} disabled={loading} activeOpacity={0.8} style={styles.ctaContainer}>
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Ionicons name="wallet-outline" size={20} color={COLORS.white} />
                  <Text style={styles.ctaText}>Pay ₹{currentPrice} — Open UPI App</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={handlePayManual} style={styles.manualLink}>
            <Ionicons name="qr-code-outline" size={14} color={COLORS.primary} />
            <Text style={styles.manualLinkText}>Pay manually using UPI ID</Text>
          </TouchableOpacity>
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

  // Bottom
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 30, paddingTop: 12, backgroundColor: COLORS.dark + 'F5', borderTopWidth: 1, borderTopColor: COLORS.darkBorder, alignItems: 'center' },
  ctaContainer: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden', ...SHADOWS.medium },
  ctaGrad: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: SIZES.radius },
  ctaText: { color: COLORS.white, fontSize: SIZES.fontLg, ...FONTS.bold },
  manualLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, padding: 6 },
  manualLinkText: { color: COLORS.primary, fontSize: SIZES.fontSm, ...FONTS.medium },

  // Manual Pay Screen
  manualIcon: { fontSize: 48, marginBottom: 12 },
  manualTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginBottom: 8 },
  manualSub: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 22, paddingHorizontal: 10, marginBottom: 20 },
  upiBox: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 20, width: '100%', borderWidth: 1, borderColor: COLORS.darkBorder, marginBottom: 24 },
  upiBoxLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, textTransform: 'uppercase', marginTop: 10 },
  upiInput: {
    width: '100%', backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.primary + '40', padding: 16,
    fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginTop: 8, marginBottom: 12,
  },
  amountRow: { marginTop: 8 },
  upiAmountText: { fontSize: 28, color: COLORS.success, ...FONTS.extraBold, marginBottom: 4 },
  upiNameText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold, marginBottom: 4 },
  paidBtn: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden' },

  // UTR Screen
  utrInput: {
    width: '100%', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, padding: 16,
    fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold,
    textAlign: 'center', letterSpacing: 1, marginBottom: 12,
  },
  utrHelp: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  retryLink: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, padding: 10 },
  retryText: { color: COLORS.primary, fontSize: SIZES.fontMd, ...FONTS.medium },

  // Done Screen
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  doneIcon: { fontSize: 64, marginBottom: 20 },
  doneTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginBottom: 12 },
  doneSub: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  doneSteps: { width: '100%', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: COLORS.darkBorder },
  doneStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  doneStepText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  doneBtn: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden' },
});

export default SubscriptionScreen;
