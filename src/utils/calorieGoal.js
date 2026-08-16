// The daily calorie target, mirroring src/utils/calorieGoal.js on the backend.
//
// The same formula was written out by hand in HomeScreen, TrackingScreen and
// DietScreen. They happen to agree today, but three copies of a number the user
// eats to is three chances to drift — DietScreen already carries a table of
// multipliers (0.8 / 1.2 / 1.15) that its own code overrides, left over from an
// older version of the rule.
//
// References: Mifflin-St Jeor for BMR, standard activity multipliers for TDEE,
// a 500 kcal/day deficit for roughly 0.5 kg/week of loss (ACSM), and a modest
// 300-400 kcal surplus for lean gain (ISSN).

/**
 * @param user  profile holding bmr, dailyCalories (TDEE) and fitnessGoal
 * @returns the number of calories to eat today
 */
export const getGoalAdjustedCalories = (user = {}) => {
  const tdee = user.dailyCalories || 2000;
  const bmr = user.bmr || Math.round(tdee / 1.55);

  // Never prescribe a target at or below BMR — that is the floor the body needs
  // at rest, and eating under it is how a deficit turns into muscle loss.
  const safeDeficit = Math.max(bmr + 100, tdee - 500);

  switch (user.fitnessGoal) {
    case 'weight_loss':
    case 'fat_loss': return safeDeficit;
    case 'weight_gain': return Math.round(tdee + 400);
    case 'muscle_building': return Math.round(tdee + 300);
    case 'height_growth':
    case 'gym_workout': return Math.round(tdee * 1.1);
    case 'home_workout':
    case 'maintenance':
    default: return tdee;
  }
};

/**
 * BMR by Mifflin-St Jeor. Prefer the value the server already computed; this is
 * the fallback for screens that calculate from figures typed on the spot.
 *
 * 'other' sits with the female constant rather than guessing — the two differ by
 * 166 kcal, and picking the lower one errs toward not over-feeding a deficit.
 */
export const calcBmr = ({ weight, height, age = 25, gender }) => {
  if (!weight || !height) return null;
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === 'male' ? base + 5 : base - 161);
};

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export const calcTdee = (bmr, activityLevel) =>
  bmr ? Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55)) : null;

/** Deurenberg body-fat estimate. The male and female constants differ; both are used. */
export const calcBodyFat = (bmi, age = 25, gender) => {
  if (!bmi) return null;
  const bf = gender === 'male'
    ? 1.20 * bmi + 0.23 * age - 16.2
    : 1.20 * bmi + 0.23 * age - 5.4;
  return parseFloat(Math.max(5, Math.min(50, bf)).toFixed(1));
};
