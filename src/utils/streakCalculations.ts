import { DailyLog, UserProfile } from '../types';
import { getProfileCalculations } from './nutritionCalculations';

export interface DayStreakStatus {
  date: string; // YYYY-MM-DD
  dayLabel: string; // "Lun", "Mar", etc.
  dayNumber: number;
  hasLogged: boolean;
  isClosed: boolean;
  caloriesConsumed: number;
  isCompliant: boolean; // within reasonable range of target (e.g. ±15%)
  isToday: boolean;
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  totalDaysLogged: number;
  complianceRatePercent: number;
  last7Days: DayStreakStatus[];
  streakLevel: string;
  badgeTitle: string;
}

/**
 * Calculates current consecutive days streak and consistency metrics from dailyLogs
 */
export function calculateStreakStats(
  dailyLogs: Record<string, DailyLog>,
  profile: UserProfile
): StreakStats {
  const calcs = getProfileCalculations(profile);
  const targetCals = calcs.targetCalories;

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Helper to format date as YYYY-MM-DD
  const formatDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // 1. Build last 7 days visual history
  const last7Days: DayStreakStatus[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = formatDate(d);
    const log = dailyLogs[dateStr];
    
    const items = log?.items || [];
    const hasLogged = items.length > 0;
    const isClosed = !!log?.isClosed;
    const cals = items.reduce((acc, item) => acc + (item.calories || 0), 0);
    
    // Compliant if logged and either closed or calories within 20% of target
    const isCompliant = hasLogged && (isClosed || (cals >= targetCals * 0.75 && cals <= targetCals * 1.25));

    last7Days.push({
      date: dateStr,
      dayLabel: dayLabels[d.getDay()],
      dayNumber: d.getDate(),
      hasLogged,
      isClosed,
      caloriesConsumed: cals,
      isCompliant,
      isToday: dateStr === todayStr,
    });
  }

  // 2. Calculate consecutive streak backwards
  // Start from today; if today hasn't logged yet, start checking from yesterday so the streak isn't lost mid-day
  const todayLog = dailyLogs[todayStr];
  const todayHasLogged = todayLog && todayLog.items && todayLog.items.length > 0;

  let streak = 0;
  let cursor = new Date(today);

  if (!todayHasLogged) {
    // Check yesterday first
    cursor.setDate(today.getDate() - 1);
  }

  while (true) {
    const dateStr = formatDate(cursor);
    const log = dailyLogs[dateStr];
    if (log && log.items && log.items.length > 0) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }

  // If today is logged, add 1 to streak
  let currentStreak = streak;

  // 3. Historical all-time best streak
  const sortedDates = Object.keys(dailyLogs)
    .filter((d) => dailyLogs[d]?.items && dailyLogs[d].items.length > 0)
    .sort();

  let bestStreak = currentStreak;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const curDate = new Date(`${dateStr}T12:00:00`);
    if (prevDate) {
      const diffMs = curDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    } else {
      tempStreak = 1;
    }
    if (tempStreak > bestStreak) {
      bestStreak = tempStreak;
    }
    prevDate = curDate;
  }

  const totalDaysLogged = sortedDates.length;
  
  // Compliance rate over logged days
  let compliantDays = 0;
  for (const dateStr of sortedDates) {
    const log = dailyLogs[dateStr];
    const cals = (log?.items || []).reduce((a, b) => a + (b.calories || 0), 0);
    if (log?.isClosed || (cals >= targetCals * 0.75 && cals <= targetCals * 1.25)) {
      compliantDays++;
    }
  }
  const complianceRatePercent = totalDaysLogged > 0 
    ? Math.round((compliantDays / totalDaysLogged) * 100) 
    : 100;

  // Streak Level
  let streakLevel = 'Comenzando';
  let badgeTitle = '🌱 Primeros Pasos';

  if (currentStreak >= 30) {
    streakLevel = 'Leyenda Imparable';
    badgeTitle = '💎 Mes de Hierro';
  } else if (currentStreak >= 14) {
    streakLevel = 'Disciplina de Acero';
    badgeTitle = '⚡ Quincena Pro';
  } else if (currentStreak >= 7) {
    streakLevel = 'Semana Perfecta';
    badgeTitle = '🔥 Hábito Consolidado';
  } else if (currentStreak >= 3) {
    streakLevel = 'En Llamas';
    badgeTitle = '✨ 3 Días Seguidos';
  }

  return {
    currentStreak,
    bestStreak: Math.max(bestStreak, currentStreak),
    totalDaysLogged,
    complianceRatePercent,
    last7Days,
    streakLevel,
    badgeTitle,
  };
}
