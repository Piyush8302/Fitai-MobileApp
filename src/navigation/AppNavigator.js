import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, FONTS } from '../constants/theme';

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
import SubscriptionScreen from '../screens/SubscriptionScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ArticlesScreen from '../screens/ArticlesScreen';
import ArticleDetailScreen from '../screens/ArticleDetailScreen';
import FoodDatabaseScreen from '../screens/FoodDatabaseScreen';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused, color, label }) => (
  <View style={styles.tabItem}>
    <Ionicons name={name} size={22} color={color} />
    <Text style={[styles.tabLabel, { color }]}>{label}</Text>
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

const AppNavigator = () => (
  <NavigationContainer>
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
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
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Articles" component={ArticlesScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="FoodDatabase" component={FoodDatabaseScreen} />
      <Stack.Screen name="ExerciseLibrary" component={ExerciseLibraryScreen} />
      <Stack.Screen name="Achievements" component={AchievementsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
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
  tabItem: { alignItems: 'center', justifyContent: 'center' },
  tabLabel: { fontSize: 10, ...FONTS.medium, marginTop: 4 },
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
