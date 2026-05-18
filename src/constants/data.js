export const FITNESS_GOALS = [
  { id: 'weight_loss', title: 'Weight Loss', icon: '🔥', color: '#FF6B6B', desc: 'Burn fat & get lean' },
  { id: 'weight_gain', title: 'Weight Gain', icon: '💪', color: '#4CAF50', desc: 'Gain healthy weight' },
  { id: 'muscle_build', title: 'Muscle Building', icon: '🏋️', color: '#6C63FF', desc: 'Build muscle mass' },
  { id: 'fat_loss', title: 'Fat Loss', icon: '⚡', color: '#FF9800', desc: 'Reduce body fat %' },
  { id: 'height_growth', title: 'Height Growth', icon: '📏', color: '#00D2FF', desc: 'Improve posture & height' },
  { id: 'maintenance', title: 'Stay Fit', icon: '🧘', color: '#9C27B0', desc: 'Maintain fitness level' },
  { id: 'home_workout', title: 'Home Workout', icon: '🏠', color: '#E91E63', desc: 'No equipment needed' },
  { id: 'gym_workout', title: 'Gym Workout', icon: '🏢', color: '#607D8B', desc: 'Full gym training' },
];

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise', icon: '🪑', multiplier: 1.2 },
  { id: 'light', label: 'Lightly Active', desc: 'Exercise 1-3 days/week', icon: '🚶', multiplier: 1.375 },
  { id: 'moderate', label: 'Moderately Active', desc: 'Exercise 3-5 days/week', icon: '🏃', multiplier: 1.55 },
  { id: 'very_active', label: 'Very Active', desc: 'Exercise 6-7 days/week', icon: '💪', multiplier: 1.725 },
  { id: 'extreme', label: 'Extremely Active', desc: 'Hard exercise daily', icon: '🔥', multiplier: 1.9 },
];

export const GENDER_OPTIONS = [
  { id: 'male', label: 'Male', icon: '👨' },
  { id: 'female', label: 'Female', icon: '👩' },
  { id: 'other', label: 'Other', icon: '🧑' },
];

export const MEAL_PLAN_SAMPLE = {
  breakfast: [
    { name: 'Oats with Banana', calories: 320, protein: 12, carbs: 55, fat: 6, icon: '🥣' },
    { name: 'Poha with Peanuts', calories: 280, protein: 8, carbs: 45, fat: 8, icon: '🍚' },
    { name: 'Idli with Sambar', calories: 250, protein: 10, carbs: 42, fat: 4, icon: '🥘' },
    { name: 'Egg Omelette + Toast', calories: 350, protein: 22, carbs: 30, fat: 14, icon: '🍳' },
  ],
  lunch: [
    { name: 'Dal Rice + Sabzi', calories: 450, protein: 18, carbs: 65, fat: 10, icon: '🍛' },
    { name: 'Chicken Curry + Roti', calories: 520, protein: 35, carbs: 45, fat: 16, icon: '🍗' },
    { name: 'Paneer Tikka + Rice', calories: 480, protein: 24, carbs: 55, fat: 14, icon: '🧀' },
    { name: 'Rajma Chawal', calories: 420, protein: 16, carbs: 62, fat: 8, icon: '🫘' },
  ],
  dinner: [
    { name: 'Grilled Chicken Salad', calories: 350, protein: 32, carbs: 20, fat: 12, icon: '🥗' },
    { name: 'Chapati + Dal Fry', calories: 380, protein: 15, carbs: 52, fat: 8, icon: '🫓' },
    { name: 'Mixed Veg Curry + Rice', calories: 400, protein: 12, carbs: 58, fat: 10, icon: '🥘' },
    { name: 'Fish Curry + Roti', calories: 420, protein: 30, carbs: 40, fat: 12, icon: '🐟' },
  ],
  snacks: [
    { name: 'Protein Shake', calories: 180, protein: 25, carbs: 12, fat: 3, icon: '🥤' },
    { name: 'Mixed Nuts', calories: 200, protein: 6, carbs: 8, fat: 18, icon: '🥜' },
    { name: 'Fruit Bowl', calories: 150, protein: 2, carbs: 35, fat: 1, icon: '🍎' },
    { name: 'Sprouts Chaat', calories: 160, protein: 10, carbs: 22, fat: 3, icon: '🥗' },
  ],
};

export const WORKOUT_CATEGORIES = [
  { id: 'chest', name: 'Chest', icon: '🫁', color: '#FF6B6B' },
  { id: 'back', name: 'Back', icon: '🔙', color: '#6C63FF' },
  { id: 'shoulders', name: 'Shoulders', icon: '💪', color: '#00D2FF' },
  { id: 'arms', name: 'Arms', icon: '🦾', color: '#FF9800' },
  { id: 'legs', name: 'Legs', icon: '🦵', color: '#4CAF50' },
  { id: 'abs', name: 'Abs', icon: '🧱', color: '#E91E63' },
  { id: 'cardio', name: 'Cardio', icon: '❤️', color: '#F44336' },
  { id: 'fullbody', name: 'Full Body', icon: '🏋️', color: '#9C27B0' },
];

export const EXERCISES = {
  chest: [
    { name: 'Push Ups', sets: 3, reps: 15, duration: '5 min', calories: 50, difficulty: 'Beginner', muscle: 'Chest, Triceps', tips: 'Keep your body straight, lower chest to floor' },
    { name: 'Bench Press', sets: 4, reps: 10, duration: '8 min', calories: 80, difficulty: 'Intermediate', muscle: 'Chest, Shoulders', tips: 'Grip slightly wider than shoulders, control the bar' },
    { name: 'Incline Dumbbell Press', sets: 3, reps: 12, duration: '7 min', calories: 70, difficulty: 'Intermediate', muscle: 'Upper Chest', tips: 'Set bench to 30-45 degrees' },
    { name: 'Cable Crossover', sets: 3, reps: 15, duration: '6 min', calories: 55, difficulty: 'Advanced', muscle: 'Inner Chest', tips: 'Squeeze at the center, control the movement' },
  ],
  back: [
    { name: 'Pull Ups', sets: 3, reps: 10, duration: '6 min', calories: 60, difficulty: 'Intermediate', muscle: 'Lats, Biceps', tips: 'Full range of motion, chin above bar' },
    { name: 'Lat Pulldown', sets: 4, reps: 12, duration: '7 min', calories: 65, difficulty: 'Beginner', muscle: 'Lats', tips: 'Pull to upper chest, squeeze shoulder blades' },
    { name: 'Barbell Row', sets: 4, reps: 10, duration: '8 min', calories: 75, difficulty: 'Intermediate', muscle: 'Upper Back', tips: 'Keep back flat, pull to lower chest' },
    { name: 'Deadlift', sets: 3, reps: 8, duration: '10 min', calories: 100, difficulty: 'Advanced', muscle: 'Full Back, Legs', tips: 'Maintain neutral spine, drive through heels' },
  ],
  legs: [
    { name: 'Squats', sets: 4, reps: 12, duration: '8 min', calories: 90, difficulty: 'Beginner', muscle: 'Quads, Glutes', tips: 'Knees over toes, chest up, go parallel' },
    { name: 'Lunges', sets: 3, reps: 15, duration: '7 min', calories: 70, difficulty: 'Beginner', muscle: 'Quads, Hamstrings', tips: 'Step forward, knee at 90 degrees' },
    { name: 'Leg Press', sets: 4, reps: 12, duration: '8 min', calories: 85, difficulty: 'Intermediate', muscle: 'Quads, Glutes', tips: 'Feet shoulder width apart on platform' },
    { name: 'Calf Raises', sets: 4, reps: 20, duration: '5 min', calories: 40, difficulty: 'Beginner', muscle: 'Calves', tips: 'Full stretch at bottom, squeeze at top' },
  ],
  abs: [
    { name: 'Crunches', sets: 3, reps: 20, duration: '5 min', calories: 40, difficulty: 'Beginner', muscle: 'Upper Abs', tips: 'Lift shoulders off ground, dont pull neck' },
    { name: 'Plank', sets: 3, reps: 1, duration: '3 min', calories: 30, difficulty: 'Beginner', muscle: 'Core', tips: 'Hold 30-60 seconds, keep body straight' },
    { name: 'Leg Raises', sets: 3, reps: 15, duration: '5 min', calories: 45, difficulty: 'Intermediate', muscle: 'Lower Abs', tips: 'Keep lower back pressed to floor' },
    { name: 'Russian Twist', sets: 3, reps: 20, duration: '5 min', calories: 50, difficulty: 'Intermediate', muscle: 'Obliques', tips: 'Lean back slightly, rotate torso fully' },
  ],
  cardio: [
    { name: 'Running', sets: 1, reps: 1, duration: '30 min', calories: 300, difficulty: 'Beginner', muscle: 'Full Body', tips: 'Start slow, maintain steady pace' },
    { name: 'Jump Rope', sets: 3, reps: 100, duration: '15 min', calories: 200, difficulty: 'Intermediate', muscle: 'Full Body', tips: 'Land on balls of feet, keep elbows close' },
    { name: 'Burpees', sets: 3, reps: 15, duration: '10 min', calories: 150, difficulty: 'Advanced', muscle: 'Full Body', tips: 'Explosive jump, controlled landing' },
    { name: 'Mountain Climbers', sets: 3, reps: 30, duration: '8 min', calories: 120, difficulty: 'Intermediate', muscle: 'Core, Legs', tips: 'Keep hips level, drive knees to chest' },
  ],
};

export const WEEKLY_WORKOUT_PLAN = [
  { day: 'Monday', focus: 'Chest + Triceps', icon: '🫁', color: '#FF6B6B' },
  { day: 'Tuesday', focus: 'Back + Biceps', icon: '🔙', color: '#6C63FF' },
  { day: 'Wednesday', focus: 'Legs + Core', icon: '🦵', color: '#4CAF50' },
  { day: 'Thursday', focus: 'Shoulders + Arms', icon: '💪', color: '#00D2FF' },
  { day: 'Friday', focus: 'Cardio + Abs', icon: '❤️', color: '#F44336' },
  { day: 'Saturday', focus: 'Full Body', icon: '🏋️', color: '#9C27B0' },
  { day: 'Sunday', focus: 'Rest Day', icon: '😴', color: '#607D8B' },
];

export const HEIGHT_EXERCISES = [
  { name: 'Cobra Stretch', duration: '2 min', icon: '🐍', desc: 'Stretches spine and improves posture' },
  { name: 'Hanging Exercise', duration: '3 min', icon: '🧗', desc: 'Decompresses spine, improves posture' },
  { name: 'Pelvic Shift', duration: '2 min', icon: '🏊', desc: 'Stretches lower back and hips' },
  { name: 'Swimming', duration: '30 min', icon: '🏊‍♂️', desc: 'Full body stretch, great for posture' },
  { name: 'Toe Touches', duration: '3 min', icon: '🤸', desc: 'Stretches hamstrings and spine' },
  { name: 'Cat-Cow Stretch', duration: '3 min', icon: '🐱', desc: 'Improves spinal flexibility' },
  { name: 'Pilates Roll Over', duration: '5 min', icon: '🧘', desc: 'Stretches and lengthens spine' },
  { name: 'Jumping Exercises', duration: '10 min', icon: '🦘', desc: 'Stimulates growth hormones' },
];

export const ONBOARDING_DATA = [
  {
    title: 'AI-Powered Fitness',
    subtitle: 'Get personalized workout plans, diet charts, and health tips powered by advanced AI technology.',
    icon: '🤖',
  },
  {
    title: 'Track Your Progress',
    subtitle: 'Monitor your weight, calories, water intake, steps, and sleep with beautiful visual charts.',
    icon: '📊',
  },
  {
    title: 'Achieve Your Goals',
    subtitle: 'Whether its weight loss, muscle gain, or better health — we have the perfect plan for you.',
    icon: '🎯',
  },
];

export const SUBSCRIPTION_PLANS = [
  {
    id: 'free',
    name: 'Free Plan',
    price: '₹0',
    period: 'Forever',
    features: ['Basic BMI Calculator', 'Limited Diet Plans', 'Limited Workouts', 'Ads Enabled', '3 AI Chats/Day'],
    color: '#607D8B',
    popular: false,
  },
  {
    id: 'premium',
    name: 'Premium',
    price: '₹29',
    period: '/month',
    features: ['Unlimited AI Plans', 'Personalized Coaching', 'Advanced Workouts', 'Premium Diet Plans', 'No Ads', 'Detailed Analytics', 'Priority Support'],
    color: '#6C63FF',
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Pro Yearly',
    price: '₹249',
    period: '/year',
    features: ['Everything in Premium', 'Dietitian Access', 'Custom Meal Plans', 'Video Consultations', 'Save ₹99/year'],
    color: '#FF6B6B',
    popular: false,
  },
];
