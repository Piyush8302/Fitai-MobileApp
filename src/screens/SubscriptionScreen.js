import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import Header from '../components/Header';
import api, { API_BASE_URL, ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SubscriptionScreen = ({ navigation, route }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);
  const [subStatus, setSubStatus] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  useEffect(() => {
    loadToken();
    fetchStatus();
  }, []);

  // Re-fetch when coming back from checkout
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchStatus();
    });
    return unsubscribe;
  }, [navigation]);

  const loadToken = async () => {
    const token = await AsyncStorage.getItem('token');
    if (token) api.setToken(token);
  };

  const fetchStatus = async () => {
    try {
      const res = await api.get(ENDPOINTS.MY_SUBSCRIPTION);
      if (res.success) setSubStatus(res.data);
    } catch (e) {
      console.log('Status fetch error:', e);
    } finally {
      setLoadingStatus(false);
    }
  };

  const handleSubscribe = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // 1. Create order on backend
      const res = await api.post(ENDPOINTS.CREATE_ORDER, { plan: selectedPlan });
      if (!res.success) {
        Alert.alert('Error', res.message || 'Could not create order');
        setLoading(false);
        return;
      }

      const { subscriptionId } = res.data;

      // 2. Open checkout page in WebBrowser
      const checkoutUrl = `${API_BASE_URL}/api/subscription/checkout/${subscriptionId}`;
      await WebBrowser.openBrowserAsync(checkoutUrl, {
        dismissButtonStyle: 'cancel',
        showTitle: true,
        toolbarColor: '#0D0D1A',
      });

      // 3. After browser closes, re-fetch status
      await fetchStatus();

      if (subStatus?.isPremium) {
        Alert.alert('Premium Activated!', 'You now have unlimited AI chat and all premium features!', [
          { text: 'Awesome!', onPress: () => navigation.goBack() },
        ]);
      }
    } catch (error) {
      console.log('Subscribe error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    Alert.alert(
      'Cancel Subscription',
      'Are you sure? Your premium will remain active until the expiry date.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await api.post(ENDPOINTS.CANCEL_SUB);
              if (res.success) {
                Alert.alert('Cancelled', res.message);
                fetchStatus();
              }
            } catch (e) {
              Alert.alert('Error', 'Could not cancel subscription');
            }
          },
        },
      ]
    );
  };

  const plans = [
    {
      id: 'monthly',
      name: 'Premium Monthly',
      price: 29,
      period: '/month',
      badge: null,
      features: [
        'Unlimited AI Chat (no daily limit)',
        'Personalized AI Diet Plans',
        'Advanced Progress Analytics',
        'Priority Support',
        'Ad-Free Experience',
      ],
    },
    {
      id: 'yearly',
      name: 'Premium Yearly',
      price: 249,
      originalPrice: 348,
      period: '/year',
      badge: '28% OFF',
      features: [
        'Everything in Monthly',
        'Yearly Progress Reports',
        'Exclusive Workout Challenges',
        'Early Access to New Features',
      ],
    },
  ];

  const isPremium = subStatus?.isPremium;

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
            {isPremium ? 'You\'re Premium!' : 'Upgrade to Premium'}
          </Text>
          <Text style={styles.heroSub}>
            {isPremium
              ? `Your ${subStatus.plan} plan is active. ${subStatus.daysLeft} days remaining.`
              : 'Unlock unlimited AI chat, personalized plans & more'}
          </Text>
        </View>

        {/* Active Subscription Info */}
        {isPremium && (
          <View style={styles.activeCard}>
            <LinearGradient colors={['#4CAF5020', '#4CAF5005']} style={styles.activeGrad}>
              <View style={styles.activeRow}>
                <View style={styles.activeIcon}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activeTitle}>Active Premium</Text>
                  <Text style={styles.activeSub}>
                    {subStatus.plan === 'yearly' ? 'Yearly' : 'Monthly'} Plan
                  </Text>
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

        {/* Free vs Premium Comparison */}
        {!isPremium && (
          <>
            <Text style={styles.sectionTitle}>Free vs Premium</Text>
            <View style={styles.compareTable}>
              <View style={[styles.compareRow, styles.compareHeader]}>
                <Text style={[styles.compareFeature, { color: COLORS.white }]}>Feature</Text>
                <Text style={[styles.compareFree, { color: COLORS.textMuted }]}>Free</Text>
                <Text style={[styles.comparePremium, { color: COLORS.primary }]}>Premium</Text>
              </View>
              {[
                { feature: 'AI Chat', free: '10/day', premium: 'Unlimited' },
                { feature: 'AI Diet Plans', free: 'Basic', premium: 'Personalized' },
                { feature: 'Progress Analytics', free: 'Basic', premium: 'Advanced' },
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
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.planName, isSelected && { color: COLORS.primary }]}>
                          {plan.name}
                        </Text>
                        <View style={styles.priceRow}>
                          {plan.originalPrice && (
                            <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
                          )}
                          <Text style={[styles.planPrice, { color: isSelected ? COLORS.primary : COLORS.white }]}>
                            {plan.price}
                          </Text>
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

        {/* Cancel Button for Premium Users */}
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
          <TouchableOpacity
            onPress={handleSubscribe}
            disabled={loading}
            activeOpacity={0.8}
            style={styles.ctaContainer}
          >
            <LinearGradient colors={COLORS.gradient1} style={styles.ctaGrad}>
              {loading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <>
                  <Ionicons name="diamond" size={20} color={COLORS.white} />
                  <Text style={styles.ctaText}>
                    Subscribe {selectedPlan === 'yearly' ? '249/year' : '29/month'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.secureText}>Secured by Razorpay</Text>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  // Hero
  hero: { alignItems: 'center', marginBottom: 24, paddingTop: 8 },
  heroGlow: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  heroIcon: { fontSize: 40 },
  heroTitle: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold },
  heroSub: {
    fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium,
    textAlign: 'center', marginTop: 8, lineHeight: 22, paddingHorizontal: 20,
  },

  // Active card
  activeCard: {
    borderRadius: SIZES.radiusLg, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.success + '40', marginBottom: 20,
  },
  activeGrad: { padding: 20, borderRadius: SIZES.radiusLg },
  activeRow: { flexDirection: 'row', alignItems: 'center' },
  activeIcon: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  activeTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  activeSub: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  daysLeft: { fontSize: SIZES.fontXxl, color: COLORS.success, ...FONTS.extraBold, textAlign: 'right' },
  daysLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'right' },
  expiryText: {
    fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium,
    marginTop: 12, borderTopWidth: 1, borderTopColor: COLORS.darkBorder, paddingTop: 12,
  },

  // Compare
  sectionTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 14, marginTop: 8 },
  compareTable: {
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, overflow: 'hidden',
  },
  compareHeader: { backgroundColor: COLORS.darkSurface },
  compareRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.darkBorder,
  },
  compareFeature: { flex: 2, fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },
  compareFree: { flex: 1, fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, textAlign: 'center' },
  premiumCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  comparePremium: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold, textAlign: 'center' },

  // Plans
  planCard: {
    borderRadius: SIZES.radiusLg, overflow: 'hidden',
    borderWidth: 1.5, borderColor: COLORS.darkBorder, marginBottom: 16,
  },
  planCardSelected: { borderColor: COLORS.primary },
  planGrad: { padding: 20, borderRadius: SIZES.radiusLg },
  badgeContainer: { alignSelf: 'flex-start', marginBottom: 10 },
  badge: { borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { fontSize: SIZES.fontXs, color: COLORS.white, ...FONTS.bold, letterSpacing: 1 },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  planName: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4, gap: 4 },
  originalPrice: {
    fontSize: SIZES.fontLg, color: COLORS.textMuted, ...FONTS.medium,
    textDecorationLine: 'line-through',
  },
  planPrice: { fontSize: SIZES.fontTitle, ...FONTS.extraBold },
  planPeriod: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium },
  radio: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.darkBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: COLORS.primary },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  features: { gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium },

  // Cancel
  cancelBtn: {
    alignSelf: 'center', marginTop: 24,
    paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.error + '40',
  },
  cancelText: { fontSize: SIZES.fontMd, color: COLORS.error, ...FONTS.medium },

  // Bottom CTA
  bottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingBottom: 34, paddingTop: 12,
    backgroundColor: COLORS.dark + 'F5',
    borderTopWidth: 1, borderTopColor: COLORS.darkBorder,
    alignItems: 'center',
  },
  ctaContainer: { width: '100%', borderRadius: SIZES.radius, overflow: 'hidden', ...SHADOWS.medium },
  ctaGrad: {
    paddingVertical: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: SIZES.radius,
  },
  ctaText: { color: COLORS.white, fontSize: SIZES.fontLg, ...FONTS.bold },
  secureText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8 },
});

export default SubscriptionScreen;
