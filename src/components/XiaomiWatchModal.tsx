import React, { useState, useEffect } from 'react';
import { 
  Watch, 
  X, 
  Check, 
  Smartphone, 
  Flame, 
  Footprints, 
  HelpCircle, 
  ChevronRight, 
  Sparkles, 
  Info, 
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { UserProfile, ConnectedActivityService } from '../types';
import { notificationService } from '../utils/notificationService';

interface XiaomiWatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: string;
  currentSteps: number;
  currentCalories: number;
  profile: UserProfile;
  currentDeviceModel?: string;
  onSaveCalibration: (
    steps: number,
    calories: number,
    deviceModel: string,
    service: ConnectedActivityService
  ) => void;
}

export const WATCH_BRANDS = [
  { id: 'xiaomi_watch', name: 'Xiaomi (Mi Fitness / Mi Band / Watch)', app: 'Mi Fitness' },
  { id: 'amazfit_zepp', name: 'Amazfit (Zepp / Zepp Life)', app: 'Zepp' },
  { id: 'huawei_health', name: 'Huawei Band / Watch (Huawei Health)', app: 'Huawei Health' },
  { id: 'samsung_galaxy', name: 'Samsung Galaxy Watch (Galaxy Wearable)', app: 'Samsung Health' },
  { id: 'garmin_connect', name: 'Garmin Watch (Garmin Connect)', app: 'Garmin Connect' },
  { id: 'generic_smartwatch', name: 'Otra Pulsera / Reloj Inteligente', app: 'App del Fabricante' },
];

export const XiaomiWatchModal: React.FC<XiaomiWatchModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  currentSteps,
  currentCalories,
  profile,
  currentDeviceModel,
  onSaveCalibration,
}) => {
  const [selectedBrand, setSelectedBrand] = useState<string>(() => {
    return localStorage.getItem('nutrifit_preferred_watch_brand') || 'xiaomi_watch';
  });
  
  const [stepsInput, setStepsInput] = useState<string>(() => 
    currentSteps > 0 ? String(currentSteps) : ''
  );
  const [caloriesInput, setCaloriesInput] = useState<string>(() => 
    currentCalories > 0 ? String(currentCalories) : ''
  );
  const [showSyncGuide, setShowSyncGuide] = useState<boolean>(false);

  // Sync inputs when opened
  useEffect(() => {
    if (isOpen) {
      setStepsInput(currentSteps > 0 ? String(currentSteps) : '');
      setCaloriesInput(currentCalories > 0 ? String(currentCalories) : '');
      if (currentDeviceModel) {
        const found = WATCH_BRANDS.find((b) => b.name === currentDeviceModel);
        if (found) setSelectedBrand(found.id);
      }
    }
  }, [isOpen, currentSteps, currentCalories, currentDeviceModel]);

  if (!isOpen) return null;

  const weightKg = profile.weightKg || 70;

  // Formula to estimate walking calories based on weight and steps:
  // ~0.04 kcal per step for a 70kg person, adjusted proportionally by body weight
  const calculateEstimatedCalories = (stepsCount: number) => {
    const factor = (weightKg / 70) * 0.04;
    return Math.round(stepsCount * factor);
  };

  const handleApplyCalculatedCalories = () => {
    const s = parseInt(stepsInput, 10) || 0;
    if (s <= 0) {
      notificationService.notifyError('Ingresa primero una cantidad de pasos válida.');
      return;
    }
    const estimated = calculateEstimatedCalories(s);
    setCaloriesInput(String(estimated));
    notificationService.notifyInfo(`Calorías estimadas calculadas: ${estimated} kcal (${weightKg} kg de peso).`);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const steps = parseInt(stepsInput, 10);
    const calories = parseInt(caloriesInput, 10);

    if (isNaN(steps) || steps < 0) {
      notificationService.notifyError('Por favor ingresa una cantidad válida de pasos.');
      return;
    }

    const brandObj = WATCH_BRANDS.find((b) => b.id === selectedBrand) || WATCH_BRANDS[0];
    const finalCalories = isNaN(calories) || calories < 0 ? calculateEstimatedCalories(steps) : calories;

    localStorage.setItem('nutrifit_preferred_watch_brand', selectedBrand);

    onSaveCalibration(steps, finalCalories, brandObj.name, 'xiaomi_watch');
    notificationService.notifySuccess(
      `¡Datos de ${brandObj.name} calibrados!`,
      `${steps.toLocaleString()} pasos y ${finalCalories} kcal registradas para ${selectedDate}.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="xiaomi-watch-modal-container"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
              <Watch className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-zinc-900 dark:text-white flex items-center gap-1.5">
                Calibrar Reloj o Pulsera
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ajuste exacto para Xiaomi (Mi Fitness), Amazfit y Smartbands
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-sm">
          {/* Explicación de la discrepancia de sensores */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-bold">
                ¿Por qué el celular y el reloj marcan números distintos?
              </p>
              <p className="text-amber-700 dark:text-amber-300/90 leading-relaxed">
                El teléfono móvil cuenta solo cuando lo llevas en el bolsillo. Tu reloj o pulsera Xiaomi registra cada paso continuo en tu muñeca durante todo el día. Con este ajuste, tu conteo calórico toma como verdad absoluta lo que marca tu pulsera.
              </p>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Selección de dispositivo */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Tu Dispositivo / Aplicación
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
              >
                {WATCH_BRANDS.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Inputs de Pasos y Calorías */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Pasos */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Footprints className="w-3.5 h-3.5 text-orange-500" />
                    Pasos en tu Reloj
                  </span>
                  <span className="text-[10px] text-zinc-400 font-normal">Pantalla hoy</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100000"
                    placeholder="Ej. 25323"
                    value={stepsInput}
                    onChange={(e) => setStepsInput(e.target.value)}
                    required
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-semibold">
                    pasos
                  </span>
                </div>
              </div>

              {/* Calorías */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-rose-500" />
                    Calorías del Reloj
                  </label>
                  <button
                    type="button"
                    onClick={handleApplyCalculatedCalories}
                    className="text-[10px] font-bold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                    title="Calcular calorías estimadas según tu peso corporal"
                  >
                    <Sparkles className="w-2.5 h-2.5" />
                    Calcular ({weightKg}kg)
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    placeholder="Ej. 164"
                    value={caloriesInput}
                    onChange={(e) => setCaloriesInput(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-orange-500"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-zinc-400 font-semibold">
                    kcal
                  </span>
                </div>
              </div>
            </div>

            {/* Ayuda de calorias */}
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Tip: Los relojes Xiaomi suelen mostrar <strong>Calorías Activas</strong> (gasto adicional por movimiento, ej. 164 kcal). Puedes poner exactamente ese número para no sobredimensionar tus comidas.
            </p>

            {/* Botones de acción */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors text-center"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-2 py-2.5 px-4 rounded-xl text-xs font-black bg-orange-600 hover:bg-orange-500 text-white transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar a mi Diario</span>
              </button>
            </div>
          </form>

          {/* Acordeón: Guía paso a paso de vinculación automática Mi Fitness */}
          <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <button
              type="button"
              onClick={() => setShowSyncGuide(!showSyncGuide)}
              className="w-full flex items-center justify-between text-left py-2 px-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <Smartphone className="w-4 h-4 text-orange-500" />
                <span>¿Cómo activar la sincronización automática de Xiaomi?</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-zinc-400 transition-transform ${showSyncGuide ? 'rotate-90' : ''}`} />
            </button>

            {showSyncGuide && (
              <div className="mt-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-2.5 text-xs text-zinc-600 dark:text-zinc-300 animate-in fade-in duration-150">
                <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                  Para que tu app <strong>Mi Fitness</strong> vuelque datos a NutriFit Pro:
                </p>
                <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                  <li>Abre la aplicación <strong>Mi Fitness</strong> en tu móvil.</li>
                  <li>Toca en la pestaña inferior <strong>Perfil</strong> (abajo a la derecha).</li>
                  <li>Selecciona <strong>"Datos y Privacidad"</strong> o <strong>"Aplicaciones conectadas"</strong>.</li>
                  <li>
                    Activa la conexión con <strong>Health Connect (Conexión de Salud de Android)</strong>, habilitando los permisos de <em>Pasos</em> y <em>Calorías activas</em>.
                  </li>
                  <li>
                    <em>Alternativa veloz:</em> También puedes conectar Mi Fitness con <strong>Strava</strong> en un clic desde esa misma pantalla.
                  </li>
                </ol>
                <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-200 dark:border-zinc-700">
                  Siempre que haya una demora o no lleves el teléfono encima, puedes usar el botón <strong>Calibrar Reloj</strong> para tener tus pasos actualizados al instante.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
