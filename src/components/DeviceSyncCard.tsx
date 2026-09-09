import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Copy, 
  Check, 
  ShieldCheck, 
  Database, 
  ExternalLink, 
  Code,
  Wifi,
  Sparkles,
  Layers,
  Activity,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { supabaseCheckWritePermissions } from '../services/supabaseService';
import { UserProfile, UserSession } from '../types';

interface DeviceSyncCardProps {
  session: UserSession;
  profile: UserProfile;
  onRefreshUserData?: () => void;
}

export const DeviceSyncCard: React.FC<DeviceSyncCardProps> = ({
  session,
  profile,
  onRefreshUserData,
}) => {
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  // Supabase diagnostic state
  const [supabaseStatus, setSupabaseStatus] = useState<{
    tested: boolean;
    canWrite: boolean;
    rlsNeedsPolicy: boolean;
    message: string;
    loading: boolean;
  }>({
    tested: false,
    canWrite: true,
    rlsNeedsPolicy: false,
    message: '',
    loading: false,
  });

  const checkSupabase = async () => {
    setSupabaseStatus(prev => ({ ...prev, loading: true }));
    try {
      const clientRes = await supabaseCheckWritePermissions();
      let serverRls = false;
      try {
        const sRes = await fetch('/api/supabase/status');
        if (sRes.ok) {
          const sJson = await sRes.json();
          serverRls = sJson.rlsNeedsPolicy;
        }
      } catch {}

      setSupabaseStatus({
        tested: true,
        canWrite: clientRes.canWrite,
        rlsNeedsPolicy: clientRes.rlsBlocked || serverRls,
        message: clientRes.message,
        loading: false,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error verificando Supabase';
      setSupabaseStatus({
        tested: true,
        canWrite: false,
        rlsNeedsPolicy: true,
        message: msg,
        loading: false,
      });
    }
  };

  useEffect(() => {
    checkSupabase();
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200/90 dark:border-white/[0.1] shadow-xs p-6 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">
                Sincronización Automática Supabase (Móvil ↔ PC)
              </h3>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Automático · Tiempo Real
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Cuenta: <strong className="text-zinc-700 dark:text-zinc-300">{session.email}</strong> • Supabase Auth ID: <code className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">{session.userId ? `${session.userId.substring(0, 8)}...` : 'Vinculado nativamente'}</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={checkSupabase}
            disabled={supabaseStatus.loading}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 text-xs font-semibold border border-zinc-200 dark:border-white/[0.08] transition-all disabled:opacity-50"
            title="Diagnóstico de lectura y escritura en Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus.loading ? 'animate-spin' : ''}`} />
            <span>{supabaseStatus.loading ? 'Verificando...' : 'Verificar Conexión'}</span>
          </button>
        </div>
      </div>

      {/* Automatic Cloud Sync Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/30 space-y-2">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-xs">
            <Wifi className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Tiempo Real Bidireccional</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Cada alimento, receta o registro de agua que anotes en tu celular se refleja al instante en tu PC mediante canales Realtime de Supabase.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/30 space-y-2">
          <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300 font-bold text-xs">
            <Smartphone className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Móvil & PC Unificados</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Sin códigos PIN temporales ni botones manuales. Simplemente inicia sesión con tu email y contraseña en cualquier dispositivo.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40 space-y-2">
          <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-200 font-bold text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Privacidad por Usuario</span>
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Toda la información está aislada y asociada a tu <span className="font-mono text-[10px]">user_id</span> en las tablas <span className="font-mono text-[10px]">food_logs</span> y <span className="font-mono text-[10px]">profiles</span>.
          </p>
        </div>
      </div>

      {/* Supabase Status Alert & Tables Info */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/[0.08] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Tablas sincronizadas:</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">food_logs</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">profiles</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">transactions</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showSqlGuide ? 'Ocultar Script SQL' : 'Ver / Copiar Esquema SQL Supabase'}</span>
          </button>
        </div>

        {supabaseStatus.tested && (
          <div className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
            supabaseStatus.canWrite
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300'
          }`}>
            {supabaseStatus.canWrite ? (
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            )}
            <div className="space-y-1">
              <p className="font-semibold">
                {supabaseStatus.canWrite 
                  ? 'Base de datos Supabase conectada con permisos completos de lectura y escritura en tiempo real.'
                  : 'Aviso de Políticas RLS en Supabase: las tablas existen y la lectura está activa.'}
              </p>
              <p className="text-[11px] opacity-90">
                {supabaseStatus.message || (supabaseStatus.canWrite 
                  ? 'Tus comidas, macronutrientes y perfil se sincronizan automáticamente con tu base de datos Supabase.'
                  : 'Para habilitar permisos de escritura directos, ejecuta el script SQL en el SQL Editor de tu proyecto Supabase.')}
              </p>
            </div>
          </div>
        )}

        {/* Collapsible SQL Script Drawer */}
        <AnimatePresence>
          {showSqlGuide && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-3 pt-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Code className="w-3.5 h-3.5 text-emerald-500" />
                  Script de esquema y políticas RLS para Supabase
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                  >
                    {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSql ? '¡Copiado!' : 'Copiar SQL'}</span>
                  </button>
                  <a
                    href="https://supabase.com/dashboard/project/pmnnqmmjbkucnmlmukwl/sql"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-[11px] font-bold transition-colors"
                  >
                    <span>Abrir SQL Editor</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              <pre className="p-3 rounded-xl bg-zinc-900 text-zinc-100 text-[11px] font-mono overflow-x-auto max-h-56 leading-relaxed border border-zinc-800">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Security & Multi-Device Indicator */}
      <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-zinc-400 dark:text-zinc-500">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Tus datos se transmiten cifrados y quedan guardados tanto en Supabase como en la memoria offline de cada equipo.</span>
        </div>
        <div className="flex items-center gap-2 text-zinc-500">
          <Monitor className="w-3.5 h-3.5" />
          <span>Móvil · PC · Tablet</span>
        </div>
      </div>
    </div>
  );
};
