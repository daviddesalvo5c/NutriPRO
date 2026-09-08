import { WorkoutCategory } from '../types';

export interface ActivityOption {
  id: WorkoutCategory;
  name: string;
  met: number;
  iconName: string;
  intensityDescription: string;
}

export const ACTIVITY_OPTIONS: ActivityOption[] = [
  {
    id: 'running',
    name: 'Correr',
    met: 9.8,
    iconName: 'Flame',
    intensityDescription: 'Intensidad alta · Ritmo promedio 5:30 min/km',
  },
  {
    id: 'outdoor_walk',
    name: 'Caminata al aire libre',
    met: 3.8,
    iconName: 'Footprints',
    intensityDescription: 'Intensidad moderada · Paso constante 5 km/h',
  },
  {
    id: 'gym',
    name: 'Fitness / Gym (Pesas y Musculación)',
    met: 5.5,
    iconName: 'Dumbbell',
    intensityDescription: 'Entrenamiento de fuerza y resistencia',
  },
  {
    id: 'cycling',
    name: 'Ciclismo',
    met: 7.5,
    iconName: 'Bike',
    intensityDescription: 'Ritmo moderado a intenso (19-22 km/h)',
  },
  {
    id: 'swimming',
    name: 'Natación',
    met: 7.0,
    iconName: 'Waves',
    intensityDescription: 'Estilo crol o libre continuo',
  },
  {
    id: 'hiit',
    name: 'HIIT / Entrenamiento Funcional',
    met: 8.5,
    iconName: 'Zap',
    intensityDescription: 'Intervalos de alta intensidad y circuitos',
  },
  {
    id: 'yoga',
    name: 'Yoga',
    met: 3.0,
    iconName: 'HeartPulse',
    intensityDescription: 'Hatha o Vinyasa flow moderado',
  },
  {
    id: 'pilates',
    name: 'Pilates',
    met: 3.5,
    iconName: 'Sparkles',
    intensityDescription: 'Control corporal, core y estiramiento',
  },
  {
    id: 'boxing',
    name: 'Boxeo / Artes Marciales',
    met: 8.0,
    iconName: 'Shield',
    intensityDescription: 'Golpes al saco, combate y sparring',
  },
  {
    id: 'dancing',
    name: 'Baile / Danza / Zumba',
    met: 4.8,
    iconName: 'Music',
    intensityDescription: 'Movimiento aeróbico continuo y coreografía',
  },
  {
    id: 'other',
    name: 'Otra actividad deportiva',
    met: 5.0,
    iconName: 'Activity',
    intensityDescription: 'Gasto calórico estándar moderado',
  },
];

/**
 * Calculates estimated burned calories based on scientific MET formula:
 * Calories = MET * weight_in_kg * (duration_minutes / 60)
 */
export function calculateCaloriesBurned(
  activityType: WorkoutCategory,
  durationMinutes: number,
  weightKg: number = 70
): number {
  if (durationMinutes <= 0) return 0;
  const option = ACTIVITY_OPTIONS.find((a) => a.id === activityType) || ACTIVITY_OPTIONS[ACTIVITY_OPTIONS.length - 1];
  const safeWeight = weightKg > 30 && weightKg < 250 ? weightKg : 70;
  const burned = option.met * safeWeight * (durationMinutes / 60);
  return Math.max(1, Math.round(burned));
}

/**
 * Converts steps count to estimated active calories burned
 * Standard approximation: ~0.04 kcal per step
 */
export function stepsToCalories(steps: number, weightKg: number = 70): number {
  if (steps <= 0) return 0;
  const factor = (weightKg / 70) * 0.04;
  return Math.round(steps * factor);
}
