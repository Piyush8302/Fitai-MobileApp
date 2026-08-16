// Guards for number fields.
//
// A numeric keyboardType is a hint, not a rule: a member can paste letters into
// one, some third-party keyboards offer their own symbol rows, and nothing in
// React Native caps how many digits arrive. That is how a walk of
// 66666666666666666666 km got logged and previewed as "~1.35e+107 steps".
//
// Every number field in the app runs its text through numericText, and every
// save checks the parsed value against a range. The keyboard picks the layout;
// these two decide what is actually accepted.

/**
 * Keep only what a number can contain: digits, at most one decimal point, and
 * no more characters than the field should ever need.
 */
export const numericText = (text, { decimals = false, maxLen = 6 } = {}) => {
  let clean = String(text ?? '').replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
  if (decimals) {
    const parts = clean.split('.');
    if (parts.length > 2) clean = `${parts[0]}.${parts.slice(1).join('')}`;
  }
  return clean.slice(0, maxLen);
};

/** Digits only — phone numbers, OTPs, ages, counts. */
export const digitsOnly = (text, maxLen = 10) => numericText(text, { decimals: false, maxLen });

/** Rupee amounts: digits plus paise, capped at 7 digits (₹99,99,999). */
export const moneyText = (text) => numericText(text, { decimals: true, maxLen: 9 });

/**
 * Range check for a save handler. Returns null when the value is good, or a
 * sentence to show the user when it is not.
 *
 *   const bad = rangeError(amount, { label: 'Amount', min: 1, max: 1000000 });
 *   if (bad) { Alert.alert('Check the amount', bad); return; }
 */
export const rangeError = (raw, { label = 'Value', min = 0, max = Infinity, integer = false } = {}) => {
  const n = Number(raw);
  if (raw === '' || raw === null || raw === undefined || !Number.isFinite(n)) {
    return `${label} is required — enter a number.`;
  }
  if (integer && !Number.isInteger(n)) return `${label} must be a whole number.`;
  if (n < min) return `${label} must be at least ${min}.`;
  if (n > max) return `${label} looks too large — it must be ${max} or less.`;
  return null;
};

// Shared ceilings, so the same field does not get one limit here and another
// there. Generous on purpose: these catch typos and pastes, not real entries.
export const LIMITS = {
  age: { min: 5, max: 120 },
  heightCm: { min: 50, max: 275 },
  weightKg: { min: 20, max: 300 },
  distanceKm: { min: 0.1, max: 300 },
  minutes: { min: 0, max: 1440 },
  sleepHours: { min: 0.5, max: 24 },
  calories: { min: 0, max: 5000 },
  protein: { min: 0, max: 500 },
  money: { min: 0, max: 10000000 },
  salary: { min: 0, max: 10000000 },
};
