// Which backend this build talks to.
//
// Set EXPO_PUBLIC_API_URL to point somewhere else — .env.local for local runs
// (gitignored, see .env.example), or the `env` block of an eas.json profile for
// builds. Expo inlines EXPO_PUBLIC_* at BUILD time, so a change needs a reload
// (local) or a rebuild (EAS).
//
// The fallback is PRODUCTION on purpose: a build that sets nothing keeps
// talking to the live backend rather than silently landing somewhere else.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'https://fitai-backend-icbh.onrender.com';

// API Endpoints
export const ENDPOINTS = {
  // Auth
  REGISTER: '/api/auth/register',
  REGISTER_OWNER: '/api/auth/register-owner',
  OWNER_STATUS: '/api/auth/owner-status',
  PHONE_EXISTS: '/api/auth/phone-exists',
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
  UPI_PAY: '/api/subscription/upi-pay',
  UPI_CONFIRM: '/api/subscription/upi-confirm',
  CASHFREE_PAY: '/api/subscription/cashfree-pay',
  CASHFREE_STATUS: '/api/subscription/cashfree-status',
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

  // Gym module
  GYM_CREATE: '/api/gym',
  GYM_MINE: '/api/gym/mine',
  GYM_ADD_MEMBER: '/api/gym/members',
  GYM_MEMBERS: '/api/gym',            // + /:gymId/members
  GYM_PAYMENT: '/api/gym/payment',
  GYM_ATTENDANCE: '/api/gym/attendance', // POST staff scan
  GYM_DASHBOARD: '/api/gym',          // + /:gymId/dashboard
  GYM_ATT_LIST: '/api/gym',           // + /:gymId/attendance
  GYM_MY_CARD: '/api/gym/my/card',
  GYM_MY_CHECKIN: '/api/gym/my/checkin',
  GYM_CASHBOOK_ADD: '/api/gym/cashbook',     // POST
  GYM_CASHBOOK: '/api/gym',                  // + /:gymId/cashbook
  GYM_REPORT: '/api/gym',                    // + /:gymId/report
  // Staff
  GYM_ADD_STAFF: '/api/gym/staff',           // POST
  GYM_STAFF_ATTENDANCE: '/api/gym/staff/attendance', // POST mark present
  GYM_STAFF_REMOVE: '/api/gym/staff',        // DELETE + /:staffId
  GYM_STAFF: '/api/gym',                      // + /:gymId/staff

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

  // Support
  SUPPORT: '/api/support',

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

  // One place for every request, so a failure says WHAT failed in the Metro
  // logs. Screens still get a thrown error (their catch blocks are unchanged),
  // but the log tells you whether the phone couldn't reach the server at all,
  // or the server answered with an error page instead of JSON.
  async request(method, endpoint, { data, params } = {}) {
    const query = params && Object.keys(params).length
      ? '?' + new URLSearchParams(params).toString()
      : '';
    const url = `${API_BASE_URL}${endpoint}${query}`;
    let response;
    try {
      response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      });
    } catch (e) {
      // Couldn't reach the server at all — DNS, no internet, wrong host.
      console.log(`[api] ${method} ${url} — cannot reach server: ${e.message}`);
      throw e;
    }
    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch (e) {
      // Reached the server, but it replied with HTML (502/503 page, wrong URL).
      console.log(`[api] ${method} ${url} — HTTP ${response.status}, non-JSON reply: ${body.slice(0, 120)}`);
      throw new Error(`Server error ${response.status}`);
    }
  }

  get(endpoint, params = {}) {
    return this.request('GET', endpoint, { params });
  }

  post(endpoint, data = {}) {
    return this.request('POST', endpoint, { data });
  }

  put(endpoint, data = {}) {
    return this.request('PUT', endpoint, { data });
  }

  delete(endpoint) {
    return this.request('DELETE', endpoint);
  }
}

export const api = new ApiService();
export default api;
