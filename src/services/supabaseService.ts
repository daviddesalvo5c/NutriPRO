import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { 
  AuthUser, 
  DailyLog, 
  FoodItem, 
  MealType, 
  SubscriptionTier, 
  SubscriptionTransaction 
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
    // Probe users table
    const { error: usersErr } = await supabase.from('users').select('id').limit(1);
    if (usersErr && usersErr.code === '42P01') {
      missingTables.push('users');
    }

    // Probe food_items table
    const { error: foodErr } = await supabase.from('food_items').select('id').limit(1);
    if (foodErr && foodErr.code === '42P01') {
      missingTables.push('food_items');
    }

    // Probe water_logs table
    const { error: waterErr } = await supabase.from('water_logs').select('id').limit(1);
    if (waterErr && waterErr.code === '42P01') {
      missingTables.push('water_logs');
    }

    // Probe vip_invitations table
    const { error: vipErr } = await supabase.from('vip_invitations').select('id').limit(1);
    if (vipErr && vipErr.code === '42P01') {
      missingTables.push('vip_invitations');
    }

    // Probe subscription_transactions table
    const { error: txErr } = await supabase.from('subscription_transactions').select('id').limit(1);
    if (txErr && txErr.code === '42P01') {
      missingTables.push('subscription_transactions');
    }

    const isConnected = missingTables.length === 0;

    return {
      isConfigured: true,
      isConnected,
      url,
      hasKey: true,
      missingTables,
      errorMessage: missingTables.length > 0 
        ? `Tablas pendientes de creación: ${missingTables.join(', ')}` 
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
// 1. AUTHENTICATION & USERS (Table: users)
// -------------------------------------------------------------

export async function supabaseLogin(
  email: string, 
  password: string
): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
  const cleanEmail = email.trim().toLowerCase();

  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      console.error('Error querying Supabase users table:', error);
      return { success: false, message: `Error en Supabase: ${error.message}` };
    }

    if (!data) {
      return { success: false, message: 'Usuario no encontrado en la base de datos de Supabase.' };
    }

    // Validate password
    if (data.password && data.password !== password.trim()) {
      return { success: false, message: 'Contraseña incorrecta.' };
    }

    const authUser: AuthUser = {
      email: data.email,
      name: data.name,
      isFounder: Boolean(data.is_founder || isFounderEmail(data.email)),
      tier: (data.tier as SubscriptionTier) || (isFounderEmail(data.email) ? 'vip' : 'free'),
      subscribedAt: data.subscribed_at,
      createdAt: data.created_at || new Date().toISOString(),
    };

    return { success: true, user: authUser };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Supabase login exception:', err);
    return { success: false, message: `Excepción de conexión: ${message}` };
  }
}

export async function supabaseRegister(
  name: string, 
  email: string, 
  password: string
): Promise<{ success: boolean; message?: string; user?: AuthUser }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    // Check if user already exists
    const { data: existing, error: checkError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking user in Supabase:', checkError);
      return { success: false, message: `Error en Supabase: ${checkError.message}` };
    }

    if (existing) {
      return { success: false, message: 'Este correo ya está registrado en Supabase.' };
    }

    const isFounder = isFounderEmail(cleanEmail);
    const tier: SubscriptionTier = isFounder ? 'vip' : 'free';

    const insertPayload = {
      email: cleanEmail,
      name: cleanName,
      password: password.trim(),
      is_founder: isFounder,
      tier,
      created_at: new Date().toISOString(),
    };

    const { data: created, error: insertError } = await supabase
      .from('users')
      .insert([insertPayload])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user to Supabase:', insertError);
      return { success: false, message: `Error al registrar en Supabase: ${insertError.message}` };
    }

    const authUser: AuthUser = {
      email: created.email,
      name: created.name,
      isFounder: Boolean(created.is_founder),
      tier: (created.tier as SubscriptionTier) || 'free',
      createdAt: created.created_at,
    };

    return { success: true, user: authUser };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Supabase register exception:', err);
    return { success: false, message: `Excepción al conectar con Supabase: ${message}` };
  }
}

export async function supabaseFetchRegisteredUsers(): Promise<AuthUser[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching registered users from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => ({
      email: row.email,
      name: row.name,
      isFounder: Boolean(row.is_founder || isFounderEmail(row.email)),
      tier: (row.tier as SubscriptionTier) || (isFounderEmail(row.email) ? 'vip' : 'free'),
      subscribedAt: row.subscribed_at,
      createdAt: row.created_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Exception fetching users from Supabase:', err);
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
      console.error('Error updating user tier in Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updating user tier in Supabase:', err);
    return false;
  }
}

// -------------------------------------------------------------
// 2. DIARY & FOOD ITEMS (Tables: food_items & water_logs)
// -------------------------------------------------------------

export async function supabaseFetchDailyLogs(email: string): Promise<Record<string, DailyLog>> {
  if (!isSupabaseConfigured) return {};

  const cleanEmail = email.trim().toLowerCase();
  try {
    // 1. Fetch food items
    const { data: foodRows, error: foodError } = await supabase
      .from('food_items')
      .select('*')
      .eq('user_email', cleanEmail)
      .order('created_at', { ascending: false });

    if (foodError) {
      console.error('Error fetching food items from Supabase:', foodError);
      return {};
    }

    // 2. Fetch water logs
    const { data: waterRows, error: waterError } = await supabase
      .from('water_logs')
      .select('*')
      .eq('user_email', cleanEmail);

    if (waterError) {
      console.warn('Warning fetching water logs from Supabase:', waterError);
    }

    // Map into daily logs
    const logs: Record<string, DailyLog> = {};

    // Populate food items
    (foodRows || []).forEach((row) => {
      const date = row.date;
      if (!logs[date]) {
        logs[date] = { date, items: [] };
      }
      const item: FoodItem = {
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
      };
      logs[date].items.push(item);
    });

    // Populate water
    (waterRows || []).forEach((row) => {
      const date = row.date;
      if (!logs[date]) {
        logs[date] = { date, items: [] };
      }
      logs[date].waterMl = Number(row.water_ml) || 0;
      if (row.water_goal_ml) {
        logs[date].waterGoalMl = Number(row.water_goal_ml);
      }
    });

    return logs;
  } catch (err) {
    console.error('Exception fetching daily logs from Supabase:', err);
    return {};
  }
}

export async function supabaseAddFoodItem(
  email: string, 
  date: string, 
  item: FoodItem
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
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
      console.error('Error inserting food item to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception adding food item to Supabase:', err);
    return false;
  }
}

export async function supabaseAddMultipleFoods(
  email: string, 
  date: string, 
  items: FoodItem[]
): Promise<boolean> {
  if (!isSupabaseConfigured || items.length === 0) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
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
      console.error('Error bulk-inserting food items to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception adding multiple foods to Supabase:', err);
    return false;
  }
}

export async function supabaseRemoveFoodItem(email: string, itemId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', itemId)
      .eq('user_email', cleanEmail);

    if (error) {
      console.error('Error removing food item from Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception removing food item from Supabase:', err);
    return false;
  }
}

export async function supabaseUpdateWater(
  email: string, 
  date: string, 
  waterMl: number
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  const cleanEmail = email.trim().toLowerCase();
  try {
    const { error } = await supabase
      .from('water_logs')
      .upsert({
        id: `${cleanEmail}_${date}`,
        user_email: cleanEmail,
        date,
        water_ml: waterMl,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_email,date' });

    if (error) {
      console.error('Error updating water log in Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception updating water log in Supabase:', err);
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
      console.error('Error fetching VIP invitations from Supabase:', error);
      return [];
    }

    return (data || []).map((row) => row.email.toLowerCase());
  } catch (err) {
    console.error('Exception fetching VIP invitations from Supabase:', err);
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

  if (!isSupabaseConfigured) {
    return { success: false, message: 'Supabase no está configurado.' };
  }

  try {
    // 1. Upsert into vip_invitations table
    const { error: inviteError } = await supabase
      .from('vip_invitations')
      .upsert({
        email: cleanEmail,
        status: 'active',
        invited_by: invitedBy,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });

    if (inviteError) {
      console.error('Error saving VIP invite in Supabase:', inviteError);
      return { success: false, message: `Error en Supabase: ${inviteError.message}` };
    }

    // 2. Update or insert in users table with tier 'vip'
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (existingUser) {
      await supabase
        .from('users')
        .update({
          tier: 'vip',
          updated_at: new Date().toISOString(),
        })
        .eq('email', cleanEmail);
    } else {
      await supabase
        .from('users')
        .insert([{
          email: cleanEmail,
          name: cleanEmail.split('@')[0],
          tier: 'vip',
          created_at: new Date().toISOString(),
        }]);
    }

    return { 
      success: true, 
      message: `¡Rango VIP otorgado directamente en Supabase para ${cleanEmail}!` 
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Exception granting VIP in Supabase:', err);
    return { success: false, message: `Error al otorgar VIP en Supabase: ${message}` };
  }
}

export async function supabaseRevokeVip(
  targetEmail: string
): Promise<{ success: boolean; message: string }> {
  const cleanEmail = targetEmail.trim().toLowerCase();
  if (isFounderEmail(cleanEmail)) {
    return { success: false, message: 'No es posible revocar la cuenta de fundador.' };
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

    // 2. Set tier to free in users table
    await supabase
      .from('users')
      .update({
        tier: 'free',
        updated_at: new Date().toISOString(),
      })
      .eq('email', cleanEmail);

    return { 
      success: true, 
      message: `Estatus VIP revocado exitosamente en Supabase para ${cleanEmail}.` 
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Exception revoking VIP in Supabase:', err);
    return { success: false, message: `Error al revocar VIP en Supabase: ${message}` };
  }
}

// -------------------------------------------------------------
// 4. TRANSACTIONS (Table: subscription_transactions)
// -------------------------------------------------------------

export async function supabaseFetchTransactions(): Promise<SubscriptionTransaction[]> {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('subscription_transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions from Supabase:', error);
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
  } catch (err) {
    console.error('Exception fetching transactions from Supabase:', err);
    return [];
  }
}

export async function supabaseRecordTransaction(
  tx: SubscriptionTransaction
): Promise<boolean> {
  if (!isSupabaseConfigured) return false;

  try {
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
      console.error('Error inserting transaction to Supabase:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Exception recording transaction in Supabase:', err);
    return false;
  }
}
