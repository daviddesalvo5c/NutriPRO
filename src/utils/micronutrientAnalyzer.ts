import { DailyLog } from '../types';

export interface MicronutrientAlert {
  nutrient: 'fibra' | 'hierro' | 'sodio' | 'agua';
  name: string;
  status: 'optimal' | 'warning' | 'deficit' | 'excess';
  averageIntake: number;
  targetIntake: number;
  unit: string;
  headline: string;
  description: string;
  recommendation: string;
  sourcesToEat: string[];
}

export interface MicronutrientAnalysisResult {
  hasAlerts: boolean;
  alertCount: number;
  daysAnalyzed: number;
  alerts: MicronutrientAlert[];
}

// Approximate nutritional keyword indicators for foods
const FIBER_FOOD_KEYWORDS: Record<string, number> = {
  avena: 8,
  lenteja: 8,
  poroto: 7,
  garbanzo: 7,
  manzana: 4,
  pera: 5,
  chia: 10,
  espinaca: 3,
  brocoli: 3,
  zanahoria: 3,
  banana: 3,
  platano: 3,
  arandano: 3,
  centeno: 6,
  integral: 5,
  ensalada: 3,
  calabaza: 3,
  nuez: 4,
  almendra: 4,
};

const IRON_FOOD_KEYWORDS: Record<string, number> = {
  carne: 3.5,
  bife: 3.5,
  lenteja: 3.3,
  higado: 6.5,
  espinaca: 2.7,
  huevo: 1.5,
  morcilla: 12.0,
  pollo: 1.2,
  atun: 1.4,
  garbanzo: 2.5,
};

const HIGH_SODIUM_KEYWORDS: Record<string, number> = {
  fiambre: 1100,
  salame: 1300,
  jamon: 950,
  salchicha: 900,
  snack: 800,
  papas: 500,
  soja: 1200,
  salsa: 600,
  queso: 550,
  empanada: 450,
  pizza: 650,
};

export function analyzeMicronutrients(dailyLogs: Record<string, DailyLog>): MicronutrientAnalysisResult {
  const today = new Date();
  const recentDays: string[] = [];

  for (let i = 0; i < 3; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    recentDays.push(`${y}-${m}-${day}`);
  }

  let totalFiber = 0;
  let totalIron = 0;
  let totalSodium = 0;
  let totalWater = 0;
  let daysWithData = 0;

  for (const dateStr of recentDays) {
    const log = dailyLogs[dateStr];
    if (log && log.items && log.items.length > 0) {
      daysWithData++;
      let dayFiber = 0;
      let dayIron = 0;
      let daySodium = 400; // natural baseline

      for (const item of log.items) {
        const lower = item.name.toLowerCase();
        const factor = (item.amountGrams || 100) / 100;

        // Check fiber
        for (const [kw, val] of Object.entries(FIBER_FOOD_KEYWORDS)) {
          if (lower.includes(kw)) {
            dayFiber += val * factor;
            break;
          }
        }

        // Check iron
        for (const [kw, val] of Object.entries(IRON_FOOD_KEYWORDS)) {
          if (lower.includes(kw)) {
            dayIron += val * factor;
            break;
          }
        }

        // Check sodium
        for (const [kw, val] of Object.entries(HIGH_SODIUM_KEYWORDS)) {
          if (lower.includes(kw)) {
            daySodium += val * factor;
            break;
          }
        }
      }

      totalFiber += dayFiber;
      totalIron += dayIron;
      totalSodium += daySodium;
      totalWater += log.waterMl || 0;
    }
  }

  const effectiveDays = Math.max(1, daysWithData);
  const avgFiber = Math.round(totalFiber / effectiveDays);
  const avgIron = Number((totalIron / effectiveDays).toFixed(1));
  const avgSodium = Math.round(totalSodium / effectiveDays);
  const avgWater = Math.round(totalWater / effectiveDays);

  const alerts: MicronutrientAlert[] = [];

  // 1. Fiber Alert (Target: 25-30g / day)
  if (daysWithData >= 1 && avgFiber < 15) {
    alerts.push({
      nutrient: 'fibra',
      name: 'Fibra Alimentaria',
      status: avgFiber < 10 ? 'deficit' : 'warning',
      averageIntake: avgFiber,
      targetIntake: 25,
      unit: 'g/día',
      headline: 'Ingesta de fibra baja en los últimos días',
      description: `Tu promedio reciente es de ${avgFiber}g vs los 25g mínimos recomendados por la OMS para una óptima salud intestinal y saciedad.`,
      recommendation: 'Aumenta el consumo de vegetales crudos, avena integral, legumbres o añade una cucharada de semillas de chía a tus meriendas.',
      sourcesToEat: ['Avena entera', 'Semillas de chía', 'Lentejas / Garbanzos', 'Manzana con piel', 'Espinaca y brócoli'],
    });
  }

  // 2. Iron Alert (Target: 14-18mg / day)
  if (daysWithData >= 1 && avgIron < 8) {
    alerts.push({
      nutrient: 'hierro',
      name: 'Hierro (Fe)',
      status: avgIron < 5 ? 'deficit' : 'warning',
      averageIntake: avgIron,
      targetIntake: 14,
      unit: 'mg/día',
      headline: 'Posible deficiencia preventiva de hierro',
      description: `Detectamos un bajo consumo de fuentes ricas en hierro (${avgIron}mg/día promedio). Esto puede impactar en tus niveles de energía y oxigenación muscular.`,
      recommendation: 'Suma cortes magros de carne roja, lentejas o espinaca. Combínalos con vitamina C (limón, tomate o kiwi) para maximizar la absorción.',
      sourcesToEat: ['Cortes magros de vaca (cuadril, lomo)', 'Lentejas con limón', 'Espinacas salteadas', 'Huevos enteros'],
    });
  }

  // 3. Sodium Alert (Normal: 1500-2300mg)
  if (daysWithData >= 1 && avgSodium > 2400) {
    alerts.push({
      nutrient: 'sodio',
      name: 'Sodio',
      status: 'excess',
      averageIntake: avgSodium,
      targetIntake: 2000,
      unit: 'mg/día',
      headline: 'Ingesta elevada de sodio detectada',
      description: `El promedio de los últimos días ronda los ${avgSodium}mg, impulsado por alimentos curados o procesados, favoreciendo la retención de líquidos.`,
      recommendation: 'Modera fiambres y productos en conserva; opta por especias naturales (orégano, cúrcuma, pimentón) para dar sabor.',
      sourcesToEat: ['Condimentos naturales', 'Agua mineral baja en sodio', 'Potasio (banana, palta)'],
    });
  }

  // 4. Water / Hydration Alert
  if (daysWithData >= 1 && avgWater < 1400) {
    alerts.push({
      nutrient: 'agua',
      name: 'Hidratación Diaria',
      status: 'warning',
      averageIntake: avgWater,
      targetIntake: 2200,
      unit: 'ml/día',
      headline: 'Hidratación por debajo del nivel óptimo',
      description: `Tu registro promedio es de ${avgWater}ml diarios. La hidratación deficiente reduce el gasto metabólico y confunde la sed con apetito.`,
      recommendation: 'Intenta beber al menos un vaso de agua al despertar y otro antes de cada comida principal.',
      sourcesToEat: ['Agua fresca', 'Infusiones sin azúcar', 'Cítricos'],
    });
  }

  return {
    hasAlerts: alerts.length > 0,
    alertCount: alerts.length,
    daysAnalyzed: effectiveDays,
    alerts,
  };
}
