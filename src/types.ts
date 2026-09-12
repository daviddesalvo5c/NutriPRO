export type Gender = 'male' | 'female';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'intense' | 'very_intense';

export type FormulaType = 'mifflin' | 'harris';

export type GoalType = 'deficit' | 'maintenance' | 'surplus';

export type GoalIntensity = 'mild' | 'moderate' | 'aggressive';

export interface UserProfile {
  name: string;
  age: number;
  gender: Gender;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  formula: FormulaType;
  goal: GoalType;
  goalIntensity: GoalIntensity;
  
  // Customization override
  customTargetsEnabled: boolean;
  targetCalories: number;
  targetProteinGrams: number;
  targetCarbsGrams: number;
  targetFatGrams: number;
  
  // Calorie Cycling / Flexible Social Day ("Día Social / Cheat Meal flexible")
  calorieCyclingEnabled?: boolean;
  weekdayReductionKcal?: number; // e.g. 150 kcal saved Mon-Fri
  socialDays?: ('friday' | 'saturday' | 'sunday')[]; // days that receive the banked calories

  // Last updated timestamp
  updatedAt: string;
}

export interface CalculationResult {
  bmr: number;
  tdee: number;
  targetCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  proteinCalories: number;
  carbsCalories: number;
  fatCalories: number;
  proteinPercent: number;
  carbsPercent: number;
  fatPercent: number;
  calorieAdjustment: number;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface FoodItem {
  id: string;
  name: string;
  portionDescription: string;
  amountGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  mealType: MealType;
  timeAdded?: string;
}

export interface DailyLog {
  date: string; // YYYY-MM-DD
  items: FoodItem[];
  waterMl?: number; // Daily hydration in ml
  waterGoalMl?: number;
  isClosed?: boolean;
  closedAt?: string;
  notes?: string;
}

export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weightKg: number;
  note?: string;
}

export interface BodyMeasurementEntry {
  id: string;
  date: string; // YYYY-MM-DD
  waistCm?: number;
  hipCm?: number;
  chestCm?: number;
  armsCm?: number;
  thighsCm?: number;
  notes?: string;
}

export interface ProgressPhotoEntry {
  id: string;
  date: string; // YYYY-MM-DD
  photoUrl: string; // Base64 data URL
  weightKg?: number;
  tag: 'front' | 'side' | 'back' | 'other';
  notes?: string;
}

export interface RecipeItem {
  id: string;
  title: string;
  description: string;
  goalCategory: GoalType | 'all';
  mealType: MealType;
  prepTimeMinutes: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  servingDescription: string;
  ingredients: string[];
  instructions: string[];
  tag: string;
}

export type SubscriptionTier = 'free' | 'pro_trial' | 'pro_monthly' | 'pro_annual' | 'vip';

export interface SubscriptionTransaction {
  id: string;
  date: string; // ISO or YYYY-MM-DD
  userEmail: string;
  userName: string;
  plan: 'pro_monthly' | 'pro_annual';
  billingCycle: 'monthly' | 'annual';
  amount: number;
  status: 'completed' | 'active';
}

export interface AuthUser {
  id?: string;
  email: string;
  name: string;
  password?: string;
  isFounder?: boolean;
  tier?: SubscriptionTier;
  subscribedAt?: string;
  trialEndsAt?: string;
  trialStartedAt?: string;
  createdAt: string;
}

export interface UserSession {
  userId?: string;
  email: string;
  name: string;
  isFounder?: boolean;
  tier?: SubscriptionTier;
  trialEndsAt?: string;
  trialStartedAt?: string;
  loginTime?: string;
}

// -------------------------------------------------------------
// Activity & Workout Types
// -------------------------------------------------------------
export type WorkoutCategory =
  | 'running'
  | 'outdoor_walk'
  | 'yoga'
  | 'gym'
  | 'cycling'
  | 'swimming'
  | 'hiit'
  | 'pilates'
  | 'boxing'
  | 'dancing'
  | 'other';

export interface WorkoutItem {
  id: string;
  type: WorkoutCategory;
  typeName: string;
  durationMinutes: number;
  caloriesBurned: number;
  timeAdded: string; // HH:MM
  notes?: string;
  date: string; // YYYY-MM-DD
}

export type ConnectedActivityService = 
  | 'strava' 
  | 'health_connect' 
  | 'xiaomi_watch' 
  | 'manual_watch' 
  | null;

export interface ActivityDayLog {
  date: string; // YYYY-MM-DD
  connectedService: ConnectedActivityService;
  syncedSteps: number;
  syncedCalories: number;
  deviceModel?: string;
  isCalibratedManually?: boolean;
  lastSyncedAt?: string;
  workouts: WorkoutItem[];
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  distance: number; // meters
  moving_time: number; // seconds
  elapsed_time: number;
  total_elevation_gain: number;
  calories?: number;
  start_date_local: string;
  average_speed: number;
}


