import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';

const TYPE_ICONS = {
  reminder: '⏰', achievement: '🏆', tip: '💡', update: '📢', streak: '🔥', promo: '🎁',
};

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get(ENDPOINTS.NOTIFICATIONS);
      if (res.success) {
        setNotifications(res.data);
        setUnreadCount(res.unreadCount);
      }
    } catch (e) { console.log(e); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id) => {
    try {
      await api.put(`${ENDPOINTS.NOTIFICATIONS}/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.log(e); }
  };

  const markAllRead = async () => {
    try {
      await api.put(ENDPOINTS.NOTIFICATIONS_READ_ALL);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { console.log(e); }
  };

  const deleteNotif = async (id) => {
    try {
      await api.delete(`${ENDPOINTS.NOTIFICATIONS}/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (e) { console.log(e); }
  };

  const timeAgo = (date) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notifCard, !item.isRead && styles.unreadCard]}
      onPress={() => !item.isRead && markRead(item._id)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={!item.isRead ? [COLORS.primary + '10', COLORS.darkCard] : [COLORS.darkCard, COLORS.darkSurface]}
        style={styles.notifGradient}
      >
        <View style={styles.notifRow}>
          {item.data?.avatar && String(item.data.avatar).startsWith('data:') ? (
            <Image source={{ uri: item.data.avatar }} style={styles.notifAvatar} />
          ) : (item.data?.kind === 'new_member' || item.data?.kind === 'payment') ? (
            <View style={styles.notifInitial}>
              <Text style={styles.notifInitialText}>{(item.data?.memberName || 'M')[0].toUpperCase()}</Text>
            </View>
          ) : (
            <Text style={styles.notifIcon}>{TYPE_ICONS[item.type] || '💬'}</Text>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.notifTitle}>{item.title}</Text>
            <Text style={styles.notifBody}>{item.body}</Text>
            <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
          </View>
          <TouchableOpacity onPress={() => deleteNotif(item._id)} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
        {!item.isRead && <View style={styles.unreadDot} />}
      </LinearGradient>
    </TouchableOpacity>
  );

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header
        title="Notifications"
        subtitle={`${unreadCount} unread`}
        onBack={() => navigation.goBack()}
        rightIcon="checkmark-done"
        onRightPress={markAllRead}
      />

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubText}>Stay tuned for health tips & reminders!</Text>
            </View>
          }
        />
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  notifCard: { marginBottom: 10, borderRadius: SIZES.radiusLg, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.darkBorder },
  unreadCard: { borderColor: COLORS.primary + '40' },
  notifGradient: { padding: 14, borderRadius: SIZES.radiusLg },
  notifRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  notifIcon: { fontSize: 28, marginTop: 2 },
  notifAvatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: COLORS.primary + '50' },
  notifInitial: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  notifInitialText: { color: COLORS.onAccent, fontSize: SIZES.fontLg, ...FONTS.bold },
  notifTitle: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.bold },
  notifBody: { fontSize: SIZES.fontSm, color: COLORS.textSecondary, ...FONTS.regular, marginTop: 4, lineHeight: 20 },
  notifTime: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 6 },
  unreadDot: { position: 'absolute', top: 14, right: 14, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  deleteBtn: { padding: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: SIZES.fontLg, color: COLORS.textMuted, ...FONTS.bold },
  emptySubText: { fontSize: SIZES.fontSm, color: COLORS.textMuted, marginTop: 4 },
});

export default NotificationsScreen;
