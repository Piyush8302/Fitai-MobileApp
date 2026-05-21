import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FREE_LIMIT = 10;

const AIChatScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm your AI Fitness Coach\n\nAsk me anything about diet, workout, weight loss, muscle gain, or health!", sender: 'ai' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [remaining, setRemaining] = useState(FREE_LIMIT);
  const [isPremium, setIsPremium] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const scrollRef = useRef(null);

  const [suggestions, setSuggestions] = useState([
    'What should I eat for weight loss?',
    'Best chest exercises?',
    'How much protein do I need?',
    'How to reduce belly fat?',
    'Indian diet plan',
    'Healthy breakfast ideas?',
  ]);

  const followUpSuggestions = [
    ['Tell me more', 'Give me a diet plan', 'Any exercises for this?', 'Indian alternatives?'],
    ['How many calories?', 'Best time to eat?', 'Home workout for this?', 'Weekly plan?'],
    ['Vegetarian options?', 'How much water?', 'Supplements needed?', 'Common mistakes?'],
    ['Beginner friendly?', 'How long to see results?', 'Morning vs evening?', 'Any side effects?'],
  ];

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      try {
        const res = await api.get(ENDPOINTS.CHAT_SUGGESTIONS);
        if (res.success && res.data?.length > 0) setSuggestions(res.data);
      } catch (e) { console.log('Suggestions load error:', e); }
      // Fetch subscription status
      try {
        const sub = await api.get(ENDPOINTS.MY_SUBSCRIPTION);
        if (sub.success) {
          setIsPremium(sub.data.isPremium || false);
          if (sub.data.isPremium) setRemaining(-1);
        }
      } catch (e) { console.log('Sub status error:', e); }
    })();
  }, []);

  // Re-check premium when screen focuses (after purchasing)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', async () => {
      try {
        const sub = await api.get(ENDPOINTS.MY_SUBSCRIPTION);
        if (sub.success && sub.data.isPremium) {
          setIsPremium(true);
          setRemaining(-1);
          setLimitReached(false);
        }
      } catch (e) {}
    });
    return unsubscribe;
  }, [navigation]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading || limitReached) return;

    const newMsg = { id: Date.now(), text: msg, sender: 'user' };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post(ENDPOINTS.SEND_CHAT, { message: msg });

      // Handle limit reached
      if (res.limitReached) {
        setLimitReached(true);
        setRemaining(0);
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          text: res.message || "You've used all free messages today. Upgrade to Premium for unlimited chat!",
          sender: 'ai',
          isLimit: true,
        }]);
        return;
      }

      if (res.success && res.data?.reply) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: res.data.reply, sender: 'ai' }]);
        if (res.data.remaining !== undefined) setRemaining(res.data.remaining);
        if (res.data.isPremium !== undefined) setIsPremium(res.data.isPremium);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          text: "Sorry, I couldn't process that. Try asking about diet, workouts, or health tips!",
          sender: 'ai',
        }]);
      }
    } catch (error) {
      console.log('Chat error:', error);
      setMessages((prev) => [...prev, {
        id: Date.now() + 1,
        text: "Network error. Please check your connection and try again.",
        sender: 'ai',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <Header
        title="AI Health Assistant"
        subtitle={isPremium ? 'Premium - Unlimited' : `${remaining} messages left today`}
        onBack={() => navigation.goBack()}
        rightIcon={isPremium ? 'diamond' : 'diamond-outline'}
        onRightPress={() => navigation.navigate('Subscription')}
      />

      {/* Remaining Messages Bar (free users) */}
      {!isPremium && (
        <View style={styles.limitBar}>
          <View style={styles.limitBarInner}>
            <View style={[styles.limitProgress, { width: `${Math.max(0, (remaining / FREE_LIMIT) * 100)}%` }]} />
          </View>
          <Text style={styles.limitText}>
            {remaining > 0 ? `${remaining}/${FREE_LIMIT} free messages` : 'No messages left'}
          </Text>
          {remaining <= 3 && remaining > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Subscription')} style={styles.upgradeChip}>
              <Text style={styles.upgradeChipText}>Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <KeyboardAvoidingView style={styles.flex} behavior={'padding'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.msgRow, msg.sender === 'user' && styles.userRow]}>
              {msg.sender === 'ai' && (
                <View style={styles.aiBubbleIcon}>
                  <Text style={{ fontSize: 16 }}>{msg.isLimit ? '🔒' : '🤖'}</Text>
                </View>
              )}
              <View style={[
                styles.bubble,
                msg.sender === 'user' ? styles.userBubble : styles.aiBubble,
                msg.isLimit && styles.limitBubble,
              ]}>
                <Text style={[styles.msgText, msg.sender === 'user' && styles.userText]}>{msg.text}</Text>
                {msg.isLimit && (
                  <TouchableOpacity
                    style={styles.upgradeBtn}
                    onPress={() => navigation.navigate('Subscription')}
                  >
                    <LinearGradient colors={COLORS.gradient1} style={styles.upgradeBtnGrad}>
                      <Ionicons name="diamond" size={16} color={COLORS.white} />
                      <Text style={styles.upgradeBtnText}>Upgrade to Premium</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          {loading && (
            <View style={[styles.msgRow]}>
              <View style={styles.aiBubbleIcon}>
                <Text style={{ fontSize: 16 }}>🤖</Text>
              </View>
              <View style={[styles.bubble, styles.aiBubble]}>
                <ActivityIndicator color={COLORS.primary} size="small" />
              </View>
            </View>
          )}

          {!loading && !limitReached && (
            <View style={styles.suggestions}>
              <Text style={styles.sugTitle}>{messages.length <= 1 ? 'Quick Questions' : 'Ask Follow-up'}</Text>
              <View style={styles.sugGrid}>
                {(messages.length <= 1
                  ? suggestions
                  : followUpSuggestions[Math.floor(Math.random() * followUpSuggestions.length)]
                ).map((q, i) => (
                  <TouchableOpacity key={i} style={styles.sugChip} onPress={() => sendMessage(q)}>
                    <Text style={styles.sugText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Limit Reached - Upgrade Prompt */}
          {limitReached && !loading && (
            <View style={styles.limitPrompt}>
              <LinearGradient colors={['#6C63FF15', '#FF6B6B10']} style={styles.limitPromptGrad}>
                <Text style={styles.limitPromptIcon}>👑</Text>
                <Text style={styles.limitPromptTitle}>Daily Limit Reached</Text>
                <Text style={styles.limitPromptSub}>
                  Upgrade to Premium for unlimited AI chat at just 29/month
                </Text>
                <TouchableOpacity
                  style={styles.limitPromptBtn}
                  onPress={() => navigation.navigate('Subscription')}
                >
                  <LinearGradient colors={COLORS.gradient1} style={styles.limitPromptBtnGrad}>
                    <Ionicons name="diamond" size={18} color={COLORS.white} />
                    <Text style={styles.limitPromptBtnText}>Go Premium</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
          <View style={[styles.inputContainer, limitReached && { opacity: 0.5 }]}>
            <TextInput
              style={styles.input}
              placeholder={limitReached ? 'Upgrade to continue chatting...' : 'Ask about diet, workout, health...'}
              placeholderTextColor={COLORS.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              editable={!limitReached}
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity
              onPress={() => limitReached ? navigation.navigate('Subscription') : sendMessage()}
              style={styles.sendBtn}
              disabled={loading}
            >
              <LinearGradient colors={limitReached ? COLORS.gradient4 : COLORS.gradient1} style={styles.sendGrad}>
                <Ionicons name={limitReached ? 'diamond' : 'send'} size={18} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },

  // Limit bar
  limitBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: COLORS.darkCard, borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder, gap: 10,
  },
  limitBarInner: {
    flex: 1, height: 4, backgroundColor: COLORS.darkBorder,
    borderRadius: 2, overflow: 'hidden',
  },
  limitProgress: {
    height: '100%', backgroundColor: COLORS.primary, borderRadius: 2,
  },
  limitText: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium },
  upgradeChip: {
    backgroundColor: COLORS.primary + '20', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  upgradeChipText: { fontSize: SIZES.fontXs, color: COLORS.primary, ...FONTS.bold },

  // Messages
  messages: { paddingHorizontal: 16, paddingBottom: 10, paddingTop: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  userRow: { justifyContent: 'flex-end' },
  aiBubbleIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary + '20',
    alignItems: 'center', justifyContent: 'center', marginRight: 8,
  },
  bubble: { maxWidth: '78%', padding: 14, borderRadius: SIZES.radiusLg },
  aiBubble: {
    backgroundColor: COLORS.darkCard, borderBottomLeftRadius: 4,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  userBubble: { backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
  limitBubble: { borderColor: COLORS.warning + '40' },
  msgText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 22 },
  userText: { color: COLORS.white },

  // Upgrade button in limit message
  upgradeBtn: { marginTop: 12, borderRadius: SIZES.radius, overflow: 'hidden' },
  upgradeBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: SIZES.radius, gap: 8,
  },
  upgradeBtnText: { color: COLORS.white, fontSize: SIZES.fontSm, ...FONTS.bold },

  // Suggestions
  suggestions: { marginTop: 16, paddingBottom: 20 },
  sugTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 14 },
  sugGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sugChip: {
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  sugText: { fontSize: SIZES.fontSm, color: COLORS.primaryLight, ...FONTS.medium },

  // Limit prompt
  limitPrompt: { marginTop: 12, borderRadius: SIZES.radiusLg, overflow: 'hidden' },
  limitPromptGrad: {
    padding: 24, borderRadius: SIZES.radiusLg, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.primary + '30',
  },
  limitPromptIcon: { fontSize: 40, marginBottom: 12 },
  limitPromptTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold, marginBottom: 8 },
  limitPromptSub: {
    fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium,
    textAlign: 'center', lineHeight: 22, marginBottom: 16,
  },
  limitPromptBtn: { borderRadius: SIZES.radius, overflow: 'hidden', width: '100%' },
  limitPromptBtnGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, borderRadius: SIZES.radius, gap: 8,
  },
  limitPromptBtnText: { color: COLORS.white, fontSize: SIZES.fontLg, ...FONTS.bold },

  // Input
  inputBar: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: COLORS.dark, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { borderRadius: 20, overflow: 'hidden', marginLeft: 8 },
  sendGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

export default AIChatScreen;
