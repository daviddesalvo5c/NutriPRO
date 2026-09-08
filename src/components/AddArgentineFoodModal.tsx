import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  X, 
  Flame, 
  Check, 
  Plus, 
  Minus, 
  Sparkles, 
  Utensils, 
  Edit3, 
  Scale, 
  Hash,
  ChevronRight,
  Filter
} from 'lucide-react';
import { FoodItem, MealType } from '../types';
import { 
  ARGENTINE_FOOD_DATABASE, 
  ArgentineFood, 
  ArgentineCategory, 
  calculateArgentineFoodNutrition, 
  searchArgentineFoods 
} from '../data/argentineFoodDatabase';

interface AddArgentineFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  mealType: MealType;
  onSaveFoodItem: (item: Omit<FoodItem, 'id'>) => void;
}

export const AddArgentineFoodModal: React.FC<AddArgentineFoodModalProps> = ({
  isOpen,
  onClose,
  mealType,
  onSaveFoodItem,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFood, setSelectedFood] = useState<ArgentineFood | null>(null);

  // Portion configuration state
  const [portionMode, setPortionMode] = useState<'unit' | 'grams'>('unit');
  const [unitCount, setUnitCount] = useState<number>(1);
  const [customGrams, setCustomGrams] = useState<number>(100);

  // Manual override state
  const [isManualMode, setIsManualMode] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualCalories, setManualCalories] = useState<number | ''>('');
  const [manualProtein, setManualProtein] = useState<number | ''>('');
  const [manualCarbs, setManualCarbs] = useState<number | ''>('');
  const [manualFat, setManualFat] = useState<number | ''>('');
  const [manualPortionDesc, setManualPortionDesc] = useState<string>('');

  const mealLabels: Record<MealType, { title: string; emoji: string }> = {
    breakfast: { title: 'Desayuno', emoji: '☕' },
    lunch: { title: 'Almuerzo / Comida', emoji: '🍽️' },
    dinner: { title: 'Cena', emoji: '🌙' },
    snacks: { title: 'Snacks / Colaciones', emoji: '🍎' },
  };

  // Categories list
  const categories: { key: string; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'Huevos y Desayuno', label: '🍳 Huevos y Desayuno' },
    { key: 'Infusiones y Bebidas', label: '☕ Infusiones y Bebidas' },
    { key: 'Carnes y Asado', label: '🥩 Carnes y Asado' },
    { key: 'Pastas y Arroces', label: '🍝 Pastas y Granos' },
    { key: 'Lácteos y Quesos', label: '🧀 Lácteos y Quesos' },
    { key: 'Panificados y Dulces', label: '🥐 Panificados y Dulces' },
    { key: 'Guarniciones y Verduras', label: '🥗 Guarniciones' },
    { key: 'Comidas Típicas Argentinas', label: '🥟 Comidas Típicas' },
    { key: 'Frutas', label: '🍌 Frutas' },
    { key: 'Snacks y Suplementos', label: '⚡ Suplementos' },
  ];

  // Filtered food list
  const filteredFoods = useMemo(() => {
    return searchArgentineFoods(searchQuery, selectedCategory);
  }, [searchQuery, selectedCategory]);

  // When selecting a food item
  const handleSelectFood = (food: ArgentineFood) => {
    setSelectedFood(food);
    setPortionMode('unit');
    setUnitCount(food.defaultUnitCount || 1);
    setCustomGrams(food.gramsPerUnit || 100);
    setIsManualMode(false);
  };

  // Calculate live nutrition values
  const currentNutrition = useMemo(() => {
    if (!selectedFood) return null;
    const qty = portionMode === 'unit' ? unitCount : customGrams;
    return calculateArgentineFoodNutrition(selectedFood, qty, portionMode);
  }, [selectedFood, portionMode, unitCount, customGrams]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSelectedCategory('all');
      setSelectedFood(null);
      setIsManualMode(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Submit calculated food item
  const handleAddCalculatedFood = () => {
    if (!selectedFood || !currentNutrition) return;

    onSaveFoodItem({
      name: selectedFood.name,
      portionDescription: currentNutrition.portionDescription,
      amountGrams: currentNutrition.amountGrams,
      calories: currentNutrition.calories,
      proteinGrams: currentNutrition.proteinGrams,
      carbsGrams: currentNutrition.carbsGrams,
      fatGrams: currentNutrition.fatGrams,
      mealType,
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    onClose();
  };

  // Submit manual food item
  const handleAddManualFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || manualCalories === '') return;

    onSaveFoodItem({
      name: manualName.trim(),
      portionDescription: manualPortionDesc.trim() || '1 porción personalizada',
      amountGrams: 100,
      calories: Number(manualCalories),
      proteinGrams: Number(manualProtein) || 0,
      carbsGrams: Number(manualCarbs) || 0,
      fatGrams: Number(manualFat) || 0,
      mealType,
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div 
        id="argentine-food-modal"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-gradient-to-r from-zinc-50 via-white to-emerald-50/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-emerald-950/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-sm shadow-emerald-600/30">
              <Utensils className="w-4 h-4 stroke-[2.4]" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <span>Añadir a {mealLabels[mealType]?.title}</span>
                <span className="text-xs">{mealLabels[mealType]?.emoji}</span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Base de datos nutricional de Argentina con cálculo por unidad o gramos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {!isManualMode ? (
            <>
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  id="search-argentine-food-input"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder='Buscar alimento (ej: "huevo", "bife", "milanesa", "arroz")...'
                  className="w-full pl-9 pr-9 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px]">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-xl font-bold whitespace-nowrap transition-all ${
                      selectedCategory === cat.key
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Food Selection & Portion Calculator */}
              {selectedFood ? (
                <div 
                  id="selected-food-portion-panel"
                  className="bg-emerald-50/40 dark:bg-emerald-950/20 border-2 border-emerald-500/80 dark:border-emerald-500/60 rounded-2xl p-4 space-y-4 animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md">
                          {selectedFood.category}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          ~{selectedFood.gramsPerUnit}g por {selectedFood.unitName}
                        </span>
                      </div>
                      <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
                        {selectedFood.name}
                      </h3>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedFood(null)}
                      className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold px-2 py-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Cambiar
                    </button>
                  </div>

                  {/* Portion Mode Selector: Unidades vs Gramos */}
                  <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                        <Scale className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Medir porción por:</span>
                      </span>

                      <div className="inline-flex p-0.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        <button
                          type="button"
                          id="portion-mode-unit-btn"
                          onClick={() => setPortionMode('unit')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            portionMode === 'unit'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                          }`}
                        >
                          <Hash className="w-3 h-3" />
                          <span>Por Unidad</span>
                        </button>
                        <button
                          type="button"
                          id="portion-mode-grams-btn"
                          onClick={() => setPortionMode('grams')}
                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            portionMode === 'grams'
                              ? 'bg-emerald-600 text-white shadow-xs'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                          }`}
                        >
                          <Scale className="w-3 h-3" />
                          <span>Por Gramos</span>
                        </button>
                      </div>
                    </div>

                    {/* Quantity Selector: Units */}
                    {portionMode === 'unit' ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">
                            Cantidad de {selectedFood.unitName}s:
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setUnitCount((prev) => Math.max(0.5, Number((prev - (prev > 1 ? 1 : 0.5)).toFixed(1))))}
                              className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <input
                              type="number"
                              id="unit-count-input"
                              step="0.5"
                              min="0.5"
                              max="30"
                              value={unitCount}
                              onChange={(e) => setUnitCount(Math.max(0.1, Number(e.target.value)))}
                              className="w-16 text-center py-1 text-sm font-black bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                            />

                            <button
                              type="button"
                              onClick={() => setUnitCount((prev) => Number((prev + (prev >= 1 ? 1 : 0.5)).toFixed(1)))}
                              className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 flex items-center justify-center font-bold"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Quick Unit Presets */}
                        <div className="flex items-center gap-1.5 pt-1">
                          {[1, 2, 3, 4].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setUnitCount(n)}
                              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                                unitCount === n
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                              }`}
                            >
                              {n} {n === 1 ? 'unidad' : 'unidades'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      /* Quantity Selector: Grams */
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs text-zinc-600 dark:text-zinc-400">
                            Peso exacto en gramos:
                          </span>

                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              id="grams-count-input"
                              step="5"
                              min="5"
                              max="2000"
                              value={customGrams}
                              onChange={(e) => setCustomGrams(Math.max(1, Number(e.target.value)))}
                              className="w-24 text-center py-1 text-sm font-black bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                            />
                            <span className="text-xs font-bold text-zinc-500">gramos</span>
                          </div>
                        </div>

                        {/* Quick Gram Presets */}
                        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto no-scrollbar">
                          {[50, 100, 150, 200, 250, 300].map((g) => (
                            <button
                              key={g}
                              type="button"
                              onClick={() => setCustomGrams(g)}
                              className={`px-2 py-1 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                                customGrams === g
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                  : 'bg-zinc-50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                              }`}
                            >
                              {g}g
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Calculated Live Macros Badge Grid */}
                  {currentNutrition && (
                    <div className="grid grid-cols-4 gap-2 text-center bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xs">
                      <div className="p-2 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/40">
                        <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase">
                          Calorías
                        </span>
                        <span className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                          {currentNutrition.calories} kcal
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 block uppercase">
                          Proteína
                        </span>
                        <span className="text-sm font-black text-indigo-900 dark:text-indigo-200">
                          {currentNutrition.proteinGrams}g
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/40">
                        <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 block uppercase">
                          Carbos
                        </span>
                        <span className="text-sm font-black text-amber-900 dark:text-amber-200">
                          {currentNutrition.carbsGrams}g
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-rose-50/70 dark:bg-rose-950/40">
                        <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 block uppercase">
                          Grasas
                        </span>
                        <span className="text-sm font-black text-rose-900 dark:text-rose-200">
                          {currentNutrition.fatGrams}g
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Main Action Button */}
                  <button
                    type="button"
                    id="btn-add-argentine-food-confirm"
                    onClick={handleAddCalculatedFood}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Añadir {currentNutrition?.portionDescription} a {mealLabels[mealType]?.title}</span>
                  </button>
                </div>
              ) : (
                /* Food Search Results List */
                <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1">
                  {filteredFoods.length === 0 ? (
                    <div className="p-8 text-center bg-zinc-50 dark:bg-zinc-800/40 rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-700">
                      <p className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                        No se encontró ningún alimento con "{searchQuery}"
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Puedes añadirlo manualmente o usar el escáner de fotos con IA.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setManualName(searchQuery);
                          setIsManualMode(true);
                        }}
                        className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                      >
                        Crear Alimento Personalizado
                      </button>
                    </div>
                  ) : (
                    filteredFoods.map((food) => (
                      <button
                        key={food.id}
                        type="button"
                        onClick={() => handleSelectFood(food)}
                        className="w-full text-left p-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 hover:border-emerald-500/70 dark:hover:border-emerald-500/70 hover:bg-emerald-50/20 dark:hover:bg-emerald-950/10 transition-all flex items-center justify-between group"
                      >
                        <div className="pr-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {food.name}
                            </span>
                            {food.popular && (
                              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                Habitual
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block mt-0.5">
                            Porción estándar: {food.gramsPerUnit}g ({food.unitName}) · {food.category}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <span className="text-xs font-black text-zinc-900 dark:text-zinc-100 block">
                              {Math.round((food.per100g.calories * food.gramsPerUnit) / 100)} kcal
                            </span>
                            <span className="text-[10px] text-zinc-400">
                              {((food.per100g.protein * food.gramsPerUnit) / 100).toFixed(1)}g P · {((food.per100g.carbs * food.gramsPerUnit) / 100).toFixed(1)}g C
                            </span>
                          </div>
                          <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition-colors">
                            <ChevronRight className="w-3.5 h-3.5" />
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          ) : (
            /* Manual Entry Form */
            <form onSubmit={handleAddManualFood} className="space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  Ingreso Manual Personalizado
                </span>
                <button
                  type="button"
                  onClick={() => setIsManualMode(false)}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  Volver al buscador
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1" htmlFor="manual-name">
                  Nombre del alimento o plato *
                </label>
                <input
                  type="text"
                  id="manual-name"
                  required
                  placeholder="Ej: Empanada casera de jamón y choclo"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1" htmlFor="manual-desc">
                  Porción / Descripción
                </label>
                <input
                  type="text"
                  id="manual-desc"
                  placeholder="Ej: 1 unidad mediana (120g)"
                  value={manualPortionDesc}
                  onChange={(e) => setManualPortionDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1" htmlFor="manual-cal">
                    Calorías (kcal) *
                  </label>
                  <input
                    type="number"
                    id="manual-cal"
                    required
                    min={0}
                    placeholder="250"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-1" htmlFor="manual-pro">
                    Proteínas (g)
                  </label>
                  <input
                    type="number"
                    id="manual-pro"
                    min={0}
                    step="0.1"
                    placeholder="15"
                    value={manualProtein}
                    onChange={(e) => setManualProtein(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1" htmlFor="manual-carb">
                    Carbos (g)
                  </label>
                  <input
                    type="number"
                    id="manual-carb"
                    min={0}
                    step="0.1"
                    placeholder="30"
                    value={manualCarbs}
                    onChange={(e) => setManualCarbs(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1" htmlFor="manual-fat">
                    Grasas (g)
                  </label>
                  <input
                    type="number"
                    id="manual-fat"
                    min={0}
                    step="0.1"
                    placeholder="8"
                    value={manualFat}
                    onChange={(e) => setManualFat(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs font-bold text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="btn-save-manual-food"
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 mt-4"
              >
                <Check className="w-4 h-4" />
                <span>Guardar Alimento en {mealLabels[mealType]?.title}</span>
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        {!isManualMode && (
          <div className="px-5 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between text-xs shrink-0">
            <span className="text-[11px] text-zinc-500">
              ¿No encuentras el alimento exacto?
            </span>
            <button
              type="button"
              id="switch-to-manual-mode-btn"
              onClick={() => setIsManualMode(true)}
              className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Ingresar valores manualmente</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
