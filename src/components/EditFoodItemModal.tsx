import React, { useState, useEffect } from 'react';
import { 
  X, 
  Trash2, 
  Check, 
  Sparkles, 
  Copy, 
  Bookmark, 
  BookmarkCheck,
  Scale, 
  Sliders,
  Flame,
  Zap
} from 'lucide-react';
import { FoodItem, MealType } from '../types';
import { saveFoodToUserLibrary } from '../utils/userFoodsStorage';
import { formatGrams, roundGrams } from '../utils/nutritionCalculations';

interface EditFoodItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FoodItem | null;
  date: string;
  onSave: (date: string, updatedItem: FoodItem) => void;
  onDuplicate: (date: string, duplicateItem: Omit<FoodItem, 'id'>) => void;
  onDelete: (date: string, itemId: string) => void;
  userEmail?: string;
}

export const EditFoodItemModal: React.FC<EditFoodItemModalProps> = ({
  isOpen,
  onClose,
  item,
  date,
  onSave,
  onDuplicate,
  onDelete,
  userEmail = '',
}) => {
  // Base state (safe fallbacks so hooks are called unconditionally)
  const [name, setName] = useState(item?.name || '');
  const [selectedMeal, setSelectedMeal] = useState<MealType>(item?.mealType || 'lunch');
  const [amountGrams, setAmountGrams] = useState<number>(item?.amountGrams || 100);
  const [portionDesc, setPortionDesc] = useState(item?.portionDescription || '');
  
  // Macros
  const [calories, setCalories] = useState<number>(item ? Math.round(item.calories) : 0);
  const [protein, setProtein] = useState<number>(item ? roundGrams(item.proteinGrams) : 0);
  const [carbs, setCarbs] = useState<number>(item ? roundGrams(item.carbsGrams) : 0);
  const [fat, setFat] = useState<number>(item ? roundGrams(item.fatGrams) : 0);
  
  // Custom manual edit toggle
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);
  const [duplicateSuccess, setDuplicateSuccess] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setSelectedMeal(item.mealType);
      setAmountGrams(item.amountGrams || 100);
      setPortionDesc(item.portionDescription || '');
      setCalories(Math.round(item.calories));
      setProtein(roundGrams(item.proteinGrams));
      setCarbs(roundGrams(item.carbsGrams));
      setFat(roundGrams(item.fatGrams));
      setIsManualOverride(false);
      setSavedToLibrary(false);
      setDuplicateSuccess(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  // Original per-gram ratios to accurately scale as grams are changed
  const originalGrams = Math.max(1, item.amountGrams || 100);
  const calPerGram = item.calories / originalGrams;
  const protPerGram = item.proteinGrams / originalGrams;
  const carbPerGram = item.carbsGrams / originalGrams;
  const fatPerGram = item.fatGrams / originalGrams;

  const handleGramsChange = (newGrams: number) => {
    const val = Math.max(1, Math.round(newGrams));
    setAmountGrams(val);
    
    if (!isManualOverride) {
      setCalories(Math.round(val * calPerGram));
      setProtein(roundGrams(val * protPerGram));
      setCarbs(roundGrams(val * carbPerGram));
      setFat(roundGrams(val * fatPerGram));
    }
  };

  const handleApplyIncrement = (delta: number) => {
    handleGramsChange(amountGrams + delta);
  };

  const handleMultiplier = (mult: number) => {
    handleGramsChange(Math.round(amountGrams * mult));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FoodItem = {
      ...item,
      name: name.trim() || item.name,
      mealType: selectedMeal,
      amountGrams,
      portionDescription: portionDesc.trim() || `${amountGrams}g`,
      calories: Math.max(0, calories),
      proteinGrams: Math.max(0, protein),
      carbsGrams: Math.max(0, carbs),
      fatGrams: Math.max(0, fat),
    };

    onSave(date, updated);
    onClose();
  };

  const handleDuplicateItem = () => {
    const newItem: Omit<FoodItem, 'id'> = {
      name: name.trim() || item.name,
      mealType: selectedMeal,
      amountGrams,
      portionDescription: portionDesc.trim() || `${amountGrams}g`,
      calories: Math.max(0, calories),
      proteinGrams: Math.max(0, protein),
      carbsGrams: Math.max(0, carbs),
      fatGrams: Math.max(0, fat),
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    onDuplicate(date, newItem);
    setDuplicateSuccess(true);
    setTimeout(() => {
      setDuplicateSuccess(false);
      onClose();
    }, 1200);
  };

  const handleSaveToLibrary = () => {
    saveFoodToUserLibrary(
      {
        name: name.trim() || item.name,
        category: 'Mis Alimentos',
        amountGrams,
        portionDescription: `${amountGrams}g`,
        calories,
        proteinGrams: protein,
        carbsGrams: carbs,
        fatGrams: fat,
        source: 'manual',
      },
      userEmail
    );
    setSavedToLibrary(true);
    setTimeout(() => setSavedToLibrary(false), 3000);
  };

  const mealOptions: { type: MealType; label: string }[] = [
    { type: 'breakfast', label: '☕ Desayuno' },
    { type: 'lunch', label: '🍽️ Almuerzo' },
    { type: 'dinner', label: '🌙 Cena' },
    { type: 'snacks', label: '🍎 Snacks' },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      id="edit-food-modal-backdrop"
    >
      <div 
        className="bg-white dark:bg-zinc-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 relative max-h-[92vh] overflow-y-auto"
        id="edit-food-modal-container"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Editar Entrada del Diario
              </span>
            </div>
            <h2 className="text-lg font-black text-zinc-900 dark:text-zinc-100 mt-0.5 truncate max-w-xs sm:max-w-md">
              {name || 'Alimento'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          {/* Food Name */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Nombre del Alimento o Plato
            </label>
            <input
              type="text"
              id="edit-food-input-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              required
            />
          </div>

          {/* Meal Target */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Momento de Comida
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {mealOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => setSelectedMeal(opt.type)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all text-center border ${
                    selectedMeal === opt.type
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-750'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grams & Scaling */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-600" />
                <span>Cantidad en Gramos</span>
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Los macros escalan automáticamente
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  id="edit-food-input-grams"
                  value={amountGrams}
                  onChange={(e) => handleGramsChange(Number(e.target.value))}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-base font-black focus:ring-2 focus:ring-emerald-500 focus:outline-none pr-10"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  g
                </span>
              </div>

              <input
                type="text"
                placeholder="Descripción (ej. 1 bife)"
                value={portionDesc}
                onChange={(e) => setPortionDesc(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Quick Adjustment Pills */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] font-bold text-zinc-400 mr-1">Rápido:</span>
              <button
                type="button"
                onClick={() => handleApplyIncrement(-50)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-650 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95"
              >
                -50g
              </button>
              <button
                type="button"
                onClick={() => handleApplyIncrement(50)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-650 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95"
              >
                +50g
              </button>
              <button
                type="button"
                onClick={() => handleApplyIncrement(100)}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-650 text-zinc-700 dark:text-zinc-200 text-[11px] font-bold border border-zinc-200 dark:border-zinc-600 transition-all active:scale-95"
              >
                +100g
              </button>
              <button
                type="button"
                onClick={() => handleMultiplier(2)}
                className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 transition-all active:scale-95"
              >
                x2 (Doble)
              </button>
            </div>
          </div>

          {/* Current Nutrition Summary Cards */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200/70 dark:border-zinc-700/70">
              <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 block uppercase">Calorías</span>
              <span className="text-sm font-black text-zinc-900 dark:text-zinc-100">{calories}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60">
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase">Proteínas</span>
              <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">{formatGrams(protein)}g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-800/60">
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase">Carbos</span>
              <span className="text-sm font-black text-amber-900 dark:text-amber-200">{formatGrams(carbs)}g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60">
              <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 block uppercase">Grasas</span>
              <span className="text-sm font-black text-rose-900 dark:text-rose-200">{formatGrams(fat)}g</span>
            </div>
          </div>

          {/* Toggle Manual Nutrition Input */}
          <div>
            <button
              type="button"
              onClick={() => setIsManualOverride(!isManualOverride)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isManualOverride ? 'Ocultar edición manual de macros' : 'Editar calorías y macros manualmente'}</span>
            </button>

            {isManualOverride && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 block mb-1">Calorías</label>
                  <input
                    type="number"
                    min="0"
                    value={calories}
                    onChange={(e) => setCalories(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-indigo-600 block mb-1">Proteína (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={protein}
                    onChange={(e) => setProtein(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-amber-600 block mb-1">Carbos (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={carbs}
                    onChange={(e) => setCarbs(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-rose-600 block mb-1">Grasas (g)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={fat}
                    onChange={(e) => setFat(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs font-bold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Quick Helper Actions: Duplicate or Save to Library */}
          <div className="pt-2 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800 flex-wrap">
            <button
              type="button"
              onClick={handleDuplicateItem}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all flex items-center gap-1.5"
              title="Añadir otra porción idéntica o bife extra a esta comida"
            >
              {duplicateSuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{duplicateSuccess ? '¡Añadido al diario!' : '+ Sumar otra porción'}</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToLibrary}
              className="px-3.5 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-900 dark:text-amber-200 text-xs font-bold transition-all flex items-center gap-1.5 border border-amber-200/70 dark:border-amber-900/50"
              title="Guardar en biblioteca para repetir fácilmente"
            >
              {savedToLibrary ? <BookmarkCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Bookmark className="w-3.5 h-3.5" />}
              <span>{savedToLibrary ? '¡Guardado en Mi Biblioteca!' : 'Guardar en Biblioteca'}</span>
            </button>
          </div>

          {/* Main Modal Actions */}
          <div className="pt-3 flex items-center justify-between gap-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                onDelete(date, item.id);
                onClose();
              }}
              className="px-3 py-2.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Eliminar</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="btn-confirm-edit-food"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Guardar Cambios</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
