import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  DailyLog,
  FoodItem,
  MealType,
  SubscriptionTier,
  UserProfile,
  UserSession,
} from '../types';
import { createDefaultProfile } from '../utils/storage';

/**
 * Acceso a Supabase.
 *
 * La identidad la lleva Supabase Auth: no hay contraseñas en tablas propias.
 * Las políticas RLS garantizan que cada usuario solo alcanza sus filas, así que
 * las consultas no filtran por usuario a mano — lo hace la base.
 *
 * El plan de suscripción no se puede escribir desde el navegador: la columna
 * está fuera de los permisos del rol `authenticated`. Solo lo cambia el
 * servidor al confirmar un pago.
 */

export interface ServiceResult<T = void> {
  success: boolean;
  message?: string;
  data?: T;
}

function fail(message: string): ServiceResult<any> {
  return { success: false, message };
}

function notConfigured(): ServiceResult<any> {
  return fail('La base de datos no está configurada.');
}

// --------------------------------------------------------------- autenticación

export async function signUp(
  name: string,
  email: string,
  password: string
): Promise<ServiceResult<UserSession>> {
  if (!isSupabaseConfigured) return notConfigured();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: { data: { full_name: name.trim() } },
  });

  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return fail('Ese correo ya está registrado. Prueba a iniciar sesión.');
    }
    return fail(error.message);
  }

  // Sin sesión inmediata, el proyecto exige confirmar el correo.
  if (!data.session || !data.user) {
    return fail('Revisa tu correo para confirmar la cuenta antes de entrar.');
  }

  return {
    success: true,
    data: { email: data.user.email!, name: name.trim(), tier: 'free' },
  };
}

export async function signIn(
  email: string,
  password: string
): Promise<ServiceResult<UserSession>> {
  if (!isSupabaseConfigured) return notConfigured();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) {
    return fail(
      error.message.toLowerCase().includes('invalid')
        ? 'Correo o contraseña incorrectos.'
        : error.message
    );
  }

  return { success: true, data: await sessionFromUser(data.user.id, data.user.email!) };
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) await supabase.auth.signOut();
}

async function sessionFromUser(userId: string, email: string): Promise<UserSession> {
  const profile = await fetchProfileRow(userId);
  return {
    email,
    name: profile?.full_name || email.split('@')[0],
    tier: (profile?.subscription_plan as SubscriptionTier) || 'free',
    isFounder: profile?.is_founder ?? false,
  };
}

/** Sesión activa al abrir la app, si el token sigue siendo válido. */
export async function getActiveSession(): Promise<UserSession | null> {
  if (!isSupabaseConfigured) return null;

  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;
  if (!user) return null;

  return sessionFromUser(user.id, user.email!);
}

export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ---------------------------------------------------------------------- perfil

async function fetchProfileRow(userId: string): Promise<any | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[supabase] perfil:', error.message);
    return null;
  }
  return data;
}

/** Perfil del usuario. Si aún no tiene datos, devuelve los valores por defecto. */
export async function fetchProfile(userId: string, fallbackName = 'Usuario'): Promise<UserProfile> {
  const row = await fetchProfileRow(userId);
  const base = createDefaultProfile(row?.full_name || fallbackName);

  if (!row) return base;

  return {
    ...base,
    name: row.full_name ?? base.name,
    age: row.age ?? base.age,
    gender: (row.gender as UserProfile['gender']) ?? base.gender,
    heightCm: row.height_cm != null ? Number(row.height_cm) : base.heightCm,
    weightKg: row.weight_kg != null ? Number(row.weight_kg) : base.weightKg,
    activityLevel: (row.activity_level as UserProfile['activityLevel']) ?? base.activityLevel,
    formula: (row.formula as UserProfile['formula']) ?? base.formula,
    goal: (row.goal as UserProfile['goal']) ?? base.goal,
    goalIntensity: (row.goal_intensity as UserProfile['goalIntensity']) ?? base.goalIntensity,
    customTargetsEnabled: row.custom_targets_enabled ?? base.customTargetsEnabled,
    targetCalories: row.target_calories ?? base.targetCalories,
    targetProteinGrams: row.target_protein ?? base.targetProteinGrams,
    targetCarbsGrams: row.target_carbs ?? base.targetCarbsGrams,
    targetFatGrams: row.target_fat ?? base.targetFatGrams,
    updatedAt: row.updated_at ?? base.updatedAt,
  };
}

export async function saveProfile(userId: string, profile: UserProfile): Promise<ServiceResult> {
  if (!isSupabaseConfigured) return notConfigured();

  // subscription_plan e is_founder quedan fuera a propósito: el rol del
  // navegador no tiene permiso sobre esas columnas.
  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: profile.name,
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.heightCm,
      weight_kg: profile.weightKg,
      activity_level: profile.activityLevel,
      formula: profile.formula,
      goal: profile.goal,
      goal_intensity: profile.goalIntensity,
      custom_targets_enabled: profile.customTargetsEnabled,
      target_calories: profile.targetCalories,
      target_protein: profile.targetProteinGrams,
      target_carbs: profile.targetCarbsGrams,
      target_fat: profile.targetFatGrams,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    console.error('[supabase] guardar perfil:', error.message);
    return fail('No se pudo guardar el perfil.');
  }
  return { success: true };
}

// ---------------------------------------------------------------------- diario

const toDateKey = (value: string) => String(value).slice(0, 10);

/** Todo el diario del usuario, agrupado por fecha. */
export async function fetchDailyLogs(userId: string): Promise<Record<string, DailyLog>> {
  if (!isSupabaseConfigured) return {};

  const [foodsResult, metricsResult] = await Promise.all([
    supabase.from('food_logs').select('*').eq('user_id', userId).order('created_at'),
    supabase.from('daily_metrics').select('*').eq('user_id', userId),
  ]);

  if (foodsResult.error) {
    console.error('[supabase] diario:', foodsResult.error.message);
    return {};
  }

  const logs: Record<string, DailyLog> = {};
  const ensure = (date: string) => (logs[date] ??= { date, items: [] });

  for (const row of foodsResult.data ?? []) {
    const date = toDateKey(row.log_date);
    ensure(date).items.push({
      id: row.id,
      name: row.food_name,
      portionDescription: row.portion_description ?? '1 porción',
      amountGrams: row.amount_grams != null ? Number(row.amount_grams) : 100,
      calories: Number(row.calories),
      proteinGrams: Number(row.protein),
      carbsGrams: Number(row.carbs),
      fatGrams: Number(row.fat),
      mealType: row.meal_type as MealType,
      timeAdded: new Date(row.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  }

  for (const row of metricsResult.data ?? []) {
    const date = toDateKey(row.log_date);
    const log = ensure(date);
    log.waterMl = Number(row.water_ml);
    log.waterGoalMl = Number(row.water_goal_ml);
  }

  return logs;
}

export async function addFoodLog(
  userId: string,
  date: string,
  item: Omit<FoodItem, 'id'>
): Promise<ServiceResult<string>> {
  if (!isSupabaseConfigured) return notConfigured();

  const { data, error } = await supabase
    .from('food_logs')
    .insert({
      user_id: userId,
      log_date: date,
      meal_type: item.mealType,
      food_name: item.name,
      portion_description: item.portionDescription,
      amount_grams: item.amountGrams,
      calories: Math.round(item.calories),
      protein: item.proteinGrams,
      carbs: item.carbsGrams,
      fat: item.fatGrams,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[supabase] añadir alimento:', error.message);
    return fail('No se pudo guardar el alimento.');
  }
  return { success: true, data: data.id };
}

export async function removeFoodLog(itemId: string): Promise<ServiceResult> {
  if (!isSupabaseConfigured) return notConfigured();

  const { error } = await supabase.from('food_logs').delete().eq('id', itemId);
  if (error) {
    console.error('[supabase] borrar alimento:', error.message);
    return fail('No se pudo eliminar el alimento.');
  }
  return { success: true };
}

export async function saveWater(
  userId: string,
  date: string,
  waterMl: number,
  waterGoalMl: number
): Promise<ServiceResult> {
  if (!isSupabaseConfigured) return notConfigured();

  const { error } = await supabase.from('daily_metrics').upsert(
    {
      user_id: userId,
      log_date: date,
      water_ml: Math.max(0, waterMl),
      water_goal_ml: waterGoalMl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,log_date' }
  );

  if (error) {
    console.error('[supabase] hidratación:', error.message);
    return fail('No se pudo guardar la hidratación.');
  }
  return { success: true };
}

export async function fetchTransactions(userId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[supabase] transacciones:', error.message);
    return [];
  }
  return data ?? [];
}
