// ─── Automatic gym check-in via geofencing ───────────────────────────────────
// When the member's phone ENTERS a gym's 100m radius, the OS wakes this task —
// even with the app closed — and we post attendance to the backend. The server
// re-verifies membership, member status, gym hours and distance, so this is
// only a trigger, not the authority.
//
// IMPORTANT: this file must be imported ONCE at app entry (App.js) so the task
// is defined when Android launches us headlessly for a geofence event.

import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';

export const GYM_GEOFENCE_TASK = 'fitai-gym-geofence';
const FLAG_KEY = 'autoCheckin'; // '1' = user enabled the toggle

TaskManager.defineTask(GYM_GEOFENCE_TASK, async ({ data, error }) => {
  try {
    if (error || !data) return;
    const { eventType, region } = data;
    if (eventType !== Location.GeofencingEventType.Enter || !region?.identifier) return;

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    // Best effort: use the freshest known position; fall back to the fence center.
    let lat = region.latitude, lng = region.longitude;
    try {
      const pos = await Location.getLastKnownPositionAsync();
      if (pos?.coords) { lat = pos.coords.latitude; lng = pos.coords.longitude; }
    } catch (e) {}

    await fetch(`${API_BASE_URL}/api/gym/my/auto-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gymId: region.identifier, lat, lng }),
    });
  } catch (e) { /* background task — never throw */ }
});

// Turn ON auto check-in for the member's gyms. `gyms` = [{ _id, name, lat, lng }].
// Returns { ok, reason?, count? } — reason: 'foreground' | 'background' | 'nolocation'.
export async function enableAutoCheckin(gyms) {
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== 'granted') return { ok: false, reason: 'foreground' };
  const bg = await Location.requestBackgroundPermissionsAsync();
  if (bg.status !== 'granted') return { ok: false, reason: 'background' };

  const regions = (gyms || [])
    .filter((g) => g && g.lat != null && g.lng != null)
    .map((g) => ({
      identifier: String(g._id),
      latitude: g.lat,
      longitude: g.lng,
      radius: 100, // metres — matches the backend geofence
      notifyOnEnter: true,
      notifyOnExit: false,
    }));
  if (!regions.length) return { ok: false, reason: 'nolocation' };

  await Location.startGeofencingAsync(GYM_GEOFENCE_TASK, regions);
  await AsyncStorage.setItem(FLAG_KEY, '1');
  return { ok: true, count: regions.length };
}

export async function disableAutoCheckin() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(GYM_GEOFENCE_TASK)) {
      await Location.stopGeofencingAsync(GYM_GEOFENCE_TASK);
    }
  } catch (e) {}
  await AsyncStorage.setItem(FLAG_KEY, '0');
}

// ─── Check in when the app is OPENED at the gym ──────────────────────────────
// The web check-in page marks attendance the moment a member opens it at the
// gym, and the app should feel the same: open FitAI while you're there and your
// attendance is already marked. This runs on launch/resume and is deliberately
// silent — it never asks for a permission it doesn't already have, and the
// server re-checks membership, status, gym hours and distance anyway.
let lastOpenCheck = 0;

export async function checkInOnAppOpen() {
  try {
    // Once every 10 minutes at most — resume fires often.
    if (Date.now() - lastOpenCheck < 10 * 60 * 1000) return;
    lastOpenCheck = Date.now();

    const token = await AsyncStorage.getItem('token');
    if (!token) return;

    // Never prompt here. If the member hasn't granted location yet, the
    // "Auto check-in" toggle on the gym card is where that conversation happens.
    const perm = await Location.getForegroundPermissionsAsync();
    if (perm.status !== 'granted') return;

    const cardRes = await fetch(`${API_BASE_URL}/api/gym/my/card`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).catch(() => null);
    const gyms = (cardRes?.data?.gyms || [])
      .filter((g) => g?.canCheckIn !== false && g?.gym?.lat != null && g?.gym?.lng != null)
      .map((g) => g.gym);
    if (!gyms.length) return;

    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }).catch(() => null);
    if (!pos?.coords) return;
    const { latitude: lat, longitude: lng } = pos.coords;

    // Straight-line metres — good enough to pick which gym we're standing in.
    const distance = (a, b, c, d) => {
      const R = 6371000, rad = (x) => (x * Math.PI) / 180;
      const dLat = rad(c - a), dLng = rad(d - b);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(h));
    };
    const near = gyms
      .map((g) => ({ g, d: distance(lat, lng, g.lat, g.lng) }))
      .filter((x) => x.d <= 120)
      .sort((x, y) => x.d - y.d)[0];
    if (!near) return;

    await fetch(`${API_BASE_URL}/api/gym/my/auto-checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ gymId: String(near.g._id), lat, lng }),
    });
  } catch (e) { /* silent — attendance on app open is a bonus, never a blocker */ }
}

export async function isAutoCheckinEnabled() {
  try {
    const flag = (await AsyncStorage.getItem(FLAG_KEY)) === '1';
    const registered = await TaskManager.isTaskRegisteredAsync(GYM_GEOFENCE_TASK);
    return flag && registered;
  } catch (e) { return false; }
}
