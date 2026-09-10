import { ActivityLevel, CalculationResult, FormulaType, Gender, GoalIntensity, GoalType, UserProfile } from '../types';

export interface ActivityOption {
  id: ActivityLevel;
  name: string;
  description: string;
  factor: number;
  iconName: string;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'sedentary',
    name: 'Sedentario',
    description: 'Poco o ningún ejercicio, trabajo de oficina / sentado',
    factor: 1.2,
    iconName: 'Armchair',
  },
  {
    id: 'light',
    name: 'Ligero',
    description: 'Ejercicio ligero o deporte 1-3 días por semana',
    factor: 1.375,
    iconName: 'Footprints',
  },
  {
    id: 'moderate',
    name: 'Moderado',
    description: 'Ejercicio moderado o deporte 3-5 días por semana',
    factor: 1.55,
    iconName: 'Flame',
  },
  {
    id: 'intense',
    name: 'Intenso / Activo',
    description: 'Ejercicio fuerte o deporte 6-7 días por semana',
    factor: 1.725,
    iconName: 'Zap',
  },
  {
    id: 'very_intense',
    name: 'Muy intenso',
    description: 'Entrenamiento muy duro, doble sesión o trabajo físico pesado',
    factor: 1.9,
    iconName: 'Trophy',
  },
];

export interface GoalOption {
  id: GoalType;
  name: string;
  subtitle: string;
  description: string;
  color: string;
  badge: string;
}

export const GOAL_OPTIONS: GoalOption[] = [
  {
    id: 'deficit',
    name: 'Déficit Calórico',
    subtitle: 'Perder grasa corporal',
    description: 'Consumes menos calorías de las que gastas, priorizando alta ingesta proteica para conservar masa magra.',
    color: 'emerald',
    badge: '-15% a -25% kcal',
  },
  {
    id: 'maintenance',
    name: 'Mantenimiento',
    subtitle: 'Mantener peso y recomposición',
    description: 'Equilibrio energético neutro para sostener el rendimiento, salud hormonal y optimizar la recuperación.',
    color: 'blue',
    badge: '0 kcal ajuste',
  },
  {
    id: 'surplus',
    name: 'Superávit Calórico',
    subtitle: 'Ganar masa muscular',
    description: 'Ligero exceso calórico controlado con suficientes carbohidratos para potenciar la síntesis proteica e hipertrofia.',
    color: 'amber',
    badge: '+10% a +15% kcal',
  },
];

/**
 * Calculates BMR using Mifflin-St Jeor formula
 * Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
 * Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age) - 161
 */
export function calculateMifflinStJeor(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

/**
 * Calculates BMR using Harris-Benedict (Roza and Shizgal revised, 1984)
 * Men: 88.362 + (13.397 × weight in kg) + (4.799 × height in cm) - (5.677 × age)
 * Women: 447.593 + (9.247 × weight in kg) + (3.098 × height in cm) - (4.330 × age)
 */
export function calculateHarrisBenedict(weightKg: number, heightCm: number, age: number, gender: Gender): number {
  if (gender === 'male') {
    return 88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age;
  } else {
    return 447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.33 * age;
  }
}

/**
 * Main BMR calculation router
 */
export function calculateBMR(weightKg: number, heightCm: number, age: number, gender: Gender, formula: FormulaType): number {
  if (weightKg <= 0 || heightCm <= 0 || age <= 0) return 1500;
  
  const bmr = formula === 'mifflin'
    ? calculateMifflinStJeor(weightKg, heightCm, age, gender)
    : calculateHarrisBenedict(weightKg, heightCm, age, gender);
    
  return Math.round(Math.max(800, bmr));
}

/**
 * Calculate TDEE (Total Daily Energy Expenditure) = BMR * Activity Factor
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const activity = ACTIVITY_OPTIONS.find((a) => a.id === activityLevel) || ACTIVITY_OPTIONS[0];
  return Math.round(bmr * activity.factor);
}

/**
 * Computes calorie adjustment based on Goal and Intensity
 */
export function getCalorieAdjustment(tdee: number, goal: GoalType, intensity: GoalIntensity): number {
  if (goal === 'maintenance') return 0;
  
  if (goal === 'deficit') {
    switch (intensity) {
      case 'mild':
        return -Math.round(tdee * 0.12); // -12% (~250-300 kcal)
      case 'moderate':
        return -Math.round(tdee * 0.20); // -20% (~400-500 kcal)
      case 'aggressive':
        return -Math.round(tdee * 0.25); // -25% (~500-650 kcal)
      default:
        return -400;
    }
  }

  // surplus
  switch (intensity) {
    case 'mild':
      return Math.round(tdee * 0.08); // +8% (~150-200 kcal)
    case 'moderate':
      return Math.round(tdee * 0.15); // +15% (~300-350 kcal)
    case 'aggressive':
      return Math.round(tdee * 0.20); // +20% (~400-500 kcal)
    default:
      return 300;
  }
}

/**
 * Computes suggested macronutrients distribution
 * Protein: 4 kcal/g
 * Carbs: 4 kcal/g
 * Fats: 9 kcal/g
 */
export function calculateSuggestedMacros(
  targetCalories: number,
  weightKg: number,
  goal: GoalType
): { proteinGrams: number; carbsGrams: number; fatGrams: number } {
  const safeCalories = Math.max(1000, targetCalories);
  const safeWeight = Math.max(35, weightKg);

  let proteinPerKg: number;
  let fatPerKg: number;

  if (goal === 'deficit') {
    // Higher protein to spare lean muscle mass during caloric deficit
    proteinPerKg = 2.2;
    fatPerKg = 0.85;
  } else if (goal === 'surplus') {
    // High protein, moderate fat, plenty of carbs to fuel workouts
    proteinPerKg = 2.0;
    fatPerKg = 0.95;
  } else {
    // Maintenance
    proteinPerKg = 1.9;
    fatPerKg = 0.9;
  }

  let proteinGrams = Math.round(safeWeight * proteinPerKg);
  let fatGrams = Math.round(safeWeight * fatPerKg);

  let proteinCals = proteinGrams * 4;
  let fatCals = fatGrams * 9;

  // Ensure protein and fat don't exceed 80% of calories
  if (proteinCals + fatCals > safeCalories * 0.8) {
    proteinGrams = Math.round((safeCalories * 0.3) / 4);
    fatGrams = Math.round((safeCalories * 0.25) / 9);
    proteinCals = proteinGrams * 4;
    fatCals = fatGrams * 9;
  }

  const remainingCals = Math.max(0, safeCalories - (proteinCals + fatCals));
  const carbsGrams = Math.max(20, Math.round(remainingCals / 4));

  return {
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}

/**
 * Complete calculation breakdown for a user profile
 */
export function getProfileCalculations(profile: UserProfile): CalculationResult {
  const bmr = calculateBMR(profile.weightKg, profile.heightCm, profile.age, profile.gender, profile.formula);
  const tdee = calculateTDEE(bmr, profile.activityLevel);
  const calorieAdjustment = getCalorieAdjustment(tdee, profile.goal, profile.goalIntensity);
  
  const suggestedTargetCalories = Math.max(1100, tdee + calorieAdjustment);
  const suggestedMacros = calculateSuggestedMacros(suggestedTargetCalories, profile.weightKg, profile.goal);

  // If user enabled custom targets, use their manual overrides
  const targetCalories = profile.customTargetsEnabled ? profile.targetCalories : suggestedTargetCalories;
  const proteinGrams = profile.customTargetsEnabled ? profile.targetProteinGrams : suggestedMacros.proteinGrams;
  const carbsGrams = profile.customTargetsEnabled ? profile.targetCarbsGrams : suggestedMacros.carbsGrams;
  const fatGrams = profile.customTargetsEnabled ? profile.targetFatGrams : suggestedMacros.fatGrams;

  const proteinCalories = proteinGrams * 4;
  const carbsCalories = carbsGrams * 4;
  const fatCalories = fatGrams * 9;
  const totalMacroCalories = Math.max(1, proteinCalories + carbsCalories + fatCalories);

  const proteinPercent = Math.round((proteinCalories / totalMacroCalories) * 100);
  const carbsPercent = Math.round((carbsCalories / totalMacroCalories) * 100);
  const fatPercent = Math.max(0, 100 - proteinPercent - carbsPercent);

  return {
    bmr,
    tdee,
    targetCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    proteinCalories,
    carbsCalories,
    fatCalories,
    proteinPercent,
    carbsPercent,
    fatPercent,
    calorieAdjustment,
  };
}

/**
 * Redondea y formatea gramos a un máximo de 2 o 3 decimales,
 * eliminando ceros innecesarios (ej: 12.30 -> "12.3", 10.00 -> "10", 0.33333333 -> "0.33")
 * para evitar desfasar el CSS o romper el layout con números como 15.000000000002.
 */
export function formatGrams(value: number | undefined | null, maxDecimals: number = 2): string {
  if (value === undefined || value === null || isNaN(value)) return '0';
  const num = Number(value);
  if (Number.isInteger(num)) return num.toString();
  return Number(num.toFixed(maxDecimals)).toString();
}

export function roundGrams(value: number | undefined | null, maxDecimals: number = 2): number {
  if (value === undefined || value === null || isNaN(value)) return 0;
  return Number(Number(value).toFixed(maxDecimals));
}

export interface CalorieCyclingDayInfo {
  targetCalories: number;
  isSocialDay: boolean;
  adjustmentKcal: number;
  label: string;
  dayOfWeek: string;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

/**
 * Calculates adaptive target calories for a specific date considering Calorie Cycling / Flexible Social Days.
 * Non-social days shave a slight deficit (e.g., -150 kcal), banking them for designated social days (e.g., Saturday +750 kcal)
 * so the total weekly deficit/average remains 100% unchanged.
 */
export function getTargetCaloriesForDate(profile: UserProfile, dateString: string): CalorieCyclingDayInfo {
  const calcs = getProfileCalculations(profile);
  const baseTarget = calcs.targetCalories;

  if (!profile.calorieCyclingEnabled) {
    return {
      targetCalories: baseTarget,
      isSocialDay: false,
      adjustmentKcal: 0,
      label: 'Meta Estándar',
      dayOfWeek: 'standard',
      proteinGrams: calcs.proteinGrams,
      carbsGrams: calcs.carbsGrams,
      fatGrams: calcs.fatGrams,
    };
  }

  const socialDays = profile.socialDays && profile.socialDays.length > 0 
    ? profile.socialDays 
    : ['saturday'];
  const weekdayReduction = profile.weekdayReductionKcal && profile.weekdayReductionKcal > 0
    ? profile.weekdayReductionKcal
    : 150;

  const dateObj = new Date(`${dateString}T12:00:00`);
  const dayIndex = dateObj.getDay(); // 0: Sunday, 1: Monday, ... 5: Friday, 6: Saturday
  
  const dayNameMap: Record<number, 'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday'> = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };
  const currentDayName = dayNameMap[dayIndex];

  const socialDaysCount = socialDays.length;
  const nonSocialDaysCount = 7 - socialDaysCount;
  const totalBanked = weekdayReduction * nonSocialDaysCount;
  const bufferPerSocialDay = Math.round(totalBanked / socialDaysCount);

  const isSocial = socialDays.includes(currentDayName as any);

  let targetCalories = baseTarget;
  let adjustmentKcal = 0;
  let label = 'Día Regular (Ahorro Colchón)';

  if (isSocial) {
    targetCalories = baseTarget + bufferPerSocialDay;
    adjustmentKcal = bufferPerSocialDay;
    label = `Día Social Flexible (+${bufferPerSocialDay} kcal colchón)`;
  } else {
    targetCalories = Math.max(1100, baseTarget - weekdayReduction);
    adjustmentKcal = -weekdayReduction;
    label = `Día Laboral (-${weekdayReduction} kcal reservadas)`;
  }

  // Calculate proportional macros for this day's calorie budget
  const suggestedMacros = calculateSuggestedMacros(targetCalories, profile.weightKg, profile.goal);

  return {
    targetCalories,
    isSocialDay: isSocial,
    adjustmentKcal,
    label,
    dayOfWeek: currentDayName,
    proteinGrams: suggestedMacros.proteinGrams,
    carbsGrams: suggestedMacros.carbsGrams,
    fatGrams: suggestedMacros.fatGrams,
  };
}


