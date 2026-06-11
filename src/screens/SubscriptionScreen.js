import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, TextInput, Linking, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SubscriptionScreen = ({ navigation }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [step, setStep] = useState('plan'); // plan → paying → done
  const [upiId, setUpiId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState(''); // pending → success
  const [showUpiModal, setShowUpiModal] = useState(false);
  const pollingRef = useRef(null);
  const orderIdRef = useRef(null);

  useEffect(() => {
    loadToken();
    fetchStatus();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
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

  // Cashfree Payment Link
  const handlePay = async () => {
    setLoading(true);
    setShowUpiModal(false);
    try {
      const res = await api.post(ENDPOINTS.CASHFREE_PAY, { plan: selectedPlan });

      if (!res.success) {
        Alert.alert('Error', res.message || 'Failed to create payment');
        setLoading(false);
        return;
      }

      orderIdRef.current = res.data.linkId;

      // Open Cashfree payment page in browser
      await WebBrowser.openBrowserAsync(res.data.paymentUrl, {
        toolbarColor: COLORS.dark,
        dismissButtonStyle: 'done',
      });

      // After browser closes, poll for payment status
      setStep('paying');
      pollingRef.current = setInterval(async () => {
        try {
          const statusRes = await api.get(`${ENDPOINTS.CASHFREE_STATUS}/${orderIdRef.current}`);
          if (statusRes.success && statusRes.data.status === 'active') {
            clearInterval(pollingRef.current);
            setStep('done');
            fetchStatus();
          }
        } catch (e) {}
      }, 3000);

      setTimeout(() => {
        if (pollingRef.current) clearInterval(pollingRef.current);
      }, 300000);

    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // Direct UPI App pay (opens Google Pay / PhonePe)
  const handleDirectUPI = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.UPI_PAY, { plan: selectedPlan });
      if (!res.success) {
        Alert.alert('Error', res.message || 'Could not start payment');
        setLoading(false);
        return;
      }
      await Linking.openURL(res.data.upiUrl);
    } catch (e) {
      Alert.alert('Error', 'Could not open UPI app. Use "Enter UPI ID" option instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const daysLeft = subStatus?.daysLeft || 0;
    const planName = subStatus?.plan === 'yearly' ? 'Yearly' : 'Monthly';
    Alert.alert(
      '⚠️ Cancel Subscription?',
      `You are about to cancel your ${planName} plan.\n\n` +
      `• No refund will be issued${daysLeft > 0 ? ` for the remaining ${daysLeft} days` : ''}\n` +
      `• Premium features will be removed immediately\n` +
      `• Unlimited AI chat will stop working\n\n` +
      `This action cannot be undone.`,
      [
        { text: 'Keep Premium', style: 'cancel' },
        {
          text: 'Cancel Anyway',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post(ENDPOINTS.CANCEL_SUB);
              if (res.success) {
                Alert.alert('Subscription Cancelled', 'Your premium access has been removed. You can re-subscribe anytime.');
                fetchStatus();
              } else {
                Alert.alert('Error', res.message || 'Could not cancel');
              }
            } catch (e) { Alert.alert('Error', 'Could not cancel. Please try again.'); }
          },
        },
      ]
    );
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

  // ===== Waiting for Payment Approval =====
  if (step === 'paying') {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <View style={styles.doneContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginBottom: 20 }} />
          <Text style={styles.doneTitle}>Approve Payment</Text>
          <Text style={styles.doneSub}>
            Payment request of ₹{currentPrice} sent to{'\n'}
            <Text style={{ color: COLORS.primary, fontWeight: 'bold' }}>{upiId}</Text>
          </Text>
          <View style={styles.doneSteps}>
            <View style={styles.doneStep}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.doneStepText}>Request sent to your UPI app</Text>
            </View>
            <View style={styles.doneStep}>
              <ActivityIndicator size={16} color={COLORS.warning} />
              <Text style={styles.doneStepText}>Waiting for approval...</Text>
            </View>
            <View style={styles.doneStep}>
              <Ionicons name="diamond-outline" size={20} color={COLORS.textMuted} />
              <Text style={[styles.doneStepText, { color: COLORS.textMuted }]}>Premium activation</Text>
            </View>
          </View>
          <Text style={styles.helpText}>
            Open Google Pay / PhonePe → Check notifications → Approve ₹{currentPrice} payment
          </Text>
          <TouchableOpacity onPress={() => { if (pollingRef.current) clearInterval(pollingRef.current); setStep('plan'); }} style={styles.cancelLink}>
            <Text style={styles.cancelLinkText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  // ===== Payment Success =====
  if (step === 'done') {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <View style={styles.doneContainer}>
          <Text style={styles.doneIcon}>🎉</Text>
          <Text style={styles.doneTitle}>Premium Activated!</Text>
          <Text style={styles.doneSub}>You now have unlimited AI chat and all premium features!</Text>
          <View style={styles.doneSteps}>
            <View style={styles.doneStep}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.doneStepText}>Payment received</Text>
            </View>
            <View style={styles.doneStep}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={styles.doneStepText}>Verified automatically</Text>
            </View>
            <View style={styles.doneStep}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
              <Text style={[styles.doneStepText, { color: COLORS.success }]}>Premium activated! 🎉</Text>
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

  // ===== Main Screen =====
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

            {/* UPI Pay Button */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Pay via UPI</Text>
          </>
        )}

        {isPremium && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
            <Text style={styles.cancelText}>Cancel Subscription</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 120 }} />
      </ScrollView>

      {!isPremium && (
        <View style={styles.bottom}>
          <TouchableOpacity onPress={() => setShowUpiModal(true)} activeOpacity={0.8} style={styles.ctaContainer}>
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              <Ionicons name="send" size={18} color={COLORS.onAccent} />
              <Text style={styles.ctaText}>Pay ₹{currentPrice} via UPI</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDirectUPI} disabled={loading} style={styles.directUpiBtn}>
            <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
            <Text style={styles.directUpiText}>Or open UPI App directly</Text>
          </TouchableOpacity>
          <Text style={styles.secureText}>Secured by Cashfree • UPI</Text>
        </View>
      )}

      {/* Payment Confirmation Modal */}
      <Modal visible={showUpiModal} transparent animationType="slide" onRequestClose={() => setShowUpiModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowUpiModal(false)} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Pay ₹{currentPrice} via UPI</Text>
          <Text style={styles.modalSub}>
            A secure Cashfree payment page will open. Pay using Google Pay, PhonePe, or any UPI app.
          </Text>

          <View style={styles.modalInfo}>
            <View style={styles.modalInfoRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.modalInfoText}>Google Pay, PhonePe, Paytm supported</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.modalInfoText}>Premium auto-activates after payment</Text>
            </View>
            <View style={styles.modalInfoRow}>
              <Ionicons name="shield-checkmark" size={18} color={COLORS.success} />
              <Text style={styles.modalInfoText}>100% secure — powered by Cashfree</Text>
            </View>
          </View>

          <TouchableOpacity onPress={handlePay} disabled={loading} style={styles.modalBtn}>
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              {loading ? <ActivityIndicator color={COLORS.white} /> : (
                <>
                  <Ionicons name="wallet" size={18} color={COLORS.onAccent} />
                  <Text style={styles.ctaText}>Pay ₹{currentPrice}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </Modal>
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
  badgeText: { fontSize: SIZES.fontXs, color: COLORS.onAccent, ...FONTS.bold, letterSpacing: 1 },
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

  // UPI Section
  upiSection: { backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, padding: 20, borderWidth: 1, borderColor: COLORS.darkBorder },
  upiLabel: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, marginBottom: 10 },
  upiInput: {
    backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, borderWidth: 1.5,
    borderColor: COLORS.primary + '40', padding: 16, fontSize: SIZES.fontLg,
    color: COLORS.white, ...FONTS.bold,
  },
  upiHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 10, lineHeight: 18 },

  cancelBtn: { alignSelf: 'center', marginTop: 24, paddingHorizontal: 20, paddingVertical: 12, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '40' },
  cancelText: { fontSize: SIZES.fontMd, color: COLORS.error, ...FONTS.medium },

  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingBottom: 34, paddingTop: 12, backgroundColor: COLORS.dark + 'F5', borderTopWidth: 1, borderTopColor: COLORS.darkBorder, alignItems: 'center' },
  ctaContainer: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden', ...SHADOWS.medium },
  ctaGrad: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: SIZES.radius },
  ctaText: { color: COLORS.onAccent, fontSize: SIZES.fontLg, ...FONTS.bold },
  directUpiBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, padding: 8 },
  directUpiText: { color: COLORS.primary, fontSize: SIZES.fontSm, ...FONTS.medium },
  secureText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 6 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  modalCard: {
    backgroundColor: COLORS.darkCard, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40, borderTopWidth: 1, borderColor: COLORS.darkBorder,
  },
  modalHandle: { width: 40, height: 4, backgroundColor: COLORS.darkBorder, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 8 },
  modalSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, lineHeight: 20, marginBottom: 20 },
  modalInput: {
    backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius,
    borderWidth: 1.5, borderColor: COLORS.primary + '60', padding: 16,
    fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 12,
  },
  modalHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, lineHeight: 18, marginBottom: 20 },
  modalBtn: { borderRadius: SIZES.radius, overflow: 'hidden' },
  modalInfo: { backgroundColor: COLORS.darkSurface, borderRadius: SIZES.radius, padding: 16, marginBottom: 20, gap: 12 },
  modalInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalInfoText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, flex: 1 },

  // Done / Paying screens
  doneContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  doneIcon: { fontSize: 64, marginBottom: 20 },
  doneTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, marginBottom: 12 },
  doneSub: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 24, marginBottom: 30 },
  doneSteps: { width: '100%', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: COLORS.darkBorder },
  doneStep: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  doneStepText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  doneBtn: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden' },
  helpText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  cancelLink: { padding: 10 },
  cancelLinkText: { color: COLORS.error, fontSize: SIZES.fontMd, ...FONTS.medium },
});

export default SubscriptionScreen;
