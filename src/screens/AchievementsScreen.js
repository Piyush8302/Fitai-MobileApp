import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

const AchievementsScreen = ({ navigation }) => {
  const [achievements, setAchievements] = useState([]);
  const [unlocked, setUnlocked] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get(ENDPOINTS.ACHIEVEMENTS);
        if (res.success) {
          setAchievements(res.data);
          setUnlocked(res.unlocked);
          setTotal(res.total);
        }
      } catch (e) { console.log(e); }
      setLoading(false);
    };
    load();
  }, []);

  const checkNew = async () => {
    try {
      const res = await api.post(ENDPOINTS.ACHIEVEMENTS_CHECK);
      if (res.success && res.newlyUnlocked > 0) {
        // Reload achievements
        const fresh = await api.get(ENDPOINTS.ACHIEVEMENTS);
        if (fresh.success) {
          setAchievements(fresh.data);
          setUnlocked(fresh.unlocked);
        }
      }
    } catch (e) { console.log(e); }
  };

  const renderAchievement = ({ item }) => (
    <View style={[styles.achievementCard, !item.isUnlocked && styles.lockedCard]}>
      <LinearGradient
        colors={item.isUnlocked ? [COLORS.primary + '20', COLORS.darkCard] : [COLORS.darkCard, COLORS.darkSurface]}
        style={styles.achievementGradient}
      >
        <Text style={styles.icon}>{item.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, !item.isUnlocked && styles.lockedTitle]}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
          {item.isUnlocked && item.unlockedAt && (
            <Text style={styles.unlockedDate}>
              🎉 Unlocked {new Date(item.unlockedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
        {item.isUnlocked ? (
          <View style={styles.unlockedBadge}><Text style={styles.unlockedText}>✓</Text></View>
        ) : (
          <View style={styles.lockedBadge}><Text style={styles.lockedText}>🔒</Text></View>
        )}
      </LinearGradient>
    </View>
  );

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Achievements" subtitle="Earn badges & rewards" onBack={() => navigation.goBack()} />

      {/* Progress Card */}
      <View style={styles.progressCard}>
        <LinearGradient colors={['#6C63FF20', COLORS.darkCard]} style={styles.progressGradient}>
          <Text style={styles.progressTitle}>Your Progress</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressCount}>
              <Text style={styles.progressHighlight}>{unlocked}</Text> / {total}
            </Text>
            <Text style={styles.progressLabel}>Badges Unlocked</Text>
          </View>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={COLORS.gradient1}
              style={[styles.progressFill, { width: `${total > 0 ? (unlocked / total) * 100 : 0}%` }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            />
          </View>
          <TouchableOpacity style={styles.checkBtn} onPress={checkNew}>
            <Text style={styles.checkBtnText}>🔍 Check for New Achievements</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={achievements}
          renderItem={renderAchievement}
          keyExtractor={(item) => item.type}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  progressCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  progressGradient: { padding: 16, borderRadius: SIZES.radiusLg },
  progressTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginBottom: 10 },
  progressCount: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  progressHighlight: { color: COLORS.primary, fontSize: SIZES.fontHero },
  progressLabel: { fontSize: SIZES.fontSm, color: COLORS.textMuted },
  progressBar: { height: 8, backgroundColor: COLORS.darkBorder, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', borderRadius: 4 },
  checkBtn: { backgroundColor: COLORS.primary + '20', borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  checkBtnText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
  list: { padding: 16, paddingBottom: 100 },
  achievementCard: { marginBottom: 10, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  lockedCard: { opacity: 0.6 },
  achievementGradient: { padding: 14, borderRadius: SIZES.radiusLg, flexDirection: 'row', alignItems: 'center', gap: 14 },
  icon: { fontSize: 36 },
  title: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold },
  lockedTitle: { color: COLORS.textMuted },
  description: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.regular, marginTop: 2 },
  unlockedDate: { fontSize: SIZES.fontXs, color: COLORS.success, marginTop: 4 },
  unlockedBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.success, alignItems: 'center', justifyContent: 'center' },
  unlockedText: { fontSize: 16, color: COLORS.white, ...FONTS.bold },
  lockedBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.darkBorder, alignItems: 'center', justifyContent: 'center' },
  lockedText: { fontSize: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export default AchievementsScreen;
