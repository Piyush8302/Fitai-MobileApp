import { DevSettings } from 'react-native';

// Reloads the JS bundle so module-level StyleSheet.create() re-evaluates with the
// new theme palette (COLORS is swapped at App.js startup). Used by the dark/light
// toggle so the theme applies instantly without the user reopening the app.
// Returns true if a reload was triggered, false if no reload mechanism is available.
export async function reloadApp() {
  // Production / standalone build: expo-updates (lazy-required so it never crashes
  // if the module isn't in the build).
  try {
    const Updates = require('expo-updates');
    if (Updates && typeof Updates.reloadAsync === 'function') {
      await Updates.reloadAsync();
      return true;
    }
  } catch (e) { /* not available */ }

  // Development (Metro): DevSettings.reload
  try {
    if (DevSettings && typeof DevSettings.reload === 'function') {
      DevSettings.reload();
      return true;
    }
  } catch (e) { /* not available */ }

  return false;
}
