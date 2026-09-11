import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Award, Calendar, CheckCircle, ChevronRight, Zap, Shield, Medal, Star } from 'lucide-react';
import { DailyLog, UserProfile } from '../types';
import { calculateStreakStats } from '../utils/streakCalculations';
import { getMilitaryRank } from '../utils/militaryRanks';
import { LeaderboardModal } from './LeaderboardModal';
import { cloudSyncService } from '../services/cloudSyncService';

interface StreakGamificationCardProps {
  dailyLogs: Record<string, DailyLog>;
  profile: UserProfile;
  userEmail?: string;
  onOpenReport?: () => void;
}

export const StreakGamificationCard: React.FC<StreakGamificationCardProps> = ({
  dailyLogs,
  profile,
  userEmail,
  onOpenReport,
}) => {
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const stats = calculateStreakStats(dailyLogs, profile);
  const rankInfo = getMilitaryRank(stats.currentStreak);

  // Synchronize streak and military rank with community leaderboard & cloud
  useEffect(() => {
    if (!userEmail) return;
    cloudSyncService.updateLeaderboard({
      email: userEmail,
      name: profile.name || userEmail.split('@')[0],
      currentStreak: stats.currentStreak,
      bestStreak: stats.bestStreak,
      complianceRate: stats.complianceRatePercent,
    }).catch(() => {});

    cloudSyncService.pushUserData({
      email: userEmail,
      streakStats: stats,
    }).catch(() => {});
  }, [userEmail, stats.currentStreak, stats.bestStreak, stats.complianceRatePercent, profile.name]);

  return (
    <>
      <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-6 text-zinc-100 shadow-xl relative overflow-hidden">
        {/* Background glow decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />

        {/* Top Header: Streak Days + Military Rank Badge + Action Buttons */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Military Rank Icon Badge */}
            <div className={`w-13 h-13 rounded-2xl flex items-center justify-center text-2xl border shadow-lg shrink-0 ${rankInfo.currentRank.badgeBorderColor} bg-zinc-900 relative`}>
              <span className="text-2xl">{rankInfo.currentRank.badgeEmoji}</span>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-zinc-950 text-[10px] font-black flex items-center justify-center shadow-sm">
                R{rankInfo.currentRank.level}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  <Flame className="w-5 h-5 text-amber-500 fill-amber-500 inline-block animate-pulse" />
                  {stats.currentStreak === 1
                    ? '1 Día Consecutivo'
                    : `${stats.currentStreak} Días Consecutivos`}
                </h3>

                {/* Military Rank Label */}
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1`}>
                  <Shield className="w-3 h-3 text-amber-400" />
                  {rankInfo.currentRank.name}
                </span>
              </div>

              {/* Medal & Reward Title */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Medal className="w-3.5 h-3.5" />
                  {rankInfo.currentRank.medalName}
                </span>
                <span className="text-zinc-600 hidden sm:inline">·</span>
                <span className="text-xs text-zinc-400">
                  {stats.complianceRatePercent}% de consistencia nutricional
                </span>
              </div>
            </div>
          </div>

          {/* Right Action Bar: Record & Leaderboard Button */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end flex-wrap">
            <div className="px-3 py-1.5 rounded-xl bg-zinc-800/80 border border-zinc-700/60 text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Récord</span>
              <span className="text-xs font-black text-amber-400 flex items-center gap-1 justify-end">
                <Trophy className="w-3 h-3" />
                {stats.bestStreak} días
              </span>
            </div>

            {/* Requested Leaderboard Button */}
            <button
              type="button"
              onClick={() => setIsLeaderboardOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trophy className="w-3.5 h-3.5 text-zinc-950" />
              <span>Tabla de Clasificaciones</span>
            </button>

            {onOpenReport && (
              <button
                type="button"
                onClick={onOpenReport}
                className="px-2.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer"
                title="Ver informe detallado"
              >
                <span>Informe</span>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* Promotion Progress to Next Military Rank */}
        {rankInfo.nextRank && (
          <div className="pt-3 pb-1">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="text-zinc-400 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-400" />
                Próximo ascenso militar:{' '}
                <strong className="text-zinc-200">{rankInfo.nextRank.name}</strong>
              </span>
              <span className="font-bold text-amber-400">
                {rankInfo.daysToNextRank === 1
                  ? 'Falta 1 día de registro'
                  : `Faltan ${rankInfo.daysToNextRank} días de registro`}
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-500"
                style={{ width: `${rankInfo.progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* 7 Days Visual Progress Timeline */}
        <div className="pt-3 space-y-2">
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

      {/* Leaderboard & Military Escalafón Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserStreak={stats.currentStreak}
        currentUserName={profile.name || 'Atleta NutriFit'}
        currentUserEmail={userEmail || profile.email || 'daviddesalvo.5c@gmail.com'}
      />
    </>
  );
};

