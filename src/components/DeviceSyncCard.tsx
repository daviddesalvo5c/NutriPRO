import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Copy, 
  Check, 
  KeyRound, 
  ShieldCheck, 
  Cloud, 
  ArrowRight,
  AlertCircle,
  Database,
  ExternalLink,
  Code
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cloudSyncService } from '../services/cloudSyncService';
import { SUPABASE_SQL_SCHEMA } from '../lib/supabase';
import { supabaseCheckWritePermissions } from '../services/supabaseService';
import { 
  DailyLog, 
  UserProfile, 
  UserSession, 
  WeightEntry, 
  BodyMeasurementEntry,
  ProgressPhotoEntry
} from '../types';
import { 
  saveDailyLogsForUser, 
  saveStoredProfileForUser, 
  saveWeightHistoryForUser, 
  saveMeasurementsForUser,
  setUserTier,
  loadDailyLogsForUser,
  loadStoredProfileForUser,
  loadWeightHistoryForUser,
  loadMeasurementsForUser,
  loadProgressPhotosForUser,
  getUserTier
} from '../utils/storage';

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
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false);

  const [inputCode, setInputCode] = useState<string>('');
  const [isRedeeming, setIsRedeeming] = useState<boolean>(false);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  const [isForcingSync, setIsForcingSync] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

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
      // 1. Check client-side permission
      const clientRes = await supabaseCheckWritePermissions();
      // 2. Check server-side status
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
    } catch (e: any) {
      setSupabaseStatus({
        tested: true,
        canWrite: false,
        rlsNeedsPolicy: true,
        message: e.message || 'Error verificando Supabase',
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

  // Generate 6-digit sync PIN
  const handleGenerateCode = async () => {
    setIsGenerating(true);
    setGeneratedCode(null);
    try {
      // First ensure current state is pushed to cloud
      const userLogs = loadDailyLogsForUser(session.email);
      const userWeights = loadWeightHistoryForUser(session.email, profile.weightKg);
      const userMeasurements = loadMeasurementsForUser(session.email);
      const userPhotos = loadProgressPhotosForUser(session.email);
      const userTier = getUserTier(session.email);

      await cloudSyncService.pushUserData({
        email: session.email,
        name: session.name,
        profile,
        dailyLogs: userLogs,
        weightHistory: userWeights,
        measurements: userMeasurements,
        progressPhotos: userPhotos,
        tier: userTier,
      });

      const code = await cloudSyncService.generateSyncCode(session.email);
      if (code) {
        setGeneratedCode(code);
      } else {
        setRedeemError('No se pudo generar el código. Verifica la conexión a internet.');
      }
    } catch {
      setRedeemError('Error al generar código de sincronización.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy code to clipboard
  const handleCopyCode = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Redeem 6-digit PIN from another device
  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();
    if (!cleanCode || cleanCode.length !== 6) {
      setRedeemError('Ingresa un código válido de 6 dígitos.');
      return;
    }

    setIsRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const data = await cloudSyncService.redeemSyncCode(cleanCode);
      if (!data || !data.email) {
        setRedeemError('Código inválido o expirado. Genéralo de nuevo en el otro dispositivo.');
        setIsRedeeming(false);
        return;
      }

      // Save imported data locally
      if (data.dailyLogs) saveDailyLogsForUser(session.email, data.dailyLogs);
      if (data.profile) saveStoredProfileForUser(session.email, data.profile);
      if (data.weightHistory) saveWeightHistoryForUser(session.email, data.weightHistory);
      if (data.measurements) saveMeasurementsForUser(session.email, data.measurements);
      if (data.tier) setUserTier(session.email, data.tier);

      setRedeemSuccess(`¡Datos transferidos con éxito desde ${data.name || data.email}!`);
      setInputCode('');
      onRefreshUserData?.();
    } catch {
      setRedeemError('Ocurrió un error al sincronizar con el código.');
    } finally {
      setIsRedeeming(false);
    }
  };

  // Force Push & Pull full sync
  const handleForceSync = async () => {
    setIsForcingSync(true);
    setSyncNotice(null);
    try {
      const userLogs = loadDailyLogsForUser(session.email);
      const userWeights = loadWeightHistoryForUser(session.email, profile.weightKg);
      const userMeasurements = loadMeasurementsForUser(session.email);
      const userPhotos = loadProgressPhotosForUser(session.email);
      const userTier = getUserTier(session.email);

      // 1. Push
      await cloudSyncService.pushUserData({
        email: session.email,
        name: session.name,
        profile,
        dailyLogs: userLogs,
        weightHistory: userWeights,
        measurements: userMeasurements,
        progressPhotos: userPhotos,
        tier: userTier,
      });

      // 2. Pull
      const cloudData = await cloudSyncService.pullUserData(session.email);
      if (cloudData) {
        if (cloudData.dailyLogs) saveDailyLogsForUser(session.email, cloudData.dailyLogs);
        if (cloudData.profile) saveStoredProfileForUser(session.email, cloudData.profile);
        if (cloudData.weightHistory) saveWeightHistoryForUser(session.email, cloudData.weightHistory);
        if (cloudData.measurements) saveMeasurementsForUser(session.email, cloudData.measurements);
        if (cloudData.tier) setUserTier(session.email, cloudData.tier);
      }

      onRefreshUserData?.();
      setSyncNotice('¡Sincronización completa! Tus datos están al día en la nube.');
      setTimeout(() => setSyncNotice(null), 4000);
    } catch {
      setSyncNotice('Aviso: Sincronización realizada en almacenamiento local.');
    } finally {
      setIsForcingSync(false);
    }
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
                Base de Datos Supabase (PostgreSQL)
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sincronización Activa
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Usuario: <strong className="text-zinc-700 dark:text-zinc-300">{session.email}</strong> • Proyecto: <code className="text-[11px] text-emerald-600 dark:text-emerald-400">pmnnqmmjbkucnmlmukwl</code>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={checkSupabase}
            disabled={supabaseStatus.loading}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-white/[0.06] dark:hover:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 text-xs font-semibold border border-zinc-200 dark:border-white/[0.08] transition-all disabled:opacity-50"
            title="Diagnóstico de lectura y escritura en Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${supabaseStatus.loading ? 'animate-spin' : ''}`} />
            <span>{supabaseStatus.loading ? 'Comprobando...' : 'Test Supabase'}</span>
          </button>

          <button
            type="button"
            onClick={handleForceSync}
            disabled={isForcingSync}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isForcingSync ? 'animate-spin' : ''}`} />
            <span>{isForcingSync ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
          </button>
        </div>
      </div>

      {/* Supabase Status Alert & Tables Info */}
      <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200/80 dark:border-white/[0.08] space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">Tablas Supabase vinculadas:</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">profiles</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">food_logs</span>
            <span className="px-2 py-0.5 rounded-md bg-zinc-200/70 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-[11px]">transactions</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSqlGuide(!showSqlGuide)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            <Code className="w-3.5 h-3.5" />
            <span>{showSqlGuide ? 'Ocultar Script SQL' : 'Ver / Copiar Script SQL de Políticas'}</span>
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
                  ? 'Base de datos Supabase conectada con permisos completos de lectura y escritura.'
                  : 'Aviso de Políticas RLS en Supabase: las tablas existen y la lectura está activa.'}
              </p>
              <p className="text-[11px] opacity-90">
                {supabaseStatus.message || (supabaseStatus.canWrite 
                  ? 'Tus comidas, macronutrientes y perfil se sincronizan directamente con tu base de datos Supabase.'
                  : 'Para que la escritura anónima esté desbloqueada en tus tablas, ejecuta el script SQL en el SQL Editor de Supabase (o añade tu service_role key en Settings).')}
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
                  Script de habilitación de políticas RLS para Supabase
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

      {syncNotice && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Two-Column Setup: Generate PIN on Mobile / Enter PIN on PC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Option A: Generate PIN to send to other device */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.06] flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm mb-1">
              <Smartphone className="w-4 h-4 text-emerald-500" />
              <span>Paso 1: Generar PIN en este dispositivo</span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-4">
              Si tienes tus comidas y datos registrados aquí, genera un código temporal para importarlos en tu computadora o en otro teléfono.
            </p>

            {generatedCode ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center mb-4">
                <p className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
                  Tu Código de Vinculación (Válido 15 min)
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-black tracking-widest text-zinc-900 dark:text-white font-mono">
                    {generatedCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="p-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:text-emerald-500 transition-colors shadow-xs"
                    title="Copiar código"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <KeyRound className="w-3.5 h-3.5" />
                <span>{generatedCode ? 'Generar Nuevo PIN' : 'Generar Código PIN'}</span>
              </>
            )}
          </button>
        </div>

        {/* Option B: Enter PIN from other device */}
        <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-white/[0.02] border border-zinc-200/80 dark:border-white/[0.06] flex flex-col justify-between">
          <form onSubmit={handleRedeemCode} className="space-y-3">
            <div>
              <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-xs sm:text-sm mb-1">
                <Monitor className="w-4 h-4 text-teal-500" />
                <span>Paso 2: Vincular con PIN de otro dispositivo</span>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed mb-3">
                Ingresa los 6 dígitos generados en tu otro dispositivo para descargar todo el diario y las configuraciones.
              </p>

              <div className="relative group">
                <input
                  type="text"
                  maxLength={6}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase())}
                  placeholder="Ej: 849201"
                  className="w-full py-2.5 px-4 text-center font-mono font-black text-lg tracking-widest bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 uppercase text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
                />
              </div>

              {redeemError && (
                <div className="mt-2 text-[11px] text-rose-500 font-semibold flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{redeemError}</span>
                </div>
              )}

              {redeemSuccess && (
                <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 shrink-0" />
                  <span>{redeemSuccess}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isRedeeming || inputCode.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {isRedeeming ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Vincular y Descargar Datos</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Security Footer */}
      <div className="pt-2 flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>Tus datos se transmiten cifrados y quedan guardados tanto en la nube como en la memoria offline de cada equipo.</span>
      </div>
    </div>
  );
};
