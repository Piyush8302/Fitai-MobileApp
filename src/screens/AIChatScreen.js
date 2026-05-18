import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import Header from '../components/Header';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AIChatScreen = ({ navigation }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hi! I'm your AI Fitness Coach 🏋️\n\nAsk me anything about diet, workout, weight loss, muscle gain, or health!", sender: 'ai' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const [suggestions, setSuggestions] = useState([
    'What should I eat for weight loss?',
    'Best chest exercises?',
    'How much protein do I need?',
    'How to reduce belly fat?',
    'Indian diet plan',
    'Healthy breakfast ideas?',
  ]);

  // Load token + suggestions on mount
  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      try {
        const res = await api.get(ENDPOINTS.CHAT_SUGGESTIONS);
        if (res.success && res.data?.length > 0) setSuggestions(res.data);
      } catch (e) { console.log('Suggestions load error:', e); }
    })();
  }, []);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const newMsg = { id: Date.now(), text: msg, sender: 'user' };
    setMessages((prev) => [...prev, newMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post(ENDPOINTS.SEND_CHAT, { message: msg });

      if (res.success && res.data?.reply) {
        setMessages((prev) => [...prev, { id: Date.now() + 1, text: res.data.reply, sender: 'ai' }]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now() + 1,
          text: "Sorry, I couldn't process that. Try asking about diet, workouts, or health tips! 💪",
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
      <Header title="AI Health Assistant" subtitle="Ask anything about fitness" onBack={() => navigation.goBack()} rightIcon="ellipsis-vertical" />

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
                  <Text style={{ fontSize: 16 }}>🤖</Text>
                </View>
              )}
              <View style={[styles.bubble, msg.sender === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.msgText, msg.sender === 'user' && styles.userText]}>{msg.text}</Text>
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

          {messages.length <= 1 && (
            <View style={styles.suggestions}>
              <Text style={styles.sugTitle}>Quick Questions</Text>
              <View style={styles.sugGrid}>
                {suggestions.map((q, i) => (
                  <TouchableOpacity key={i} style={styles.sugChip} onPress={() => sendMessage(q)}>
                    <Text style={styles.sugText}>{q}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Ask about diet, workout, health..."
              placeholderTextColor={COLORS.textMuted}
              value={input}
              onChangeText={setInput}
              multiline
              onSubmitEditing={() => sendMessage()}
            />
            <TouchableOpacity onPress={() => sendMessage()} style={styles.sendBtn} disabled={loading}>
              <LinearGradient colors={COLORS.gradient1} style={styles.sendGrad}>
                <Ionicons name="send" size={18} color={COLORS.white} />
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
  msgText: { fontSize: SIZES.fontMd, color: COLORS.textSecondary, ...FONTS.medium, lineHeight: 22 },
  userText: { color: COLORS.white },
  suggestions: { marginTop: 16, paddingBottom: 20 },
  sugTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginBottom: 14 },
  sugGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sugChip: {
    backgroundColor: COLORS.darkCard, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  sugText: { fontSize: SIZES.fontSm, color: COLORS.primaryLight, ...FONTS.medium },
  inputBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: COLORS.dark, borderTopWidth: 1, borderTopColor: COLORS.darkBorder },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: COLORS.darkCard, borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.darkBorder, paddingLeft: 16, paddingRight: 6, paddingVertical: 6 },
  input: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium, maxHeight: 100, paddingVertical: 8 },
  sendBtn: { borderRadius: 20, overflow: 'hidden', marginLeft: 8 },
  sendGrad: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

export default AIChatScreen;
