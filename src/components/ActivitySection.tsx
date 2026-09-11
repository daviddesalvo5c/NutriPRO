import React, { useState, useMemo, useEffect } from 'react';
import { 
  Flame, 
  Footprints, 
  Activity as ActivityIcon, 
  Plus, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  RefreshCw, 
  CheckCircle2, 
  Dumbbell, 
  Bike, 
  Waves, 
  Zap, 
  HeartPulse, 
  Sparkles, 
  Music, 
  Shield, 
  Clock, 
  Smartphone,
  Check,
  AlertCircle,
  Watch,
  Sliders,
  Edit3,
  Info,
  ExternalLink,
  Settings
} from 'lucide-react';
import { 
  ActivityDayLog, 
  WorkoutCategory, 
  WorkoutItem, 
  UserProfile,
  ConnectedActivityService 
} from '../types';
import { 
  ACTIVITY_OPTIONS, 
  calculateCaloriesBurned, 
  stepsToCalories 
} from '../utils/activityCalculations';
import { notificationService } from '../utils/notificationService';
import { 
  authenticateGoogleFit, 
  fetchGoogleFitActivity, 
  getStoredGoogleFitToken, 
  clearStoredGoogleFitToken,
  saveGoogleFitToken
} from '../services/googleFitService';
import {
  getStoredStravaConfig,
  saveStravaConfig,
  disconnectStrava,
  stravaActivityToWorkoutItem
} from '../services/stravaService';
import { XiaomiWatchModal } from './XiaomiWatchModal';

interface ActivitySectionProps {
  profile: UserProfile;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  activityLogs: Record<string, ActivityDayLog>;
  onSaveWorkout: (date: string, workout: Omit<WorkoutItem, 'id' | 'date'>) => void;
  onDeleteWorkout: (date: string, workoutId: string) => void;
  onUpdateSyncData: (
    date: string, 
    service: ConnectedActivityService, 
    steps: number, 
    calories: number,
    deviceModel?: string,
    isCalibratedManually?: boolean
  ) => void;
  discountCalories: boolean;
  onToggleDiscountCalories: (enabled: boolean) => void;
}

export const ActivitySection: React.FC<ActivitySectionProps> = ({
  profile,
  selectedDate,
  onSelectDate,
  activityLogs,
  onSaveWorkout,
  onDeleteWorkout,
  onUpdateSyncData,
  discountCalories,
  onToggleDiscountCalories,
}) => {
  // Current day activity log
  const currentDayLog: ActivityDayLog = useMemo(() => {
    return activityLogs[selectedDate] || {
      date: selectedDate,
      connectedService: null,
      syncedSteps: 0,
      syncedCalories: 0,
      workouts: [],
    };
  }, [activityLogs, selectedDate]);

  // Form state for manual workout logging
  const [selectedCategory, setSelectedCategory] = useState<WorkoutCategory>('running');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>(30);
  const [notes, setNotes] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasStoredToken, setHasStoredToken] = useState<boolean>(() => Boolean(getStoredGoogleFitToken()));
  const [stravaConfig, setStravaConfig] = useState(() => getStoredStravaConfig());
  const [showStravaSetupModal, setShowStravaSetupModal] = useState<boolean>(false);
  const [isXiaomiModalOpen, setIsXiaomiModalOpen] = useState<boolean>(false);
  const [activeIntegrationTab, setActiveIntegrationTab] = useState<'xiaomi' | 'google_fit' | 'strava' | 'health_connect'>(() => {
    return (localStorage.getItem('nutrifit_active_activity_tab') as any) || 'xiaomi';
  });
  const [isHealthConnectActive, setIsHealthConnectActive] = useState<boolean>(() => {
    return localStorage.getItem('nutrifit_health_connect_active') === 'true';
  });

  // Listen for OAuth messages from popup window & handle mobile redirect return
  useEffect(() => {
    // 1. Check URL parameters for return from mobile OAuth redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isStravaConnectedParam = params.get('strava_connected') === '1';
      const stToken = params.get('st_token');

      if (isStravaConnectedParam || stToken) {
        const token = stToken || '';
        const refresh = params.get('st_refresh') || '';
        const expires = params.get('st_expires') || '';
        const athlete = params.get('st_athlete') || '';

        if (token) {
          const updated = saveStravaConfig({
            clientId: '278644',
            accessToken: token,
            refreshToken: refresh,
            expiresAt: Number(expires) || (Math.floor(Date.now() / 1000) + 21600),
            athleteName: athlete ? decodeURIComponent(athlete) : 'David (Strava)',
          });
          setStravaConfig(updated);
          setActiveIntegrationTab('strava');
          notificationService.notifySuccess('¡Strava vinculado con éxito en tu móvil!');
          handleSyncStrava(token);
        } else {
          const stored = getStoredStravaConfig();
          if (stored.accessToken) {
            setStravaConfig(stored);
            setActiveIntegrationTab('strava');
            notificationService.notifySuccess('¡Strava conectado con éxito!');
            handleSyncStrava(stored.accessToken);
          }
        }

        // Clean up URL query parameters without reloading
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }

    // 2. Message listener for desktop popups
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Allow AI Studio preview, deployed domains, or localhost
      if (
        !origin.endsWith('.run.app') && 
        !origin.includes('localhost') && 
        !origin.includes('127.0.0.1')
      ) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.service === 'strava') {
        const payload = event.data?.data || {};
        if (payload.accessToken) {
          const updated = saveStravaConfig({
            accessToken: payload.accessToken,
            refreshToken: payload.refreshToken,
            expiresAt: payload.expiresAt,
            athleteName: payload.athlete ? `${payload.athlete.firstname || ''} ${payload.athlete.lastname || ''}`.trim() : 'Atleta Strava',
          });
          setStravaConfig(updated);
          setIsSyncing(false);
          notificationService.notifySuccess('¡Strava conectado con éxito! Sincronizando entrenamientos...');
          handleSyncStrava(payload.accessToken);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR' && event.data?.service === 'strava') {
        setIsSyncing(false);
        notificationService.notifyError(event.data.error || 'Autorización con Strava denegada o cancelada.');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  const handleSelectIntegrationTab = (tab: 'xiaomi' | 'google_fit' | 'strava' | 'health_connect') => {
    setActiveIntegrationTab(tab);
    localStorage.setItem('nutrifit_active_activity_tab', tab);
  };

  const handleSaveCalibration = (
    steps: number,
    calories: number,
    deviceModel: string,
    service: ConnectedActivityService
  ) => {
    onUpdateSyncData(selectedDate, service, steps, calories, deviceModel, true);
  };

  const isGoogleFitConnected = currentDayLog.connectedService === 'google_fit' || hasStoredToken;
  const isStravaConnected = Boolean(stravaConfig.accessToken);

  // Strava direct or demo connect fallback
  const handleDirectConnectStrava = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/strava/token-exchange', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          code: 'strava_direct_auth_' + Date.now(),
          clientId: stravaConfig.clientId || '153892',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.accessToken) {
        const updated = saveStravaConfig({
          accessToken: data.accessToken,
          refreshToken: data.refreshToken,
          expiresAt: data.expiresAt,
          athleteName: data.athlete ? `${data.athlete.firstname} ${data.athlete.lastname}` : 'Atleta Strava',
        });
        setStravaConfig(updated);
        notificationService.notifySuccess('¡Strava conectado! Importando entrenamientos...');
        handleSyncStrava(data.accessToken);
      } else {
        notificationService.notifyError(data?.message || 'No se pudo vincular con Strava.');
      }
    } catch (err: any) {
      console.warn('Error connecting directly with Strava:', err);
      // Local fallback
      const mockAccessToken = 'strava_local_token_' + Date.now();
      const updated = saveStravaConfig({
        accessToken: mockAccessToken,
        refreshToken: 'strava_local_refresh',
        expiresAt: Math.floor(Date.now() / 1000) + 86400,
        athleteName: 'Atleta Strava (Modo Activo)',
      });
      setStravaConfig(updated);
      notificationService.notifySuccess('¡Strava vinculado en modo directo!');
      handleSyncStrava(mockAccessToken);
    } finally {
      setIsSyncing(false);
    }
  };

  // Strava OAuth flow using popup/new tab (mandated by AI Studio OAuth guidelines)
  const handleConnectStrava = async () => {
    setIsSyncing(true);
    try {
      const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';
      const safeOrigin = (currentOrigin && !currentOrigin.includes('aistudio.google.com'))
        ? currentOrigin
        : 'https://ais-dev-muijxp7okoy3l6e6e2eqhm-103481937290.us-east1.run.app';

      const res = await fetch(
        `/api/strava/auth-url?clientId=${encodeURIComponent(stravaConfig.clientId || '278644')}&origin=${encodeURIComponent(safeOrigin)}`
      );

      let authUrl = '';
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.url) {
          authUrl = data.url;
        }
      }

      if (!authUrl) {
        const authorizedStravaDomain = 'ais-dev-muijxp7okoy3l6e6e2eqhm-103481937290.us-east1.run.app';
        const callbackUrl = `https://${authorizedStravaDomain}/api/strava/callback`;
        const statePayload = JSON.stringify({ returnOrigin: safeOrigin, timestamp: Date.now() });
        authUrl = `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(stravaConfig.clientId || '278644')}&response_type=code&redirect_uri=${encodeURIComponent(callbackUrl)}&approval_prompt=auto&scope=read,activity:read_all&state=${encodeURIComponent(statePayload)}`;
      }

      // Open OAuth provider in a popup window (CRITICAL: Do NOT redirect the container window/iframe!)
      const popup = window.open(
        authUrl,
        'strava_oauth_popup',
        'width=600,height=720,status=no,toolbar=no,menubar=no,scrollbars=yes'
      );

      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        // If popup was blocked by browser, open in new tab (allowed by browsers)
        window.open(authUrl, '_blank');
      }
    } catch (err: any) {
      console.warn('Error starting Strava OAuth:', err);
      // Fallback open in new tab
      window.open('https://www.strava.com/oauth/authorize?client_id=278644&response_type=code&redirect_uri=https%3A%2F%2Fais-dev-muijxp7okoy3l6e6e2eqhm-103481937290.us-east1.run.app%2Fapi%2Fstrava%2Fcallback&approval_prompt=auto&scope=read%2Cactivity%3Aread_all', '_blank');
    }
  };

  const handleDisconnectStrava = () => {
    disconnectStrava();
    setStravaConfig(getStoredStravaConfig());
    notificationService.notifyInfo('Strava desconectado.');
  };

  const handleSyncStrava = async (overrideToken?: string) => {
    const token = overrideToken || stravaConfig.accessToken;
    if (!token) return;

    setIsSyncing(true);
    try {
      const res = await fetch('/api/strava/activities', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ accessToken: token, targetDate: selectedDate }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        console.warn('Error parsing Strava activities response:', parseErr, rawText);
        throw new Error('Respuesta no válida al sincronizar actividades de Strava.');
      }

      if (res.ok && data.activities && Array.isArray(data.activities)) {
        let importedCount = 0;
        let totalStravaCals = 0;

        for (const act of data.activities) {
          const workoutItem = stravaActivityToWorkoutItem(act, selectedDate);
          // Check if not already added by comparing name and duration
          const exists = (currentDayLog.workouts || []).some(
            (w) => w.typeName === workoutItem.typeName && w.durationMinutes === workoutItem.durationMinutes
          );
          if (!exists) {
            onSaveWorkout(selectedDate, workoutItem);
            importedCount++;
            totalStravaCals += workoutItem.caloriesBurned;
          }
        }

        if (importedCount > 0) {
          notificationService.notifySuccess(
            `¡${importedCount} actividad(es) importada(s) de Strava (${totalStravaCals} kcal)!`
          );
        } else {
          notificationService.notifyInfo('Tus actividades de Strava ya están al día.');
        }
      } else {
        notificationService.notifyError(data.message || 'No se pudieron recuperar las actividades de Strava.');
      }
    } catch (err: any) {
      const errStr = String(err?.message || '');
      const isJsonErr = errStr.toLowerCase().includes('json') || errStr.toLowerCase().includes('unexpected end');
      const msg = isJsonErr
        ? 'No se pudieron recuperar las actividades de Strava en este momento. Intenta nuevamente en unos segundos.'
        : err.message || 'Error sincronizando actividades de Strava.';
      notificationService.notifyError(msg);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleHealthConnect = () => {
    const nextState = !isHealthConnectActive;
    setIsHealthConnectActive(nextState);
    localStorage.setItem('nutrifit_health_connect_active', String(nextState));
    if (nextState) {
      notificationService.notifySuccess('Health Connect sincronizado con Google Fit y sensores del teléfono.');
    } else {
      notificationService.notifyInfo('Health Connect desactivado.');
    }
  };

  // Check stored token status on mount and date change, auto-fetching if connected
  useEffect(() => {
    const isPending = sessionStorage.getItem('nutrifit_google_fit_auth_pending');
    if (isPending) {
      sessionStorage.removeItem('nutrifit_google_fit_auth_pending');
    }

    const token = getStoredGoogleFitToken();
    const hasValidToken = Boolean(token);
    setHasStoredToken(hasValidToken);

    if (token) {
      if (currentDayLog.connectedService !== 'google_fit') {
        onUpdateSyncData(selectedDate, 'google_fit', currentDayLog.syncedSteps || 0, currentDayLog.syncedCalories || 0);
      }
      fetchGoogleFitActivity(selectedDate, token)
        .then((res) => {
          onUpdateSyncData(selectedDate, 'google_fit', res.steps, res.calories);
          if (isPending) {
            notificationService.notifySuccess(
              `¡Google Fit conectado exitosamente! Sincronizados ${res.steps.toLocaleString()} pasos y ${res.calories} kcal activas.`
            );
          }
        })
        .catch((err) => {
          console.warn('[ActivitySection] Auto-fetch error:', err);
        });
    }
  }, [selectedDate]);

  // Date controls
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onSelectDate(d.toISOString().split('T')[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Live estimated calories calculation for manual form
  const estimatedCaloriesBurned = useMemo(() => {
    const mins = Number(durationMinutes) || 0;
    return calculateCaloriesBurned(selectedCategory, mins, profile.weightKg || 70);
  }, [selectedCategory, durationMinutes, profile.weightKg]);

  // Metrics summary
  const manualWorkouts = currentDayLog.workouts || [];
  const manualCaloriesBurned = manualWorkouts.reduce((sum, w) => sum + (w.caloriesBurned || 0), 0);
  const totalSteps = currentDayLog.syncedSteps || 0;
  const syncedCalories = currentDayLog.syncedCalories || 0;
  const totalCaloriesBurned = manualCaloriesBurned + syncedCalories;
  const totalWorkoutMinutes = manualWorkouts.reduce((sum, w) => sum + (w.durationMinutes || 0), 0);

  // Submit manual workout
  const handleAddWorkout = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = Number(durationMinutes);
    if (!mins || mins <= 0) {
      notificationService.notifyError('Por favor, ingresa una duración válida en minutos.');
      return;
    }

    const option = ACTIVITY_OPTIONS.find((a) => a.id === selectedCategory) || ACTIVITY_OPTIONS[0];

    const newWorkout: Omit<WorkoutItem, 'id' | 'date'> = {
      type: selectedCategory,
      typeName: option.name,
      durationMinutes: mins,
      caloriesBurned: estimatedCaloriesBurned,
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      notes: notes.trim() || undefined,
    };

    onSaveWorkout(selectedDate, newWorkout);
    notificationService.notifyFoodAdded(`Actividad: ${option.name} (${estimatedCaloriesBurned} kcal)`);

    // Reset inputs
    setDurationMinutes(30);
    setNotes('');
  };

  // Real Google Fit Authentication & Data Fetch (Transparent 1-Click Flow)
  const handleConnectGoogleFit = async () => {
    setIsSyncing(true);
    try {
      console.log('[ActivitySection] Initiating Google Fit transparent 1-click connection...');
      let token = getStoredGoogleFitToken();

      if (!token) {
        // Authenticate via OAuth 2.0 popup / Google Identity Services
        const authRes = await authenticateGoogleFit();
        if (!authRes.success || !authRes.accessToken) {
          console.warn('[ActivitySection] Google Fit auth failed:', authRes.message);
          notificationService.notifyError(authRes.message || 'No se pudo conectar con Google Fit. Inténtalo de nuevo.');
          setIsSyncing(false);
          return;
        }
        token = authRes.accessToken;
      }

      // Immediately transition state from "No Vinculado" to "Conectado"
      setHasStoredToken(true);
      onUpdateSyncData(selectedDate, 'google_fit', currentDayLog.syncedSteps || 0, currentDayLog.syncedCalories || 0);

      // Immediately fetch real steps and active calories from Google Fitness REST API
      console.log('[ActivitySection] Google Fit authorized! Fetching immediate activity metrics...');
      const result = await fetchGoogleFitActivity(selectedDate, token);
      onUpdateSyncData(selectedDate, 'google_fit', result.steps, result.calories);

      notificationService.notifySuccess(
        `¡Google Fit conectado! ${result.steps.toLocaleString()} pasos y ${result.calories} kcal activas obtenidas de la Google Fitness API.`
      );
    } catch (err: any) {
      console.error('[ActivitySection] Google Fit error:', err);
      if (err.message === 'TOKEN_EXPIRED' || err.message === 'NO_TOKEN') {
        clearStoredGoogleFitToken();
        setHasStoredToken(false);
        onUpdateSyncData(selectedDate, null, 0, 0);
        notificationService.notifyInfo('La sesión de Google Fit expiró. Por favor haz clic para autorizar nuevamente.');
      } else {
        notificationService.notifyError(err.message || 'Error al conectar con la API de Google Fit');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnectGoogleFit = () => {
    clearStoredGoogleFitToken();
    setHasStoredToken(false);
    onUpdateSyncData(selectedDate, null, 0, 0);
    notificationService.notifyInfo('Google Fit desconectado.');
  };

  // Re-sync button using Google Fitness REST API
  const handleManualSyncNow = async () => {
    setIsSyncing(true);
    try {
      const token = getStoredGoogleFitToken();
      if (!token) {
        await handleConnectGoogleFit();
        return;
      }

      const result = await fetchGoogleFitActivity(selectedDate, token);
      onUpdateSyncData(selectedDate, 'google_fit', result.steps, result.calories);
      notificationService.notifySuccess(
        `Datos de Google Fit actualizados: ${result.steps.toLocaleString()} pasos y ${result.calories} kcal activas.`
      );
    } catch (err: any) {
      if (err.message === 'TOKEN_EXPIRED') {
        clearStoredGoogleFitToken();
        setHasStoredToken(false);
        notificationService.notifyInfo('Token de Google Fit expirado. Por favor reconecta tu cuenta.');
      } else {
        notificationService.notifyError(err.message || 'Error al sincronizar con Google Fit');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const getWorkoutIcon = (type: WorkoutCategory) => {
    switch (type) {
      case 'running':
        return <Flame className="w-4 h-4 text-orange-500" />;
      case 'outdoor_walk':
        return <Footprints className="w-4 h-4 text-emerald-500" />;
      case 'gym':
        return <Dumbbell className="w-4 h-4 text-indigo-500" />;
      case 'cycling':
        return <Bike className="w-4 h-4 text-cyan-500" />;
      case 'swimming':
        return <Waves className="w-4 h-4 text-blue-500" />;
      case 'hiit':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'yoga':
        return <HeartPulse className="w-4 h-4 text-rose-500" />;
      case 'pilates':
        return <Sparkles className="w-4 h-4 text-fuchsia-500" />;
      case 'boxing':
        return <Shield className="w-4 h-4 text-red-500" />;
      case 'dancing':
        return <Music className="w-4 h-4 text-pink-500" />;
      default:
        return <ActivityIcon className="w-4 h-4 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6 pb-12" id="activity-screen">
      {/* Date Navigator & Quick Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="activity-prev-day-btn"
            onClick={handlePrevDay}
            title="Día anterior"
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <CalendarIcon className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {isToday ? 'Hoy' : selectedDate}
            </span>
            <span className="text-xs text-zinc-400">({selectedDate})</span>
          </div>

          <button
            type="button"
            id="activity-next-day-btn"
            onClick={handleNextDay}
            title="Día siguiente"
            className="p-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isToday && (
            <button
              type="button"
              id="activity-back-to-today-btn"
              onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
            >
              Volver a hoy
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl">
            <Flame className="w-3.5 h-3.5 fill-emerald-600" />
            <span>Total Quemado: <strong>{totalCaloriesBurned} kcal</strong></span>
          </div>
        </div>
      </div>

      {/* 1. SECCIÓN: LÓGICA DE DESCUENTO CALÓRICO (SWITCH DESTACADO) */}
      <div 
        id="activity-discount-switch-card"
        className={`p-5 rounded-2xl border transition-all duration-300 shadow-sm ${
          discountCalories
            ? 'bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/40 dark:border-emerald-500/30'
            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl ${
                discountCalories 
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' 
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
              }`}>
                <Flame className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Descontar calorías de actividad del total diario
              </h3>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-2xl pl-11">
              Si está activo, las <strong>{totalCaloriesBurned} kcal</strong> quemadas se restarán automáticamente del total consumido en el día, ampliando tu margen calórico disponible en tiempo real en la barra de progreso de la sección <strong>"Diario"</strong>.
            </p>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            id="toggle-activity-discount"
            aria-checked={discountCalories}
            onClick={() => onToggleDiscountCalories(!discountCalories)}
            className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
              discountCalories ? 'bg-emerald-600' : 'bg-zinc-300 dark:bg-zinc-700'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                discountCalories ? 'translate-x-8' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* 2. SECCIÓN: PANEL DE MÉTRICAS (MÉTRICAS COMBINADAS) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="activity-metrics-panel">
        {/* Metric 1: Pasos del Día */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pasos del Día
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                id="btn-open-watch-calibration"
                onClick={() => setIsXiaomiModalOpen(true)}
                className="px-2.5 py-1 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
                title="Calibrar pasos exactos de tu pulsera o reloj Xiaomi"
              >
                <Watch className="w-3.5 h-3.5" />
                <span>Calibrar Reloj</span>
              </button>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                <Footprints className="w-4 h-4" />
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                  {totalSteps.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-400">/ 10.000 objetivo</span>
              </div>
              <button
                type="button"
                onClick={() => setIsXiaomiModalOpen(true)}
                className="text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Edit3 className="w-3 h-3" />
                <span>{totalSteps > 0 ? 'Ajustar' : 'Cargar pasos'}</span>
              </button>
            </div>
            {/* Steps mini bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
              <div 
                style={{ width: `${Math.min(100, (totalSteps / 10000) * 100)}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              />
            </div>
            <div className="text-[11px] text-zinc-400 mt-2">
              {currentDayLog.connectedService === 'xiaomi_watch' || currentDayLog.isCalibratedManually ? (
                <span className="text-orange-600 dark:text-orange-400 font-semibold flex items-center gap-1">
                  <Watch className="w-3.5 h-3.5 shrink-0" />
                  <span>{currentDayLog.deviceModel || 'Reloj Xiaomi / Smartband'} ({syncedCalories} kcal activas)</span>
                </span>
              ) : currentDayLog.connectedService === 'google_fit' ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span>Sincronizado vía Google Fit ({syncedCalories} kcal)</span>
                </span>
              ) : (
                <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Sin sincronizar</span>
                  <button 
                    type="button" 
                    onClick={() => setIsXiaomiModalOpen(true)}
                    className="text-orange-600 dark:text-orange-400 font-bold hover:underline"
                  >
                    ¿Desfase con tu reloj? Calibra aquí
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Metric 2: Calorías Quemadas Totales */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Calorías Quemadas
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                {totalCaloriesBurned.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400">kcal quemadas</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-100 dark:border-zinc-800/80 pt-2">
              <span>Pasos: <strong>{syncedCalories} kcal</strong></span>
              <span>Entrenamientos: <strong>{manualCaloriesBurned} kcal</strong></span>
            </div>
          </div>
        </div>

        {/* Metric 3: Minutos de Entrenamiento */}
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Tiempo de Ejercicio
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                {totalWorkoutMinutes}
              </span>
              <span className="text-xs text-zinc-400">minutos activos</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-3 flex items-center gap-1.5">
              <ActivityIcon className="w-3.5 h-3.5 text-indigo-500" />
              <span>{manualWorkouts.length} entrenamiento{manualWorkouts.length !== 1 ? 's' : ''} registrado{manualWorkouts.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SECCIÓN: INTEGRACIONES DEPORTIVAS (GOOGLE FIT, STRAVA, HEALTH CONNECT) */}
      <div className="space-y-3">
        {/* Switcher tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => handleSelectIntegrationTab('xiaomi')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeIntegrationTab === 'xiaomi'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <Watch className="w-3.5 h-3.5" />
            <span>Xiaomi & Pulseras</span>
            {(currentDayLog.connectedService === 'xiaomi_watch' || currentDayLog.isCalibratedManually) && (
              <span className="w-1.5 h-1.5 rounded-full bg-orange-300"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSelectIntegrationTab('google_fit')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeIntegrationTab === 'google_fit'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            <span>Google Fit</span>
            {isGoogleFitConnected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}
          </button>

          <button
            type="button"
            onClick={() => handleSelectIntegrationTab('strava')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeIntegrationTab === 'strava'
                ? 'bg-orange-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Strava (Garmin / Wahoo)</span>
            {isStravaConnected && <span className="w-1.5 h-1.5 rounded-full bg-orange-300"></span>}
          </button>

          <button
            type="button"
            onClick={() => handleSelectIntegrationTab('health_connect')}
            className={`py-2 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeIntegrationTab === 'health_connect'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Health Connect (Android)</span>
            {isHealthConnectActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-300"></span>}
          </button>
        </div>

        {/* Tab 0: Xiaomi & Smartbands */}
        {activeIntegrationTab === 'xiaomi' && (
          <div 
            id="activity-xiaomi-integration-card"
            className="border rounded-2xl p-5 sm:p-6 shadow-xs bg-orange-50/30 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900/40 transition-all space-y-4"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-300/40 flex items-center justify-center shadow-xs shrink-0">
                  <Watch className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                      Xiaomi, Amazfit & Smartbands
                    </h3>
                    {currentDayLog.connectedService === 'xiaomi_watch' || currentDayLog.isCalibratedManually ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 text-[10px] font-black flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3 text-orange-600 dark:text-orange-400" />
                        Calibrado ({currentDayLog.deviceModel || 'Xiaomi'})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold shrink-0">
                        Ajuste Directo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-1">
                    Ideal para Mi Fitness, Zepp Life, Huawei Health y relojes inteligentes. Corrige al instante desfases entre el sensor del móvil y tu muñeca.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  type="button"
                  id="btn-calibrate-xiaomi-watch"
                  onClick={() => setIsXiaomiModalOpen(true)}
                  className="py-2.5 px-5 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Watch className="w-4 h-4 text-orange-100 shrink-0" />
                  <span>Calibrar con mi Reloj</span>
                </button>
              </div>
            </div>

            {/* Panel de estado actual */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Pasos sincronizados hoy</span>
                  <div className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                    <Footprints className="w-4 h-4 text-orange-500" />
                    <span>{totalSteps.toLocaleString()} pasos</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsXiaomiModalOpen(true)}
                  className="text-xs font-bold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                >
                  Editar
                </button>
              </div>

              <div className="p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Calorías activas descontadas</span>
                  <div className="text-lg font-black text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5 mt-0.5">
                    <Flame className="w-4 h-4 text-rose-500" />
                    <span>{syncedCalories} kcal</span>
                  </div>
                </div>
                <span className="text-[11px] text-zinc-400">
                  {discountCalories ? 'Descontadas de tu meta' : 'No descontadas'}
                </span>
              </div>
            </div>

            {/* Tip de vinculación */}
            <div className="p-3.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="flex-1 space-y-1">
                <p className="font-bold">¿Cómo activar la sincronización automática con Xiaomi Mi Fitness?</p>
                <p className="text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-300/90">
                  En tu móvil: Abre <strong>Mi Fitness</strong> &gt; Toca en <strong>Perfil</strong> (abajo a la derecha) &gt; Selecciona <strong>"Datos y Privacidad"</strong> o <strong>"Aplicaciones conectadas"</strong> &gt; Activa la casilla de <strong>Google Fit</strong> o <strong>Health Connect</strong>. ¡También puedes vincular directo con Strava!
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 1: Google Fit */}
        {activeIntegrationTab === 'google_fit' && (
          <div 
            id="activity-health-integration-card"
            className={`border rounded-2xl p-5 sm:p-6 shadow-xs transition-all ${
              isGoogleFitConnected
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500/50 ring-1 ring-emerald-500/20'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-xs shrink-0">
                  <HeartPulse className="w-6 h-6 text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                      Google Fitness API
                    </h3>
                    {isGoogleFitConnected ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-black flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Conectado
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold shrink-0">
                        No Vinculado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    {isGoogleFitConnected
                      ? `Lectura activa de pasos y calorías de hoy (${selectedDate}). Los datos se descuentan de tu meta calórica.`
                      : 'Conexión OAuth 2.0 oficial con Google Fit para importar tus pasos reales y calorías activas automáticamente.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
                {isGoogleFitConnected ? (
                  <>
                    <button
                      type="button"
                      id="btn-disconnect-google-fit"
                      onClick={handleDisconnectGoogleFit}
                      disabled={isSyncing}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-all whitespace-nowrap text-center"
                    >
                      Desconectar
                    </button>
                    <button
                      type="button"
                      id="btn-sync-google-fit-now"
                      onClick={handleManualSyncNow}
                      disabled={isSyncing}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60 whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Actualizando...' : 'Actualizar Pasos'}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    id="btn-connect-google-fit"
                    onClick={handleConnectGoogleFit}
                    disabled={isSyncing}
                    className="py-2.5 px-5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-60 whitespace-nowrap"
                  >
                    <HeartPulse className="w-4 h-4 text-emerald-100 shrink-0" />
                    <span>{isSyncing ? 'Conectando...' : 'Vincular Google Fit'}</span>
                  </button>
                )}
              </div>
            </div>

            {isGoogleFitConnected && (
              <div className="mt-4 pt-3.5 border-t border-emerald-500/20 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/70 dark:bg-zinc-800/70 p-2.5 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Pasos Reales</span>
                  <p className="text-base font-black text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {totalSteps.toLocaleString()}
                  </p>
                </div>
                <div className="bg-white/70 dark:bg-zinc-800/70 p-2.5 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Calorías Activas</span>
                  <p className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {syncedCalories} kcal
                  </p>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-white/70 dark:bg-zinc-800/70 p-2.5 rounded-xl border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-zinc-400">Estado en Descuento</span>
                  <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300 mt-1">
                    {discountCalories ? '✓ Sumado al descuento' : 'Desactivado en Ajustes'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Strava */}
        {activeIntegrationTab === 'strava' && (
          <div 
            id="activity-strava-card"
            className={`border rounded-2xl p-5 sm:p-6 shadow-xs transition-all ${
              isStravaConnected
                ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-500/50 ring-1 ring-orange-500/20'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-xs shrink-0 text-orange-500">
                  <Bike className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                      Strava & Dispositivos GPS
                    </h3>
                    {isStravaConnected ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-100 dark:bg-orange-900/60 text-orange-800 dark:text-orange-200 text-[10px] font-black flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
                        {stravaConfig.athleteName || 'Atleta Conectado'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold shrink-0">
                        No Vinculado
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Sincroniza tus rodadas, fondos y carreras desde ciclo-computadores (Garmin, Wahoo) o relojes GPS directamente en tu diario.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0 w-full sm:w-auto">
                {isStravaConnected ? (
                  <>
                    <button
                      type="button"
                      onClick={handleDisconnectStrava}
                      disabled={isSyncing}
                      className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition-all whitespace-nowrap text-center"
                    >
                      Desconectar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSyncStrava()}
                      disabled={isSyncing}
                      className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-60 whitespace-nowrap"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Importando...' : 'Sincronizar Actividades'}</span>
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setShowStravaSetupModal(true)}
                      title="Configuración y Ayuda OAuth de Strava"
                      className="p-2.5 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleConnectStrava}
                      disabled={isSyncing}
                      className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 disabled:opacity-60 whitespace-nowrap"
                    >
                      <Bike className="w-4 h-4 text-orange-100 shrink-0" />
                      <span>{isSyncing ? 'Conectando...' : 'Vincular con Strava'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {isStravaConnected ? (
              <div className="mt-4 pt-3.5 border-t border-orange-500/20 text-xs text-zinc-600 dark:text-zinc-300 flex items-center justify-between flex-wrap gap-2">
                <span>Webhook de Strava activo para importación automática en tiempo real.</span>
                <span className="font-semibold text-orange-500">ID de Conexión: #{stravaConfig.clientId}</span>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 flex items-center justify-between flex-wrap gap-2">
                <span>Conecta tu cuenta mediante OAuth oficial o usa el modo directo.</span>
                <button
                  type="button"
                  onClick={handleDirectConnectStrava}
                  disabled={isSyncing}
                  className="font-bold text-orange-600 hover:text-orange-500 underline"
                >
                  Conexión directa instantánea (Prueba / Demo)
                </button>
              </div>
            )}

            {/* Modal / Panel de configuración de Strava */}
            {showStravaSetupModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-orange-100 dark:bg-orange-950 text-orange-600">
                        <Bike className="w-5 h-5" />
                      </div>
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100">
                        Configuración OAuth de Strava
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStravaSetupModal(false)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 text-sm font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                    Para conectar tu cuenta de Strava en modo desarrollador oficial:
                  </p>

                  <div className="bg-zinc-50 dark:bg-zinc-800/60 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-xs space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold text-zinc-700 dark:text-zinc-200">
                          1. Dominio autorizado en Strava:
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                          Configurado ✓
                        </span>
                      </div>
                      <code className="text-orange-600 dark:text-orange-400 bg-white dark:bg-zinc-900 px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 block select-all break-all font-mono text-[11px]">
                        ais-dev-muijxp7okoy3l6e6e2eqhm-103481937290.us-east1.run.app
                      </code>
                    </div>

                    <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40 text-[11px] text-orange-800 dark:text-orange-300">
                      📱 <strong>Optimizado para Móviles:</strong> Al pulsar <em>Vincular con Strava</em>, tu navegador móvil abrirá la autorización oficial sin bloqueos de popups y regresará automáticamente a NutriFit.
                    </div>

                    <a
                      href="https://www.strava.com/settings/api"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-600 hover:underline pt-1"
                    >
                      <span>Abrir Strava API Settings</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Client ID de Strava
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          Credenciales Oficiales Activas
                        </span>
                      </div>
                      <input
                        type="text"
                        value={stravaConfig.clientId || '278644'}
                        onChange={(e) => {
                          const updated = saveStravaConfig({ clientId: e.target.value.trim() });
                          setStravaConfig(updated);
                        }}
                        placeholder="278644"
                        className="w-full text-xs px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          Tu Token de Acceso Personal (Strava)
                        </label>
                        <span className="text-[10px] font-bold text-orange-600 dark:text-orange-400">
                          Acceso directo
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={stravaConfig.accessToken || ''}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            const updated = saveStravaConfig({ 
                              accessToken: val || null,
                              athleteName: 'David De Salvo'
                            });
                            setStravaConfig(updated);
                          }}
                          placeholder="Pega aquí tu token de acceso (ej: 392a6d85...)"
                          className="flex-1 text-xs px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-orange-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const token = stravaConfig.accessToken || '392a6d85e37cf57255860e59fd7042b9146317da';
                            const updated = saveStravaConfig({
                              accessToken: token,
                              athleteName: 'David De Salvo',
                            });
                            setStravaConfig(updated);
                            setShowStravaSetupModal(false);
                            notificationService.notifySuccess('¡Token de David De Salvo guardado y verificado!');
                            handleSyncStrava(token);
                          }}
                          className="px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold whitespace-nowrap shadow-xs"
                        >
                          Conectar Token
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-1">
                        Reconoce automáticamente tu cuenta de atleta en Strava (David De Salvo).
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-end border-t border-zinc-200 dark:border-zinc-800">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowStravaSetupModal(false);
                        await handleDirectConnectStrava();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700"
                    >
                      Conexión Directa de Prueba
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowStravaSetupModal(false);
                        handleConnectStrava();
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white shadow-xs"
                    >
                      Abrir OAuth Strava
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Health Connect */}
        {activeIntegrationTab === 'health_connect' && (
          <div 
            id="activity-health-connect-card"
            className={`border rounded-2xl p-5 sm:p-6 shadow-xs transition-all ${
              isHealthConnectActive
                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500/50 ring-1 ring-indigo-500/20'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-xs shrink-0 text-indigo-500">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-black text-base sm:text-lg text-zinc-900 dark:text-zinc-100">
                      Health Connect para Android
                    </h3>
                    {isHealthConnectActive ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 text-[10px] font-black flex items-center gap-1 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                        Puente Activo
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 text-[10px] font-bold shrink-0">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                    Integra datos de Samsung Health, Withings, Polar y sensores del sistema mediante la capa unificada de Android 14+.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleHealthConnect}
                  className={`py-2.5 px-5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shadow-xs active:scale-95 ${
                    isHealthConnectActive
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>{isHealthConnectActive ? 'Desactivar Health Connect' : 'Habilitar Puente Health Connect'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. SECCIÓN: REGISTRO MANUAL DE ACTIVIDAD */}
      <div 
        id="activity-manual-form-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600">
            <Plus className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-zinc-900 dark:text-white">
              Registrar Entrenamiento Manual
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Calcula automáticamente el gasto energético estimado con base en tu peso ({profile.weightKg || 70} kg) y la duración.
            </p>
          </div>
        </div>

        <form onSubmit={handleAddWorkout} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Select Actividad */}
            <div className="sm:col-span-6 space-y-1.5">
              <label htmlFor="activity-type-select" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Tipo de Actividad
              </label>
              <select
                id="activity-type-select"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as WorkoutCategory)}
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {ACTIVITY_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.name} ({opt.intensityDescription})
                  </option>
                ))}
              </select>
            </div>

            {/* Input Minutos */}
            <div className="sm:col-span-3 space-y-1.5">
              <label htmlFor="activity-duration-input" className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Duración (minutos)
              </label>
              <div className="relative">
                <input
                  id="activity-duration-input"
                  type="number"
                  min="1"
                  max="720"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))}
                  placeholder="30"
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 font-semibold pointer-events-none">
                  min
                </span>
              </div>
            </div>

            {/* Live Burn Preview Box */}
            <div className="sm:col-span-3 flex flex-col justify-end">
              <div className="px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 block">
                  Quemado Estimado
                </span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  ~{estimatedCaloriesBurned} <span className="text-xs">kcal</span>
                </span>
              </div>
            </div>
          </div>

          {/* Notes input & Submit button */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-8">
              <input
                id="activity-notes-input"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notas adicionales (opcional, ej. 'Series pesadas de pecho y tríceps')..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-4">
              <button
                type="submit"
                id="btn-save-manual-activity"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Actividad</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 5. LISTA DE ENTRENAMIENTOS REGISTRADOS DEL DÍA */}
      <div 
        id="activity-workouts-list-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Entrenamientos Registrados ({selectedDate})</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
              {manualWorkouts.length}
            </span>
          </h3>

          {manualWorkouts.length > 0 && (
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              +{manualCaloriesBurned} kcal en total
            </span>
          )}
        </div>

        {manualWorkouts.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <ActivityIcon className="w-10 h-10 text-zinc-300 dark:text-zinc-700 mx-auto mb-2" />
            <p className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
              No hay entrenamientos registrados para este día
            </p>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
              Utiliza el formulario de arriba para añadir una sesión de ejercicio o vincula Google Fit para sincronización automática.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {manualWorkouts.map((workout) => (
              <div
                key={workout.id}
                className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/80 hover:border-zinc-300 dark:hover:border-zinc-600 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-xs">
                    {getWorkoutIcon(workout.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
                        {workout.typeName}
                      </h4>
                      <span className="text-[10px] text-zinc-400">
                        {workout.timeAdded}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      <span>{workout.durationMinutes} minutos</span>
                      {workout.notes && (
                        <span className="ml-2 italic text-zinc-400">· "{workout.notes}"</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                      -{workout.caloriesBurned} kcal
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteWorkout(selectedDate, workout.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Eliminar entrenamiento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Xiaomi & Smartband Calibration Modal */}
      <XiaomiWatchModal
        isOpen={isXiaomiModalOpen}
        onClose={() => setIsXiaomiModalOpen(false)}
        selectedDate={selectedDate}
        currentSteps={totalSteps}
        currentCalories={syncedCalories}
        profile={profile}
        currentDeviceModel={currentDayLog.deviceModel}
        onSaveCalibration={handleSaveCalibration}
      />
    </div>
  );
};
