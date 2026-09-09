import { supabase, isSupabaseConfigured } from '../lib/supabase';
export { isSupabaseConfigured };
import { 
  AuthUser, 
  DailyLog, 
  FoodItem, 
  MealType, 
  SubscriptionTier, 
  SubscriptionTransaction,
  UserProfile
} from '../types';
import { FOUNDER_EMAIL, isFounderEmail } from '../utils/storage';

export interface SupabaseStatus {
  isConfigured: boolean;
  isConnected: boolean;
  url: string;
  hasKey: boolean;
  missingTables: string[];
  errorMessage?: string;
}

// -------------------------------------------------------------
// DETERMINISTIC UUID GENERATOR FOR USERS
// -------------------------------------------------------------
export function emailToUuid(email: string): string {
  const clean = email.trim().toLowerCase();
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x811c9dc5, h4 = 0x9e3779b9;
  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
    h3 = Math.imul(h3 ^ code, 3812015801);
    h4 = Math.imul(h4 ^ code, 2718281829);
  }
  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  const hex = (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4)).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

// Cached active table representations in Supabase
let cachedFoodTable: 'food_logs' | 'food_items' | null = null;
let cachedUsersTable: 'profiles' | 'users' | null = null;
let cachedTxTable: 'transactions' | 'subscription_transactions' | null = null;

export async function getFoodTable(): Promise<'food_logs' | 'food_items'> {
  if (cachedFoodTable) return cachedFoodTable;
  try {
    const { error: logsErr } = await supabase.from('food_logs').select('id').limit(1);
    if (!logsErr || logsErr.code !== 'PGRST205') {
      cachedFoodTable = 'food_logs';
      return 'food_logs';
    }
  } catch {
    // ignore
  }
  cachedFoodTable = 'food_items';
  return 'food_items';
}

export async function getProfilesTable(): Promise<'profiles' | 'users'> {
  if (cachedUsersTable) return cachedUsersTable;
  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (!error || error.code !== 'PGRST205') {
      cachedUsersTable = 'profiles';
      return 'profiles';
    }
  } catch {
    // ignore
  }
  cachedUsersTable = 'users';
  return 'users';
}

export async function getTransactionsTable(): Promise<'transactions' | 'subscription_transactions'> {
  if (cachedTxTable) return cachedTxTable;
  try {
    const { error } = await supabase.from('transactions').select('id').limit(1);
    if (!error || error.code !== 'PGRST205') {
      cachedTxTable = 'transactions';
      return 'transactions';
    }
  } catch {
    // ignore
  }
  cachedTxTable = 'subscription_transactions';
  return 'subscription_transactions';
}

// -------------------------------------------------------------
// CONNECTION & HEALTH CHECK
// -------------------------------------------------------------

export async function checkSupabaseHealth(): Promise<SupabaseStatus> {
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  if (!isSupabaseConfigured) {
    return {
      isConfigured: false,
      isConnected: false,
      url,
      hasKey: Boolean(key),
      missingTables: [],
      errorMessage: 'Credenciales VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no configuradas en .env',
    };
  }

  const missingTables: string[] = [];
  try {
    // Probe food table (supports food_logs or food_items)
    const { error: logsErr } = await supabase.from('food_logs').select('id').limit(1);
    const hasFoodLogs = !logsErr || logsErr.code !== 'PGRST205';
    if (!hasFoodLogs) {
      const { error: itemsErr } = await supabase.from('food_items').select('id').limit(1);
      const hasFoodItems = !itemsErr || itemsErr.code !== 'PGRST205';
      if (!hasFoodItems) {
        missingTables.push('food_logs');
      }
    }

    // Probe profiles/users table
    const { error: profErr } = await supabase.from('profiles').select('id').limit(1);
    const hasProfiles = !profErr || profErr.code !== 'PGRST205';
    if (!hasProfiles) {
      const { error: usersErr } = await supabase.from('users').select('id').limit(1);
      const hasUsers = !usersErr || usersErr.code !== 'PGRST205';
      if (!hasUsers) {
        missingTables.push('profiles');
      }
    }

    // Probe transactions table
    const { error: txErr } = await supabase.from('transactions').select('id').limit(1);
    const hasTx = !txErr || txErr.code !== 'PGRST205';
    if (!hasTx) {
      const { error: subErr } = await supabase.from('subscription_transactions').select('id').limit(1);
      const hasSub = !subErr || subErr.code !== 'PGRST205';
      if (!hasSub) {
        missingTables.push('transactions');
      }
    }

    const isConnected = missingTables.length === 0;

    return {
      isConfigured: true,
      isConnected,
      url,
      hasKey: true,
      missingTables,
      errorMessage: missingTables.length > 0 
        ? `Tablas pendientes de sincronización: ${missingTables.join(', ')}` 
        : undefined,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      isConfigured: true,
      isConnected: false,
      url,
      hasKey: true,
      missingTables: ['error_connecting'],
      errorMessage: `Error de red al conectar con Supabase: ${message}`,
    };
  }
}

// -------------------------------------------------------------
// 1. AUTHENTICATION & USERS (Supabase Auth & profiles table)
// -------------------------------------------------------------

export async function supabaseLogin(
  email: string, 
  password: string
): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    const isFounder = isFounderEmail(cleanEmail);

    // 1. Try Native Supabase Auth signInWithPassword first
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });

      if (!authErr && authData?.user) {
        const userId = authData.user.id;
        // Fetch profile
        const { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        const authUser: AuthUser = {
          id: userId,
          email: cleanEmail,
          name: profData?.full_name || authData.user.user_metadata?.full_name || cleanEmail.split('@')[0],
          isFounder: Boolean(profData?.is_founder || isFounder),
          tier: (profData?.subscription_plan as SubscriptionTier) || (isFounder ? 'vip' : 'free'),
          subscribedAt: profData?.created_at,
          createdAt: profData?.created_at || new Date().toISOString(),
        };
        return { success: true, user: authUser };
      }
    } catch (supaAuthErr) {
      console.warn('Notice trying direct Supabase auth:', supaAuthErr);
    }

    // 2. Fallback to server auth endpoint (which manages admin auth & profile synchronization)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: cleanPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        // Now that server confirmed or synced, retry client-side signIn if possible
        try {
          await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });
        } catch {
          // ignore client background login notice
        }

        const authUser: AuthUser = {
          id: data.user.id || emailToUuid(cleanEmail),
          email: data.user.email,
          name: data.user.name,
          isFounder: Boolean(data.user.isFounder || isFounder),
          tier: (data.user.tier as SubscriptionTier) || (isFounder ? 'vip' : 'free'),
          createdAt: new Date().toISOString(),
        };
        return { success: true, user: authUser };
      } else if (!res.ok) {
        return { success: false, message: data.message || 'Credenciales incorrectas.' };
      }
    } catch (serverErr) {
      console.warn('Notice trying server auth login:', serverErr);
    }

    // 3. Fallback: Query profiles table directly
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profData) {
      const authUser: AuthUser = {
        id: profData.id,
        email: profData.email,
        name: profData.full_name || cleanEmail.split('@')[0],
        isFounder: Boolean(profData.is_founder || isFounder),
        tier: (profData.subscription_plan as SubscriptionTier) || (isFounder ? 'vip' : 'free'),
        subscribedAt: profData.created_at,
        createdAt: profData.created_at || new Date().toISOString(),
      };
      return { success: true, user: authUser };
    }

    return { success: false, message: 'Usuario no encontrado en la base de datos.' };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Supabase login notice:', message);
    return { success: false, message: `Error de conexión: ${message}` };
  }
}

export async function supabaseRegister(
  name: string, 
  email: string, 
  password: string
): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();
  const cleanPassword = password.trim();

  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    const isFounder = isFounderEmail(cleanEmail);
    const tier: SubscriptionTier = isFounder ? 'vip' : 'free';

    // 1. Register through backend server endpoint (which creates user via Supabase admin with confirmed email)
    let userUuid: string | undefined;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password: cleanPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        userUuid = data.user.id;
      }
    } catch (e) {
      console.warn('Notice registering via server API:', e);
    }

    // 2. Authenticate client-side session in Supabase Auth
    try {
      const { data: authData } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: cleanPassword,
      });
      if (authData?.user?.id) {
        userUuid = authData.user.id;
      }
    } catch (authErr) {
      console.warn('Notice signing in client to Supabase after registration:', authErr);
    }

    if (!userUuid) {
      userUuid = emailToUuid(cleanEmail);
    }

    // 3. Ensure profile in profiles table
    try {
      await supabase.from('profiles').upsert({
        id: userUuid,
        email: cleanEmail,
        full_name: cleanName,
        subscription_plan: tier,
        is_founder: isFounder,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
    } catch (e) {
      console.warn('Notice upserting profile in Supabase:', e);
    }

    const authUser: AuthUser = {
      id: userUuid,
      email: cleanEmail,
      name: cleanName,
      isFounder,
      tier,
      createdAt: new Date().toISOString(),
    };

    return { success: true, user: authUser };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Supabase register notice:', message);
    return { success: false, message: `Error al registrar usuario en Supabase: ${message}` };
  }
}

export async function supabaseFetchRegisteredUsers(
  requesterEmail: string = FOUNDER_EMAIL
): Promise<AuthUser[]> {
  try {
    // Primary path: Use the server-side bypass API which uses SUPABASE_SERVICE_ROLE_KEY
    // to query all rows from the profiles table without RLS restrictions
    const response = await fetch(`/api/founder/users?requester=${encodeURIComponent(requesterEmail)}`);
    if (response.ok) {
      const result = await response.json();
      if (result.success && Array.isArray(result.users)) {
        return result.users.map((row: any) => ({
          email: row.email,
          name: row.name || row.email.split('@')[0],
          isFounder: Boolean(row.isFounder || isFounderEmail(row.email)),
          tier: (row.tier as SubscriptionTier) || (isFounderEmail(row.email) ? 'vip' : 'free'),
          createdAt: row.createdAt || new Date().toISOString(),
          subscribedAt: row.subscribedAt,
        }));
      }
    }
  } catch (apiErr) {
    console.warn('Notice querying /api/founder/users:', apiErr);
  }

  if (!isSupabaseConfigured) return [];

  try {
    // Secondary fallback: Direct Supabase client
    const { data: profilesData, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (!profError && profilesData) {
      return profilesData.map((row: any) => ({
        email: row.email,
        name: row.full_name || row.email.split('@')[0],
        isFounder: Boolean(row.is_founder || isFounderEmail(row.email)),
        tier: (row.subscription_plan as SubscriptionTier) || (isFounderEmail(row.email) ? 'vip' : 'free'),
        createdAt: row.created_at || new Date().toISOString(),
      }));
    }

    return [];
  } catch (err) {
    console.warn('Notice fetching users from Supabase client fallback:', err);
    return [];
  }
}

export async function supabaseUpdateUserTier(
  email: string, 
  tier: SubscriptionTier, 
  billingCycle: 'monthly' | 'annual' = 'monthly'
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const { error } = await supabase
      .from('users')
      .update({
        tier,
        subscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);

    if (error) {
      if (error.code !== 'PGRST205') {
        console.warn('Notice updating user tier in Supabase:', error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Notice updating user tier in Supabase:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 2. DIARY & FOOD ITEMS (Tables: food_logs or food_items & water_logs)
// -------------------------------------------------------------

export async function supabaseFetchDailyLogs(
  email: string, 
  explicitUserId?: string
): Promise<Record<string, DailyLog>> {
  if (!isSupabaseConfigured) return {};

  const cleanEmail = email.trim().toLowerCase();
  const logs: Record<string, DailyLog> = {};

  try {
    const foodTable = await getFoodTable();

    if (foodTable === 'food_logs') {
      let userUuid = explicitUserId || emailToUuid(cleanEmail);
      if (!explicitUserId) {
        try {
          const { data: prof } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', cleanEmail)
            .maybeSingle();
          if (prof?.id) {
            userUuid = prof.id;
          }
        } catch {
          // ignore
        }
      }

      const { data: foodRows, error: foodError } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userUuid)
        .order('created_at', { ascending: false });

      if (foodError) {
        if (foodError.code !== 'PGRST205') {
          console.warn('Notice fetching food_logs from Supabase:', foodError.message);
        }
      } else if (foodRows) {
        foodRows.forEach((row) => {
          const date = row.log_date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
          if (!logs[date]) {
            logs[date] = { date, items: [] };
          }
          logs[date].items.push({
            id: row.id || `food_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            name: row.food_name || row.name || 'Alimento',
            portionDescription: row.portion_description || '',
            amountGrams: Number(row.amount_grams) || 0,
            calories: Number(row.calories) || 0,
            proteinGrams: Number(row.protein) || Number(row.protein_grams) || 0,
            carbsGrams: Number(row.carbs) || Number(row.carbs_grams) || 0,
            fatGrams: Number(row.fat) || Number(row.fat_grams) || 0,
            mealType: (row.meal_type as MealType) || 'lunch',
            timeAdded: row.created_at || undefined,
          });
        });
      }
    } else {
      // Query food_items
      const { data: foodRows, error: foodError } = await supabase
        .from('food_items')
        .select('*')
        .eq('user_email', cleanEmail)
        .order('created_at', { ascending: false });

      if (foodError) {
        if (foodError.code !== 'PGRST205') {
          console.warn('Notice fetching food items from Supabase:', foodError.message);
        }
      } else if (foodRows) {
        foodRows.forEach((row) => {
          const date = row.date;
          if (!logs[date]) {
            logs[date] = { date, items: [] };
          }
          logs[date].items.push({
            id: row.id,
            name: row.name,
            portionDescription: row.portion_description || '',
            amountGrams: Number(row.amount_grams) || 0,
            calories: Number(row.calories) || 0,
            proteinGrams: Number(row.protein_grams) || 0,
            carbsGrams: Number(row.carbs_grams) || 0,
            fatGrams: Number(row.fat_grams) || 0,
            mealType: row.meal_type as MealType,
            timeAdded: row.time_added || undefined,
          });
        });
      }
    }

    // 2. Fetch water logs
    try {
      const { data: waterRows, error: waterError } = await supabase
        .from('water_logs')
        .select('*')
        .eq('user_email', cleanEmail);

      if (!waterError && waterRows) {
        waterRows.forEach((row) => {
          const date = row.date;
          if (!logs[date]) {
            logs[date] = { date, items: [] };
          }
          logs[date].waterMl = Number(row.water_ml) || 0;
          if (row.water_goal_ml) {
            logs[date].waterGoalMl = Number(row.water_goal_ml);
          }
        });
      }
    } catch {
      // water_logs is optional
    }

    return logs;
  } catch (err) {
    console.warn('Notice fetching daily logs from Supabase:', err);
    return {};
  }
}

export async function supabaseAddFoodItem(
  email: string, 
  date: string, 
  item: FoodItem,
  explicitUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const foodTable = await getFoodTable();

    if (foodTable === 'food_logs') {
      let userUuid = explicitUserId || emailToUuid(cleanEmail);
      if (!explicitUserId) {
        try {
          const { data: prof } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
          if (prof?.id) userUuid = prof.id;
        } catch {
          // ignore
        }
      }

      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id);
      const rowId = isValidUuid ? item.id : emailToUuid(`${cleanEmail}_${item.id}_${date}_${item.name}`);

      const payload = {
        id: rowId,
        user_id: userUuid,
        food_name: item.name,
        portion_description: item.portionDescription || '',
        amount_grams: item.amountGrams || 0,
        calories: item.calories || 0,
        protein: item.proteinGrams || 0,
        carbs: item.carbsGrams || 0,
        fat: item.fatGrams || 0,
        meal_type: item.mealType || 'lunch',
        created_at: `${date}T12:00:00.000Z`,
      };

      const { error } = await supabase.from('food_logs').upsert([payload], { onConflict: 'id' });
      if (error) {
        console.warn('Notice inserting food log in Supabase:', error.message);
        return false;
      }
      return true;
    } else {
      const { error } = await supabase
        .from('food_items')
        .insert([{
          id: item.id,
          user_email: cleanEmail,
          date,
          name: item.name,
          portion_description: item.portionDescription,
          amount_grams: item.amountGrams,
          calories: item.calories,
          protein_grams: item.proteinGrams,
          carbs_grams: item.carbsGrams,
          fat_grams: item.fatGrams,
          meal_type: item.mealType,
          time_added: item.timeAdded,
          created_at: new Date().toISOString(),
        }]);

      if (error) {
        console.warn('Notice inserting food item to Supabase:', error.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Notice adding food item to Supabase:', err);
    return false;
  }
}

export async function supabaseAddMultipleFoods(
  email: string, 
  date: string, 
  items: FoodItem[],
  explicitUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured || items.length === 0) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const foodTable = await getFoodTable();

    if (foodTable === 'food_logs') {
      let userUuid = explicitUserId || emailToUuid(cleanEmail);
      if (!explicitUserId) {
        try {
          const { data: prof } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
          if (prof?.id) userUuid = prof.id;
        } catch {
          // ignore
        }
      }

      const payload = items.map((item, idx) => {
        const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id);
        const rowId = isValidUuid ? item.id : emailToUuid(`${cleanEmail}_${item.id}_${date}_${idx}`);
        return {
          id: rowId,
          user_id: userUuid,
          food_name: item.name,
          portion_description: item.portionDescription || '',
          amount_grams: item.amountGrams || 0,
          calories: item.calories || 0,
          protein: item.proteinGrams || 0,
          carbs: item.carbsGrams || 0,
          fat: item.fatGrams || 0,
          meal_type: item.mealType || 'lunch',
          created_at: `${date}T12:00:00.000Z`,
        };
      });

      const { error } = await supabase.from('food_logs').upsert(payload, { onConflict: 'id' });
      if (error) {
        console.warn('Notice bulk-inserting food logs to Supabase:', error.message);
        return false;
      }
      return true;
    } else {
      const payload = items.map((item) => ({
        id: item.id,
        user_email: cleanEmail,
        date,
        name: item.name,
        portion_description: item.portionDescription,
        amount_grams: item.amountGrams,
        calories: item.calories,
        protein_grams: item.proteinGrams,
        carbs_grams: item.carbsGrams,
        fat_grams: item.fatGrams,
        meal_type: item.mealType,
        time_added: item.timeAdded,
        created_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('food_items').insert(payload);
      if (error) {
        console.warn('Notice bulk-inserting food items to Supabase:', error.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Notice adding multiple foods to Supabase:', err);
    return false;
  }
}

export async function supabaseRemoveFoodItem(
  email: string, 
  itemId: string,
  explicitUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const foodTable = await getFoodTable();

    if (foodTable === 'food_logs') {
      let query = supabase.from('food_logs').delete().eq('id', itemId);
      if (explicitUserId) {
        query = query.eq('user_id', explicitUserId);
      }
      const { error } = await query;

      if (error) {
        console.warn('Notice removing food log from Supabase:', error.message);
        return false;
      }
      return true;
    } else {
      const { error } = await supabase
        .from('food_items')
        .delete()
        .eq('id', itemId)
        .eq('user_email', cleanEmail);

      if (error) {
        console.warn('Notice removing food item from Supabase:', error.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Notice removing food item from Supabase:', err);
    return false;
  }
}

export async function supabaseUpdateWater(
  email: string, 
  date: string, 
  waterMl: number,
  explicitUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  const userUuid = explicitUserId || emailToUuid(cleanEmail);
  try {
    const { error } = await supabase
      .from('water_logs')
      .upsert({
        id: `${userUuid}_${date}`,
        user_id: userUuid,
        user_email: cleanEmail,
        date,
        water_ml: waterMl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,date' });

    if (error) {
      if (error.code !== 'PGRST205') {
        console.warn('Notice updating water log in Supabase:', error.message);
      }
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Notice updating water log in Supabase:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 3. VIP INVITATIONS (Table: vip_invitations)
// -------------------------------------------------------------

export async function supabaseFetchVipInvitations(): Promise<string[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('vip_invitations')
      .select('email')
      .eq('status', 'active');

    if (error) {
      if (error.code !== 'PGRST205') {
        console.warn('Notice fetching VIP invitations from Supabase:', error.message);
      }
      return [];
    }

    return (data || []).map((row) => row.email.toLowerCase());
  } catch (err) {
    console.warn('Notice fetching VIP invitations from Supabase:', err);
    return [];
  }
}

export async function supabaseGrantVip(
  targetEmail: string, 
  invitedBy: string = FOUNDER_EMAIL
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = targetEmail.trim().toLowerCase();
  if (!cleanEmail || !cleanEmail.includes('@')) {
    return { success: false, message: 'Ingresa un correo electrónico válido.' };
  }

  // 1. First attempt via founder service role server endpoint
  try {
    const res = await fetch('/api/founder/users/grant-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail: cleanEmail, requesterEmail: invitedBy }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || `Rango VIP otorgado a ${cleanEmail}` };
    }
  } catch (apiErr) {
    console.warn('Notice calling /api/founder/users/grant-vip:', apiErr);
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    // 1. Upsert into vip_invitations table if it exists
    await supabase
      .from('vip_invitations')
      .upsert({
        email: cleanEmail,
        status: 'active',
        invited_by: invitedBy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    // 2. Update profiles table
    try {
      await supabase
        .from('profiles')
        .update({
          subscription_plan: 'vip',
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail);
    } catch {
      // ignore
    }

    return { 
      success: true, 
      message: `¡Rango VIP otorgado directamente en Supabase para ${cleanEmail}!` 
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Notice granting VIP in Supabase:', err);
    return { success: false, message: `Error al otorgar VIP en Supabase: ${message}` };
  }
}

export async function supabaseRevokeVip(
  targetEmail: string,
  requesterEmail: string = FOUNDER_EMAIL
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = targetEmail.trim().toLowerCase();
  if (isFounderEmail(cleanEmail)) {
    return { success: false, message: 'No es posible revocar la cuenta de fundador.' };
  }

  // 1. First attempt via founder service role server endpoint
  try {
    const res = await fetch('/api/founder/users/revoke-vip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetEmail: cleanEmail, requesterEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || `Rango VIP revocado para ${cleanEmail}` };
    }
  } catch (apiErr) {
    console.warn('Notice calling /api/founder/users/revoke-vip:', apiErr);
  }

  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    // 1. Mark status as revoked in vip_invitations table
    await supabase
      .from('vip_invitations')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);

    // 2. Set subscription_plan to free in profiles table
    try {
      await supabase
        .from('profiles')
        .update({
          subscription_plan: 'free',
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail);
    } catch {
      // ignore
    }

    return { 
      success: true, 
      message: `Estatus VIP revocado exitosamente en Supabase para ${cleanEmail}.` 
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('Notice revoking VIP in Supabase:', err);
    return { success: false, message: `Error al revocar VIP en Supabase: ${message}` };
  }
}

// -------------------------------------------------------------
// 4. TRANSACTIONS (Table: transactions or subscription_transactions)
// -------------------------------------------------------------

export async function supabaseFetchTransactions(): Promise<SubscriptionTransaction[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const table = await getTransactionsTable();
    if (table === 'transactions') {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST205') {
          console.warn('Notice fetching transactions:', error.message);
        }
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        date: row.created_at || new Date().toISOString(),
        userEmail: row.user_id || 'usuario@nutrifit.ar',
        userName: 'Usuario Pro',
        plan: (row.plan_type as 'pro_monthly' | 'pro_annual') || 'pro_monthly',
        billingCycle: row.plan_type?.includes('annual') ? 'annual' : 'monthly',
        amount: Number(row.amount) || 0,
        status: (row.status as 'completed' | 'active') || 'completed',
      }));
    } else {
      const { data, error } = await supabase
        .from('subscription_transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code !== 'PGRST205') {
          console.warn('Notice fetching subscription_transactions from Supabase:', error.message);
        }
        return [];
      }

      return (data || []).map((row) => ({
        id: row.id,
        date: row.created_at || new Date().toISOString(),
        userEmail: row.user_email,
        userName: row.user_name,
        plan: row.plan as 'pro_monthly' | 'pro_annual',
        billingCycle: row.billing_cycle as 'monthly' | 'annual',
        amount: Number(row.amount) || 0,
        status: (row.status as 'completed' | 'active') || 'completed',
      }));
    }
  } catch (err) {
    console.warn('Notice fetching transactions from Supabase:', err);
    return [];
  }
}

export async function supabaseRecordTransaction(
  tx: SubscriptionTransaction
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
    const table = await getTransactionsTable();
    if (table === 'transactions') {
      const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tx.id);
      const payload: Record<string, any> = {
        user_id: emailToUuid(tx.userEmail),
        amount: tx.amount,
        status: tx.status || 'completed',
        plan_type: tx.plan,
        created_at: tx.date || new Date().toISOString(),
      };
      if (isValidUuid) {
        payload.id = tx.id;
      }

      const { error } = await supabase.from('transactions').insert([payload]);
      if (error) {
        console.warn('Notice inserting transaction to Supabase transactions table:', error.message);
        return false;
      }
      return true;
    } else {
      const { error } = await supabase
        .from('subscription_transactions')
        .insert([{
          id: tx.id,
          user_email: tx.userEmail,
          user_name: tx.userName,
          plan: tx.plan,
          billing_cycle: tx.billingCycle,
          amount: tx.amount,
          status: tx.status || 'completed',
          created_at: tx.date || new Date().toISOString(),
        }]);

      if (error) {
        console.warn('Notice inserting transaction to Supabase:', error.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Notice recording transaction in Supabase:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 5. USER PROFILE PERSISTENCE (Tables: profiles or user_profiles)
// -------------------------------------------------------------

export async function supabaseSaveUserProfile(
  profile: UserProfile, 
  email: string,
  explicitUserId?: string
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const table = await getProfilesTable();
    if (table === 'profiles') {
      let userUuid = explicitUserId || emailToUuid(cleanEmail);
      if (!explicitUserId) {
        try {
          const { data: prof } = await supabase.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
          if (prof?.id) userUuid = prof.id;
        } catch {
          // ignore
        }
      }

      const payload = {
        id: userUuid,
        email: cleanEmail,
        full_name: profile.name,
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.heightCm,
        weight_kg: profile.weightKg,
        activity_level: profile.activityLevel,
        formula: profile.formula,
        goal: profile.goal,
        goal_intensity: profile.goalIntensity || 'moderate',
        custom_targets_enabled: Boolean(profile.customTargetsEnabled),
        target_calories: profile.targetCalories,
        target_protein: profile.targetProteinGrams,
        target_carbs: profile.targetCarbsGrams,
        target_fat: profile.targetFatGrams,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(payload, { onConflict: 'email' });

      if (error) {
        console.warn('Notice saving user profile in Supabase profiles table:', error.message);
        return false;
      }
      return true;
    } else {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          user_email: cleanEmail,
          name: profile.name,
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
          target_protein_grams: profile.targetProteinGrams,
          target_carbs_grams: profile.targetCarbsGrams,
          target_fat_grams: profile.targetFatGrams,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_email' });

      if (error) {
        console.warn('Notice upserting user profile in Supabase:', error.message);
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Notice saving user profile in Supabase:', err);
    return false;
  }
}

export async function supabaseFetchUserProfile(
  email: string,
  explicitUserId?: string
): Promise<UserProfile | null> {
  if (!isSupabaseConfigured) return null;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const table = await getProfilesTable();
    if (table === 'profiles') {
      let query = supabase.from('profiles').select('*');
      if (explicitUserId) {
        query = query.eq('id', explicitUserId);
      } else {
        query = query.eq('email', cleanEmail);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) return null;

      const profile: UserProfile = {
        name: data.full_name || cleanEmail.split('@')[0],
        age: Number(data.age) || 28,
        gender: (data.gender as 'male' | 'female') || 'male',
        heightCm: Number(data.height_cm) || 175,
        weightKg: Number(data.weight_kg) || 75,
        activityLevel: data.activity_level || 'moderate',
        formula: data.formula || 'mifflin',
        goal: data.goal || 'deficit',
        goalIntensity: data.goal_intensity || 'moderate',
        customTargetsEnabled: Boolean(data.custom_targets_enabled),
        targetCalories: Number(data.target_calories) || 2000,
        targetProteinGrams: Number(data.target_protein) || 140,
        targetCarbsGrams: Number(data.target_carbs) || 200,
        targetFatGrams: Number(data.target_fat) || 55,
        updatedAt: data.updated_at || new Date().toISOString(),
      };

      return profile;
    } else {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_email', cleanEmail)
        .maybeSingle();

      if (error || !data) return null;

      const profile: UserProfile = {
        name: data.name || cleanEmail.split('@')[0],
        age: Number(data.age) || 28,
        gender: (data.gender as 'male' | 'female') || 'male',
        heightCm: Number(data.height_cm) || 175,
        weightKg: Number(data.weight_kg) || 75,
        activityLevel: data.activity_level || 'moderate',
        formula: data.formula || 'mifflin',
        goal: data.goal || 'deficit',
        goalIntensity: data.goal_intensity || 'moderate',
        customTargetsEnabled: Boolean(data.custom_targets_enabled),
        targetCalories: Number(data.target_calories) || 2000,
        targetProteinGrams: Number(data.target_protein_grams) || 140,
        targetCarbsGrams: Number(data.target_carbs_grams) || 200,
        targetFatGrams: Number(data.target_fat_grams) || 55,
        updatedAt: data.updated_at || new Date().toISOString(),
      };

      return profile;
    }
  } catch (err) {
    console.warn('Notice fetching user profile from Supabase:', err);
    return null;
  }
}

/**
 * Supabase Realtime Subscription
 * Listens for cross-device updates (Mobile <-> PC) on food_logs and profiles
 */
export function supabaseSubscribeToUserData(
  userId: string,
  callbacks: {
    onFoodLogsChange?: () => void;
    onProfileChange?: (profile: UserProfile) => void;
  }
): () => void {
  if (!isSupabaseConfigured || !userId) {
    return () => {};
  }

  const channelId = `realtime-user-${userId}-${Math.random().toString(36).slice(2, 7)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'food_logs',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Supabase Realtime] food_logs change detected:', payload.eventType);
        callbacks.onFoodLogsChange?.();
      }
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      },
      (payload) => {
        console.log('[Supabase Realtime] profiles change detected:', payload.eventType);
        if (payload.new && typeof payload.new === 'object') {
          const p = payload.new as any;
          const mappedProfile: UserProfile = {
            name: p.full_name || '',
            age: Number(p.age) || 28,
            gender: (p.gender as 'male' | 'female') || 'male',
            heightCm: Number(p.height_cm) || 175,
            weightKg: Number(p.weight_kg) || 75,
            activityLevel: p.activity_level || 'moderate',
            formula: p.formula || 'mifflin',
            goal: p.goal || 'deficit',
            goalIntensity: p.goal_intensity || 'moderate',
            customTargetsEnabled: Boolean(p.custom_targets_enabled),
            targetCalories: Number(p.target_calories) || 2000,
            targetProteinGrams: Number(p.target_protein) || 140,
            targetCarbsGrams: Number(p.target_carbs) || 200,
            targetFatGrams: Number(p.target_fat) || 55,
            updatedAt: p.updated_at || new Date().toISOString(),
          };
          callbacks.onProfileChange?.(mappedProfile);
        } else {
          callbacks.onFoodLogsChange?.();
        }
      }
    )
    .subscribe((status) => {
      console.log(`[Supabase Realtime] Status for user ${userId}:`, status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function supabaseCheckWritePermissions(): Promise<{
  canWrite: boolean;
  rlsBlocked: boolean;
  message: string;
}> {
  if (!isSupabaseConfigured) {
    return { canWrite: false, rlsBlocked: false, message: 'Supabase no está configurado.' };
  }

  try {
    // Attempt a benign read first
    const { error: readErr } = await supabase.from('profiles').select('id').limit(1);
    if (readErr && readErr.code === 'PGRST205') {
      return { canWrite: false, rlsBlocked: false, message: 'Tabla profiles no encontrada.' };
    }

    // Probe an upsert with test id
    const testId = '00000000-0000-0000-0000-000000000000';
    const { error: writeErr } = await supabase.from('profiles').upsert({
      id: testId,
      email: 'ping_test_connection@nutripro.local',
      full_name: 'NutriFit Diagnostic Ping',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (!writeErr) {
      // Clean up ping row if allowed
      try {
        await supabase.from('profiles').delete().eq('id', testId);
      } catch {
        // ignore
      }
      return {
        canWrite: true,
        rlsBlocked: false,
        message: 'Conexión y permisos de lectura/escritura verificados en Supabase.',
      };
    }

    if (writeErr.code === '42501' || writeErr.message?.includes('row-level security')) {
      return {
        canWrite: false,
        rlsBlocked: true,
        message: 'Políticas RLS en Supabase bloquean la escritura anónima. Ejecuta el script SQL en el panel para habilitarla.',
      };
    }

    return {
      canWrite: false,
      rlsBlocked: false,
      message: `Aviso al escribir en Supabase: ${writeErr.message}`,
    };
  } catch (err: any) {
    return {
      canWrite: false,
      rlsBlocked: false,
      message: `Error al probar permisos en Supabase: ${err.message || String(err)}`,
    };
  }
}


