import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

const ArticleDetailScreen = ({ route, navigation }) => {
  const { slug } = route.params;
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(`${ENDPOINTS.ARTICLES}/${slug}`);
        if (res.success) setArticle(res.data);
      } catch (e) { console.log(e); }
      setLoading(false);
    };
    load();
  }, [slug]);

  const handleLike = async () => {
    if (!article) return;
    try {
      const res = await api.put(`${ENDPOINTS.ARTICLES}/${article._id}/like`);
      if (res.success) setArticle(prev => ({ ...prev, likes: res.likes }));
    } catch (e) { console.log(e); }
  };

  // Simple HTML-to-Text renderer
  const renderContent = (html) => {
    if (!html) return null;
    const parts = html.split(/(<[^>]+>)/g).filter(Boolean);
    const elements = [];
    let key = 0;

    for (const part of parts) {
      if (part.startsWith('<h2')) continue;
      if (part === '</h2>') continue;
      if (part.startsWith('<h3')) continue;
      if (part === '</h3>') continue;
      if (part.startsWith('<p')) continue;
      if (part === '</p>') continue;
      if (part.startsWith('<ul') || part === '</ul>' || part.startsWith('<ol') || part === '</ol>') continue;
      if (part.startsWith('<li')) continue;
      if (part === '</li>') continue;
      if (part.startsWith('<strong')) continue;
      if (part === '</strong>') continue;
      if (part.startsWith('<')) continue;

      const text = part.trim();
      if (!text) continue;
      elements.push(<Text key={key++} style={styles.contentText}>{text}</Text>);
    }
    return elements;
  };

  if (loading) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <Header title="Loading..." onBack={() => navigation.goBack()} />
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      </LinearGradient>
    );
  }

  if (!article) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
        <Header title="Not Found" onBack={() => navigation.goBack()} />
        <View style={styles.center}><Text style={styles.emptyText}>Article not found</Text></View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Article" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>{article.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.author}>✍️ {article.author}</Text>
          <Text style={styles.readTime}>📖 {article.readTime} min</Text>
          <Text style={styles.source}>{article.source === 'indian' ? '🇮🇳' : '🌍'} {article.source}</Text>
        </View>
        <View style={styles.tagRow}>
          {(article.tags || []).map((t, i) => (
            <View key={i} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>
          ))}
        </View>
        <View style={styles.divider} />
        <Text style={styles.summary}>{article.summary}</Text>
        <View style={styles.divider} />
        <View style={styles.contentBox}>
          {renderContent(article.content)}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.likeBtn} onPress={handleLike}>
            <Ionicons name="heart" size={20} color={COLORS.secondary} />
            <Text style={styles.likeBtnText}>{article.likes || 0} Likes</Text>
          </TouchableOpacity>
          <Text style={styles.views}>👁 {article.views || 0} views</Text>
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: SIZES.fontXxl, color: COLORS.white, ...FONTS.bold, lineHeight: 32, marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  author: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.medium },
  readTime: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  source: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { backgroundColor: COLORS.primary + '15', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: SIZES.fontXs, color: COLORS.primaryLight, ...FONTS.medium },
  divider: { height: 1, backgroundColor: COLORS.darkBorder, marginVertical: 14 },
  summary: { fontSize: SIZES.fontMd, color: COLORS.accent, ...FONTS.medium, lineHeight: 22, fontStyle: 'italic' },
  contentBox: { marginTop: 4 },
  contentText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.regular, lineHeight: 24, marginBottom: 8 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  likeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.secondary + '15', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  likeBtnText: { fontSize: SIZES.fontSm, color: COLORS.secondary, ...FONTS.bold },
  views: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
});

export default ArticleDetailScreen;
