import React, { useState, useMemo } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { 
  ActivityDayLog, 
  WorkoutCategory, 
  WorkoutItem, 
  UserProfile 
} from '../types';
import { 
  ACTIVITY_OPTIONS, 
  calculateCaloriesBurned, 
  stepsToCalories 
} from '../utils/activityCalculations';
import { notificationService } from '../utils/notificationService';

interface ActivitySectionProps {
  profile: UserProfile;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  activityLogs: Record<string, ActivityDayLog>;
  onSaveWorkout: (date: string, workout: Omit<WorkoutItem, 'id' | 'date'>) => void;
  onDeleteWorkout: (date: string, workoutId: string) => void;
  onUpdateSyncData: (date: string, service: 'apple_health' | 'google_fit' | null, steps: number, calories: number) => void;
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

  // Toggle Health / Google Fit connection simulation
  const handleToggleHealthConnection = (service: 'apple_health' | 'google_fit') => {
    setIsSyncing(true);

    setTimeout(() => {
      const isCurrentlyConnected = currentDayLog.connectedService === service;
      if (isCurrentlyConnected) {
        // Disconnect
        onUpdateSyncData(selectedDate, null, 0, 0);
        notificationService.notifyInfo(`Desconectado de ${service === 'apple_health' ? 'Apple Health' : 'Google Fit'}`);
      } else {
        // Connect and generate realistic activity reading for the day
        const simulatedSteps = Math.floor(5800 + Math.random() * 3400); // 5800 - 9200 steps
        const simulatedCalories = stepsToCalories(simulatedSteps, profile.weightKg || 70);
        onUpdateSyncData(selectedDate, service, simulatedSteps, simulatedCalories);
        notificationService.notifySuccess(
          `¡Conectado exitosamente con ${service === 'apple_health' ? 'Apple Health' : 'Google Fit'}! Se sincronizaron ${simulatedSteps.toLocaleString()} pasos (${simulatedCalories} kcal).`
        );
      }
      setIsSyncing(false);
    }, 600);
  };

  // Re-sync button
  const handleManualSyncNow = () => {
    if (!currentDayLog.connectedService) return;
    setIsSyncing(true);
    setTimeout(() => {
      const current = currentDayLog.syncedSteps || 6000;
      const additional = Math.floor(350 + Math.random() * 850);
      const newSteps = current + additional;
      const newCalories = stepsToCalories(newSteps, profile.weightKg || 70);
      onUpdateSyncData(selectedDate, currentDayLog.connectedService, newSteps, newCalories);
      setIsSyncing(false);
      notificationService.notifySuccess(`Sincronización al día: +${additional} pasos detectados.`);
    }, 500);
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
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Footprints className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">
                {totalSteps.toLocaleString()}
              </span>
              <span className="text-xs text-zinc-400">/ 10.000 objetivo</span>
            </div>
            {/* Steps mini bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-3">
              <div 
                style={{ width: `${Math.min(100, (totalSteps / 10000) * 100)}%` }}
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              />
            </div>
            <div className="text-[11px] text-zinc-400 mt-2">
              {currentDayLog.connectedService ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Sincronizado vía {currentDayLog.connectedService === 'apple_health' ? 'Apple Health' : 'Google Fit'}
                </span>
              ) : (
                <span>Conecta tu app de salud para conteo en vivo</span>
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

      {/* 3. SECCIÓN: INTEGRACIÓN AUTOMÁTICA (APPLE HEALTH / GOOGLE FIT) */}
      <div 
        id="activity-health-integration-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-[11px] font-bold mb-1.5">
              <Smartphone className="w-3.5 h-3.5" />
              <span>Sincronización Biométrica</span>
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white">
              Conexión Automática con Apple Health / Google Fit
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Vincula la aplicación para importar automáticamente tus pasos diarios, frecuencia cardíaca y calorías activas quemadas.
            </p>
          </div>

          {currentDayLog.connectedService && (
            <button
              type="button"
              id="activity-btn-sync-now"
              onClick={handleManualSyncNow}
              disabled={isSyncing}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-95 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}</span>
            </button>
          )}
        </div>

        {/* Integration Badges / Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
          {/* Apple Health Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            currentDayLog.connectedService === 'apple_health'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/40'
              : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Apple Health</h4>
                  <p className="text-[11px] text-zinc-500">iOS & Apple Watch</p>
                </div>
              </div>
              {currentDayLog.connectedService === 'apple_health' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Activo
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              Lee pasos, anillo de movimiento y calorías activas calculadas por los sensores de Apple Watch y iPhone.
            </p>

            <button
              type="button"
              id="btn-connect-apple-health"
              onClick={() => handleToggleHealthConnection('apple_health')}
              disabled={isSyncing}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                currentDayLog.connectedService === 'apple_health'
                  ? 'bg-zinc-200 dark:bg-zinc-700 hover:bg-rose-100 hover:text-rose-700 text-zinc-700 dark:text-zinc-200'
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {currentDayLog.connectedService === 'apple_health' ? 'Desconectar Apple Health' : 'Vincular Apple Health'}
            </button>
          </div>

          {/* Google Fit Card */}
          <div className={`p-4 rounded-2xl border transition-all ${
            currentDayLog.connectedService === 'google_fit'
              ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-500 ring-1 ring-emerald-500/40'
              : 'bg-zinc-50/60 dark:bg-zinc-800/40 border-zinc-200 dark:border-zinc-800'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 via-green-500 to-amber-500 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <HeartPulse className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Google Fit</h4>
                  <p className="text-[11px] text-zinc-500">Android & Wear OS</p>
                </div>
              </div>
              {currentDayLog.connectedService === 'google_fit' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-[10px] font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Activo
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-4">
              Sincroniza puntos de cardio, podómetro y entrenamientos registrados en cualquier dispositivo Android.
            </p>

            <button
              type="button"
              id="btn-connect-google-fit"
              onClick={() => handleToggleHealthConnection('google_fit')}
              disabled={isSyncing}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                currentDayLog.connectedService === 'google_fit'
                  ? 'bg-zinc-200 dark:bg-zinc-700 hover:bg-rose-100 hover:text-rose-700 text-zinc-700 dark:text-zinc-200'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white'
              }`}
            >
              {currentDayLog.connectedService === 'google_fit' ? 'Desconectar Google Fit' : 'Vincular Google Fit'}
            </button>
          </div>
        </div>
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
              Utiliza el formulario de arriba para añadir una sesión de ejercicio o conecta Apple Health / Google Fit.
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
    </div>
  );
};
