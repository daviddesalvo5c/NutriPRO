import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Sparkles, 
  Apple, 
  Droplets, 
  ShieldAlert,
  Flame
} from 'lucide-react';
import { DailyLog } from '../types';
import { analyzeMicronutrients, MicronutrientAlert } from '../utils/micronutrientAnalyzer';

interface MicronutrientAlertsCardProps {
  dailyLogs: Record<string, DailyLog>;
  compact?: boolean;
}

export const MicronutrientAlertsCard: React.FC<MicronutrientAlertsCardProps> = ({
  dailyLogs,
  compact = false,
}) => {
  const [expanded, setExpanded] = useState(!compact);
  const analysis = analyzeMicronutrients(dailyLogs);

  if (!analysis.hasAlerts) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
              Micronutrientes en Rango Óptimo
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Fibra, hierro, sodio e hidratación estables en los últimos 3 días.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
          Óptimo
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
      {/* Header */}
      <div 
        onClick={() => setExpanded(!expanded)} 
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Alertas Preventivas de Micronutrientes
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                {analysis.alertCount} {analysis.alertCount === 1 ? 'aviso' : 'avisos'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
              Análisis preventivo de los últimos 3 días para proteger tu salud y digestión
            </p>
          </div>
        </div>

        <button 
          type="button"
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {/* Expanded Alerts Detail */}
      {expanded && (
        <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          {analysis.alerts.map((alert, idx) => {
            const isFiber = alert.nutrient === 'fibra';
            const isIron = alert.nutrient === 'hierro';
            const isSodium = alert.nutrient === 'sodio';

            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {isFiber ? '🥬' : isIron ? '🥩' : isSodium ? '🧂' : '💧'}
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                        {alert.headline}
                      </h5>
                      <span className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                        Promedio: {alert.averageIntake} {alert.unit} (Meta: {alert.targetIntake} {alert.unit})
                      </span>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                    alert.status === 'deficit' 
                      ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                      : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  }`}>
                    {alert.status === 'deficit' ? 'Déficit' : alert.status === 'excess' ? 'Exceso' : 'Atención'}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {alert.description}
                </p>

                <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sugerencia del Nutricionista:</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {alert.recommendation}
                  </p>
                  <div className="pt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">Alimentos clave:</span>
                    {alert.sourcesToEat.map((food, fIdx) => (
                      <span
                        key={fIdx}
                        className="px-1.5 py-0.5 rounded-md bg-white dark:bg-zinc-800 text-[10px] font-semibold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                      >
                        {food}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
