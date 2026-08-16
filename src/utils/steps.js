// Reading the phone's own step count, through Health Connect.
//
// Until now "steps" in this app were never measured — they were derived from a
// distance the member typed in (km × 1350 in the Log Activity sheet). Turning on
// the phone's step counter did nothing, because nothing ever asked it. The
// 10,000 step goal and the Step Master badge both implied otherwise.
//
// Why Health Connect and not expo-sensors: the Pedometer in expo-sensors only
// reports steps while the app is in the foreground on Android — its own docs say
// "Pedometer updates will not be delivered while the app is in the background" —
// and `getStepCountAsync`, which reads history, is iOS only. Health Connect is
// where Android keeps the all-day count, whether it came from the phone's
// sensor, Google Fit or Samsung Health.
//
// None of this works in Expo Go: it is a native module and needs a dev/EAS
// build. Every function here fails soft so the app behaves exactly as before
// when the module, the provider or the permission is missing.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { ENDPOINTS } from '../config/api';

// Lazy require so Expo Go — where the native side is absent — does not crash on
// import. Same pattern as the speech module in LogMealScreen.
let HC = null;
try {
  HC = require('react-native-health-connect');
} catch (e) {
  HC = null;
}

const STEPS_PERMISSION = { accessType: 'read', recordType: 'Steps' };
const PREF_KEY = 'stepSyncEnabled';

// SdkAvailabilityStatus.SDK_AVAILABLE — the provider is installed and usable.
const SDK_AVAILABLE = 3;

export const isSupported = () => Platform.OS === 'android' && !!HC;

/**
 * Why step sync cannot run, or null when it can.
 * Kept as a reason rather than a boolean so the screen can tell the member what
 * to actually do about it.
 */
export const checkAvailability = async () => {
  if (Platform.OS !== 'android') return 'ios';
  if (!HC) return 'module';                    // Expo Go, or an old build
  try {
    const status = await HC.getSdkStatus();
    if (status !== SDK_AVAILABLE) return 'provider';   // needs Health Connect installed/updated
    return null;
  } catch (e) {
    return 'module';
  }
};

/** Has the member already granted us the Steps permission? */
export const hasPermission = async () => {
  if (!HC) return false;
  try {
    await HC.initialize();
    const granted = await HC.getGrantedPermissions();
    return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
  } catch (e) {
    return false;
  }
};

/** Ask for it. Returns true if we may now read steps. */
export const requestPermission = async () => {
  if (!HC) return false;
  try {
    await HC.initialize();
    const granted = await HC.requestPermission([STEPS_PERMISSION]);
    return granted.some((p) => p.recordType === 'Steps' && p.accessType === 'read');
  } catch (e) {
    return false;
  }
};

export const openSettings = () => { try { HC?.openHealthConnectSettings(); } catch (e) {} };

/** The member's own on/off switch, remembered across launches. */
export const isSyncEnabled = async () => (await AsyncStorage.getItem(PREF_KEY)) === 'yes';
export const setSyncEnabled = (on) => AsyncStorage.setItem(PREF_KEY, on ? 'yes' : 'no');

// Today in IST, matching how the backend stamps a tracking day — otherwise a
// late-evening sync would land on the wrong date either side of midnight UTC.
const istDayBounds = () => {
  const nowIst = new Date(Date.now() + 5.5 * 3600 * 1000);
  const start = new Date(nowIst);
  start.setUTCHours(0, 0, 0, 0);
  return {
    startTime: new Date(start.getTime() - 5.5 * 3600 * 1000).toISOString(),
    endTime: new Date().toISOString(),
  };
};

/** Steps recorded so far today, or null when unavailable. */
export const readTodaySteps = async () => {
  if (!HC) return null;
  try {
    await HC.initialize();
    const { startTime, endTime } = istDayBounds();
    const res = await HC.aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: { operator: 'between', startTime, endTime },
    });
    const total = res?.COUNT_TOTAL;
    return Number.isFinite(total) ? total : 0;
  } catch (e) {
    return null;
  }
};

/**
 * Read today's steps and hand them to the server.
 *
 * Health Connect is the authority when this is on, so the count is SET, not
 * added to — the walk sheet stops contributing steps of its own, otherwise a
 * logged walk would be counted twice, once by the phone and once by hand.
 *
 * @returns the step count written, or null if nothing was synced
 */
export const syncTodaySteps = async () => {
  if (!(await isSyncEnabled())) return null;
  if (!(await hasPermission())) return null;
  const steps = await readTodaySteps();
  if (steps == null) return null;
  try {
    const res = await api.post(ENDPOINTS.LOG_TRACKING, { steps });
    return res?.success ? steps : null;
  } catch (e) {
    return null;
  }
};

/**
 * True when the phone is the source of truth for steps, so the manual walk log
 * should record distance and calories but leave the step count alone.
 */
export const stepsComeFromPhone = async () => {
  if (!isSupported()) return false;
  return (await isSyncEnabled()) && (await hasPermission());
};
