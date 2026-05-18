import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

const CATEGORY_ICONS = {
  nutrition: '🥗', workout: '🏋️', wellness: '🧘', weight_loss: '⚖️',
  weight_gain: '💪', yoga: '🧘‍♂️', mental_health: '🧠', indian_diet: '🇮🇳',
  international_diet: '🌍', supplements: '💊', disease_prevention: '🏥', home_remedies: '🌿',
};

const ArticlesScreen = ({ navigation }) => {
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadArticles = useCallback(async () => {
    try {
      const params = {};
      if (selectedCategory) params.category = selectedCategory;
      const res = await api.get(ENDPOINTS.ARTICLES, params);
      if (res.success) setArticles(res.data);
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const res = await api.get(ENDPOINTS.ARTICLES_CATEGORIES);
      if (res.success) setCategories(res.data);
    } catch (e) { console.log(e); }
  };

  useEffect(() => { loadCategories(); }, []);
  useEffect(() => { setLoading(true); loadArticles(); }, [loadArticles]);

  const renderArticle = ({ item }) => (
    <TouchableOpacity
      style={styles.articleCard}
      onPress={() => navigation.navigate('ArticleDetail', { slug: item.slug })}
      activeOpacity={0.8}
    >
      <LinearGradient colors={[COLORS.darkCard, COLORS.darkSurface]} style={styles.articleGradient}>
        <View style={styles.articleHeader}>
          <Text style={styles.categoryIcon}>{CATEGORY_ICONS[item.category] || '📰'}</Text>
          <View style={styles.articleMeta}>
            <Text style={styles.sourceBadge}>{item.source === 'indian' ? '🇮🇳 Indian' : item.source === 'international' ? '🌍 International' : '🤖 FitAI'}</Text>
            <Text style={styles.readTime}>📖 {item.readTime} min read</Text>
          </View>
        </View>
        <Text style={styles.articleTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.articleSummary} numberOfLines={2}>{item.summary}</Text>
        <View style={styles.articleFooter}>
          <View style={styles.articleStats}>
            <Text style={styles.statText}>👁 {item.views || 0}</Text>
            <Text style={styles.statText}>❤️ {item.likes || 0}</Text>
          </View>
          <View style={styles.tagRow}>
            {(item.tags || []).slice(0, 2).map((t, i) => (
              <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
            ))}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Health Articles" subtitle="Indian & International" onBack={() => navigation.goBack()} />

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll} contentContainerStyle={styles.categoryContent}>
        <TouchableOpacity
          style={[styles.categoryChip, !selectedCategory && styles.categoryActive]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map((c, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.categoryChip, selectedCategory === c._id && styles.categoryActive]}
            onPress={() => setSelectedCategory(selectedCategory === c._id ? null : c._id)}
          >
            <Text style={styles.categoryIcon2}>{CATEGORY_ICONS[c._id] || '📰'}</Text>
            <Text style={[styles.categoryText, selectedCategory === c._id && styles.categoryTextActive]}>
              {(c._id || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} ({c.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={articles}
          renderItem={renderArticle}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadArticles(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={<Text style={styles.emptyText}>No articles found</Text>}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  categoryScroll: { maxHeight: 50 },
  categoryContent: { paddingHorizontal: 16, gap: 8, alignItems: 'center' },
  categoryChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  categoryActive: { backgroundColor: COLORS.primary + '30', borderColor: COLORS.primary },
  categoryText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  categoryTextActive: { color: COLORS.primary },
  categoryIcon2: { fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  articleCard: { marginBottom: 14, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  articleGradient: { padding: 16, borderRadius: SIZES.radiusLg },
  articleHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryIcon: { fontSize: 28 },
  articleMeta: { alignItems: 'flex-end' },
  sourceBadge: { fontSize: SIZES.fontXs, color: COLORS.primary, ...FONTS.bold },
  readTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  articleTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 6, lineHeight: 22 },
  articleSummary: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.regular, lineHeight: 20, marginBottom: 10 },
  articleFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  articleStats: { flexDirection: 'row', gap: 12 },
  statText: { fontSize: SIZES.fontXs, color: COLORS.textMuted },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: { backgroundColor: COLORS.primary + '15', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 10, color: COLORS.primaryLight, ...FONTS.medium },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, textAlign: 'center', marginTop: 40 },
});

export default ArticlesScreen;
