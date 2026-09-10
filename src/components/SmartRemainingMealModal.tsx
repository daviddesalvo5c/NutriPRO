import React, { useState } from 'react';
import { 
  Sparkles, 
  ChefHat, 
  Clock, 
  Plus, 
  Check, 
  Flame, 
  X, 
  RotateCcw, 
  AlertCircle,
  Utensils,
  Lightbulb
} from 'lucide-react';
import { FoodItem, MealType } from '../types';

interface MealOption {
  id: string;
  title: string;
  prepTimeMinutes: number;
  difficulty: string;
  amountGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  portionDescription: string;
  ingredients: { name: string; amount: string }[];
  instructions: string[];
  chefTip?: string;
}

interface SmartRemainingMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  remainingCalories: number;
  remainingProtein: number;
  remainingCarbs: number;
  remainingFat: number;
  targetCalories: number;
  onSaveFoodItem: (item: Omit<FoodItem, 'id'>, mealType: MealType) => void;
  initialMealType?: MealType;
  isProOrVip?: boolean;
  onOpenPlansModal?: () => void;
}

export const SmartRemainingMealModal: React.FC<SmartRemainingMealModalProps> = ({
  isOpen,
  onClose,
  remainingCalories,
  remainingProtein,
  remainingCarbs,
  remainingFat,
  targetCalories,
  onSaveFoodItem,
  initialMealType = 'dinner',
  isProOrVip = false,
  onOpenPlansModal,
}) => {
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType);
  const [dietaryNotes, setDietaryNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<MealOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const safeCals = Math.max(0, remainingCalories);
  const safeProt = Math.max(0, remainingProtein);
  const safeCarbs = Math.max(0, remainingCarbs);
  const safeFat = Math.max(0, remainingFat);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-remaining-meal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          remainingCalories: safeCals,
          remainingProtein: safeProt,
          remainingCarbs: safeCarbs,
          remainingFat: safeFat,
          mealType: selectedMealType,
          dietaryNotes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.options && data.options.length > 0) {
        setOptions(data.options);
      } else {
        setError(data.message || 'No se pudieron generar opciones en este momento.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error de conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOptionToDiary = (opt: MealOption) => {
    onSaveFoodItem(
      {
        name: opt.title,
        portionDescription: opt.portionDescription || `${opt.amountGrams}g`,
        amountGrams: opt.amountGrams,
        calories: opt.calories,
        proteinGrams: opt.proteinGrams,
        carbsGrams: opt.carbsGrams,
        fatGrams: opt.fatGrams,
        mealType: selectedMealType,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      selectedMealType
    );

    setAddedId(opt.id);
    setTimeout(() => {
      setAddedId(null);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-700 text-zinc-100 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                Chef IA: Armar Plato con Macros Restantes
              </h2>
              <p className="text-xs text-zinc-400">
                Opciones rápidas con ingredientes cotidianos que cuadran exactamente con tu día
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

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
          {/* Trial & Pro Promo for Free Users */}
          {!isProOrVip && onOpenPlansModal && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/70 via-teal-950/60 to-emerald-950/70 border border-emerald-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-emerald-200">
                  <strong>Función Pro:</strong> Acceso ilimitado al Asistente Chef IA con tu <strong>Mes de Prueba Gratis de 30 días</strong>.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPlansModal();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black shrink-0 transition-all shadow-xs"
              >
                Activar 30 Días Gratis
              </button>
            </div>
          )}

          {/* Remaining Macros HUD */}
          <div className="bg-zinc-950/80 border border-zinc-800 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400">
                Presupuesto Disponible para esta Comida
              </span>
              <span className="text-xs font-bold text-zinc-300">
                Meta diaria: {targetCalories} kcal
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Calorías</span>
                <span className="text-base sm:text-lg font-black text-emerald-400 block">
                  {safeCals}
                </span>
                <span className="text-[10px] text-zinc-500">kcal</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Proteína</span>
                <span className="text-base sm:text-lg font-black text-teal-400 block">
                  {safeProt}g
                </span>
                <span className="text-[10px] text-zinc-500">{safeProt * 4} kcal</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Carbos</span>
                <span className="text-base sm:text-lg font-black text-amber-400 block">
                  {safeCarbs}g
                </span>
                <span className="text-[10px] text-zinc-500">{safeCarbs * 4} kcal</span>
              </div>

              <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
                <span className="text-[10px] uppercase font-bold text-zinc-400 block">Grasas</span>
                <span className="text-base sm:text-lg font-black text-rose-400 block">
                  {safeFat}g
                </span>
                <span className="text-[10px] text-zinc-500">{safeFat * 9} kcal</span>
              </div>
            </div>

            {safeCals <= 100 && (
              <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Te quedan muy pocas calorías ({safeCals} kcal). La IA te sugerirá opciones ultraligeras (té con claras, gelatina o caldo desgrasado).
                </span>
              </div>
            )}
          </div>

          {/* Form controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                ¿Para qué comida es?
              </label>
              <div className="grid grid-cols-4 gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                {(['breakfast', 'lunch', 'snacks', 'dinner'] as MealType[]).map((type) => {
                  const labels: Record<MealType, string> = {
                    breakfast: 'Desayuno',
                    lunch: 'Almuerzo',
                    snacks: 'Merienda',
                    dinner: 'Cena',
                  };
                  const active = selectedMealType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedMealType(type)}
                      className={`py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                        active
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-zinc-400 hover:text-white'
                      }`}
                    >
                      {labels[type]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-zinc-300 block mb-1">
                Preferencias / ¿Qué tienes en la heladera? (Opcional)
              </label>
              <input
                type="text"
                value={dietaryNotes}
                onChange={(e) => setDietaryNotes(e.target.value)}
                placeholder="Ej: Tengo huevos, atún y verduras; sin lácteos..."
                className="w-full px-3 py-2 text-xs bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <RotateCcw className="w-4 h-4 animate-spin" />
                <span>Calculando recetas exactas con tus macros...</span>
              </>
            ) : (
              <>
                <ChefHat className="w-4 h-4" />
                <span>
                  {options.length > 0
                    ? 'Regenerar otras 3 opciones de platos'
                    : 'Armame 3 opciones de comidas ahora'}
                </span>
              </>
            )}
          </button>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Generated Dish Options */}
          {options.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                  Platos Sugeridos por la IA
                </span>
                <span className="text-[11px] text-zinc-400">
                  Selecciona uno para cargarlo en tu diario
                </span>
              </div>

              <div className="space-y-3">
                {options.map((opt, idx) => {
                  const isAdded = addedId === opt.id;
                  return (
                    <div
                      key={opt.id || idx}
                      className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 hover:border-emerald-500/40 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-black text-white">{opt.title}</h3>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-emerald-400" />
                              {opt.prepTimeMinutes || 10} min
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-800 text-zinc-300">
                              {opt.difficulty || 'Fácil'}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-400 mt-0.5">
                            {opt.portionDescription || `${opt.amountGrams}g totales`}
                          </p>
                        </div>

                        {/* Macro pills */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 text-xs font-bold">
                            {opt.calories} kcal
                          </span>
                        </div>
                      </div>

                      {/* Macro Breakdown */}
                      <div className="flex items-center gap-3 text-xs bg-zinc-900/80 px-3 py-1.5 rounded-xl border border-zinc-800/80">
                        <span className="text-zinc-300">
                          P: <strong className="text-teal-400">{opt.proteinGrams}g</strong>
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-300">
                          C: <strong className="text-amber-400">{opt.carbsGrams}g</strong>
                        </span>
                        <span className="text-zinc-500">·</span>
                        <span className="text-zinc-300">
                          G: <strong className="text-rose-400">{opt.fatGrams}g</strong>
                        </span>
                      </div>

                      {/* Ingredients */}
                      <div>
                        <span className="text-[11px] font-bold uppercase text-zinc-400 block mb-1">
                          Ingredientes a pesar en balanza:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {opt.ingredients.map((ing, iIdx) => (
                            <div
                              key={iIdx}
                              className="text-xs text-zinc-300 bg-zinc-900/50 px-2.5 py-1 rounded-lg border border-zinc-800/60 flex items-center justify-between"
                            >
                              <span>{ing.name}</span>
                              <strong className="text-emerald-400 ml-1.5">{ing.amount}</strong>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Instructions */}
                      {opt.instructions && opt.instructions.length > 0 && (
                        <div className="text-xs text-zinc-400 space-y-1 bg-zinc-900/40 p-2.5 rounded-xl">
                          <span className="font-bold text-zinc-300 block text-[11px]">
                            Preparación rápida:
                          </span>
                          <ol className="list-decimal list-inside space-y-0.5">
                            {opt.instructions.map((step, sIdx) => (
                              <li key={sIdx}>{step}</li>
                            ))}
                          </ol>
                        </div>
                      )}

                      {/* Chef tip */}
                      {opt.chefTip && (
                        <div className="text-[11px] text-emerald-300/90 flex items-center gap-1.5 bg-emerald-950/20 p-2 rounded-lg border border-emerald-900/30">
                          <Lightbulb className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{opt.chefTip}</span>
                        </div>
                      )}

                      {/* Add button */}
                      <button
                        type="button"
                        onClick={() => handleAddOptionToDiary(opt)}
                        disabled={isAdded}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white'
                        }`}
                      >
                        {isAdded ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>¡Añadido al Diario!</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            <span>
                              Añadir este plato a {selectedMealType.toUpperCase()}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
