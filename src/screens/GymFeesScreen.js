import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS, SHADOWS } from '../constants/theme';
import Header from '../components/Header';
import api from '../config/api';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const GymFeesScreen = ({ navigation, route }) => {
  const { gymId, gymName, filter: initFilter } = route.params || {};
  const [summary, setSummary] = useState(null);
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState(initFilter || 'due'); // default: members who owe
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(`/api/gym/${gymId}/fees`);
      if (res.success) { setSummary(res.summary); setMembers(res.data || []); }
    } catch (e) { console.log('fees', e); }
    setLoading(false);
  }, [gymId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { const un = navigation.addListener('focus', load); return un; }, [navigation, load]);
  const onRefresh = async () => { setRefreshing(true); try { await load(); } catch (e) {} setRefreshing(false); };

  const s = summary || {};
  const cards = [
    { key: 'active', label: 'Active Members', count: s.activeMembers, icon: 'people', grad: ['#6C63FF', '#8B85FF'] },
    { key: 'due', label: 'Due Members', count: s.dueMembers, amount: s.totalPending, icon: 'alert-circle', grad: ['#FF6B6B', '#FF8E53'] },
    { key: 'today', label: 'Due Today', count: s.dueToday, amount: s.dueTodayAmount, icon: 'today', grad: ['#FB8C00', '#FFB300'] },
    { key: 'upcoming', label: 'Upcoming (7d)', count: s.upcoming, amount: s.upcomingAmount, icon: 'calendar', grad: ['#00D2FF', '#4FACFE'] },
    { key: 'overdue', label: 'Overdue', count: s.overdue, amount: s.overdueAmount, icon: 'warning', grad: ['#E53935', '#FF6B6B'] },
    { key: 'pending', label: 'Pending ₹', amount: s.totalPending, isAmount: true, icon: 'wallet', grad: ['#22C55E', '#16A34A'] },
  ];

  const filtered = (() => {
    if (filter === 'active') return members;
    if (filter === 'due' || filter === 'pending') return members.filter(m => m.bucket === 'overdue' || m.bucket === 'today');
    return members.filter(m => m.bucket === filter);
  })();

  const dueBadge = (m) => {
    if (m.bucket === 'overdue') return { t: `Overdue ${Math.abs(m.daysDiff)}d`, c: COLORS.error };
    if (m.bucket === 'today') return { t: 'Due today', c: COLORS.warning };
    if (m.bucket === 'upcoming') return { t: `Due in ${m.daysDiff}d`, c: COLORS.accent };
    return { t: `Paid till ${fmtDate(m.dueDate)}`, c: COLORS.success };
  };

  const activeCard = cards.find(c => c.key === filter);

  if (loading) {
    return (
      <LinearGradient colors={COLORS.gradientDark} style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header title="Fee Dues" subtitle={gymName || 'Members & pending fees'} onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />}>

        {/* Summary cards — tap to filter */}
        <View style={styles.grid}>
          {cards.map((c) => {
            const active = filter === c.key;
            return (
              <TouchableOpacity key={c.key} style={[styles.cardWrap, active && styles.cardWrapActive]} activeOpacity={0.85} onPress={() => setFilter(c.key)}>
                <LinearGradient colors={c.grad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
                  <View style={styles.cardTop}>
                    <View style={styles.cardChip}><Ionicons name={c.icon} size={15} color="#FFF" /></View>
                    {active && <Ionicons name="checkmark-circle" size={16} color="#FFF" />}
                  </View>
                  <Text style={styles.cardValue} numberOfLines={1} adjustsFontSizeToFit>
                    {c.isAmount ? `₹${c.amount || 0}` : (c.count ?? 0)}
                  </Text>
                  <Text style={styles.cardLabel} numberOfLines={1}>{c.label}</Text>
                  {!c.isAmount && c.amount != null && (
                    <Text style={styles.cardSub}>₹{c.amount || 0} pending</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Filtered list header */}
        <View style={styles.listHead}>
          <Text style={styles.listTitle}>{activeCard?.label || 'Members'}</Text>
          <Text style={styles.listCount}>{filtered.length} {filtered.length === 1 ? 'member' : 'members'}</Text>
        </View>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>🎉</Text>
            <Text style={styles.emptyText}>No members in this bucket.</Text>
          </View>
        ) : filtered.map((m) => {
          const b = dueBadge(m);
          return (
            <TouchableOpacity key={m._id} style={styles.row} activeOpacity={0.7}
              onPress={() => navigation.navigate('GymMemberDetail', { membershipId: m._id, gymId })}>
              {m.user?.avatar && /^(data:|http)/.test(m.user.avatar) ? (
                <Image source={{ uri: m.user.avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar}><Text style={styles.avatarInitial}>{(m.user?.name || 'M')[0].toUpperCase()}</Text></View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>{m.user?.name || 'Member'}</Text>
                <Text style={styles.meta}>{m.user?.phone} • {m.plan}</Text>
                <Text style={[styles.badge, { color: b.c }]}>{b.t}{m.dueDate && m.bucket !== 'ok' ? ` • ${fmtDate(m.dueDate)}` : ''}</Text>
              </View>
              <View style={styles.right}>
                {m.pending > 0 && <Text style={styles.amount}>₹{m.pending}</Text>}
                <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 16, paddingBottom: 20 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  cardWrap: { width: '47%', flexGrow: 1, borderRadius: 16, overflow: 'hidden', ...SHADOWS.medium },
  cardWrapActive: { borderWidth: 2, borderColor: '#FFFFFF' },
  card: { padding: 14, minHeight: 100, borderRadius: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardChip: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  cardValue: { fontSize: 26, color: '#FFFFFF', ...FONTS.extraBold },
  cardLabel: { fontSize: SIZES.fontSm, color: 'rgba(255,255,255,0.95)', ...FONTS.semiBold, marginTop: 2 },
  cardSub: { fontSize: SIZES.fontXs, color: 'rgba(255,255,255,0.85)', ...FONTS.medium, marginTop: 2 },

  listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 12 },
  listTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  listCount: { fontSize: SIZES.fontSm, color: COLORS.textMuted, ...FONTS.semiBold },

  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginBottom: 8, backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, borderWidth: 1, borderColor: COLORS.darkBorder },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: SIZES.fontLg, color: COLORS.onAccent, ...FONTS.bold },
  name: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  meta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 1, textTransform: 'capitalize' },
  badge: { fontSize: SIZES.fontXs, ...FONTS.semiBold, marginTop: 3 },
  right: { alignItems: 'flex-end', flexDirection: 'row', gap: 6, alignItems: 'center' },
  amount: { fontSize: SIZES.fontMd, color: COLORS.error, ...FONTS.bold },

  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium },
});

export default GymFeesScreen;
