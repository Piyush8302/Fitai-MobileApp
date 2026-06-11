import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Modal, ScrollView, Alert, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FoodDatabaseScreen = ({ navigation }) => {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [selectedFood, setSelectedFood] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [mealType, setMealType] = useState('lunch');
  const [servings, setServings] = useState(1);
  const [dietPref, setDietPref] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const toastAnim = useRef(new Animated.Value(-100)).current;
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef(null);

  const showToast = (foodName, cal, meal) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ foodName, cal, meal });
    toastAnim.setValue(-100);
    toastOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(toastAnim, { toValue: 55, useNativeDriver: true, friction: 8 }),
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => {
      Animated.parallel([
        Animated.timing(toastAnim, { toValue: -100, duration: 300, useNativeDriver: true }),
        Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setToast(null));
    }, 2500);
  };

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      let pref = null;
      try {
        const profileRes = await api.get(ENDPOINTS.GET_ME);
        if (profileRes.success) {
          const u = profileRes.data || profileRes.user;
          if (u.dietPreference) { pref = u.dietPreference; setDietPref(u.dietPreference); }
        }
      } catch (e) { console.log(e); }
      try {
        const catParams = pref ? { dietPref: pref } : {};
        const res = await api.get(ENDPOINTS.FOOD_CATEGORIES, catParams);
        if (res.success) setCategories(res.data);
      } catch (e) { console.log(e); }
    })();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.q = search;
        if (selectedSource) params.source = selectedSource;
        if (selectedCategory) params.category = selectedCategory;
        if (dietPref) params.dietPref = dietPref;
        const res = await api.get(ENDPOINTS.FOOD, params);
        if (res.success) setFoods(res.data);
      } catch (e) { console.log(e); }
      setLoading(false);
    };
    const timer = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, selectedSource, selectedCategory, dietPref]);

  const getHealthScore = (food) => {
    let score = 50;
    if (food.protein >= 15) score += 20;
    else if (food.protein >= 8) score += 10;
    if (food.fiber >= 4) score += 15;
    else if (food.fiber >= 2) score += 8;
    if (food.fat <= 5) score += 10;
    if (food.calories <= 150) score += 5;
    if (food.calories > 400) score -= 10;
    return Math.min(100, Math.max(0, score));
  };

  const getHealthLabel = (score) => {
    if (score >= 80) return { text: 'Excellent', color: COLORS.success };
    if (score >= 60) return { text: 'Good', color: '#4CAF50' };
    if (score >= 40) return { text: 'Moderate', color: COLORS.warning };
    return { text: 'Indulgent', color: COLORS.secondary };
  };

  const handleLogMeal = async () => {
    if (!selectedFood) return;
    try {
      const totalCal = Math.round(selectedFood.calories * servings);
      const totalProtein = parseFloat((selectedFood.protein * servings).toFixed(1));
      const res = await api.post(ENDPOINTS.LOG_MEAL, {
        mealType,
        items: [{ name: selectedFood.name, calories: totalCal, protein: totalProtein }],
        totalCalories: totalCal,
      });
      if (res.success) {
        setShowDetail(false);
        setServings(1);
        showToast(selectedFood.name, totalCal, mealType);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not log meal. Please try again.');
    }
  };

  const renderFood = ({ item }) => {
    const score = getHealthScore(item);
    const health = getHealthLabel(score);
    return (
      <TouchableOpacity
        style={styles.foodCard}
        activeOpacity={0.8}
        onPress={() => { setSelectedFood(item); setShowDetail(true); setServings(1); }}
      >
        <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.foodGradient}>
          <View style={styles.foodHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.foodName}>{item.name}</Text>
              {item.hindiName && <Text style={styles.hindiName}>{item.hindiName}</Text>}
            </View>
            <View style={styles.calBadge}>
              <Text style={styles.calValue}>{item.calories}</Text>
              <Text style={styles.calLabel}>kcal</Text>
            </View>
          </View>

          <View style={styles.servingRow}>
            <Text style={styles.serving}>📏 {item.serving}</Text>
            <View style={[styles.healthBadge, { backgroundColor: health.color + '20' }]}>
              <Text style={[styles.healthText, { color: health.color }]}>{health.text}</Text>
            </View>
          </View>

          <View style={styles.macroRow}>
            <View style={[styles.macroPill, { backgroundColor: COLORS.accent + '20' }]}>
              <Text style={[styles.macroText, { color: COLORS.accent }]}>P: {item.protein}g</Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: COLORS.warning + '20' }]}>
              <Text style={[styles.macroText, { color: COLORS.warning }]}>C: {item.carbs}g</Text>
            </View>
            <View style={[styles.macroPill, { backgroundColor: COLORS.secondary + '20' }]}>
              <Text style={[styles.macroText, { color: COLORS.secondary }]}>F: {item.fat}g</Text>
            </View>
            {item.fiber > 0 && (
              <View style={[styles.macroPill, { backgroundColor: COLORS.success + '20' }]}>
                <Text style={[styles.macroText, { color: COLORS.success }]}>Fiber: {item.fiber}g</Text>
              </View>
            )}
          </View>

          <View style={styles.foodFooter}>
            <Text style={styles.categoryLabel}>{item.category}</Text>
            <Text style={styles.sourceLabel}>{item.source === 'indian' ? '🇮🇳 Indian' : '🌍 International'}</Text>
            {item.isVeg && <Text style={styles.vegLabel}>🟢 Veg</Text>}
            {item.isVeg === false && <Text style={styles.nonVegLabel}>🔴 Non-Veg</Text>}
            <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} style={{ marginLeft: 'auto' }} />
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Food Details" subtitle="Nutrition & Health Info" onBack={() => navigation.goBack()} />

      {/* How We Track Banner */}
      <TouchableOpacity style={styles.infoBanner}>
        <LinearGradient colors={['#4CAF5015', COLORS.darkCard]} style={styles.infoBannerGrad}>
          <Ionicons name="information-circle" size={20} color="#4CAF50" />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.infoTitle}>How Health Tracking Works</Text>
            <Text style={styles.infoSub}>
              We measure nutrition per serving using protein, carbs, fat & fiber. Tap any food to see details & log it to your daily meals.
            </Text>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={COLORS.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search food (e.g., paneer, chicken, roti)..."
          placeholderTextColor={COLORS.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Source Filter */}
      <View style={styles.filterRow}>
        {[null, 'indian', 'international'].map((s) => (
          <TouchableOpacity
            key={s || 'all'}
            style={[styles.filterChip, selectedSource === s && styles.filterActive]}
            onPress={() => setSelectedSource(s)}
          >
            <Text style={[styles.filterText, selectedSource === s && styles.filterTextActive]}>
              {s === null ? '🍽 All' : s === 'indian' ? '🇮🇳 Indian' : '🌍 International'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <View style={styles.catWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catScrollContent}>
            <TouchableOpacity
              style={[styles.catChip, !selectedCategory && styles.catChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.catChipText, !selectedCategory && { color: COLORS.primary, ...FONTS.bold }]}>All</Text>
            </TouchableOpacity>
            {categories.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[styles.catChip, selectedCategory === c.name && styles.catChipActive]}
                onPress={() => setSelectedCategory(selectedCategory === c.name ? null : c.name)}
              >
                <Text style={[styles.catChipText, selectedCategory === c.name && { color: COLORS.primary, ...FONTS.bold }]}>
                  {c.name} ({c.count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={foods}
          renderItem={renderFood}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No food items found. Try different search.</Text>}
        />
      )}

      {/* ===== FOOD DETAIL MODAL ===== */}
      <Modal visible={showDetail} transparent animationType="slide" onRequestClose={() => setShowDetail(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient colors={[COLORS.darkCard, COLORS.dark]} style={styles.modalGrad}>
              {selectedFood && (
                <ScrollView showsVerticalScrollIndicator={false}>
                  {/* Modal Header */}
                  <View style={styles.modalHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{selectedFood.name}</Text>
                      {selectedFood.hindiName && <Text style={styles.modalHindi}>{selectedFood.hindiName}</Text>}
                    </View>
                    <TouchableOpacity onPress={() => setShowDetail(false)} style={styles.modalClose}>
                      <Ionicons name="close" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>

                  {/* Health Score */}
                  {(() => {
                    const score = getHealthScore(selectedFood);
                    const health = getHealthLabel(score);
                    return (
                      <View style={[styles.healthScoreCard, { borderColor: health.color + '40' }]}>
                        <View style={[styles.healthScoreCircle, { borderColor: health.color }]}>
                          <Text style={[styles.healthScoreNum, { color: health.color }]}>{score}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={[styles.healthScoreLabel, { color: health.color }]}>Health Score: {health.text}</Text>
                          <Text style={styles.healthScoreDesc}>
                            Based on protein, fiber, fat content & calorie density per serving
                          </Text>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Nutrition Facts */}
                  <Text style={styles.detailSection}>🔬 Nutrition Facts</Text>
                  <Text style={styles.detailServing}>Per serving: {selectedFood.serving}</Text>

                  <View style={styles.nutriGrid}>
                    {[
                      { label: 'Calories', value: `${Math.round(selectedFood.calories * servings)}`, unit: 'kcal', color: COLORS.secondary, icon: '🔥' },
                      { label: 'Protein', value: `${(selectedFood.protein * servings).toFixed(1)}`, unit: 'g', color: COLORS.accent, icon: '💪' },
                      { label: 'Carbs', value: `${(selectedFood.carbs * servings).toFixed(1)}`, unit: 'g', color: COLORS.warning, icon: '🌾' },
                      { label: 'Fat', value: `${(selectedFood.fat * servings).toFixed(1)}`, unit: 'g', color: '#FF6B6B', icon: '🧈' },
                      { label: 'Fiber', value: `${((selectedFood.fiber || 0) * servings).toFixed(1)}`, unit: 'g', color: COLORS.success, icon: '🌿' },
                    ].map((n, i) => (
                      <View key={i} style={[styles.nutriItem, { borderColor: n.color + '30' }]}>
                        <Text style={styles.nutriIcon}>{n.icon}</Text>
                        <Text style={[styles.nutriValue, { color: n.color }]}>{n.value}{n.unit}</Text>
                        <Text style={styles.nutriLabel}>{n.label}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Macro Breakdown Bar */}
                  <Text style={styles.detailSection}>📊 Macro Breakdown</Text>
                  {(() => {
                    const totalMacro = selectedFood.protein + selectedFood.carbs + selectedFood.fat;
                    if (totalMacro === 0) return null;
                    const pPct = Math.round((selectedFood.protein / totalMacro) * 100);
                    const cPct = Math.round((selectedFood.carbs / totalMacro) * 100);
                    const fPct = 100 - pPct - cPct;
                    return (
                      <View>
                        <View style={styles.macroBreakdownBar}>
                          <View style={[styles.macroSegment, { width: `${pPct}%`, backgroundColor: COLORS.accent }]} />
                          <View style={[styles.macroSegment, { width: `${cPct}%`, backgroundColor: COLORS.warning }]} />
                          <View style={[styles.macroSegment, { width: `${fPct}%`, backgroundColor: '#FF6B6B' }]} />
                        </View>
                        <View style={styles.macroLegend}>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: COLORS.accent }]} />
                            <Text style={styles.legendText}>Protein {pPct}%</Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: COLORS.warning }]} />
                            <Text style={styles.legendText}>Carbs {cPct}%</Text>
                          </View>
                          <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                            <Text style={styles.legendText}>Fat {fPct}%</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })()}

                  {/* Servings Selector */}
                  <Text style={styles.detailSection}>🍽 Servings</Text>
                  <View style={styles.servingsRow}>
                    <TouchableOpacity
                      style={styles.servingBtn}
                      onPress={() => setServings(Math.max(0.5, servings - 0.5))}
                    >
                      <Ionicons name="remove" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.servingsValue}>{servings}</Text>
                    <TouchableOpacity
                      style={styles.servingBtn}
                      onPress={() => setServings(servings + 0.5)}
                    >
                      <Ionicons name="add" size={20} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>

                  {/* Meal Type Selector */}
                  <Text style={styles.detailSection}>📝 Log to Meal</Text>
                  <View style={styles.mealTypeRow}>
                    {['breakfast', 'lunch', 'dinner', 'snack'].map((m) => (
                      <TouchableOpacity
                        key={m}
                        style={[styles.mealTypeBtn, mealType === m && styles.mealTypeBtnActive]}
                        onPress={() => setMealType(m)}
                      >
                        <Text style={styles.mealTypeIcon}>
                          {m === 'breakfast' ? '🌅' : m === 'lunch' ? '☀️' : m === 'dinner' ? '🌙' : '🍪'}
                        </Text>
                        <Text style={[styles.mealTypeText, mealType === m && { color: COLORS.primary }]}>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Log Button */}
                  <TouchableOpacity style={styles.logBtn} onPress={handleLogMeal}>
                    <LinearGradient colors={COLORS.gradient1} style={styles.logBtnGrad}>
                      <Ionicons name="add-circle" size={22} color={COLORS.onAccent} />
                      <Text style={styles.logBtnText}>
                        Log {Math.round(selectedFood.calories * servings)} kcal to {mealType.charAt(0).toUpperCase() + mealType.slice(1)}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <View style={{ height: 30 }} />
                </ScrollView>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Toast Notification */}
      {toast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: toastAnim }], opacity: toastOpacity }]}>
          <LinearGradient colors={[COLORS.darkCard, COLORS.darkCard]} style={styles.toastGradient}>
            <View style={styles.toastIconWrap}>
              <Ionicons name="checkmark-circle" size={22} color={COLORS.success} />
            </View>
            <View style={styles.toastContent}>
              <Text style={styles.toastTitle}>Added to {toast.meal}</Text>
              <Text style={styles.toastMsg} numberOfLines={1}>{toast.foodName} • {toast.cal} kcal</Text>
            </View>
            <TouchableOpacity onPress={() => {
              Animated.timing(toastOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null));
            }}>
              <Ionicons name="close" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Info Banner
  infoBanner: { marginHorizontal: 16, marginBottom: 10, borderRadius: SIZES.radius, overflow: 'hidden' },
  infoBannerGrad: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: SIZES.radius, borderWidth: 1, borderColor: '#4CAF5030' },
  infoTitle: { fontSize: SIZES.fontSm, color: '#4CAF50', ...FONTS.bold },
  infoSub: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2, lineHeight: 16 },

  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },

  // Filters
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  filterChip: {
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  filterActive: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary },
  filterText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  filterTextActive: { color: COLORS.primary },

  // Category
  catWrap: { height: 46, marginBottom: 10 },
  catScrollContent: { paddingHorizontal: 16, alignItems: 'center' },
  catChip: {
    height: 38, justifyContent: 'center',
    backgroundColor: COLORS.darkCard, borderRadius: 19, paddingHorizontal: 16,
    borderWidth: 1, borderColor: COLORS.darkBorder, marginRight: 8,
  },
  catChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '20' },
  catChipText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium, textTransform: 'capitalize' },

  // List
  list: { padding: 16, paddingBottom: 100 },
  foodCard: { marginBottom: 12, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  foodGradient: { padding: 14, borderRadius: SIZES.radiusLg },
  foodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  foodName: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  hindiName: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  calBadge: { alignItems: 'center', backgroundColor: COLORS.primary + '20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  calValue: { fontSize: SIZES.fontLg, color: COLORS.primary, ...FONTS.bold },
  calLabel: { fontSize: 9, color: COLORS.textMuted, ...FONTS.medium },

  servingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  serving: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  healthBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 3 },
  healthText: { fontSize: SIZES.fontXs, ...FONTS.bold },

  macroRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  macroPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  macroText: { fontSize: SIZES.fontSm, ...FONTS.bold },
  foodFooter: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  categoryLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, textTransform: 'capitalize' },
  sourceLabel: { fontSize: SIZES.fontXs, color: COLORS.primary },
  vegLabel: { fontSize: SIZES.fontXs, color: COLORS.success },
  nonVegLabel: { fontSize: SIZES.fontXs, color: COLORS.secondary },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },

  // ===== MODAL =====
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { maxHeight: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  modalGrad: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  modalTitle: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  modalHindi: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 4 },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.darkBorder, alignItems: 'center', justifyContent: 'center' },

  // Health Score
  healthScoreCard: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, marginBottom: 20,
  },
  healthScoreCircle: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 3,
    alignItems: 'center', justifyContent: 'center',
  },
  healthScoreNum: { fontSize: SIZES.fontXl, ...FONTS.bold },
  healthScoreLabel: { fontSize: SIZES.fontMd, ...FONTS.bold },
  healthScoreDesc: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2, lineHeight: 16 },

  // Nutrition Grid
  detailSection: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 10, marginTop: 4 },
  detailServing: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginBottom: 12 },
  nutriGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  nutriItem: {
    width: '30%', flexGrow: 1, alignItems: 'center', padding: 12,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1,
  },
  nutriIcon: { fontSize: 20, marginBottom: 4 },
  nutriValue: { fontSize: SIZES.fontLg, ...FONTS.bold },
  nutriLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },

  // Macro Breakdown
  macroBreakdownBar: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', marginBottom: 10 },
  macroSegment: { height: '100%' },
  macroLegend: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.medium },

  // Servings
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 20 },
  servingBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  servingsValue: { fontSize: 28, color: COLORS.white, ...FONTS.bold, minWidth: 50, textAlign: 'center' },

  // Meal Type
  mealTypeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  mealTypeBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  mealTypeBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' },
  mealTypeIcon: { fontSize: 20, marginBottom: 4 },
  mealTypeText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },

  // Log Button
  logBtn: { borderRadius: SIZES.radius, overflow: 'hidden' },
  logBtnGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8, borderRadius: SIZES.radius },
  logBtnText: { fontSize: SIZES.fontMd, color: COLORS.onAccent, ...FONTS.bold },

  // Toast
  toastContainer: {
    position: 'absolute', top: 0, right: 16, left: 16,
    zIndex: 999, elevation: 999,
  },
  toastGradient: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.success + '30',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 10,
  },
  toastIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: COLORS.success + '20',
    alignItems: 'center', justifyContent: 'center',
  },
  toastContent: { flex: 1 },
  toastTitle: { fontSize: SIZES.fontSm, color: COLORS.success, ...FONTS.bold, textTransform: 'capitalize' },
  toastMsg: { fontSize: SIZES.fontXs, color: COLORS.textSecondary, ...FONTS.medium, marginTop: 1 },
});

export default FoodDatabaseScreen;
