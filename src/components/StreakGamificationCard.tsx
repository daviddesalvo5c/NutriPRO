import React from 'react';
import { Flame, Trophy, Award, Calendar, CheckCircle, ChevronRight, Zap } from 'lucide-react';
import { DailyLog, UserProfile } from '../types';
import { calculateStreakStats } from '../utils/streakCalculations';

interface StreakGamificationCardProps {
  dailyLogs: Record<string, DailyLog>;
  profile: UserProfile;
  onOpenReport?: () => void;
}

export const StreakGamificationCard: React.FC<StreakGamificationCardProps> = ({
  dailyLogs,
  profile,
  onOpenReport,
}) => {
  const stats = calculateStreakStats(dailyLogs, profile);

  return (
    <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 text-zinc-100 shadow-xl relative overflow-hidden">
      {/* Background glow decoration */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black tracking-tight text-white">
                {stats.currentStreak === 1
                  ? '1 Día Consecutivo'
                  : `${stats.currentStreak} Días Consecutivos`}
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {stats.streakLevel}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {stats.badgeTitle} · {stats.complianceRatePercent}% de consistencia nutricional
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <div className="px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-right">
            <span className="text-[10px] uppercase font-bold text-zinc-400 block">Récord</span>
            <span className="text-xs font-black text-amber-400 flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {stats.bestStreak} días
            </span>
          </div>

          {onOpenReport && (
            <button
              type="button"
              onClick={onOpenReport}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
            >
              <span>Informe</span>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          )}
        </div>
      </div>

      {/* 7 Days Visual Progress Timeline */}
      <div className="pt-4 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-zinc-400">
          <span className="font-bold uppercase tracking-wider text-zinc-300">
            Progreso de los últimos 7 días:
          </span>
          <span>{stats.totalDaysLogged} días registrados en total</span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {stats.last7Days.map((d, idx) => {
            return (
              <div
                key={idx}
                className={`p-2 rounded-2xl border text-center transition-all flex flex-col items-center justify-between min-h-[72px] ${
                  d.isToday
                    ? 'ring-2 ring-emerald-500/60 border-emerald-500/40 bg-zinc-800/80'
                    : 'border-zinc-800 bg-zinc-950/60'
                }`}
              >
                <span className="text-[10px] font-bold text-zinc-400 block">
                  {d.dayLabel}
                </span>

                <div className="my-1">
                  {d.hasLogged ? (
                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs ${
                      d.isCompliant
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    }`}>
                      <Flame className="w-4 h-4 fill-current" />
                    </div>
                  ) : (
                    <div className="w-7 h-7 rounded-xl bg-zinc-800/60 text-zinc-600 flex items-center justify-center text-xs">
                      ·
                    </div>
                  )}
                </div>

                <span className="text-[10px] font-semibold text-zinc-400">
                  {d.hasLogged ? `${Math.round(d.caloriesConsumed)}k` : `${d.dayNumber}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
