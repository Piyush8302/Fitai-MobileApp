import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';

const DarkNavTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    background: COLORS.dark,
    card: COLORS.dark,
    text: COLORS.white,
    border: COLORS.darkBorder,
    notification: COLORS.secondary,
  },
};

import SplashScreen from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import OTPLoginScreen from '../screens/OTPLoginScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import HomeScreen from '../screens/HomeScreen';
import BMIScreen from '../screens/BMIScreen';
import GoalSelectionScreen from '../screens/GoalSelectionScreen';
import WeightLossScreen from '../screens/WeightLossScreen';
import WeightGainScreen from '../screens/WeightGainScreen';
import HeightGrowthScreen from '../screens/HeightGrowthScreen';
import DietScreen from '../screens/DietScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import GymExerciseScreen from '../screens/GymExerciseScreen';
import AIChatScreen from '../screens/AIChatScreen';
import TrackingScreen from '../screens/TrackingScreen';
import LogMealScreen from '../screens/LogMealScreen';
import MyGymCardScreen from '../screens/MyGymCardScreen';
import GymAdminScreen from '../screens/GymAdminScreen';
import GymScanScreen from '../screens/GymScanScreen';
import GymCashbookScreen from '../screens/GymCashbookScreen';
import GymOwnerSettingsScreen from '../screens/GymOwnerSettingsScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ArticlesScreen from '../screens/ArticlesScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import FoodDatabaseScreen from '../screens/FoodDatabaseScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import HelpSupportScreen from '../screens/HelpSupportScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import RateUsScreen from '../screens/RateUsScreen';
import ShareAppScreen from '../screens/ShareAppScreen';
import ReferralScreen from '../screens/ReferralScreen';
import EditProfileScreen from '../screens/EditProfileScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused, color, label }) => (
  <View style={styles.tabItem}>
    <Ionicons name={name} size={22} color={color} />
    <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>{label}</Text>
  </View>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="HomeTab"
      component={HomeScreen}
      options={{
        tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'home' : 'home-outline'} color={color} label="Home" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="WorkoutTab"
      component={WorkoutScreen}
      options={{
        tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'barbell' : 'barbell-outline'} color={color} label="Workout" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="AIChatTab"
      component={AIChatScreen}
      options={{
        tabBarIcon: ({ focused }) => (
          <View style={styles.aiTab}>
            <LinearGradient colors={COLORS.gradient1} style={styles.aiTabGrad}>
              <Text style={styles.aiTabIcon}>🤖</Text>
            </LinearGradient>
          </View>
        ),
      }}
    />
    <Tab.Screen
      name="TrackingTab"
      component={TrackingScreen}
      options={{
        tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'stats-chart' : 'stats-chart-outline'} color={color} label="Track" focused={focused} />,
      }}
    />
    <Tab.Screen
      name="ProfileTab"
      component={ProfileScreen}
      options={{
        tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'person' : 'person-outline'} color={color} label="Profile" focused={focused} />,
      }}
    />
  </Tab.Navigator>
);

// ===== Gym Owner bottom tabs =====
const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: styles.tabBar,
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textMuted,
      tabBarShowLabel: false,
    }}
  >
    <Tab.Screen
      name="GymDashboardTab"
      component={GymAdminScreen}
      options={{ tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'people' : 'people-outline'} color={color} label="Gym" focused={focused} /> }}
    />
    <Tab.Screen
      name="GymCashbookTab"
      component={GymCashbookScreen}
      options={{ tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'wallet' : 'wallet-outline'} color={color} label="Cashbook" focused={focused} /> }}
    />
    <Tab.Screen
      name="AdminSettingsTab"
      component={GymOwnerSettingsScreen}
      options={{ tabBarIcon: ({ focused, color }) => <TabIcon name={focused ? 'settings' : 'settings-outline'} color={color} label="Settings" focused={focused} /> }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <NavigationContainer theme={DarkNavTheme}>
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: COLORS.dark } }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="OTPLogin" component={OTPLoginScreen} />
      <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
      <Stack.Screen name="BMI" component={BMIScreen} />
      <Stack.Screen name="GoalSelection" component={GoalSelectionScreen} />
      <Stack.Screen name="WeightLoss" component={WeightLossScreen} />
      <Stack.Screen name="WeightGain" component={WeightGainScreen} />
      <Stack.Screen name="HeightGrowth" component={HeightGrowthScreen} />
      <Stack.Screen name="Diet" component={DietScreen} />
      <Stack.Screen name="Workout" component={WorkoutScreen} />
      <Stack.Screen name="GymExercise" component={GymExerciseScreen} />
      <Stack.Screen name="AIChat" component={AIChatScreen} />
      <Stack.Screen name="Tracking" component={TrackingScreen} />
      <Stack.Screen name="LogMeal" component={LogMealScreen} />
      <Stack.Screen name="MyGymCard" component={MyGymCardScreen} />
      <Stack.Screen name="GymAdmin" component={GymAdminScreen} />
      <Stack.Screen name="AdminMain" component={AdminTabs} />
      <Stack.Screen name="GymScan" component={GymScanScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Articles" component={ArticlesScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="FoodDatabase" component={FoodDatabaseScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="HelpSupport" component={HelpSupportScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="RateUs" component={RateUsScreen} />
      <Stack.Screen name="ShareApp" component={ShareAppScreen} />
      <Stack.Screen name="Referral" component={ReferralScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    </Stack.Navigator>
  </NavigationContainer>
);

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    backgroundColor: COLORS.dark + 'F5',
    borderTopWidth: 1,
    borderTopColor: COLORS.darkBorder,
    height: 70,
    paddingBottom: 10,
    paddingTop: 8,
  },
  tabItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
  tabLabel: { fontSize: 9, ...FONTS.medium, marginTop: 3, numberOfLines: 1 },
  aiTab: { marginTop: -20 },
  aiTabGrad: {
    width: 52, height: 52, borderRadius: 26,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  aiTabIcon: { fontSize: 24 },
});

export default AppNavigator;
