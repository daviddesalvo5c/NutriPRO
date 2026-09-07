import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Utensils, Check, ExternalLink, ShieldCheck, Trash2, BookPlus } from 'lucide-react';
import { FoodItem, MealType } from '../types';
import {
  BUILT_IN_FOODS,
  FOOD_CATEGORIES,
  LibraryFood,
  USDA_SOURCE,
  loadCustomFoods,
  saveCustomFoods,
  scaleFood,
  usdaUrl,
} from '../data/foodLibrary';
import { FoodSearchPicker } from './FoodSearchPicker';

interface FoodsSectionProps {
  onAddFoodToDiary: (item: Omit<FoodItem, 'id'>, mealType: MealType) => void;
}

/** Distintivo de procedencia: de dónde sale el valor nutricional del alimento. */
const ProvenanceBadge: React.FC<{ food: LibraryFood }> = ({ food }) => {
  if (food.provenance === 'usda' && food.fdcId) {
    return (
      <a
        href={usdaUrl(food.fdcId)}
        target="_blank"
        rel="noopener noreferrer"
        title={`Verificado en USDA FoodData Central — ${food.sourceName || ''}`}
        className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:underline"
      >
        <ShieldCheck className="w-2.5 h-2.5" />
        USDA
        <ExternalLink className="w-2 h-2" />
      </a>
    );
  }

  if (food.provenance === 'custom') {
    return (
      <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
        Mío
      </span>
    );
  }

  return (
    <span
      title="Valor de composición media, sin verificar contra una fuente institucional"
      className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
    >
      Referencia
    </span>
  );
};

export const FoodsSection: React.FC<FoodsSectionProps> = ({ onAddFoodToDiary }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [targetMeal, setTargetMeal] = useState<MealType>('lunch');
  const [addedItemName, setAddedItemName] = useState<string | null>(null);
  const [customFoods, setCustomFoods] = useState<LibraryFood[]>([]);
  const [showAddPanel, setShowAddPanel] = useState(false);

  useEffect(() => {
    setCustomFoods(loadCustomFoods());
  }, []);

  const allFoods = useMemo(() => [...customFoods, ...BUILT_IN_FOODS], [customFoods]);

  const filtered = allFoods.filter((f) => {
    const matchesQuery = f.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat =
      selectedCategory === 'all' ||
      (selectedCategory === 'Mis alimentos'
        ? f.provenance === 'custom'
        : f.category === selectedCategory);
    return matchesQuery && matchesCat;
  });

  const handleAdd = (food: LibraryFood) => {
    const macros = scaleFood(food, food.defaultGrams);

    onAddFoodToDiary(
      {
        name: food.name,
        portionDescription: food.defaultPortionLabel,
        amountGrams: food.defaultGrams,
        calories: macros.calories,
        proteinGrams: macros.protein,
        carbsGrams: macros.carbs,
        fatGrams: macros.fat,
        mealType: targetMeal,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      targetMeal
    );

    setAddedItemName(food.name);
    setTimeout(() => setAddedItemName(null), 2000);
  };

  /** Guarda en la biblioteca un alimento traído de la búsqueda oficial. */
  const handleSaveToLibrary = (picked: {
    name: string;
    amountGrams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    sourceUrl: string;
  }) => {
    // Se vuelve a normalizar a 100 g para guardarlo en el formato de la biblioteca.
    const factor = 100 / picked.amountGrams;
    const round1 = (v: number) => Math.round(v * 10) / 10;
    const fdcId = Number(picked.sourceUrl.match(/food-details\/(\d+)/)?.[1]) || undefined;

    const entry: LibraryFood = {
      id: `custom-${fdcId ?? Date.now()}`,
      name: picked.name,
      category: 'Mis alimentos',
      provenance: fdcId ? 'usda' : 'custom',
      fdcId,
      sourceName: picked.name,
      per100g: {
        calories: Math.round(picked.calories * factor),
        protein: round1(picked.protein * factor),
        carbs: round1(picked.carbs * factor),
        fat: round1(picked.fat * factor),
      },
      defaultGrams: picked.amountGrams,
      defaultPortionLabel: `${picked.amountGrams} g`,
    };

    setCustomFoods((prev) => {
      const next = [entry, ...prev.filter((f) => f.id !== entry.id)];
      saveCustomFoods(next);
      return next;
    });

    setAddedItemName(`${entry.name} (guardado en tu biblioteca)`);
    setTimeout(() => setAddedItemName(null), 2500);
    setShowAddPanel(false);
  };

  const handleDeleteCustom = (id: string) => {
    setCustomFoods((prev) => {
      const next = prev.filter((f) => f.id !== id);
      saveCustomFoods(next);
      return next;
    });
  };

  return (
    <div className="space-y-6 pb-12" id="foods-screen">
      {/* Header & Search */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-600" />
              Biblioteca de Alimentos
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Valores nutricionales preconfigurados. No hace falta que sepas los macros.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 pl-2">Añadir a:</span>
            {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((m) => {
              const labels = { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snacks: 'Snacks' };
              const isSelected = targetMeal === m;
              return (
                <button
                  key={m}
                  onClick={() => setTargetMeal(m)}
                  className={`text-xs py-1 px-2.5 rounded-lg font-semibold transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                  }`}
                >
                  {labels[m]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar en tu biblioteca..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowAddPanel((v) => !v)}
              className="shrink-0 px-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
            >
              <BookPlus className="w-3.5 h-3.5" />
              Añadir alimento
            </button>
          </div>

          {showAddPanel && (
            <FoodSearchPicker
              onPick={(food) =>
                handleSaveToLibrary({
                  name: food.name,
                  amountGrams: food.amountGrams,
                  calories: food.calories,
                  protein: food.protein,
                  carbs: food.carbs,
                  fat: food.fat,
                  sourceUrl: food.sourceUrl,
                })
              }
            />
          )}

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {['all', ...FOOD_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full font-medium shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                {cat === 'all' ? 'Todos' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {addedItemName && (
        <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-300 dark:border-emerald-800">
          <Check className="w-4 h-4 text-emerald-600" />
          {addedItemName}
        </div>
      )}

      {/* Grid of foods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((food) => {
          const macros = scaleFood(food, food.defaultGrams);

          return (
            <div
              key={food.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <ProvenanceBadge food={food} />
                  <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                    {macros.calories} kcal
                  </span>
                </div>
                <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1.5">
                  {food.name}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {food.defaultPortionLabel}
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {food.per100g.calories} kcal / 100 g
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <div className="text-[10px] text-zinc-600 dark:text-zinc-400 space-x-2">
                  <span className="text-indigo-600 font-semibold">{macros.protein}g P</span>
                  <span className="text-amber-600 font-semibold">{macros.carbs}g C</span>
                  <span className="text-rose-600 font-semibold">{macros.fat}g G</span>
                </div>

                <div className="flex items-center gap-1">
                  {food.category === 'Mis alimentos' && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(food.id)}
                      title="Quitar de mi biblioteca"
                      className="p-1 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleAdd(food)}
                    className="py-1 px-2.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-lg transition-all flex items-center gap-1 border border-emerald-200 dark:border-emerald-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Procedencia de los datos */}
      <div className="bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 space-y-1.5">
        <p className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">
          ¿De dónde salen estos valores?
        </p>
        <p className="text-[10.5px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
          Los alimentos marcados con{' '}
          <span className="font-bold text-emerald-700 dark:text-emerald-400">USDA</span> están
          verificados contra{' '}
          <a
            href={USDA_SOURCE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
          >
            {USDA_SOURCE.name}
          </a>{' '}
          ({USDA_SOURCE.organization}); cada uno enlaza a su ficha oficial. Los marcados como{' '}
          <span className="font-semibold">Referencia</span> son valores de composición media de uso
          común, sin respaldo institucional individual. Toda composición es orientativa: varía con
          la marca, el corte y el método de cocción.
        </p>
      </div>
    </div>
  );
};
