import { createClient } from '@supabase/supabase-js';

// Read Supabase credentials from Vite environment variables, with real production fallbacks
const supabaseUrl = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://pmnnqmmjbkucnmlmukwl.supabase.co';

const supabaseAnonKey = 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_wnB0GkWe-Wh2ngB3YUIHHg_q6vSTzuU';

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
-- NUTRIFIT PRO - SCRIPT DE HABILITACIÓN DE SINCRONIZACIÓN SUPABASE
-- Copia y ejecuta este script en el SQL Editor de tu proyecto Supabase:
-- https://supabase.com/dashboard/project/pmnnqmmjbkucnmlmukwl/sql
-- =========================================================

-- 1. Habilitar políticas de sincronización para tus tablas existentes (profiles, food_logs, transactions)
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.food_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transactions ENABLE ROW LEVEL SECURITY;

-- Políticas de lectura y escritura para anon y authenticated
DROP POLICY IF EXISTS "Permitir todo a anon profiles" ON public.profiles;
CREATE POLICY "Permitir todo a anon profiles" ON public.profiles FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon food_logs" ON public.food_logs;
CREATE POLICY "Permitir todo a anon food_logs" ON public.food_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir todo a anon transactions" ON public.transactions;
CREATE POLICY "Permitir todo a anon transactions" ON public.transactions FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 2. Tabla de Hidratación (Agua) por si aún no existe
CREATE TABLE IF NOT EXISTS public.water_logs (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  date TEXT NOT NULL,
  water_ml NUMERIC DEFAULT 0,
  water_goal_ml NUMERIC DEFAULT 2500,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_date_water UNIQUE (user_email, date)
);
ALTER TABLE IF EXISTS public.water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a anon water_logs" ON public.water_logs;
CREATE POLICY "Permitir todo a anon water_logs" ON public.water_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Tabla de Invitaciones VIP (opcional)
CREATE TABLE IF NOT EXISTS public.vip_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active',
  invited_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE IF EXISTS public.vip_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir todo a anon vip_invitations" ON public.vip_invitations;
CREATE POLICY "Permitir todo a anon vip_invitations" ON public.vip_invitations FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
`;
