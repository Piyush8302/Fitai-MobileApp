// Always use the live Render backend (works on emulator + real device)
export const API_BASE_URL = 'https://fitai-backend-icbh.onrender.com';

// API Endpoints
export const ENDPOINTS = {
  // Auth
  REGISTER: '/api/auth/register',
  LOGIN: '/api/auth/login',
  SEND_OTP: '/api/auth/send-otp',
  VERIFY_OTP: '/api/auth/verify-otp',
  GOOGLE_LOGIN: '/api/auth/google',
  GET_ME: '/api/auth/me',
  UPDATE_PROFILE: '/api/auth/profile',
  REQUEST_EMAIL_CHANGE: '/api/auth/request-email-change',
  VERIFY_EMAIL_CHANGE: '/api/auth/verify-email-change',
  REQUEST_PHONE_CHANGE: '/api/auth/request-phone-change',
  VERIFY_PHONE_CHANGE: '/api/auth/verify-phone-change',
  UPLOAD_AVATAR: '/api/auth/avatar',

  // BMI
  CALCULATE_BMI: '/api/bmi/calculate',
  BMI_HISTORY: '/api/bmi/history',

  // Workouts
  WORKOUTS: '/api/workouts',
  AI_WORKOUT: '/api/workouts/ai-plan',
  WEEKLY_SCHEDULE: '/api/workouts/weekly-schedule',

  // Diet
  DIET_PLANS: '/api/diet',
  AI_DIET: '/api/diet/ai-plan',

  // Tracking
  TODAY_TRACKING: '/api/tracking/today',
  LOG_TRACKING: '/api/tracking/log',
  ADD_WATER: '/api/tracking/water',
  LOG_MEAL: '/api/tracking/meal',
  WEEKLY_REPORT: '/api/tracking/weekly',
  MONTHLY_PROGRESS: '/api/tracking/monthly',

  // Chat
  SEND_CHAT: '/api/chat/send',
  CHAT_HISTORY: '/api/chat/history',
  CLEAR_CHAT: '/api/chat/clear',
  CHAT_SUGGESTIONS: '/api/chat/suggestions',

  // Subscription
  SUB_PLANS: '/api/subscription/plans',
  CREATE_ORDER: '/api/subscription/create-order',
  VERIFY_PAYMENT: '/api/subscription/verify-payment',
  MY_SUBSCRIPTION: '/api/subscription/my',
  CANCEL_SUB: '/api/subscription/cancel',

  // Articles
  ARTICLES: '/api/articles',
  ARTICLES_CATEGORIES: '/api/articles/categories',
  ARTICLES_TRENDING: '/api/articles/trending',
  ARTICLES_SEED: '/api/articles/seed',
  ARTICLES_BY_CATEGORY: '/api/articles/category',

  // Food Database
  FOOD: '/api/food',
  FOOD_CATEGORIES: '/api/food/categories',
  FOOD_CALCULATE: '/api/food/calculate',

  // Exercise Library
  EXERCISES: '/api/exercises',
  EXERCISES_MUSCLES: '/api/exercises/muscles',
  EXERCISES_BY_MUSCLE: '/api/exercises/muscle',

  // Favorites
  FAVORITES: '/api/favorites',
  FAVORITES_CHECK: '/api/favorites/check',
  FAVORITES_TOGGLE: '/api/favorites/toggle',

  // Achievements
  ACHIEVEMENTS: '/api/achievements',
  ACHIEVEMENTS_CHECK: '/api/achievements/check',

  // Notifications
  NOTIFICATIONS: '/api/notifications',
  NOTIFICATIONS_UNREAD: '/api/notifications/unread-count',
  NOTIFICATIONS_READ_ALL: '/api/notifications/read-all',
  SAVE_PUSH_TOKEN: '/api/notifications/push-token',

  // Auth - Password
  CHANGE_PASSWORD: '/api/auth/change-password',
  FORGOT_PASSWORD: '/api/auth/forgot-password',
  RESET_PASSWORD: '/api/auth/reset-password',
  DELETE_ACCOUNT: '/api/auth/delete-account',
};

// API Helper
class ApiService {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  getHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    return headers;
  }

  async get(endpoint, params = {}) {
    const query = Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const response = await fetch(`${API_BASE_URL}${endpoint}${query}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return response.json();
  }

  async post(endpoint, data = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async put(endpoint, data = {}) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return response.json();
  }

  async delete(endpoint) {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return response.json();
  }
}

export const api = new ApiService();
export default api;
