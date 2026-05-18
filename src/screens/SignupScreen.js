import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES, FONTS } from '../constants/theme';
import InputField from '../components/InputField';
import GradientButton from '../components/GradientButton';
import api, { ENDPOINTS } from '../config/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SignupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (password !== confirm) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(ENDPOINTS.REGISTER, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.success) {
        await AsyncStorage.setItem('token', res.token);
        await AsyncStorage.setItem('user', JSON.stringify(res.user));
        api.setToken(res.token);
        navigation.replace('ProfileSetup');
      } else {
        Alert.alert('Signup Failed', res.message || 'Something went wrong');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please check your connection.');
      console.log('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={COLORS.gradientDark} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Start your fitness transformation today</Text>
        </View>

        <View style={styles.form}>
          <InputField label="Full Name" icon="person-outline" placeholder="Enter your name" value={name} onChangeText={setName} />
          <InputField label="Email" icon="mail-outline" placeholder="Enter your email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <InputField label="Password" icon="lock-closed-outline" placeholder="Create password (min 6 chars)" value={password} onChangeText={setPassword} secureTextEntry />
          <InputField label="Confirm Password" icon="shield-checkmark-outline" placeholder="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry />

          <GradientButton
            title={loading ? '' : 'Create Account'}
            onPress={handleSignup}
            disabled={loading}
            style={styles.btn}
          >
            {loading && <ActivityIndicator color="#fff" />}
          </GradientButton>

          <TouchableOpacity style={styles.socialBtn}>
            <Ionicons name="logo-google" size={22} color="#DB4437" />
            <Text style={styles.socialText}>Sign up with Google</Text>
          </TouchableOpacity>

          <View style={styles.loginRow}>
            <Text style={styles.loginText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 60, paddingBottom: 40 },
  header: { marginBottom: 32 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.darkCard, alignItems: 'center', justifyContent: 'center', marginBottom: 20,
  },
  title: { fontSize: SIZES.fontTitle, color: COLORS.white, ...FONTS.bold },
  subtitle: { fontSize: SIZES.fontMd, color: COLORS.textMuted, ...FONTS.medium, marginTop: 8 },
  form: {},
  btn: { marginTop: 8, marginBottom: 24 },
  socialBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.darkCard, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.darkBorder, paddingVertical: 14, gap: 10,
  },
  socialText: { fontSize: SIZES.fontMd, color: COLORS.white, ...FONTS.medium },
  loginRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  loginText: { fontSize: SIZES.fontMd, color: COLORS.textMuted },
  loginLink: { fontSize: SIZES.fontMd, color: COLORS.primary, ...FONTS.bold },
});

export default SignupScreen;
