export interface MilitaryRank {
  id: string;
  level: number;
  name: string;
  shortTitle: string;
  minDays: number;
  maxDays: number | null; // null for highest rank
  medalName: string;
  badgeEmoji: string;
  motto: string;
  description: string;
  chevronsCount: number;
  gradientClass: string;
  badgeBorderColor: string;
  textColor: string;
}

export const MILITARY_RANKS: MilitaryRank[] = [
  {
    id: 'recruit',
    level: 1,
    name: 'Recluta Disciplinario',
    shortTitle: 'Recluta',
    minDays: 0,
    maxDays: 2,
    medalName: 'Insignia de Reclutamiento',
    badgeEmoji: '🪖',
    motto: 'Todo gran viaje comienza con el primer registro.',
    description: 'Fase de instrucción. El compromiso diario comienza con cada alimento pesado y registrado.',
    chevronsCount: 1,
    gradientClass: 'from-zinc-700 via-zinc-800 to-zinc-900',
    badgeBorderColor: 'border-zinc-600',
    textColor: 'text-zinc-300',
  },
  {
    id: 'private_first_class',
    level: 2,
    name: 'Soldado de Primera',
    shortTitle: 'Soldado 1ª',
    minDays: 3,
    maxDays: 6,
    medalName: 'Medalla de Fuego Continuo',
    badgeEmoji: '🎖️',
    motto: 'La disciplina es el puente entre las metas y los logros.',
    description: 'Superaste la inercia inicial. 3 días continuos anotando sin faltar al deber.',
    chevronsCount: 1,
    gradientClass: 'from-emerald-800 via-emerald-900 to-zinc-900',
    badgeBorderColor: 'border-emerald-500',
    textColor: 'text-emerald-400',
  },
  {
    id: 'corporal',
    level: 3,
    name: 'Cabo Táctico',
    shortTitle: 'Cabo',
    minDays: 7,
    maxDays: 13,
    medalName: 'Orden de la Semana Invicta',
    badgeEmoji: '🎗️',
    motto: '7 días de combate y control calórico absoluto.',
    description: 'Una semana completa de disciplina ininterrumpida. Primer hito táctico completado.',
    chevronsCount: 2,
    gradientClass: 'from-cyan-800 via-cyan-950 to-zinc-900',
    badgeBorderColor: 'border-cyan-500',
    textColor: 'text-cyan-400',
  },
  {
    id: 'sergeant',
    level: 4,
    name: 'Sargento de Hierro',
    shortTitle: 'Sargento',
    minDays: 14,
    maxDays: 20,
    medalName: 'Cruz de Hierro de la Constancia',
    badgeEmoji: '🥉',
    motto: 'La debilidad teme a la repetición implacable.',
    description: '14 días de constancia de acero. Tu mente y tu cuerpo han adoptado el ritmo de la precisión.',
    chevronsCount: 3,
    gradientClass: 'from-amber-800 via-amber-950 to-zinc-900',
    badgeBorderColor: 'border-amber-600',
    textColor: 'text-amber-400',
  },
  {
    id: 'lieutenant',
    level: 5,
    name: 'Teniente de Asalto',
    shortTitle: 'Teniente',
    minDays: 21,
    maxDays: 29,
    medalName: 'Laurel de los 21 Días (Hábito Forjado)',
    badgeEmoji: '🥈',
    motto: 'La barrera neurológica ha caído: el registro ya es tu instinto.',
    description: '21 días consecutivos. La ciencia valida que tu disciplina se ha transformado en un hábito indestructible.',
    chevronsCount: 3,
    gradientClass: 'from-blue-700 via-indigo-900 to-zinc-950',
    badgeBorderColor: 'border-blue-400',
    textColor: 'text-blue-300',
  },
  {
    id: 'captain',
    level: 6,
    name: 'Capitán de Élite NutriFit',
    shortTitle: 'Capitán',
    minDays: 30,
    maxDays: 59,
    medalName: 'Gran Estrella Dorada del Mes',
    badgeEmoji: '🥇',
    motto: 'Un mes completo sin ceder un solo centímetro al descontrol.',
    description: '30 días de comando total de tu ingesta y gasto energético. Rango reservado para los atletas más dedicados.',
    chevronsCount: 4,
    gradientClass: 'from-amber-600 via-yellow-700 to-zinc-950',
    badgeBorderColor: 'border-yellow-400',
    textColor: 'text-yellow-400',
  },
  {
    id: 'major',
    level: 7,
    name: 'Mayor Estratega',
    shortTitle: 'Mayor',
    minDays: 60,
    maxDays: 89,
    medalName: 'Hoja de Roble Estratégica',
    badgeEmoji: '💎',
    motto: '60 días de visión de largo plazo y ejecución impecable.',
    description: 'Dos meses ininterrumpidos. Tu composición corporal y tu metabolismo responden a tu maestría.',
    chevronsCount: 4,
    gradientClass: 'from-purple-700 via-purple-950 to-zinc-950',
    badgeBorderColor: 'border-purple-400',
    textColor: 'text-purple-300',
  },
  {
    id: 'colonel',
    level: 8,
    name: 'Coronel Blindado',
    shortTitle: 'Coronel',
    minDays: 90,
    maxDays: 179,
    medalName: 'Águila de Guerra Trimestral',
    badgeEmoji: '🦅',
    motto: 'Un trimestre de acero. Tu voluntad no admite negociación.',
    description: '90 días continuos. Has superado el 99% de las personas que inician una transformación física.',
    chevronsCount: 5,
    gradientClass: 'from-rose-800 via-red-950 to-zinc-950',
    badgeBorderColor: 'border-rose-500',
    textColor: 'text-rose-400',
  },
  {
    id: 'general',
    level: 9,
    name: 'General de Brigada',
    shortTitle: 'General',
    minDays: 180,
    maxDays: 364,
    medalName: 'Doble Estrella de Diamante',
    badgeEmoji: '⭐️⭐️',
    motto: 'Medio año inquebrantable. Eres el ejemplo vivo de la constancia.',
    description: '6 meses registrando cada comida y actividad sin excusas. Estatus de alto mando de la comunidad.',
    chevronsCount: 5,
    gradientClass: 'from-orange-600 via-amber-800 to-zinc-950',
    badgeBorderColor: 'border-orange-400',
    textColor: 'text-orange-300',
  },
  {
    id: 'field_marshal',
    level: 10,
    name: 'Mariscal Supremo de NutriFit',
    shortTitle: 'Mariscal',
    minDays: 365,
    maxDays: null,
    medalName: 'Gran Cruz de Mariscal con Espadas',
    badgeEmoji: '👑',
    motto: 'Un año completo de disciplina ininterrumpida. Leyenda absoluta.',
    description: '365+ días ininterrumpidos de disciplina total. El rango supremo de honor y perseverancia humana.',
    chevronsCount: 5,
    gradientClass: 'from-amber-400 via-yellow-600 to-amber-950',
    badgeBorderColor: 'border-amber-300',
    textColor: 'text-amber-200',
  },
];

export interface MilitaryRankInfo {
  currentRank: MilitaryRank;
  nextRank: MilitaryRank | null;
  streakDays: number;
  progressPercent: number;
  daysToNextRank: number;
}

export function getMilitaryRank(streakDays: number): MilitaryRankInfo {
  const safeDays = Math.max(0, Math.floor(streakDays || 0));

  let currentRank = MILITARY_RANKS[0];
  for (let i = MILITARY_RANKS.length - 1; i >= 0; i--) {
    if (safeDays >= MILITARY_RANKS[i].minDays) {
      currentRank = MILITARY_RANKS[i];
      break;
    }
  }

  const currentIndex = MILITARY_RANKS.findIndex((r) => r.id === currentRank.id);
  const nextRank = currentIndex < MILITARY_RANKS.length - 1 ? MILITARY_RANKS[currentIndex + 1] : null;

  let progressPercent = 100;
  let daysToNextRank = 0;

  if (nextRank) {
    const range = nextRank.minDays - currentRank.minDays;
    const progressInRank = safeDays - currentRank.minDays;
    progressPercent = Math.min(100, Math.max(0, Math.round((progressInRank / range) * 100)));
    daysToNextRank = Math.max(0, nextRank.minDays - safeDays);
  }

  return {
    currentRank,
    nextRank,
    streakDays: safeDays,
    progressPercent,
    daysToNextRank,
  };
}

export function getAllMilitaryRanks(): MilitaryRank[] {
  return MILITARY_RANKS;
}
