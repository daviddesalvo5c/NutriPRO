import React, { useState } from 'react';
import { 
  Plus, 
  Flame, 
  Trash2, 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  Utensils, 
  Coffee, 
  Sun, 
  Moon, 
  Apple, 
  Edit3,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Scan,
  Camera,
  Lock
} from 'lucide-react';
import { DailyLog, FoodItem, MealType, UserProfile, SubscriptionTier } from '../types';
import { getProfileCalculations, formatGrams, roundGrams } from '../utils/nutritionCalculations';
import { WaterTrackerCard } from './WaterTrackerCard';
import { hasUserProAccess, FOUNDER_EMAIL } from '../utils/storage';
import { AddArgentineFoodModal } from './AddArgentineFoodModal';

interface DiarySectionProps {
  profile: UserProfile;
  dailyLogs: Record<string, DailyLog>;
  selectedDate: string;
  onSelectDate: (date: string) => void;
  onAddFoodItem: (date: string, item: Omit<FoodItem, 'id'>) => void;
  onRemoveFoodItem: (date: string, itemId: string) => void;
  onUpdateWater?: (date: string, amountMl: number) => void;
  onToggleCloseDay?: (date: string) => void;
  onOpenProfile: () => void;
  onNavigateToScanner: () => void;
  onNavigateToActivity?: () => void;
  totalActivityBurned?: number;
  discountActivityCalories?: boolean;
  userEmail?: string;
  currentTier?: SubscriptionTier;
  onOpenPlansModal?: () => void;
}

export const DiarySection: React.FC<DiarySectionProps> = ({
  profile,
  dailyLogs,
  selectedDate,
  onSelectDate,
  onAddFoodItem,
  onRemoveFoodItem,
  onUpdateWater,
  onToggleCloseDay,
  onOpenProfile,
  onNavigateToScanner,
  onNavigateToActivity,
  totalActivityBurned = 0,
  discountActivityCalories = true,
  userEmail = '',
  currentTier = 'free' as SubscriptionTier,
  onOpenPlansModal,
}) => {
  const [activeModalMeal, setActiveModalMeal] = useState<MealType | null>(null);

  // Check 7-day history limit for Free users
  const isDateOlderThan7Days = (dateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays > 6;
  };

  const isHistoryLocked = !hasUserProAccess(userEmail, currentTier) && isDateOlderThan7Days(selectedDate);

  // Quick add form state
  const [foodName, setFoodName] = useState('');
  const [portion, setPortion] = useState('1 porción');
  const [calories, setCalories] = useState<number | ''>('');
  const [protein, setProtein] = useState<number | ''>('');
  const [carbs, setCarbs] = useState<number | ''>('');
  const [fat, setFat] = useState<number | ''>('');

  // Calculations from the UserProfile
  const profileCalcs = getProfileCalculations(profile);

  // Active day's items
  const currentLog = dailyLogs[selectedDate] || { date: selectedDate, items: [] };
  const items = currentLog.items || [];

  // Sum consumed (redondeado para evitar decimales largos o desfases en el CSS)
  const totalCaloriesConsumed = Math.round(items.reduce((acc, i) => acc + (i.calories || 0), 0));
  const totalProteinConsumed = roundGrams(items.reduce((acc, i) => acc + (i.proteinGrams || 0), 0));
  const totalCarbsConsumed = roundGrams(items.reduce((acc, i) => acc + (i.carbsGrams || 0), 0));
  const totalFatConsumed = roundGrams(items.reduce((acc, i) => acc + (i.fatGrams || 0), 0));

  // Targets from Profile
  const targetCalories = profileCalcs.targetCalories;
  const targetProtein = roundGrams(profileCalcs.proteinGrams);
  const targetCarbs = roundGrams(profileCalcs.carbsGrams);
  const targetFat = roundGrams(profileCalcs.fatGrams);

  // Real-time activity discount logic
  const activeBurn = (discountActivityCalories && totalActivityBurned > 0) ? totalActivityBurned : 0;
  const netCaloriesConsumed = Math.max(0, totalCaloriesConsumed - activeBurn);

  // Remaining
  const caloriesRemaining = targetCalories - netCaloriesConsumed;
  const caloriesPercent = Math.min(100, Math.round((netCaloriesConsumed / targetCalories) * 100));

  const proteinPercent = Math.min(100, Math.round((totalProteinConsumed / targetProtein) * 100));
  const carbsPercent = Math.min(100, Math.round((totalCarbsConsumed / targetCarbs) * 100));
  const fatPercent = Math.min(100, Math.round((totalFatConsumed / targetFat) * 100));

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

  const handleSaveNewFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || calories === '' || !activeModalMeal) return;

    const itemToAdd: Omit<FoodItem, 'id'> = {
      name: foodName,
      portionDescription: portion || '1 porción',
      amountGrams: 100,
      calories: Number(calories) || 0,
      proteinGrams: Number(protein) || 0,
      carbsGrams: Number(carbs) || 0,
      fatGrams: Number(fat) || 0,
      mealType: activeModalMeal,
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onAddFoodItem(selectedDate, itemToAdd);

    // Reset
    setFoodName('');
    setPortion('1 porción');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setActiveModalMeal(null);
  };

  const mealsList: { type: MealType; label: string; icon: any; color: string }[] = [
    { type: 'breakfast', label: 'Desayuno', icon: Coffee, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300' },
    { type: 'lunch', label: 'Almuerzo / Comida', icon: Sun, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 dark:text-orange-300' },
    { type: 'dinner', label: 'Cena', icon: Moon, color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-300' },
    { type: 'snacks', label: 'Snacks & Merienda', icon: Apple, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300' },
  ];

  const isFounder = userEmail.trim().toLowerCase() === FOUNDER_EMAIL.toLowerCase() || Boolean(profile.name && profile.name.toLowerCase().includes('david'));

  return (
    <div className="space-y-6 pb-12" id="diary-screen">
      {/* Date Navigator & Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-zinc-900 p-3.5 sm:p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
        {/* Selector de fecha */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrevDay}
            title="Día anterior"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 transition-colors shrink-0 active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 whitespace-nowrap leading-none">
            <CalendarIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-none whitespace-nowrap">
              {isToday ? 'Hoy' : selectedDate}
            </span>
            <span className="text-[11px] sm:text-xs text-zinc-400 dark:text-zinc-400 leading-none whitespace-nowrap">
              ({selectedDate})
            </span>
          </div>

          <button
            type="button"
            onClick={handleNextDay}
            title="Día siguiente"
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 transition-colors shrink-0 active:scale-95"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {!isToday && (
            <button
              type="button"
              onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 whitespace-nowrap"
            >
              Volver a hoy
            </button>
          )}
        </div>

        {/* Barra de acciones: Alimentos AR, Actividad, Escanear IA, Perfil Fundador */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="diary-btn-open-argentine-food"
            onClick={() => setActiveModalMeal('lunch')}
            className="h-9 px-3 bg-zinc-100 hover:bg-emerald-50 dark:bg-zinc-800 dark:hover:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-emerald-200/60 dark:border-emerald-800/60 shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap"
            title="Buscar alimentos argentinos por porción o gramos"
          >
            <Utensils className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Alimentos AR</span>
          </button>

          {onNavigateToActivity && (
            <button
              type="button"
              id="diary-btn-open-activity"
              onClick={onNavigateToActivity}
              className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap ${
                activeBurn > 0
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
              }`}
              title="Registrar o sincronizar actividad física"
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
              <span>{activeBurn > 0 ? `-${activeBurn} kcal act.` : 'Actividad'}</span>
            </button>
          )}

          <button
            type="button"
            id="diary-btn-open-scanner"
            onClick={onNavigateToScanner}
            className="h-9 px-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02] whitespace-nowrap"
            title="Escanear con Cámara Inteligente (95%+ Precisión)"
          >
            <Camera className="w-3.5 h-3.5 shrink-0" />
            <span>Escanear IA</span>
          </button>

          {/* Cerrar el Día button */}
          {onToggleCloseDay && (
            <button
              type="button"
              id="diary-btn-toggle-close-day"
              onClick={() => onToggleCloseDay(selectedDate)}
              className={`h-9 px-3.5 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap ${
                currentLog.isClosed
                  ? 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/50'
                  : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
              }`}
              title={currentLog.isClosed ? 'Día cerrado y guardado en la base de datos. Clic para reabrir.' : 'Cerrar el día y guardar en la base de datos'}
            >
              <CheckCircle className={`w-3.5 h-3.5 ${currentLog.isClosed ? 'text-white' : 'text-emerald-400'}`} />
              <span>{currentLog.isClosed ? 'Día Cerrado ✓' : 'Cerrar el Día'}</span>
            </button>
          )}

          {/* Pill/badge David Desalvo (Fundador) Déficit */}
          <button
            type="button"
            id="diary-btn-profile-badge"
            onClick={onOpenProfile}
            className="h-9 font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500 flex items-center gap-1.5 transition-all text-xs whitespace-nowrap shrink-0"
            title="Ver o editar perfil y metas nutricionales"
          >
            <span className="font-bold text-zinc-800 dark:text-zinc-200">
              {isFounder ? 'David Desalvo' : (profile.name || 'Mi Perfil')}
            </span>
            {isFounder && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/60 dark:border-amber-700/60 leading-none">
                Fundador
              </span>
            )}
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 font-extrabold leading-none">
              {profile.goal === 'deficit' ? 'Déficit' : profile.goal === 'surplus' ? 'Superávit' : 'Mantenimiento'}
            </span>
            <Edit3 className="w-3 h-3 text-zinc-400 shrink-0" />
          </button>
        </div>
      </div>

      {/* Closed Day Notification Banner */}
      {currentLog.isClosed && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-black text-emerald-900 dark:text-emerald-100">
                  Día Cerrado y Guardado
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/80 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                  Sincronizado
                </span>
              </div>
              <p className="text-xs text-emerald-700 dark:text-emerald-300/80 mt-0.5">
                {currentLog.closedAt
                  ? `Cerrado a las ${new Date(currentLog.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : 'Registro finalizado'} · El balance calórico y macronutrientes han sido guardados permanentemente.
              </p>
            </div>
          </div>

          {onToggleCloseDay && (
            <button
              type="button"
              id="diary-btn-reopen-day"
              onClick={() => onToggleCloseDay(selectedDate)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-zinc-700 transition-colors shrink-0"
            >
              Reabrir para editar
            </button>
          )}
        </div>
      )}

      {/* Main Calories & Macros Tracker Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* Calorie Dial / Summary */}
          <div className="md:col-span-5 flex flex-col justify-center border-b md:border-b-0 md:border-r border-zinc-100 dark:border-zinc-800 pb-6 md:pb-0 md:pr-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Balance Calórico Diario
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                caloriesRemaining >= 0 
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
              }`}>
                {caloriesRemaining >= 0 ? `${caloriesRemaining} kcal restantes` : `${Math.abs(caloriesRemaining)} kcal superadas`}
              </span>
            </div>

            <div className="flex items-baseline gap-2 mt-1 flex-wrap">
              <span className="text-4xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">
                {activeBurn > 0 ? netCaloriesConsumed.toLocaleString() : totalCaloriesConsumed.toLocaleString()}
              </span>
              <span className="text-base font-semibold text-zinc-400">
                / {targetCalories.toLocaleString()} kcal {activeBurn > 0 ? 'netas' : ''}
              </span>
              {activeBurn > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 font-bold border border-orange-200 dark:border-orange-800 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500 fill-orange-500" />
                  -{activeBurn} kcal actividad
                </span>
              )}
            </div>

            {/* Main Progress Bar */}
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-3.5 rounded-full overflow-hidden mt-3 p-0.5 border border-zinc-200 dark:border-zinc-700">
              <div
                style={{ width: `${Math.min(100, (netCaloriesConsumed / targetCalories) * 100)}%` }}
                className={`h-full rounded-full transition-all duration-500 ${
                  caloriesRemaining < 0
                    ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                }`}
              />
            </div>

            {/* Subtext info */}
            {activeBurn > 0 ? (
              <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-800/50 px-2.5 py-1 rounded-lg">
                <span>Comida: <strong>{totalCaloriesConsumed} kcal</strong></span>
                <span>Actividad: <strong className="text-orange-600 dark:text-orange-400">-{activeBurn} kcal</strong></span>
                <span>Margen Neto: <strong className="text-emerald-600 dark:text-emerald-400">{netCaloriesConsumed} kcal</strong></span>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                <span>{caloriesPercent}% de tu meta diaria</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Objetivo: {profile.goal === 'deficit' ? 'Pérdida de grasa' : profile.goal === 'surplus' ? 'Hipertrofia' : 'Mantenimiento'}
                </span>
              </div>
            )}
          </div>

          {/* 3 Macro Progress Bars */}
          <div className="md:col-span-7 space-y-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Macronutrientes (adaptados a tu perfil)
              </span>
              <button
                onClick={onOpenProfile}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                Ajustar metas
                <Edit3 className="w-3 h-3" />
              </button>
            </div>

            {/* Protein Progress */}
            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span className="text-zinc-900 dark:text-zinc-100">Proteínas</span>
                </div>
                <div className="text-zinc-700 dark:text-zinc-300">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">{formatGrams(totalProteinConsumed)}g</span>
                  <span className="text-zinc-400 font-normal"> / {formatGrams(targetProtein)}g</span>
                  <span className="ml-2 text-[10px] text-zinc-500">({proteinPercent}%)</span>
                </div>
              </div>
              <div className="w-full bg-zinc-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, proteinPercent)}%` }}
                  className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>

            {/* Carbs Progress */}
            <div className="bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-zinc-900 dark:text-zinc-100">Carbohidratos</span>
                </div>
                <div className="text-zinc-700 dark:text-zinc-300">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{formatGrams(totalCarbsConsumed)}g</span>
                  <span className="text-zinc-400 font-normal"> / {formatGrams(targetCarbs)}g</span>
                  <span className="ml-2 text-[10px] text-zinc-500">({carbsPercent}%)</span>
                </div>
              </div>
              <div className="w-full bg-zinc-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, carbsPercent)}%` }}
                  className="bg-amber-500 h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>

            {/* Fat Progress */}
            <div className="bg-rose-50/40 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/30">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span className="text-zinc-900 dark:text-zinc-100">Grasas</span>
                </div>
                <div className="text-zinc-700 dark:text-zinc-300">
                  <span className="text-rose-600 dark:text-rose-400 font-bold">{formatGrams(totalFatConsumed)}g</span>
                  <span className="text-zinc-400 font-normal"> / {formatGrams(targetFat)}g</span>
                  <span className="ml-2 text-[10px] text-zinc-500">({fatPercent}%)</span>
                </div>
              </div>
              <div className="w-full bg-zinc-200/80 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div
                  style={{ width: `${Math.min(100, fatPercent)}%` }}
                  className="bg-rose-500 h-full rounded-full transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Water Hydration Tracker Card */}
      <WaterTrackerCard
        currentWaterMl={currentLog.waterMl || 0}
        targetWaterMl={currentLog.waterGoalMl || 2500}
        onUpdateWater={(newAmount) => {
          if (onUpdateWater) {
            onUpdateWater(selectedDate, newAmount);
          }
        }}
      />

      {/* Meals Sections OR Locked History View */}
      {isHistoryLocked ? (
        <div className="p-8 text-center rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-lg font-black text-zinc-900 dark:text-zinc-100">
              Historial de más de 7 días restringido
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              El <strong>Plan Gratuito</strong> incluye los registros de los últimos 7 días. 
              Actualiza a <strong>NutriFit Pro</strong> para consultar y registrar en cualquier fecha de tu historial sin restricciones.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
            {onOpenPlansModal && (
              <button
                type="button"
                id="btn-diary-upgrade-pro"
                onClick={onOpenPlansModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 hover:scale-105"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Desbloquear Historial con Pro ($12.999 ARS/mes)</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onSelectDate(new Date().toISOString().split('T')[0])}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
            >
              Volver a Hoy
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
        {mealsList.map((meal) => {
          const mealItems = items.filter((i) => i.mealType === meal.type);
          const mealCals = Math.round(mealItems.reduce((acc, i) => acc + (i.calories || 0), 0));
          const mealProtein = roundGrams(mealItems.reduce((acc, i) => acc + (i.proteinGrams || 0), 0));
          const mealCarbs = roundGrams(mealItems.reduce((acc, i) => acc + (i.carbsGrams || 0), 0));
          const mealFat = roundGrams(mealItems.reduce((acc, i) => acc + (i.fatGrams || 0), 0));
          const MealIcon = meal.icon;

          return (
            <div
              key={meal.type}
              id={`meal-card-${meal.type}`}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs"
            >
              {/* Meal Header */}
              <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${meal.color}`}>
                    <MealIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {meal.label}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{mealCals} kcal</span>
                      <span>·</span>
                      <span>P: {formatGrams(mealProtein)}g</span>
                      <span>C: {formatGrams(mealCarbs)}g</span>
                      <span>G: {formatGrams(mealFat)}g</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onNavigateToScanner}
                    title={`Escanear foto para ${meal.label}`}
                    className="p-1.5 sm:px-2 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-zinc-600 dark:text-zinc-400 text-xs font-semibold rounded-xl transition-all flex items-center gap-1 border border-zinc-200/80 dark:border-zinc-700"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline text-[11px]">Escanear</span>
                  </button>

                  <button
                    type="button"
                    id={`btn-add-food-${meal.type}`}
                    onClick={() => setActiveModalMeal(meal.type)}
                    className="py-1.5 px-3 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-emerald-200/80 dark:border-emerald-800/80 shadow-xs active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              {mealItems.length === 0 ? (
                <div className="p-5 text-center text-xs text-zinc-400 dark:text-zinc-500 italic">
                  No hay alimentos registrados en {meal.label.toLowerCase()}.
                </div>
              ) : (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
                  {mealItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 px-4 flex items-center justify-between hover:bg-zinc-50/70 dark:hover:bg-zinc-800/30 transition-colors group"
                    >
                      <div className="pr-3">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          {item.name}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {item.portionDescription} {item.timeAdded ? `· ${item.timeAdded}` : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold hidden sm:flex">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                            {formatGrams(item.proteinGrams)}g P
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/50 dark:border-amber-800/50">
                            {formatGrams(item.carbsGrams)}g C
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200/50 dark:border-rose-800/50">
                            {formatGrams(item.fatGrams)}g G
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-black text-zinc-800 dark:text-zinc-200 block">
                            {Math.round(item.calories)} kcal
                          </span>
                          <span className="text-[10px] text-zinc-400 sm:hidden">
                            {formatGrams(item.proteinGrams)}P · {formatGrams(item.carbsGrams)}C · {formatGrams(item.fatGrams)}G
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveFoodItem(selectedDate, item.id)}
                          title="Eliminar del diario"
                          className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Card de Cierre de Jornada / Sincronización */}
        {!isHistoryLocked && onToggleCloseDay && (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <div className="flex items-center gap-3 text-center sm:text-left">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                currentLog.isClosed
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300'
              }`}>
                <CheckCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {currentLog.isClosed
                    ? 'Jornada Cerrada y Guardada'
                    : '¿Terminaste de registrar todas tus comidas del día?'}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {currentLog.isClosed
                    ? 'Este día está asegurado en la base de datos. Puedes reabrirlo cuando desees añadir más alimentos.'
                    : `Cierra el día para archivar tu consumo (${totalCaloriesConsumed} kcal) y sincronizarlo de forma permanente en la base de datos.`}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="diary-btn-footer-close-day"
              onClick={() => onToggleCloseDay(selectedDate)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all hover:scale-105 shrink-0 ${
                currentLog.isClosed
                  ? 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              <CheckCircle className="w-4 h-4" />
              <span>{currentLog.isClosed ? 'Reabrir Día' : 'Cerrar el Día y Guardar'}</span>
            </button>
          </div>
        )}
      </div>
      )}

      {/* Argentine Food Database Search & Portion Modal */}
      {activeModalMeal && (
        <AddArgentineFoodModal
          isOpen={Boolean(activeModalMeal)}
          onClose={() => setActiveModalMeal(null)}
          mealType={activeModalMeal}
          onSaveFoodItem={(item) => {
            onAddFoodItem(selectedDate, item);
            setActiveModalMeal(null);
          }}
        />
      )}
    </div>
  );
};
