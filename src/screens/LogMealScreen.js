import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, Platform, Animated, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DIET_MEAL_SUGGESTIONS } from '../constants/data';
import { pickMealPhoto } from '../utils/photo';

// Modern speech recognition (Expo, new-arch compatible). Lazy require so the
// app never crashes in Expo Go where the native module isn't bundled.
let SpeechModule = null, useSpeechEvent = null;
try {
  const sr = require('expo-speech-recognition');
  SpeechModule = sr.ExpoSpeechRecognitionModule;
  useSpeechEvent = sr.useSpeechRecognitionEvent;
} catch (e) { SpeechModule = null; }

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'snack', label: 'Snack', icon: '🍪' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
];

// Number words → multiplier (English + Hindi)
const NUM_WORDS = {
  half: 0.5, aadha: 0.5, adha: 0.5,
  one: 1, ek: 1, a: 1, an: 1,
  two: 2, do: 2, couple: 2,
  three: 3, teen: 3, tin: 3,
  four: 4, char: 4, chaar: 4,
  five: 5, paanch: 5, panch: 5,
  six: 6, che: 6, chhe: 6,
};

const getMealTypeByTime = () => {
  const h = new Date().getHours();
  if (h >= 4 && h < 11) return 'breakfast';
  if (h >= 11 && h < 16) return 'lunch';
  if (h >= 16 && h < 19) return 'snack';
  return 'dinner';
};

const parseGrams = (serving) => {
  const m = String(serving || '').match(/(\d+(?:\.\d+)?)\s*(?:g|gm|gms|grams|ml)\b/i);
  return m ? parseFloat(m[1]) : null;
};

const LogMealScreen = ({ navigation, route }) => {
  const [mealType, setMealType] = useState(route?.params?.mealType || getMealTypeByTime());
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState([]);
  const [logging, setLogging] = useState(false);
  const [dietPref, setDietPref] = useState('veg');

  // Voice
  const [listening, setListening] = useState(false);
  const [voiceAvailable] = useState(!!SpeechModule);
  const [voiceMsg, setVoiceMsg] = useState('');   // last error/status, shown under the search bar
  const pulse = useRef(new Animated.Value(1)).current;
  const searchTimer = useRef(null);
  // Whether this listening session produced anything, so `end` can tell the
  // difference between "heard nothing" and "already handled".
  const heardRef = useRef(false);

  // Speech recognition events (no-op hook fallback when module unavailable / Expo Go)
  const useEvt = useSpeechEvent || (() => {});
  useEvt('result', (event) => {
    const transcript = event?.results?.[0]?.transcript;
    if (!transcript) return;
    // Interim results stream in while the user is still speaking — show them so
    // it's obvious the mic is live, but only parse once the result is final.
    setSearch(transcript);
    if (!event.isFinal) return;
    heardRef.current = true;
    handleVoiceText(transcript);
  });
  useEvt('end', () => {
    setListening(false);
    if (!heardRef.current) setVoiceMsg("Didn't catch that — tap 🎤 and speak clearly.");
  });
  useEvt('error', (event) => {
    setListening(false);
    const code = event?.error;
    if (!code || code === 'no-speech' || code === 'aborted') {
      if (code === 'no-speech') setVoiceMsg("Didn't hear anything — tap 🎤 and try again.");
      return;
    }
    // These used to be swallowed into console.log, so a mic that never worked
    // just looked like a button that resets itself. Say what actually failed.
    const FRIENDLY = {
      'not-allowed': 'Microphone permission is off. Enable it for FitAI in Settings.',
      'service-not-allowed': 'Speech recognition is unavailable on this phone. Install/enable the Google app, then try again.',
      'language-not-supported': 'English (India) speech is not installed. Add it in Google app → Settings → Voice.',
      network: 'Voice needs internet — check your connection.',
      'audio-capture': 'Could not access the microphone. Close other apps using it and retry.',
      busy: 'Speech recogniser is busy — wait a moment and tap 🎤 again.',
    };
    setVoiceMsg(FRIENDLY[code] || `Voice error: ${code}${event?.message ? ` — ${event.message}` : ''}`);
  });

  useEffect(() => {
    (async () => {
      const token = await AsyncStorage.getItem('token');
      if (token) api.setToken(token);
      try {
        const u = JSON.parse(await AsyncStorage.getItem('user') || '{}');
        if (u.dietPreference) setDietPref(u.dietPreference);
      } catch (e) {}
    })();
  }, []);

  useEffect(() => {
    if (listening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.25, duration: 600, easing: Easing.ease, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 600, easing: Easing.ease, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulse.stopAnimation();
      pulse.setValue(1);
    }
  }, [listening]);

  const startVoice = async () => {
    if (!SpeechModule) {
      Alert.alert(
        '🎤 Voice needs the installed app',
        'Voice logging works in the built APK (EAS build), not in Expo Go. For now, type the food name to search.'
      );
      return;
    }
    try {
      // Ask the module itself instead of assuming: a phone with no speech
      // service would otherwise fail the moment start() runs, which looked
      // like the button resetting itself.
      let available = true;
      try { available = SpeechModule.isRecognitionAvailable(); } catch (e) { available = true; }
      if (!available) {
        Alert.alert(
          'Voice not available on this phone',
          'No speech recognition service was found. Install or enable the Google app (and its Voice/offline language data), then try again.'
        );
        return;
      }

      const perm = await SpeechModule.requestPermissionsAsync();
      if (!perm?.granted) {
        Alert.alert('Mic permission needed', 'Enable Microphone for FitAI in Settings to use voice.');
        return;
      }
      // Note: the search box is NOT cleared here — wiping what the user typed
      // the instant they tapped the mic is what made a failed start look like
      // a "reset". Interim results overwrite it only once speech arrives.
      setVoiceMsg('');
      heardRef.current = false;
      setListening(true);
      SpeechModule.start({
        lang: 'en-IN',
        interimResults: true,     // live words = visible proof the mic is on
        continuous: false,
        maxAlternatives: 1,
      });
    } catch (e) {
      setListening(false);
      setVoiceMsg(String(e?.message || e || 'Could not start voice'));
      Alert.alert('Could not start voice', String(e?.message || e || 'unknown'));
    }
  };

  const stopVoice = () => {
    try { SpeechModule?.stop(); } catch (e) {}
    setListening(false);
  };

  // Parse spoken text into multiple foods with quantities and auto-add
  const handleVoiceText = async (text) => {
    setListening(false);
    setSearch(text);
    // Split into chunks: "do roti aur ek bowl rice" → ["do roti", "ek bowl rice"]
    const chunks = text.toLowerCase().split(/\s+(?:and|aur|with|plus|,)\s+/).map(c => c.trim()).filter(Boolean);
    let added = 0;
    for (const chunk of chunks) {
      const words = chunk.split(/\s+/);
      let qty = 1;
      // Leading number (digit or word)
      if (/^\d/.test(words[0])) { qty = parseFloat(words[0]); words.shift(); }
      else if (NUM_WORDS[words[0]] !== undefined) { qty = NUM_WORDS[words[0]]; words.shift(); }
      // Drop unit words like "bowl/plate/glass/piece"
      const query = words.filter(w => !['bowl', 'plate', 'glass', 'piece', 'pieces', 'cup', 'katori', 'roti', 'plate'].includes(w) || words.length === 1).join(' ').trim() || chunk;
      try {
        const res = await api.get(`${ENDPOINTS.FOOD}?q=${encodeURIComponent(query)}&limit=1`);
        if (res.success && res.data?.length) {
          addItem(res.data[0], false, qty);
          added++;
        }
      } catch (e) {}
    }
    if (added === 0) {
      // No match — keep text in search box for manual lookup
      doSearch(text);
    } else {
      setSearch('');
    }
  };

  // ===== PHOTO → CALORIES =====
  // The backend sends the photo to Gemini (already configured for the AI chat,
  // free tier) and matches whatever it recognises against our own food database,
  // so the numbers are ours wherever we carry the dish. Everything lands in the
  // normal item list, where quantities stay editable before logging.
  const [scanning, setScanning] = useState(false);

  const scanPhoto = (source) => async () => {
    if (scanning) return;
    try {
      const image = await pickMealPhoto(source);
      if (!image) return;
      setScanning(true);
      const res = await api.post(ENDPOINTS.FOOD_ANALYZE_PHOTO, { image });
      if (!res.success) {
        Alert.alert('Could not read the photo', res.message || 'Please try again.');
        return;
      }
      const found = res.data || [];
      if (!found.length) {
        Alert.alert('No food found', res.message || 'Try a clearer, closer photo of the plate.');
        return;
      }
      found.forEach((f) => {
        addItem(
          { name: f.name, calories: f.calories, protein: f.protein, carbs: f.carbs, fat: f.fat, serving: f.serving },
          false,
          f.quantity || 1,
        );
      });
      const guessed = found.filter((f) => !f.matched).length;
      Alert.alert(
        `📸 Added ${found.length} item${found.length > 1 ? 's' : ''}`,
        `${found.map((f) => `• ${f.name}${f.quantity !== 1 ? ` ×${f.quantity}` : ''}`).join('\n')}\n\n${
          guessed ? 'Some values are estimates from the photo — ' : ''
        }check the amounts before logging.`,
      );
    } catch (e) {
      Alert.alert('Error', 'Could not scan that photo. Please try again.');
    } finally { setScanning(false); }
  };

  const openPhotoScan = () => {
    Alert.alert('📸 Scan meal photo', 'Get an instant calorie estimate from a photo of your plate.', [
      { text: 'Take photo', onPress: scanPhoto('camera') },
      { text: 'Choose from gallery', onPress: scanPhoto('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ===== SEARCH =====
  const doSearch = useCallback((q) => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q || q.length < 2) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await api.get(`${ENDPOINTS.FOOD}?q=${encodeURIComponent(q)}&limit=8`);
        if (res.success) setResults(res.data || []);
      } catch (e) {}
      finally { setSearching(false); }
    }, 300);
  }, []);

  const onSearchChange = (t) => { setSearch(t); doSearch(t); };

  // ===== ITEMS =====
  const addItem = (food, custom = false, qty = 1) => {
    const serving = food.serving || '1 serving';
    setItems(prev => [...prev, {
      id: Date.now() + Math.random(),
      name: food.name,
      qty,
      baseCal: food.calories || 0,
      baseProtein: food.protein || 0,
      baseCarbs: food.carbs || 0,
      baseFat: food.fat || 0,
      serving,
      grams: parseGrams(serving),
      custom,
      calText: custom ? '' : undefined,
      proText: custom ? '' : undefined,
    }]);
    setSearch('');
    setResults([]);
  };

  const changeQty = (id, delta) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, qty: Math.min(20, Math.max(0.5, parseFloat((i.qty + delta).toFixed(1)))) } : i));
  const updateItem = (id, patch) => setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  const removeItem = (id) => setItems(prev => prev.filter(i => i.id !== id));

  const totalCal = items.reduce((s, i) => s + Math.round(i.baseCal * i.qty), 0);
  const totalProtein = parseFloat(items.reduce((s, i) => s + i.baseProtein * i.qty, 0).toFixed(1));
  const totalCarbs = parseFloat(items.reduce((s, i) => s + i.baseCarbs * i.qty, 0).toFixed(1));
  const totalFat = parseFloat(items.reduce((s, i) => s + i.baseFat * i.qty, 0).toFixed(1));
  const totalGrams = Math.round(items.reduce((s, i) => s + (i.grams ? i.grams * i.qty : 0), 0));

  const logMeal = async () => {
    if (items.length === 0) { Alert.alert('Add food', 'Search or speak to add at least one item'); return; }
    setLogging(true);
    const payloadItems = items.map(i => ({
      name: i.qty !== 1 ? `${i.name} (${i.qty}×)` : i.name,
      calories: Math.round(i.baseCal * i.qty),
      protein: parseFloat((i.baseProtein * i.qty).toFixed(1)),
    }));
    try {
      const res = await api.post(ENDPOINTS.LOG_MEAL, { mealType, items: payloadItems, totalCalories: totalCal });
      if (res.success) {
        navigation.navigate('Tracking', { logged: true });
      } else {
        Alert.alert('Error', res.message || 'Failed to log meal');
      }
    } catch (e) { Alert.alert('Error', 'Failed to log meal'); }
    finally { setLogging(false); }
  };

  const quickAdds = (DIET_MEAL_SUGGESTIONS[dietPref] || DIET_MEAL_SUGGESTIONS.veg)[mealType === 'snack' ? 'snacks' : mealType] || [];

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Log Meal</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Meal type tabs */}
      <View style={styles.tabsRow}>
        {MEAL_TYPES.map((m) => (
          <TouchableOpacity
            key={m.key}
            style={[styles.tab, mealType === m.key && styles.tabActive]}
            onPress={() => setMealType(m.key)}
          >
            <Text style={styles.tabIcon}>{m.icon}</Text>
            <Text style={[styles.tabLabel, mealType === m.key && { color: COLORS.primary }]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search + Mic */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search food (rice, paneer, roti)…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={onSearchChange}
          />
          {searching && <ActivityIndicator size="small" color={COLORS.primary} />}
          {search.length > 0 && !searching && (
            <TouchableOpacity onPress={() => { setSearch(''); setResults([]); }}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.camBtn} onPress={openPhotoScan} disabled={scanning}>
          {scanning
            ? <ActivityIndicator size="small" color={COLORS.primary} />
            : <Ionicons name="camera" size={22} color={COLORS.primary} />}
        </TouchableOpacity>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity
            style={[styles.micBtn, listening && styles.micBtnActive]}
            onPress={listening ? stopVoice : startVoice}
          >
            <Ionicons name={listening ? 'stop' : 'mic'} size={22} color={COLORS.onAccent} />
          </TouchableOpacity>
        </Animated.View>
      </View>
      <Text style={[styles.voiceHint, !listening && voiceMsg && { color: COLORS.warning }]}>
        {listening ? '🎙 Listening… speak now (e.g. "two roti and one bowl rice")'
          : scanning ? '📸 Reading your plate…'
            : voiceMsg ? voiceMsg
              : voiceAvailable ? 'Tap 📷 for a photo estimate, or 🎤 and speak — "do roti aur ek bowl rice"'
                : 'Tap 📷 to estimate calories from a photo, or type to search'}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 180 }}>
        {/* Search results */}
        {results.length > 0 && (
          <View style={styles.resultsBox}>
            {results.map((food) => (
              <TouchableOpacity key={food.id} style={styles.resultRow} onPress={() => addItem(food)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.resultName}>{food.name}</Text>
                  <Text style={styles.resultMeta}>
                    {food.serving} {food.hindiName ? `• ${food.hindiName}` : ''}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                  <Text style={styles.resultCal}>{food.calories} kcal</Text>
                  <Text style={styles.resultMacro}>P{food.protein} C{food.carbs} F{food.fat}</Text>
                </View>
                <Ionicons name="add-circle" size={26} color={COLORS.primary} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.customRow}
              onPress={() => addItem({ name: search.trim() || 'Custom food', calories: 0, protein: 0, serving: 'custom' }, true)}
            >
              <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
              <Text style={styles.customText}>Add "{search.trim()}" as custom (enter kcal)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Quick Add */}
        {results.length === 0 && (
          <>
            <Text style={styles.sectionTitle}>⚡ Quick Add — {mealType}</Text>
            <View style={styles.quickGrid}>
              {quickAdds.map((food, i) => (
                <TouchableOpacity key={i} style={styles.quickCard} onPress={() => addItem(food)}>
                  <Text style={styles.quickIcon}>{food.icon}</Text>
                  <Text style={styles.quickName} numberOfLines={2}>{food.name}</Text>
                  <Text style={styles.quickCal}>{food.calories} kcal</Text>
                  <View style={styles.quickAddBadge}>
                    <Ionicons name="add" size={14} color={COLORS.onAccent} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Added items */}
        {items.length > 0 && (
          <View style={styles.itemsBox}>
            <Text style={styles.sectionTitle}>🧾 Your {mealType} ({items.length})</Text>
            {items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1, paddingRight: 6 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                  {item.custom ? (
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                      <TextInput
                        style={styles.miniInput} placeholder="kcal" placeholderTextColor={COLORS.textMuted}
                        keyboardType="number-pad" value={item.calText}
                        onChangeText={(t) => updateItem(item.id, { calText: t, baseCal: parseInt(t) || 0 })}
                      />
                      <TextInput
                        style={styles.miniInput} placeholder="protein g" placeholderTextColor={COLORS.textMuted}
                        keyboardType="decimal-pad" value={item.proText}
                        onChangeText={(t) => updateItem(item.id, { proText: t, baseProtein: parseFloat(t) || 0 })}
                      />
                    </View>
                  ) : (
                    <Text style={styles.itemServing}>{item.serving} = {Math.round(item.baseCal)} kcal</Text>
                  )}
                  {item.grams ? (
                    <Text style={styles.itemWeight}>⚖️ {item.qty}× {item.grams}g = {Math.round(item.grams * item.qty)}g</Text>
                  ) : !item.custom ? (
                    <Text style={styles.itemWeight}>⚖️ {item.qty} serving{item.qty !== 1 ? 's' : ''}</Text>
                  ) : null}
                </View>
                <View style={styles.qtyWrap}>
                  <TouchableOpacity onPress={() => changeQty(item.id, -0.5)} hitSlop={{ top: 8, bottom: 8 }}>
                    <Ionicons name="remove-circle" size={26} color={item.qty <= 0.5 ? COLORS.darkBorder : COLORS.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.qty}×</Text>
                  <TouchableOpacity onPress={() => changeQty(item.id, 0.5)} hitSlop={{ top: 8, bottom: 8 }}>
                    <Ionicons name="add-circle" size={26} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
                <View style={{ alignItems: 'flex-end', minWidth: 44 }}>
                  <Text style={styles.itemCal}>{Math.round(item.baseCal * item.qty)}</Text>
                  <Text style={styles.itemCalUnit}>kcal</Text>
                </View>
                <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                  <Ionicons name="close-circle" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Sticky bottom — total + Log */}
      {items.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.totalRow}>
            <View>
              <Text style={styles.totalCal}>{totalCal} kcal</Text>
              <Text style={styles.totalMacros}>
                P {totalProtein}g • C {totalCarbs}g • F {totalFat}g{totalGrams > 0 ? ` • ~${totalGrams}g` : ''}
              </Text>
            </View>
            <TouchableOpacity style={styles.logBtn} onPress={logMeal} disabled={logging}>
              <LinearGradient colors={COLORS.gradient1} style={styles.logBtnGrad}>
                {logging ? <ActivityIndicator color={COLORS.onAccent} /> : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color={COLORS.onAccent} />
                    <Text style={styles.logBtnText}>Log {items.length} item{items.length > 1 ? 's' : ''}</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },

  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: SIZES.radius,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  tabActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '12' },
  tabIcon: { fontSize: 18 },
  tabLabel: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.semiBold, marginTop: 2 },

  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 50,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, paddingHorizontal: 14,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  searchInput: { flex: 1, fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  micBtn: {
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.primary,
  },
  micBtnActive: { backgroundColor: COLORS.error },
  camBtn: {
    width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.primary + '55',
  },
  voiceHint: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, paddingHorizontal: 18, marginTop: 8, marginBottom: 8 },

  resultsBox: { marginHorizontal: 16, marginTop: 4 },
  resultRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 12,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, marginBottom: 6,
    borderWidth: 1, borderColor: COLORS.darkBorder,
  },
  resultName: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.semiBold },
  resultMeta: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 2 },
  resultCal: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.bold },
  resultMacro: { fontSize: 9, color: COLORS.textMuted },
  customRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  customText: { fontSize: SIZES.fontSm, color: COLORS.primary, ...FONTS.medium },

  sectionTitle: { fontSize: SIZES.fontLg, color: COLORS.white, ...FONTS.bold, marginHorizontal: 16, marginTop: 14, marginBottom: 10 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: 16 },
  quickCard: {
    width: '47%', flexGrow: 1, padding: 14, borderRadius: SIZES.radius,
    backgroundColor: COLORS.darkCard, borderWidth: 1, borderColor: COLORS.darkBorder, position: 'relative',
  },
  quickIcon: { fontSize: 24, marginBottom: 6 },
  quickName: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold },
  quickCal: { fontSize: SIZES.fontXs, color: COLORS.warning, ...FONTS.bold, marginTop: 4 },
  quickAddBadge: {
    position: 'absolute', top: 10, right: 10, width: 22, height: 22, borderRadius: 11,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },

  itemsBox: { marginBottom: 10 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: 16, paddingVertical: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.primary + '20',
  },
  itemName: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.semiBold },
  itemServing: { fontSize: SIZES.fontXs, color: COLORS.textMuted, marginTop: 1 },
  itemWeight: { fontSize: SIZES.fontXs, color: COLORS.accent, ...FONTS.medium, marginTop: 2 },
  miniInput: {
    backgroundColor: COLORS.darkSurface, borderRadius: 8, borderWidth: 1, borderColor: COLORS.darkBorder,
    paddingHorizontal: 8, paddingVertical: 4, fontSize: SIZES.fontXs, color: COLORS.white, width: 72,
  },
  qtyWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyText: { fontSize: SIZES.fontSm, color: COLORS.white, ...FONTS.bold, minWidth: 30, textAlign: 'center' },
  itemCal: { fontSize: SIZES.fontSm, color: COLORS.warning, ...FONTS.bold },
  itemCalUnit: { fontSize: 8, color: COLORS.textMuted },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.darkCard, borderTopWidth: 1, borderTopColor: COLORS.darkBorder,
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 28,
  },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  totalCal: { fontSize: SIZES.fontXl, color: COLORS.white, ...FONTS.bold },
  totalMacros: { fontSize: SIZES.fontXs, color: COLORS.textMuted, ...FONTS.medium, marginTop: 2 },
  logBtn: { borderRadius: SIZES.radius, overflow: 'hidden' },
  logBtnGrad: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 24, borderRadius: SIZES.radius },
  logBtnText: { fontSize: SIZES.fontMd, color: COLORS.onAccent, ...FONTS.bold },
});

export default LogMealScreen;
