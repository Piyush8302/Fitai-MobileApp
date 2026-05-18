import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

const FoodDatabaseScreen = ({ navigation }) => {
  const [foods, setFoods] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = {};
        if (search) params.q = search;
        if (selectedSource) params.source = selectedSource;
        const res = await api.get(ENDPOINTS.FOOD, params);
        if (res.success) setFoods(res.data);
      } catch (e) { console.log(e); }
      setLoading(false);
    };

    const timer = setTimeout(load, search ? 400 : 0);
    return () => clearTimeout(timer);
  }, [search, selectedSource]);

  const getMacroColor = (type) => {
    switch (type) {
      case 'protein': return COLORS.accent;
      case 'carbs': return COLORS.warning;
      case 'fat': return COLORS.secondary;
      default: return COLORS.textMuted;
    }
  };

  const renderFood = ({ item }) => (
    <TouchableOpacity style={styles.foodCard} activeOpacity={0.8}>
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
        <Text style={styles.serving}>📏 {item.serving}</Text>
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
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Food Database" subtitle="Search calories & macros" onBack={() => navigation.goBack()} />

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
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder,
    marginHorizontal: 16, marginBottom: 10, paddingHorizontal: 14, height: 48,
  },
  searchInput: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 10 },
  filterChip: {
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  filterActive: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary },
  filterText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  filterTextActive: { color: COLORS.primary },
  list: { padding: 16, paddingBottom: 100 },
  foodCard: { marginBottom: 12, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  foodGradient: { padding: 14, borderRadius: SIZES.radiusLg },
  foodHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  foodName: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  hindiName: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  calBadge: { alignItems: 'center', backgroundColor: COLORS.primary + '20', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4 },
  calValue: { fontSize: SIZES.fontLg, color: COLORS.primary, ...FONTS.bold },
  calLabel: { fontSize: 9, color: COLORS.textMuted, ...FONTS.medium },
  serving: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginBottom: 8 },
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
});

export default FoodDatabaseScreen;
