import React, { useState } from 'react';
import { 
  PartyPopper, 
  Sparkles, 
  Calendar, 
  Flame, 
  Check, 
  X, 
  Sliders, 
  ShieldCheck, 
  Info 
} from 'lucide-react';
import { UserProfile } from '../types';
import { getProfileCalculations } from '../utils/nutritionCalculations';

interface CalorieCyclingModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
}

export const CalorieCyclingModal: React.FC<CalorieCyclingModalProps> = ({
  isOpen,
  onClose,
  profile,
  onUpdateProfile,
}) => {
  const [enabled, setEnabled] = useState<boolean>(!!profile.calorieCyclingEnabled);
  const [weekdayReduction, setWeekdayReduction] = useState<number>(
    profile.weekdayReductionKcal || 150
  );
  const [selectedSocialDays, setSelectedSocialDays] = useState<('friday' | 'saturday' | 'sunday')[]>(
    profile.socialDays && profile.socialDays.length > 0 ? profile.socialDays : ['saturday']
  );

  if (!isOpen) return null;

  const calcs = getProfileCalculations(profile);
  const baseCalories = calcs.targetCalories;

  const toggleSocialDay = (day: 'friday' | 'saturday' | 'sunday') => {
    if (selectedSocialDays.includes(day)) {
      if (selectedSocialDays.length === 1) return; // Keep at least one
      setSelectedSocialDays(selectedSocialDays.filter((d) => d !== day));
    } else {
      setSelectedSocialDays([...selectedSocialDays, day]);
    }
  };

  const socialCount = selectedSocialDays.length;
  const nonSocialCount = 7 - socialCount;
  const totalBankedWeekly = weekdayReduction * nonSocialCount;
  const bufferPerSocialDay = Math.round(totalBankedWeekly / socialCount);

  const weekdayCalories = Math.max(1100, baseCalories - weekdayReduction);
  const socialDayCalories = baseCalories + bufferPerSocialDay;

  const handleSave = () => {
    onUpdateProfile({
      ...profile,
      calorieCyclingEnabled: enabled,
      weekdayReductionKcal: weekdayReduction,
      socialDays: selectedSocialDays,
      updatedAt: new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 text-zinc-100 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <PartyPopper className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                Día Social & Cheat Meal Flexible
              </h2>
              <p className="text-xs text-zinc-400">
                Ahorra calorías en la semana para disfrutar tus salidas de fin de semana
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Toggle Switch */}
          <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-white block">
                Activar Ciclado de Calorías
              </span>
              <span className="text-[11px] text-zinc-400">
                Ajusta las metas diarias automáticamente sin modificar tu déficit semanal
              </span>
            </div>

            <button
              type="button"
              onClick={() => setEnabled(!enabled)}
              className={`w-12 h-7 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                enabled ? 'bg-amber-500' : 'bg-zinc-700'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {enabled && (
            <div className="space-y-5 animate-in fade-in">
              {/* Savings Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-300">
                    Ahorro diario en días laborales:
                  </label>
                  <span className="text-sm font-black text-amber-400">
                    -{weekdayReduction} kcal/día
                  </span>
                </div>

                <input
                  type="range"
                  min="50"
                  max="300"
                  step="25"
                  value={weekdayReduction}
                  onChange={(e) => setWeekdayReduction(Number(e.target.value))}
                  className="w-full accent-amber-500 bg-zinc-800 rounded-lg cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Leve (-50 kcal)</span>
                  <span>Estándar (-150 kcal)</span>
                  <span>Generoso (-300 kcal)</span>
                </div>
              </div>

              {/* Social Days Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">
                  ¿Qué días son tus días sociales con colchón extra?
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'friday', label: 'Viernes' },
                    { id: 'saturday', label: 'Sábado' },
                    { id: 'sunday', label: 'Domingo' },
                  ].map((day) => {
                    const isSel = selectedSocialDays.includes(day.id as any);
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => toggleSocialDay(day.id as any)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all border text-center ${
                          isSel
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-xs'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Math Simulation HUD */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                  Distribución Semanal Calculada:
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 block">
                      Días Laborales ({nonSocialCount} días)
                    </span>
                    <span className="text-lg font-black text-zinc-200 block">
                      {weekdayCalories} kcal
                    </span>
                    <span className="text-[10px] text-amber-400">
                      -{weekdayReduction} kcal reservadas
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30">
                    <span className="text-[10px] uppercase font-bold text-amber-300 block">
                      Día Social ({socialCount} {socialCount === 1 ? 'día' : 'días'})
                    </span>
                    <span className="text-lg font-black text-amber-400 block">
                      {socialDayCalories} kcal
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      +{bufferPerSocialDay} kcal colchón libre
                    </span>
                  </div>
                </div>

                <div className="text-xs text-zinc-400 flex items-center gap-2 pt-1 border-t border-zinc-800/80">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    El promedio semanal es exactamente <strong>{baseCalories} kcal/día</strong>. Tu déficit nutricional y tu progreso están 100% asegurados.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-zinc-800 bg-zinc-950/60 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Guardar Configuración</span>
          </button>
        </div>
      </div>
    </div>
  );
};
