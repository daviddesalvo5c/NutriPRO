import { 
  AuthUser, 
  DailyLog, 
  FoodItem, 
  UserProfile, 
  UserSession,
  WeightEntry,
  BodyMeasurementEntry,
  ProgressPhotoEntry,
  SubscriptionTier,
  SubscriptionTransaction,
  ActivityDayLog,
  WorkoutItem
} from '../types';
import { calculateBMR, calculateSuggestedMacros, calculateTDEE, getCalorieAdjustment } from './nutritionCalculations';

export const FOUNDER_EMAIL = 'daviddesalvo.5c@gmail.com';
export const FOUNDER_PASSWORD = 'minplan13';
export const FOUNDER_NAME = 'David De Salvo';

const USERS_REGISTRY_KEY = 'nutrifit_registered_users_v1';
const ACTIVE_SESSION_KEY = 'nutrifit_active_session_v1';

export function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Generate an isolated, safe storage key per user email
export function getUserStorageKey(prefix: string, email: string): string {
  const safe = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `${prefix}_${safe}`;
}

export function createDefaultProfile(name: string = 'Usuario'): UserProfile {
  const defaultAge = 28;
  const defaultGender = 'male';
  const defaultHeight = 178;
  const defaultWeight = 75;
  const defaultActivity = 'moderate';
  const defaultGoal = 'deficit';
  const defaultIntensity = 'moderate';

  const bmr = calculateBMR(defaultWeight, defaultHeight, defaultAge, defaultGender, 'mifflin');
  const tdee = calculateTDEE(bmr, defaultActivity);
  const adjustment = getCalorieAdjustment(tdee, defaultGoal, defaultIntensity);
  const targetCalories = Math.max(1200, tdee + adjustment);
  const macros = calculateSuggestedMacros(targetCalories, defaultWeight, defaultGoal);

  return {
    name,
    age: defaultAge,
    gender: defaultGender,
    heightCm: defaultHeight,
    weightKg: defaultWeight,
    activityLevel: defaultActivity,
    formula: 'mifflin',
    goal: defaultGoal,
    goalIntensity: defaultIntensity,
    customTargetsEnabled: false,
    targetCalories,
    targetProteinGrams: macros.proteinGrams,
    targetCarbsGrams: macros.carbsGrams,
    targetFatGrams: macros.fatGrams,
    updatedAt: '1970-01-01T00:00:00.000Z',
  };
}

export const INITIAL_SAMPLE_FOODS: FoodItem[] = [
  {
    id: 'sample-1',
    name: 'Tortilla de claras con espinacas y avena',
    portionDescription: '1 plato (3 claras + 1 huevo + 40g avena)',
    amountGrams: 250,
    calories: 380,
    proteinGrams: 32,
    carbsGrams: 36,
    fatGrams: 10,
    mealType: 'breakfast',
    timeAdded: '08:30',
  },
  {
    id: 'sample-2',
    name: 'Café con bebida vegetal de almendras',
    portionDescription: '1 taza (200ml)',
    amountGrams: 200,
    calories: 45,
    proteinGrams: 2,
    carbsGrams: 4,
    fatGrams: 2,
    mealType: 'breakfast',
    timeAdded: '08:45',
  },
  {
    id: 'sample-3',
    name: 'Pechuga de pollo a la plancha con quinoa y brócoli',
    portionDescription: '1 ración (180g pollo + 120g quinoa)',
    amountGrams: 350,
    calories: 520,
    proteinGrams: 52,
    carbsGrams: 48,
    fatGrams: 12,
    mealType: 'lunch',
    timeAdded: '14:00',
  },
  {
    id: 'sample-4',
    name: 'Yogur griego 0% con frutos rojos y nueces',
    portionDescription: '1 bol (150g yogur + 15g nueces)',
    amountGrams: 180,
    calories: 220,
    proteinGrams: 18,
    carbsGrams: 14,
    fatGrams: 9,
    mealType: 'snacks',
    timeAdded: '17:30',
  },
];

// -------------------------------------------------------------
// USER REGISTRY & SESSION MANAGEMENT
// -------------------------------------------------------------

export function loadRegisteredUsers(): AuthUser[] {
  try {
    const raw = localStorage.getItem(USERS_REGISTRY_KEY);
    let users: AuthUser[] = raw ? JSON.parse(raw) : [];

    // Ensure preconfigured founder user is always registered with VIP status
    const founderIndex = users.findIndex(
      (u) => u.email.toLowerCase() === FOUNDER_EMAIL.toLowerCase()
    );

    if (founderIndex === -1) {
      const founderUser: AuthUser = {
        email: FOUNDER_EMAIL,
        name: FOUNDER_NAME,
        password: FOUNDER_PASSWORD,
        isFounder: true,
        tier: 'vip',
        createdAt: new Date().toISOString(),
      };
      users.unshift(founderUser);
    } else {
      users[founderIndex].isFounder = true;
      users[founderIndex].tier = 'vip';
    }

    // Only maintain real registered users (plus founder). Clean out any mock demo users if present.
    users = users.filter((u) => {
      const e = u.email.toLowerCase();
      return !e.includes('example.com') && !e.includes('ejemplo.com') && e !== 'carlos.fit@example.com';
    });

    // Ensure all users have a valid tier
    let changed = false;
    users = users.map((u) => {
      if (!u.tier) {
        changed = true;
        return { ...u, tier: u.isFounder ? 'vip' : 'free' };
      }
      return u;
    });
    saveRegisteredUsers(users);

    return users;
  } catch (err) {
    console.error('Error loading registered users:', err);
    return [
      {
        email: FOUNDER_EMAIL,
        name: FOUNDER_NAME,
        password: FOUNDER_PASSWORD,
        isFounder: true,
        tier: 'vip',
        createdAt: new Date().toISOString(),
      },
    ];
  }
}

export function saveRegisteredUsers(users: AuthUser[]): void {
  try {
    localStorage.setItem(USERS_REGISTRY_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Error saving registered users:', err);
  }
}

export function registerNewUser(name: string, email: string, password: string): { success: boolean; message?: string; user?: AuthUser } {
  const users = loadRegisteredUsers();
  const normalizedEmail = email.trim().toLowerCase();

  if (users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    return { success: false, message: 'Este correo electrónico ya se encuentra registrado.' };
  }

  const newUser: AuthUser = {
    name: name.trim(),
    email: normalizedEmail,
    password,
    isFounder: normalizedEmail === FOUNDER_EMAIL.toLowerCase(),
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  saveRegisteredUsers(users);

  // Initialize fresh profile for this user
  const initialProfile = createDefaultProfile(newUser.name);
  saveStoredProfileForUser(newUser.email, initialProfile);

  return { success: true, user: newUser };
}

export function loadActiveSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) {
        return parsed as UserSession;
      }
    }
  } catch (err) {
    console.error('Error loading active session:', err);
  }
  return null;
}

export function saveActiveSession(session: UserSession): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.error('Error saving active session:', err);
  }
}

export function clearActiveSession(): void {
  try {
    localStorage.removeItem(ACTIVE_SESSION_KEY);
  } catch (err) {
    console.error('Error clearing active session:', err);
  }
}

// -------------------------------------------------------------
// ISOLATED PER-USER PROFILE & DIARY LOGS
// -------------------------------------------------------------

export function loadStoredProfileForUser(email: string, userName?: string): UserProfile {
  const storageKey = getUserStorageKey('nutrifit_user_profile', email);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name && typeof parsed.weightKg === 'number') {
        return parsed as UserProfile;
      }
    }
  } catch (err) {
    console.error(`Error loading profile for ${email}:`, err);
  }

  // Fallback initial profile for this user
  const fallback = createDefaultProfile(userName || (email === FOUNDER_EMAIL ? FOUNDER_NAME : 'Usuario'));
  saveStoredProfileForUser(email, fallback);
  return fallback;
}

export function saveStoredProfileForUser(email: string, profile: UserProfile): void {
  const storageKey = getUserStorageKey('nutrifit_user_profile', email);
  try {
    const updated = {
      ...profile,
      updatedAt: profile.updatedAt || new Date().toISOString(),
    };
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
    console.error(`Error saving profile for ${email}:`, err);
  }
}

export function loadDailyLogsForUser(email: string): Record<string, DailyLog> {
  const storageKey = getUserStorageKey('nutrifit_daily_logs', email);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Error loading daily logs for ${email}:`, err);
  }

  const today = getTodayString();
  const isFounder = email.trim().toLowerCase() === FOUNDER_EMAIL.toLowerCase();

  // Start clean with empty food items for today
  const initialLogs: Record<string, DailyLog> = {
    [today]: {
      date: today,
      items: [],
      waterMl: 0,
    },
  };

  saveDailyLogsForUser(email, initialLogs);
  return initialLogs;
}

export function saveDailyLogsForUser(email: string, logs: Record<string, DailyLog>): void {
  const storageKey = getUserStorageKey('nutrifit_daily_logs', email);
  try {
    localStorage.setItem(storageKey, JSON.stringify(logs));
  } catch (err) {
    console.error(`Error saving daily logs for ${email}:`, err);
  }
}

// -------------------------------------------------------------
// WEIGHT HISTORY & PROGRESS LOGS
// -------------------------------------------------------------

export function loadWeightHistoryForUser(email: string, initialWeightKg: number = 75): WeightEntry[] {
  const storageKey = getUserStorageKey('nutrifit_weight_history', email);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Error loading weight history for ${email}:`, err);
  }

  // Generate realistic initial 4-week sample trend points around user's initial weight
  const today = new Date();
  const entries: WeightEntry[] = [];
  const startWeight = initialWeightKg;
  
  for (let i = 21; i >= 0; i -= 3) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const diff = (21 - i) * 0.15; // gradual realistic change
    const simulatedWeight = Number((startWeight + (i > 0 ? (Math.random() * 0.4 - 0.2) + (diff * 0.3) : 0)).toFixed(1));
    entries.push({
      id: `w_${dateStr}`,
      date: dateStr,
      weightKg: simulatedWeight,
      note: i === 21 ? 'Punto de partida' : undefined,
    });
  }

  saveWeightHistoryForUser(email, entries);
  return entries;
}

export function saveWeightHistoryForUser(email: string, entries: WeightEntry[]): void {
  const storageKey = getUserStorageKey('nutrifit_weight_history', email);
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
  } catch (err) {
    console.error(`Error saving weight history for ${email}:`, err);
  }
}

// -------------------------------------------------------------
// BODY MEASUREMENTS
// -------------------------------------------------------------

export function loadMeasurementsForUser(email: string): BodyMeasurementEntry[] {
  const storageKey = getUserStorageKey('nutrifit_body_measurements', email);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Error loading measurements for ${email}:`, err);
  }

  const todayStr = getTodayString();
  const initial: BodyMeasurementEntry[] = [
    {
      id: 'm_init',
      date: todayStr,
      waistCm: 84,
      hipCm: 98,
      chestCm: 102,
      armsCm: 35,
      thighsCm: 56,
      notes: 'Medición inicial',
    },
  ];

  saveMeasurementsForUser(email, initial);
  return initial;
}

export function saveMeasurementsForUser(email: string, entries: BodyMeasurementEntry[]): void {
  const storageKey = getUserStorageKey('nutrifit_body_measurements', email);
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
  } catch (err) {
    console.error(`Error saving measurements for ${email}:`, err);
  }
}

// -------------------------------------------------------------
// PROGRESS PHOTOS
// -------------------------------------------------------------

export function loadProgressPhotosForUser(email: string): ProgressPhotoEntry[] {
  const storageKey = getUserStorageKey('nutrifit_progress_photos', email);
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error(`Error loading progress photos for ${email}:`, err);
  }
  return [];
}

export function saveProgressPhotosForUser(email: string, entries: ProgressPhotoEntry[]): void {
  const storageKey = getUserStorageKey('nutrifit_progress_photos', email);
  try {
    localStorage.setItem(storageKey, JSON.stringify(entries));
  } catch (err) {
    console.error(`Error saving progress photos for ${email}:`, err);
  }
}

// -------------------------------------------------------------
// THEME PREFERENCE (DARK / LIGHT)
// -------------------------------------------------------------

const THEME_KEY = 'nutrifit_theme_preference';

export function loadThemePreference(): 'dark' | 'light' {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw === 'light' || raw === 'dark') {
      return raw;
    }
  } catch (err) {
    console.error('Error loading theme:', err);
  }
  return 'dark'; // Default premium dark theme
}

export function saveThemePreference(theme: 'dark' | 'light'): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (err) {
    console.error('Error saving theme:', err);
  }
}

// -------------------------------------------------------------
// SUBSCRIPTIONS, VIP ROLES & BILLING TRANSACTIONS
// -------------------------------------------------------------

const TRANSACTIONS_KEY = 'nutrifit_transactions_v1';
const VIP_INVITES_KEY = 'nutrifit_vip_invites_v1';

export function isFounderEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase() === FOUNDER_EMAIL.toLowerCase();
}

export function getUserTier(email: string): SubscriptionTier {
  if (isFounderEmail(email)) {
    return 'vip';
  }

  // Check VIP invites registry first
  const vips = loadVipInvitedEmails();
  if (vips.includes(email.trim().toLowerCase())) {
    return 'vip';
  }

  // Check individual user subscription key
  const subKey = getUserStorageKey('nutrifit_user_sub', email);
  try {
    const raw = localStorage.getItem(subKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tier) {
        return parsed.tier as SubscriptionTier;
      }
    }
  } catch (e) {
    console.error('Error reading user subscription:', e);
  }

  // Check registered users table
  const users = loadRegisteredUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (user && user.tier) {
    return user.tier;
  }

  return 'free';
}

export function setUserTier(
  email: string, 
  tier: SubscriptionTier, 
  billingCycle: 'monthly' | 'annual' = 'monthly',
  userName?: string
): void {
  const normalized = email.trim().toLowerCase();
  const subKey = getUserStorageKey('nutrifit_user_sub', normalized);
  
  const subData = {
    tier,
    billingCycle,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(subKey, JSON.stringify(subData));

  // Update in registered users registry
  const users = loadRegisteredUsers();
  const index = users.findIndex((u) => u.email.toLowerCase() === normalized);
  if (index !== -1) {
    users[index].tier = tier;
    users[index].subscribedAt = new Date().toISOString();
    saveRegisteredUsers(users);
  }

  // Record a transaction if it's a paid upgrade
  if (tier === 'pro_monthly' || tier === 'pro_annual') {
    const amount = tier === 'pro_annual' ? 94999 : 12999;
    recordTransaction(
      normalized, 
      userName || (index !== -1 ? users[index].name : 'Usuario'),
      tier,
      billingCycle,
      amount
    );
  }
}

export function loadVipInvitedEmails(): string[] {
  try {
    const raw = localStorage.getItem(VIP_INVITES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((e: string) => e.toLowerCase());
      }
    }
  } catch (err) {
    console.error('Error loading VIP invites:', err);
  }
  return ['elena.r@example.com']; // Initial sample invited VIP
}

export function saveVipInvitedEmails(emails: string[]): void {
  try {
    const unique = Array.from(new Set(emails.map((e) => e.trim().toLowerCase())));
    localStorage.setItem(VIP_INVITES_KEY, JSON.stringify(unique));
  } catch (err) {
    console.error('Error saving VIP invites:', err);
  }
}

export function grantVipToUser(email: string): { success: boolean; message: string; user?: AuthUser } {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) {
    return { success: false, message: 'Ingresa un correo electrónico válido.' };
  }

  // Add to VIP invites list
  const currentVips = loadVipInvitedEmails();
  if (!currentVips.includes(normalized)) {
    currentVips.push(normalized);
    saveVipInvitedEmails(currentVips);
  }

  // Update in user sub key
  const subKey = getUserStorageKey('nutrifit_user_sub', normalized);
  localStorage.setItem(subKey, JSON.stringify({ tier: 'vip', updatedAt: new Date().toISOString() }));

  // Update in registered users registry if existing, or create entry
  const users = loadRegisteredUsers();
  let foundUser = users.find((u) => u.email.toLowerCase() === normalized);

  if (foundUser) {
    foundUser.tier = 'vip';
    saveRegisteredUsers(users);
  } else {
    // Registered placeholder for invited user
    foundUser = {
      name: normalized.split('@')[0],
      email: normalized,
      tier: 'vip',
      createdAt: new Date().toISOString(),
    };
    users.push(foundUser);
    saveRegisteredUsers(users);
  }

  return { 
    success: true, 
    message: `¡Se otorgó el rango VIP con acceso total gratuito a ${normalized}!`, 
    user: foundUser 
  };
}

export function revokeVipFromUser(email: string): { success: boolean; message: string; user?: AuthUser } {
  const normalized = email.trim().toLowerCase();
  if (isFounderEmail(normalized)) {
    return { success: false, message: 'No es posible revocar el estatus de la cuenta de fundador.' };
  }

  // Remove from VIP invites list
  const currentVips = loadVipInvitedEmails();
  const updatedVips = currentVips.filter((e) => e !== normalized);
  saveVipInvitedEmails(updatedVips);

  // Update user sub key to free
  const subKey = getUserStorageKey('nutrifit_user_sub', normalized);
  localStorage.setItem(subKey, JSON.stringify({ tier: 'free', updatedAt: new Date().toISOString() }));

  // Update in registered users
  const users = loadRegisteredUsers();
  const foundUser = users.find((u) => u.email.toLowerCase() === normalized);
  if (foundUser) {
    foundUser.tier = 'free';
    saveRegisteredUsers(users);
  }

  return { 
    success: true, 
    message: `Se revocó el rango VIP de ${normalized}. Ahora es usuario del Plan Gratuito.`,
    user: foundUser
  };
}

export function hasUserProAccess(email: string, tier?: SubscriptionTier): boolean {
  if (isFounderEmail(email)) return true;
  const currentTier = tier || getUserTier(email);
  return currentTier === 'vip' || currentTier === 'pro_monthly' || currentTier === 'pro_annual';
}

// -------------------------------------------------------------
// DAILY AI SCAN LIMIT (3 scans/day for Free users)
// -------------------------------------------------------------

export function getTodayAiScansCount(email: string): number {
  const today = getTodayString();
  const key = getUserStorageKey(`nutrifit_ai_scans_${today}`, email);
  try {
    const val = localStorage.getItem(key);
    return val ? parseInt(val, 10) : 0;
  } catch (e) {
    return 0;
  }
}

export function incrementTodayAiScansCount(email: string): number {
  const today = getTodayString();
  const key = getUserStorageKey(`nutrifit_ai_scans_${today}`, email);
  const count = getTodayAiScansCount(email) + 1;
  try {
    localStorage.setItem(key, count.toString());
  } catch (e) {
    console.error('Error incrementing scan count:', e);
  }
  return count;
}

export function canUserPerformAiScan(email: string, tier?: SubscriptionTier): { allowed: boolean; remaining: number; max: number } {
  if (hasUserProAccess(email, tier)) {
    return { allowed: true, remaining: 9999, max: 9999 };
  }

  const MAX_FREE_DAILY_SCANS = 3;
  const current = getTodayAiScansCount(email);
  const remaining = Math.max(0, MAX_FREE_DAILY_SCANS - current);
  return {
    allowed: remaining > 0,
    remaining,
    max: MAX_FREE_DAILY_SCANS,
  };
}

// -------------------------------------------------------------
// TRANSACTIONS HISTORY & MRR
// -------------------------------------------------------------

export function loadTransactions(): SubscriptionTransaction[] {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy demo transactions with example.com
        const real = parsed.filter((t: SubscriptionTransaction) => 
          t.userEmail && !t.userEmail.includes('example.com') && !t.userEmail.includes('ejemplo.com')
        );
        return real;
      }
    }
  } catch (err) {
    console.error('Error loading transactions:', err);
  }

  return [];
}

export function saveTransactions(transactions: SubscriptionTransaction[]): void {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions));
  } catch (err) {
    console.error('Error saving transactions:', err);
  }
}

export function recordTransaction(
  userEmail: string,
  userName: string,
  plan: 'pro_monthly' | 'pro_annual',
  billingCycle: 'monthly' | 'annual',
  amount: number
): SubscriptionTransaction {
  const txs = loadTransactions();
  const newTx: SubscriptionTransaction = {
    id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    date: new Date().toISOString(),
    userEmail,
    userName,
    plan,
    billingCycle,
    amount,
    status: 'completed',
  };

  const updated = [newTx, ...txs];
  saveTransactions(updated);
  return newTx;
}

export function recordSubscriptionTransaction(params: {
  userEmail: string;
  userName: string;
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  amount: number;
  currency?: string;
  status?: string;
  paymentMethod?: string;
  description?: string;
}): SubscriptionTransaction {
  const plan: 'pro_monthly' | 'pro_annual' = params.tier === 'pro_annual' ? 'pro_annual' : 'pro_monthly';
  return recordTransaction(params.userEmail, params.userName, plan, params.billingCycle, params.amount);
}

// -------------------------------------------------------------
// Activity Logs & Caloric Discount Persistence
// -------------------------------------------------------------
const ACTIVITY_LOGS_PREFIX = 'nutrifit_activity_logs';
const ACTIVITY_DISCOUNT_PREFIX = 'nutrifit_activity_discount_pref';

export function loadActivityLogsForUser(email: string): Record<string, ActivityDayLog> {
  if (typeof window === 'undefined' || !email) return {};
  try {
    const key = getUserStorageKey(ACTIVITY_LOGS_PREFIX, email);
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading activity logs:', err);
    return {};
  }
}

export function saveActivityLogsForUser(email: string, logs: Record<string, ActivityDayLog>): void {
  if (typeof window === 'undefined' || !email) return;
  try {
    const key = getUserStorageKey(ACTIVITY_LOGS_PREFIX, email);
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (err) {
    console.error('Error saving activity logs:', err);
  }
}

export function loadDiscountActivityCaloriesPreference(email: string): boolean {
  if (typeof window === 'undefined' || !email) return true; // Default enabled as requested
  try {
    const key = getUserStorageKey(ACTIVITY_DISCOUNT_PREFIX, email);
    const raw = localStorage.getItem(key);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export function saveDiscountActivityCaloriesPreference(email: string, enabled: boolean): void {
  if (typeof window === 'undefined' || !email) return;
  try {
    const key = getUserStorageKey(ACTIVITY_DISCOUNT_PREFIX, email);
    localStorage.setItem(key, String(enabled));
  } catch (err) {
    console.error('Error saving discount activity pref:', err);
  }
}



