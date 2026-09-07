import React, { useState } from 'react';
import { Droplet, Plus, Minus, RotateCcw, Check, Sparkles, Award } from 'lucide-react';
import { motion } from 'motion/react';

interface WaterTrackerCardProps {
  currentWaterMl: number;
  targetWaterMl?: number;
  onUpdateWater: (amountMl: number) => void;
}

export const WaterTrackerCard: React.FC<WaterTrackerCardProps> = ({
  currentWaterMl,
  targetWaterMl = 2500,
  onUpdateWater,
}) => {
  const [customAmount, setCustomAmount] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState<boolean>(false);

  const safeCurrent = Math.max(0, currentWaterMl || 0);
  const percent = Math.min(100, Math.round((safeCurrent / targetWaterMl) * 100));
  const isGoalReached = safeCurrent >= targetWaterMl;
  const glassesConsumed = (safeCurrent / 250).toFixed(1);
  const targetGlasses = (targetWaterMl / 250).toFixed(0);

  const handleAdd = (deltaMl: number) => {
    onUpdateWater(Math.max(0, safeCurrent + deltaMl));
  };

  const handleSetCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customAmount, 10);
    if (!isNaN(val) && val >= 0) {
      onUpdateWater(val);
      setShowCustomInput(false);
      setCustomAmount('');
    }
  };

  return (
    <div 
      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs relative overflow-hidden"
      id="water-tracker-card"
    >
      {/* Subtle Aqua Glow Accent */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-cyan-500/10 dark:bg-cyan-500/15 rounded-full blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center border border-cyan-500/20 shadow-xs">
            <Droplet className="w-5 h-5 fill-cyan-500/40 text-cyan-600 dark:text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              Control de Hidratación
              {isGoalReached && (
                <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-800 flex items-center gap-1">
                  <Award className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                  Meta Alcanzada
                </span>
              )}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Mantén tu rendimiento metabólico y salud celular
            </p>
          </div>
        </div>

        {/* Status Count */}
        <div className="flex items-baseline gap-1.5 text-right self-end sm:self-auto">
          <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
            {(safeCurrent / 1000).toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-zinc-500">
            / {(targetWaterMl / 1000).toFixed(1)} L ({percent}%)
          </span>
        </div>
      </div>

      {/* Progress Bar Container */}
      <div className="space-y-1.5 mb-4">
        <div className="h-3 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-zinc-700/80">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
          />
        </div>
        <div className="flex justify-between text-[11px] font-medium text-zinc-500 dark:text-zinc-400 px-0.5">
          <span>{glassesConsumed} de {targetGlasses} vasos (aprox. 250ml c/u)</span>
          <span>{safeCurrent < targetWaterMl ? `Faltan ${targetWaterMl - safeCurrent} ml` : '¡Hidratación óptima!'}</span>
        </div>
      </div>

      {/* Quick Increment Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleAdd(250)}
          className="py-2 px-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
          id="water-btn-add-250"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+250 ml (1 Vaso)</span>
        </button>

        <button
          type="button"
          onClick={() => handleAdd(500)}
          className="py-2 px-3 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 hover:bg-cyan-100 dark:hover:bg-cyan-900/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95"
          id="water-btn-add-500"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+500 ml (Botella)</span>
        </button>

        <button
          type="button"
          onClick={() => handleAdd(-250)}
          disabled={safeCurrent <= 0}
          className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 active:scale-95"
          id="water-btn-minus-250"
        >
          <Minus className="w-3.5 h-3.5" />
          <span>-250 ml</span>
        </button>

        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="py-2 px-3 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
          id="water-btn-custom"
        >
          <span>Personalizar</span>
        </button>
      </div>

      {/* Optional Custom Input Drawer */}
      {showCustomInput && (
        <form onSubmit={handleSetCustom} className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800 flex items-center gap-2">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Total exacto en ml (ej: 1800)"
            className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            min={0}
            step={50}
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold rounded-lg transition-colors"
          >
            Fijar
          </button>
          <button
            type="button"
            onClick={() => onUpdateWater(0)}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg"
            title="Reiniciar a 0"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </form>
      )}
    </div>
  );
};
