import React, { useState, useEffect } from 'react';
import { 
  User, 
  Scale, 
  Ruler, 
  Calendar, 
  Flame, 
  Zap, 
  CheckCircle2, 
  Info, 
  RotateCcw, 
  Save, 
  Sliders, 
  HelpCircle,
  TrendingDown,
  Equal,
  TrendingUp,
  Activity,
  ArrowRight,
  Crown,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { 
  ActivityLevel, 
  FormulaType, 
  Gender, 
  GoalIntensity, 
  GoalType, 
  UserProfile, 
  SubscriptionTier,
  UserSession
} from '../types';
import { FounderManagementPanel } from './FounderManagementPanel';
import { isFounderEmail } from '../utils/storage';
import { 
  ACTIVITY_OPTIONS, 
  calculateBMR, 
  calculateHarrisBenedict, 
  calculateMifflinStJeor, 
  calculateSuggestedMacros, 
  calculateTDEE, 
  getCalorieAdjustment, 
  getProfileCalculations, 
  GOAL_OPTIONS 
} from '../utils/nutritionCalculations';

interface UserProfileSectionProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onNavigateToDiary: () => void;
  session?: UserSession | null;
  currentTier?: SubscriptionTier;
  onOpenPlansModal?: () => void;
}

export const UserProfileSection: React.FC<UserProfileSectionProps> = ({
  profile,
  onUpdateProfile,
  onNavigateToDiary,
  session = null,
  currentTier = 'free',
  onOpenPlansModal,
}) => {
  // Local form state
  const [formData, setFormData] = useState<UserProfile>({ ...profile });
  const [ageInput, setAgeInput] = useState<string>(() => (profile.age ? String(profile.age) : ''));
  const [heightInput, setHeightInput] = useState<string>(() => (profile.heightCm ? String(profile.heightCm) : ''));
  const [weightInput, setWeightInput] = useState<string>(() => (profile.weightKg ? String(profile.weightKg) : ''));

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [showFormulaDetails, setShowFormulaDetails] = useState<boolean>(false);

  // Synchronize local form and string states whenever external profile updates
  useEffect(() => {
    setFormData(profile);
    setAgeInput(profile.age ? String(profile.age) : '');
    setHeightInput(profile.heightCm ? String(profile.heightCm) : '');
    setWeightInput(profile.weightKg ? String(profile.weightKg) : '');
  }, [
    profile.age,
    profile.heightCm,
    profile.weightKg,
    profile.gender,
    profile.goal,
    profile.goalIntensity,
    profile.activityLevel,
    profile.formula,
    profile.name
  ]);

  // Live calculations based on current form inputs
  const liveCalcs = getProfileCalculations(formData);

  // BMI Calculation
  const heightM = formData.heightCm > 0 ? formData.heightCm / 100 : 1.75;
  const bmi = formData.weightKg > 0 ? Number((formData.weightKg / (heightM * heightM)).toFixed(1)) : 22.5;

  const getBmiCategory = (val: number) => {
    if (val < 18.5) return { label: 'Bajo peso', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' };
    if (val < 24.9) return { label: 'Peso saludable', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' };
    if (val < 29.9) return { label: 'Sobrepeso', color: 'text-amber-700 bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300' };
    return { label: 'Obesidad', color: 'text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' };
  };

  const bmiInfo = getBmiCategory(bmi);

  // Handlers for numeric fields that allow empty string typing
  const handleAgeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string or digits only
    if (val === '' || /^\d*$/.test(val)) {
      setAgeInput(val);
      if (val.trim() === '') return;
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed) && parsed > 0) {
        const updated = { ...formData, age: parsed };
        setFormData(updated);
        onUpdateProfile(updated);
      }
    }
  };

  const handleAgeBlur = () => {
    const trimmed = ageInput.trim();
    if (trimmed === '' || isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
      const fallback = formData.age || 28;
      setAgeInput(String(fallback));
    } else {
      const clamped = Math.min(120, Math.max(10, parseInt(trimmed, 10)));
      setAgeInput(String(clamped));
      if (clamped !== formData.age) {
        const updated = { ...formData, age: clamped };
        setFormData(updated);
        onUpdateProfile(updated);
      }
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow empty string or decimal typing
    if (val === '' || /^[\d.,]*$/.test(val)) {
      setHeightInput(val);
      if (val.trim() === '') return;
      const parsed = parseFloat(val.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        const updated = { ...formData, heightCm: parsed };
        setFormData(updated);
        onUpdateProfile(updated);
      }
    }
  };

  const handleHeightBlur = () => {
    const trimmed = heightInput.trim();
    if (trimmed === '' || isNaN(Number(trimmed.replace(',', '.'))) || Number(trimmed.replace(',', '.')) <= 0) {
      const fallback = formData.heightCm || 175;
      setHeightInput(String(fallback));
    } else {
      const clamped = Math.min(250, Math.max(70, parseFloat(trimmed.replace(',', '.'))));
      setHeightInput(String(clamped));
      if (clamped !== formData.heightCm) {
        const updated = { ...formData, heightCm: clamped };
        setFormData(updated);
        onUpdateProfile(updated);
      }
    }
  };

  const handleWeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^[\d.,]*$/.test(val)) {
      setWeightInput(val);
      if (val.trim() === '' || val.endsWith('.') || val.endsWith(',')) return;
      const parsed = parseFloat(val.replace(',', '.'));
      if (!isNaN(parsed) && parsed > 0) {
        const updated = { ...formData, weightKg: parsed };
        setFormData(updated);
        onUpdateProfile(updated);
      }
    }
  };

  const handleWeightBlur = () => {
    const trimmed = weightInput.trim();
    if (trimmed === '' || isNaN(Number(trimmed.replace(',', '.'))) || Number(trimmed.replace(',', '.')) <= 0) {
      const fallback = formData.weightKg || 75;
      setWeightInput(String(fallback));
    } else {
      const clamped = Math.min(350, Math.max(25, parseFloat(trimmed.replace(',', '.'))));
      const rounded = Math.round(clamped * 10) / 10;
      setWeightInput(String(rounded));
      if (rounded !== formData.weightKg) {
        const updated = { ...formData, weightKg: rounded };
        setFormData(updated);
        onUpdateProfile(updated);
      }
    }
  };

  // Handler for saving changes explicitly
  const handleSave = () => {
    const parsedAge = parseInt(ageInput, 10);
    const parsedHeight = parseFloat(heightInput.replace(',', '.'));
    const parsedWeight = parseFloat(weightInput.replace(',', '.'));

    const finalProfile: UserProfile = {
      ...formData,
      age: !isNaN(parsedAge) && parsedAge > 0 ? parsedAge : formData.age,
      heightCm: !isNaN(parsedHeight) && parsedHeight > 0 ? parsedHeight : formData.heightCm,
      weightKg: !isNaN(parsedWeight) && parsedWeight > 0 ? parsedWeight : formData.weightKg,
    };

    setFormData(finalProfile);
    setAgeInput(String(finalProfile.age));
    setHeightInput(String(finalProfile.heightCm));
    setWeightInput(String(finalProfile.weightKg));

    onUpdateProfile(finalProfile);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
    }, 3500);
  };

  // Re-calculate suggested macros and optionally update targets if not customized
  const updateGoalAndRecalculate = (newGoal: GoalType, newIntensity?: GoalIntensity) => {
    const intensity = newIntensity || formData.goalIntensity;
    const bmr = calculateBMR(formData.weightKg, formData.heightCm, formData.age, formData.gender, formData.formula);
    const tdee = calculateTDEE(bmr, formData.activityLevel);
    const adjustment = getCalorieAdjustment(tdee, newGoal, intensity);
    const targetCals = Math.max(1100, tdee + adjustment);
    const suggested = calculateSuggestedMacros(targetCals, formData.weightKg, newGoal);

    setFormData((prev) => ({
      ...prev,
      goal: newGoal,
      goalIntensity: intensity,
      targetCalories: prev.customTargetsEnabled ? prev.targetCalories : targetCals,
      targetProteinGrams: prev.customTargetsEnabled ? prev.targetProteinGrams : suggested.proteinGrams,
      targetCarbsGrams: prev.customTargetsEnabled ? prev.targetCarbsGrams : suggested.carbsGrams,
      targetFatGrams: prev.customTargetsEnabled ? prev.targetFatGrams : suggested.fatGrams,
    }));
  };

  const handleResetToSuggestedMacros = () => {
    const bmr = calculateBMR(formData.weightKg, formData.heightCm, formData.age, formData.gender, formData.formula);
    const tdee = calculateTDEE(bmr, formData.activityLevel);
    const adjustment = getCalorieAdjustment(tdee, formData.goal, formData.goalIntensity);
    const targetCals = Math.max(1100, tdee + adjustment);
    const suggested = calculateSuggestedMacros(targetCals, formData.weightKg, formData.goal);

    setFormData((prev) => ({
      ...prev,
      customTargetsEnabled: false,
      targetCalories: targetCals,
      targetProteinGrams: suggested.proteinGrams,
      targetCarbsGrams: suggested.carbsGrams,
      targetFatGrams: suggested.fatGrams,
    }));
  };

  // Formula math preview comparison
  const mifflinBmr = Math.round(calculateMifflinStJeor(formData.weightKg, formData.heightCm, formData.age, formData.gender));
  const harrisBmr = Math.round(calculateHarrisBenedict(formData.weightKg, formData.heightCm, formData.age, formData.gender));

  return (
    <div className="space-y-8 pb-12" id="user-profile-screen">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 text-white p-6 sm:p-8 rounded-2xl shadow-sm">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-emerald-100 text-xs font-semibold uppercase tracking-wider mb-2">
            <User className="w-4 h-4" />
            Configuración & Biofísica Nutricional
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Perfil de Usuario & Cálculo de Requerimientos
          </h1>
          <p className="mt-2 text-sm sm:text-base text-emerald-50 leading-relaxed">
            Configura tus medidas biológicas para estimar con exactitud tu Tasa Metabólica Basal (BMR) y Gasto Total (TDEE).
            Al definir tu objetivo, la aplicación calibrará automáticamente todas las barras de progreso del diario.
          </p>
        </div>
      </div>

      {/* Save status notification */}
      {savedSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 px-4 py-3 rounded-xl flex items-center justify-between shadow-xs transition-all animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold">¡Perfil guardado correctamente!</p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300">
                Tus metas de calorías ({liveCalcs.targetCalories.toLocaleString()} kcal) y macronutrientes se han actualizado en todo el diario.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToDiary}
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
          >
            Ir al Diario
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Membership & Subscription Tier Status Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            {currentTier === 'vip' || session?.isFounder ? (
              <div className="w-12 h-12 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-black text-xl shadow-md shrink-0">
                ✦
              </div>
            ) : currentTier === 'pro_monthly' || currentTier === 'pro_annual' ? (
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                <Crown className="w-6 h-6" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center font-black text-xl shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-zinc-100">
                  {currentTier === 'vip' || session?.isFounder
                    ? 'Miembro VIP ✦'
                    : currentTier === 'pro_monthly'
                    ? 'Suscripción Pro Mensual'
                    : currentTier === 'pro_annual'
                    ? 'Suscripción Pro Anual'
                    : 'Plan Gratuito'}
                </h2>
                {currentTier === 'vip' || session?.isFounder ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black uppercase tracking-wider">
                    Acceso Total Gratuito
                  </span>
                ) : currentTier === 'pro_monthly' || currentTier === 'pro_annual' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                    Pro Activo
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                    Básico (Con Límites)
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                {currentTier === 'vip' || session?.isFounder
                  ? 'Cuentas con acceso 100% ilimitado a todas las herramientas avanzadas sin costo ni vencimiento.'
                  : currentTier === 'pro_monthly' || currentTier === 'pro_annual'
                  ? 'Escáner IA ilimitado, historial completo, generador de menús con IA y exportación PDF.'
                  : 'Límite de 3 escaneos con IA al día y 7 días de historial en el diario.'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            {onOpenPlansModal && (
              <button
                type="button"
                id="btn-profile-view-plans"
                onClick={onOpenPlansModal}
                className={`px-4 py-2.5 rounded-xl text-xs font-black shadow-xs transition-all flex items-center gap-1.5 ${
                  currentTier === 'vip' || session?.isFounder
                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 hover:bg-amber-200 border border-amber-300 dark:border-amber-700'
                    : currentTier === 'pro_monthly' || currentTier === 'pro_annual'
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white hover:scale-[1.02]'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {currentTier === 'vip' || session?.isFounder
                    ? 'Ver Beneficios VIP'
                    : currentTier === 'pro_monthly' || currentTier === 'pro_annual'
                    ? 'Administrar Plan'
                    : 'Actualizar a Pro ($7.99/m)'}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Personal Data & Activity & Objective */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION 1: Datos Personales */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Datos Personales
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Variables biométricas indispensables para las ecuaciones metabólicas
                  </p>
                </div>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${bmiInfo.color}`}>
                IMC {bmi} · {bmiInfo.label}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nombre */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5" htmlFor="input-profile-name">
                  Nombre completo o alias
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. David"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Sexo Biológico */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Sexo biológico (define la constante calórica hormonal)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    id="btn-gender-male"
                    onClick={() => setFormData({ ...formData, gender: 'male' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                      formData.gender === 'male'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    <span>Masculino (Hombre)</span>
                  </button>
                  <button
                    type="button"
                    id="btn-gender-female"
                    onClick={() => setFormData({ ...formData, gender: 'female' })}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${
                      formData.gender === 'female'
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 ring-1 ring-emerald-600'
                        : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    <span>Femenino (Mujer)</span>
                  </button>
                </div>
              </div>

              {/* Edad */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5" htmlFor="input-profile-age">
                  Edad (años)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-age"
                    type="text"
                    inputMode="numeric"
                    value={ageInput}
                    onChange={handleAgeChange}
                    onBlur={handleAgeBlur}
                    placeholder="Ej. 28"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Altura */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5" htmlFor="input-profile-height">
                  Altura (cm)
                </label>
                <div className="relative">
                  <Ruler className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-height"
                    type="text"
                    inputMode="decimal"
                    value={heightInput}
                    onChange={handleHeightChange}
                    onBlur={handleHeightBlur}
                    placeholder="Ej. 175"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Peso actual */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5" htmlFor="input-profile-weight">
                  Peso actual (kg)
                </label>
                <div className="relative">
                  <Scale className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="input-profile-weight"
                    type="text"
                    inputMode="decimal"
                    value={weightInput}
                    onChange={handleWeightChange}
                    onBlur={handleWeightBlur}
                    placeholder="Ej. 75.5"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-zinc-100"
                  />
                </div>
              </div>

              {/* Peso ideal estimado context */}
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 flex flex-col justify-center">
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Rango de peso saludable (IMC 18.5 - 24.9):</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 mt-0.5">
                  {(18.5 * heightM * heightM).toFixed(1)} kg - {(24.9 * heightM * heightM).toFixed(1)} kg
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 2: Nivel de Actividad Física */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Nivel de Actividad Física Diaria
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Multiplicador PAL (Physical Activity Level) para calcular el TDEE
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-md">
                Factor: x{ACTIVITY_OPTIONS.find((a) => a.id === formData.activityLevel)?.factor}
              </span>
            </div>

            <div className="space-y-2.5">
              {ACTIVITY_OPTIONS.map((opt) => {
                const isSelected = formData.activityLevel === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    id={`activity-opt-${opt.id}`}
                    onClick={() => setFormData({ ...formData, activityLevel: opt.id })}
                    className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isSelected
                        ? 'border-teal-600 bg-teal-50/70 dark:bg-teal-950/30 ring-1 ring-teal-600 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/40 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                        isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-zinc-300 dark:border-zinc-600'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                            {opt.name}
                          </span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                            x{opt.factor}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                          {opt.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: Objetivo Principal */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
                  3
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Definición de Objetivo Principal
                  </h2>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Ajuste energético que guiará tus metas diarias y el balance del diario
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {GOAL_OPTIONS.map((g) => {
                const isSelected = formData.goal === g.id;
                const Icon = g.id === 'deficit' ? TrendingDown : g.id === 'surplus' ? TrendingUp : Equal;

                return (
                  <button
                    key={g.id}
                    type="button"
                    id={`goal-btn-${g.id}`}
                    onClick={() => updateGoalAndRecalculate(g.id)}
                    className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/40 ring-1 ring-emerald-600 shadow-xs'
                        : 'border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          isSelected ? 'bg-emerald-600 text-white' : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                          {g.badge}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {g.name}
                      </h3>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2">
                        {g.subtitle}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Intensity sub-selector for Deficit or Surplus */}
            {formData.goal !== 'maintenance' && (
              <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    Ritmo de ajuste ({formData.goal === 'deficit' ? 'Déficit' : 'Superávit'}):
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    {liveCalcs.calorieAdjustment > 0 ? `+${liveCalcs.calorieAdjustment}` : liveCalcs.calorieAdjustment} kcal/día
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['mild', 'moderate', 'aggressive'] as GoalIntensity[]).map((level) => {
                    const isLevel = formData.goalIntensity === level;
                    const labels = {
                      mild: 'Conservador',
                      moderate: 'Estándar',
                      aggressive: 'Intensivo',
                    };
                    return (
                      <button
                        key={level}
                        type="button"
                        id={`goal-intensity-${level}`}
                        onClick={() => updateGoalAndRecalculate(formData.goal, level)}
                        className={`py-1.5 px-2 text-xs rounded-lg font-semibold border transition-all ${
                          isLevel
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        {labels[level]}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formData.goal === 'deficit'
                    ? formData.goalIntensity === 'mild'
                      ? 'Pérdida suave (-12% kcal). Muy sostenible y preserva fuerza.'
                      : formData.goalIntensity === 'moderate'
                      ? 'Ritmo recomendado (-20% kcal). Ideal para perder grasa sostenida (~0.4-0.5 kg/sem).'
                      : 'Déficit alto (-25% kcal). Rápido, recomendado solo para fases cortas o alto % graso.'
                    : formData.goalIntensity === 'mild'
                    ? 'Superávit limpio (+8% kcal). Mínima ganancia de grasa.'
                    : formData.goalIntensity === 'moderate'
                    ? 'Volumen recomendado (+15% kcal). Óptimo para hipertrofia sin acumulación excesiva.'
                    : 'Volumen acelerado (+20% kcal). Para personas con dificultad para subir de peso.'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Metabolic Calculations & Macros Customization */}
        <div className="lg:col-span-5 space-y-6">
          {/* SECTION 4: Requerimientos Energéticos (BMR & TDEE) */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Cálculo de Requerimientos
                </h2>
              </div>

              {/* Formula selector pill */}
              <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs">
                <button
                  type="button"
                  id="formula-mifflin-btn"
                  onClick={() => setFormData({ ...formData, formula: 'mifflin' })}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    formData.formula === 'mifflin'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Mifflin-St Jeor
                </button>
                <button
                  type="button"
                  id="formula-harris-btn"
                  onClick={() => setFormData({ ...formData, formula: 'harris' })}
                  className={`px-2.5 py-1 rounded font-semibold transition-all ${
                    formData.formula === 'harris'
                      ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                      : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Harris-Benedict
                </button>
              </div>
            </div>

            {/* BMR & TDEE Display Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {/* BMR */}
              <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-800/80 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80">
                <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                  BMR (Basal)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                    {liveCalcs.bmr.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-zinc-500">kcal</span>
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1 leading-tight">
                  Gasto en reposo absoluto 24h
                </p>
              </div>

              {/* TDEE */}
              <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/60 dark:from-amber-950/20 dark:to-orange-950/20 p-4 rounded-xl border border-amber-200/80 dark:border-amber-800/50">
                <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
                  TDEE (Gasto Total)
                </span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-2xl font-black text-amber-950 dark:text-amber-100">
                    {liveCalcs.tdee.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">kcal</span>
                </div>
                <p className="text-[10px] text-amber-800/80 dark:text-amber-400 mt-1 leading-tight">
                  BMR × factor actividad
                </p>
              </div>
            </div>

            {/* Target Calories Highlight Card */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-4 rounded-xl shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-100 uppercase tracking-wider block">
                    Meta Calórica Diaria Asignada
                  </span>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black tracking-tight">
                      {liveCalcs.targetCalories.toLocaleString()}
                    </span>
                    <span className="text-sm font-semibold text-emerald-100">kcal / día</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg inline-block">
                    {formData.goal === 'deficit' ? 'Déficit' : formData.goal === 'surplus' ? 'Superávit' : 'Mantenimiento'}
                  </span>
                  <p className="text-[11px] text-emerald-100 mt-1">
                    {formData.goal === 'maintenance'
                      ? 'Calorías neutras'
                      : `${liveCalcs.calorieAdjustment > 0 ? '+' : ''}${liveCalcs.calorieAdjustment} kcal vs TDEE`}
                  </p>
                </div>
              </div>
            </div>

            {/* Formula Details Toggle */}
            <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setShowFormulaDetails(!showFormulaDetails)}
                className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1.5 transition-colors"
              >
                <Info className="w-3.5 h-3.5" />
                <span>{showFormulaDetails ? 'Ocultar desglose científico' : 'Ver desglose de la fórmula matemática'}</span>
              </button>

              {showFormulaDetails && (
                <div className="mt-3 p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl text-xs text-zinc-600 dark:text-zinc-300 space-y-2 border border-zinc-200/60 dark:border-zinc-700">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    Fórmula activa: {formData.formula === 'mifflin' ? 'Mifflin-St Jeor (1990)' : 'Harris-Benedict Revisada (1984)'}
                  </div>
                  {formData.formula === 'mifflin' ? (
                    <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                      BMR = (10 × {formData.weightKg}kg) + (6.25 × {formData.heightCm}cm) - (5 × {formData.age}a) {formData.gender === 'male' ? '+ 5' : '- 161'} = <strong className="text-emerald-600">{mifflinBmr} kcal</strong>
                    </p>
                  ) : (
                    <p className="font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                      BMR = {formData.gender === 'male' ? '88.362 + (13.397×P) + (4.799×A) - (5.677×E)' : '447.593 + (9.247×P) + (3.098×A) - (4.330×E)'} = <strong className="text-emerald-600">{harrisBmr} kcal</strong>
                    </p>
                  )}
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    TDEE = {liveCalcs.bmr} (BMR) × {ACTIVITY_OPTIONS.find((a) => a.id === formData.activityLevel)?.factor} (Actividad) = <strong>{liveCalcs.tdee} kcal</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5: Distribución de Macronutrientes */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3 mb-4">
              <div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Metas de Macronutrientes
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Distribución sugerida vs personalización manual
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="toggle-custom-macros"
                  onClick={() => setFormData((prev) => ({ ...prev, customTargetsEnabled: !prev.customTargetsEnabled }))}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1 border transition-all ${
                    formData.customTargetsEnabled
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  {formData.customTargetsEnabled ? 'Manual activo' : 'Modo Sugerido'}
                </button>
              </div>
            </div>

            {/* Visual Macro Bar */}
            <div className="mb-4">
              <div className="h-4 w-full rounded-full overflow-hidden flex bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shadow-inner">
                <div
                  style={{ width: `${liveCalcs.proteinPercent}%` }}
                  className="bg-indigo-500 transition-all duration-300"
                  title={`Proteína: ${liveCalcs.proteinGrams}g (${liveCalcs.proteinPercent}%)`}
                />
                <div
                  style={{ width: `${liveCalcs.carbsPercent}%` }}
                  className="bg-amber-500 transition-all duration-300"
                  title={`Carbohidratos: ${liveCalcs.carbsGrams}g (${liveCalcs.carbsPercent}%)`}
                />
                <div
                  style={{ width: `${liveCalcs.fatPercent}%` }}
                  className="bg-rose-500 transition-all duration-300"
                  title={`Grasas: ${liveCalcs.fatGrams}g (${liveCalcs.fatPercent}%)`}
                />
              </div>

              {/* Legend */}
              <div className="flex items-center justify-between text-xs mt-2 text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Proteína: <strong>{liveCalcs.proteinGrams}g</strong> ({liveCalcs.proteinPercent}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Carbos: <strong>{liveCalcs.carbsGrams}g</strong> ({liveCalcs.carbsPercent}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Grasas: <strong>{liveCalcs.fatGrams}g</strong> ({liveCalcs.fatPercent}%)</span>
                </div>
              </div>
            </div>

            {/* Macro Inputs / Sliders */}
            <div className="space-y-4 pt-2">
              {/* Proteína */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-indigo-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Proteínas (4 kcal/g)</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <span className="text-indigo-600 dark:text-indigo-400 font-bold">{liveCalcs.proteinGrams}g</span>
                    <span className="text-[11px] text-zinc-400 ml-1">
                      ({(liveCalcs.proteinGrams / formData.weightKg).toFixed(1)} g/kg)
                    </span>
                  </div>
                </div>
                {formData.customTargetsEnabled ? (
                  <input
                    type="range"
                    min={50}
                    max={300}
                    step={2}
                    value={formData.targetProteinGrams}
                    onChange={(e) => setFormData({ ...formData, targetProteinGrams: Number(e.target.value) })}
                    className="w-full accent-indigo-600"
                  />
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Sugerido: ~2.0 - 2.2 g/kg para proteger masa muscular durante tu objetivo.
                  </p>
                )}
              </div>

              {/* Carbohidratos */}
              <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-100 dark:border-amber-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Carbohidratos (4 kcal/g)</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <span className="text-amber-600 dark:text-amber-400 font-bold">{liveCalcs.carbsGrams}g</span>
                    <span className="text-[11px] text-zinc-400 ml-1">
                      ({liveCalcs.carbsCalories} kcal)
                    </span>
                  </div>
                </div>
                {formData.customTargetsEnabled ? (
                  <input
                    type="range"
                    min={30}
                    max={450}
                    step={5}
                    value={formData.targetCarbsGrams}
                    onChange={(e) => setFormData({ ...formData, targetCarbsGrams: Number(e.target.value) })}
                    className="w-full accent-amber-500"
                  />
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Sugerido: Combustible glucolítico ajustado para tus entrenamientos y gasto diario.
                  </p>
                )}
              </div>

              {/* Grasas */}
              <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-xl border border-rose-100 dark:border-rose-900/40">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">Grasas Saludables (9 kcal/g)</span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">{liveCalcs.fatGrams}g</span>
                    <span className="text-[11px] text-zinc-400 ml-1">
                      ({(liveCalcs.fatGrams / formData.weightKg).toFixed(1)} g/kg)
                    </span>
                  </div>
                </div>
                {formData.customTargetsEnabled ? (
                  <input
                    type="range"
                    min={20}
                    max={150}
                    step={2}
                    value={formData.targetFatGrams}
                    onChange={(e) => setFormData({ ...formData, targetFatGrams: Number(e.target.value) })}
                    className="w-full accent-rose-500"
                  />
                ) : (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Sugerido: Esencial para soporte hormonal y absorción de vitaminas liposolubles.
                  </p>
                )}
              </div>

              {/* Calorie Customization if Manual */}
              {formData.customTargetsEnabled && (
                <div className="bg-zinc-50 dark:bg-zinc-800 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-zinc-900 dark:text-zinc-100" htmlFor="custom-calories-input">
                      Meta calórica manual directa (kcal):
                    </label>
                    <input
                      id="custom-calories-input"
                      type="number"
                      min={1000}
                      max={6000}
                      value={formData.targetCalories}
                      onChange={(e) => setFormData({ ...formData, targetCalories: Number(e.target.value) })}
                      className="w-24 text-right py-1 px-2 text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg"
                    />
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between mt-1">
                    <span>Suma de macros ingresados:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {liveCalcs.proteinCalories + liveCalcs.carbsCalories + liveCalcs.fatCalories} kcal
                    </span>
                  </div>
                </div>
              )}

              {formData.customTargetsEnabled && (
                <button
                  type="button"
                  onClick={handleResetToSuggestedMacros}
                  className="w-full py-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Restablecer a valores científicos sugeridos
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                id="save-profile-btn"
                onClick={handleSave}
                className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-bold rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                Guardar Perfil & Aplicar Metas
              </button>

              <button
                type="button"
                onClick={onNavigateToDiary}
                className="py-3 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5"
              >
                Ver Diario
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Módulo Exclusivo de Gestión de Invitados VIP & Métricas (SOLO FUNDADOR: daviddesalvo.5c@gmail.com) */}
      {isFounderEmail(session?.email) && session?.email && (
        <FounderManagementPanel currentUserEmail={session.email} />
      )}
    </div>
  );
};
