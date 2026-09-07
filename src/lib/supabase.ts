import { createClient } from '@supabase/supabase-js';

// Read Supabase credentials from Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Detect if valid configuration is present
export const isSupabaseConfigured: boolean = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey.trim() !== '' &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('placeholder')
);

// Instantiate Supabase Client
// Fallback to a placeholder URL if not yet provided to prevent initialization crash
export const supabase = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://placeholder.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  hasKey: Boolean(supabaseAnonKey),
  isConfigured: isSupabaseConfigured,
};

// SQL Schema for NutriFit Pro tables
export const SUPABASE_SQL_SCHEMA = `-- =========================================================
-- NUTRIFIT PRO - SUPABASE DATABASE SCHEMA
-- Copia y ejecuta este script en el SQL Editor de tu proyecto Supabase
-- =========================================================

-- 1. Tabla de Usuarios y Membresías
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password TEXT,
  is_founder BOOLEAN DEFAULT FALSE,
  tier TEXT DEFAULT 'free', -- 'free' | 'pro_monthly' | 'pro_annual' | 'vip'
  subscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla del Diario de Alimentos
CREATE TABLE IF NOT EXISTS public.food_items (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  date TEXT NOT NULL, -- formato 'YYYY-MM-DD'
  name TEXT NOT NULL,
  portion_description TEXT,
  amount_grams NUMERIC DEFAULT 0,
  calories NUMERIC DEFAULT 0,
  protein_grams NUMERIC DEFAULT 0,
  carbs_grams NUMERIC DEFAULT 0,
  fat_grams NUMERIC DEFAULT 0,
  meal_type TEXT NOT NULL, -- 'breakfast' | 'lunch' | 'dinner' | 'snacks'
  time_added TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Registro de Hidratación (Agua)
CREATE TABLE IF NOT EXISTS public.water_logs (
  id TEXT PRIMARY KEY, -- formato: '{email}_{date}'
  user_email TEXT NOT NULL,
  date TEXT NOT NULL,
  water_ml NUMERIC DEFAULT 0,
  water_goal_ml NUMERIC DEFAULT 2500,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date_water UNIQUE (user_email, date)
);

-- 4. Tabla de Invitaciones VIP
CREATE TABLE IF NOT EXISTS public.vip_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active', -- 'active' | 'revoked'
  invited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Transacciones y Suscripciones
CREATE TABLE IF NOT EXISTS public.subscription_transactions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  plan TEXT NOT NULL, -- 'pro_monthly' | 'pro_annual'
  billing_cycle TEXT NOT NULL, -- 'monthly' | 'annual'
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'completed',
  payment_method TEXT DEFAULT 'Stripe Card',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS) pero permitir acceso público/anónimo para desarrollo rápido
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.food_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de acceso para clave anónima (públicas para esta applet)
CREATE POLICY "Permitir todo a anon users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon food_items" ON public.food_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon water_logs" ON public.water_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon vip_invitations" ON public.vip_invitations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a anon subscription_transactions" ON public.subscription_transactions FOR ALL USING (true) WITH CHECK (true);
`;
