import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Utensils, Check, Sparkles, Scale, Hash, Camera, Trash2, Bookmark, Flame } from 'lucide-react';
import { FoodItem, MealType } from '../types';
import { 
  ARGENTINE_FOOD_DATABASE, 
  ArgentineFood, 
  searchArgentineFoods, 
  calculateArgentineFoodNutrition 
} from '../data/argentineFoodDatabase';
import { AddArgentineFoodModal } from './AddArgentineFoodModal';
import { 
  loadUserSavedFoods, 
  UserSavedFood, 
  removeFoodFromUserLibrary, 
  scaleUserSavedFood 
} from '../utils/userFoodsStorage';
import { formatGrams } from '../utils/nutritionCalculations';

interface FoodsSectionProps {
  onAddFoodToDiary: (item: Omit<FoodItem, 'id'>, mealType: MealType) => void;
  userEmail?: string;
}

export const FoodsSection: React.FC<FoodsSectionProps> = ({ onAddFoodToDiary, userEmail = '' }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [targetMeal, setTargetMeal] = useState<MealType>('lunch');
  const [addedItemName, setAddedItemName] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savedFoods, setSavedFoods] = useState<UserSavedFood[]>(() => loadUserSavedFoods(userEmail));

  useEffect(() => {
    setSavedFoods(loadUserSavedFoods(userEmail));
  }, [userEmail]);

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'scanned', label: `📸 Mis Escaneos (${savedFoods.length})` },
    { id: 'Huevos y Desayuno', label: '🍳 Huevos y Desayuno' },
    { id: 'Carnes y Asado', label: '🥩 Carnes y Asado' },
    { id: 'Pastas y Arroces', label: '🍝 Pastas y Granos' },
    { id: 'Lácteos y Quesos', label: '🧀 Lácteos y Quesos' },
    { id: 'Panificados y Dulces', label: '🥐 Panificados y Dulces' },
    { id: 'Guarniciones y Verduras', label: '🥗 Guarniciones' },
    { id: 'Comidas Típicas Argentinas', label: '🥟 Comidas Típicas' },
    { id: 'Frutas', label: '🍌 Frutas' },
    { id: 'Snacks y Suplementos', label: '⚡ Suplementos' },
  ];

  const filteredArgentine = useMemo(() => {
    if (selectedCategory === 'scanned') return [];
    return searchArgentineFoods(query, selectedCategory);
  }, [query, selectedCategory]);

  const filteredSavedFoods = useMemo(() => {
    if (selectedCategory !== 'all' && selectedCategory !== 'scanned') return [];
    if (!query.trim()) return savedFoods;
    const q = query.toLowerCase();
    return savedFoods.filter(
      (f) => f.name.toLowerCase().includes(q) || f.category?.toLowerCase().includes(q)
    );
  }, [savedFoods, query, selectedCategory]);

  const handleQuickAdd = (food: ArgentineFood) => {
    const nutrition = calculateArgentineFoodNutrition(food, 1, 'unit');
    onAddFoodToDiary(
      {
        name: food.name,
        portionDescription: nutrition.portionDescription,
        amountGrams: nutrition.amountGrams,
        calories: nutrition.calories,
        proteinGrams: nutrition.proteinGrams,
        carbsGrams: nutrition.carbsGrams,
        fatGrams: nutrition.fatGrams,
        mealType: targetMeal,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      targetMeal
    );

    setAddedItemName(`${food.name} (${nutrition.portionDescription})`);
    setTimeout(() => {
      setAddedItemName(null);
    }, 2500);
  };

  const handleAddSavedFood = (saved: UserSavedFood) => {
    onAddFoodToDiary(
      {
        name: saved.name,
        portionDescription: saved.portionDescription || `${saved.amountGrams}g`,
        amountGrams: saved.amountGrams,
        calories: saved.calories,
        proteinGrams: saved.proteinGrams,
        carbsGrams: saved.carbsGrams,
        fatGrams: saved.fatGrams,
        mealType: targetMeal,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      targetMeal
    );

    setAddedItemName(`${saved.name} (${saved.amountGrams}g)`);
    setTimeout(() => {
      setAddedItemName(null);
    }, 2500);
  };

  const handleAddComponent = (comp: { name: string; amountGrams: number; calories: number; proteinGrams: number; carbsGrams: number; fatGrams: number }) => {
    onAddFoodToDiary(
      {
        name: comp.name,
        portionDescription: `${comp.amountGrams}g`,
        amountGrams: comp.amountGrams,
        calories: comp.calories,
        proteinGrams: comp.proteinGrams,
        carbsGrams: comp.carbsGrams,
        fatGrams: comp.fatGrams,
        mealType: targetMeal,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      targetMeal
    );

    setAddedItemName(`+ ${comp.name} (${comp.amountGrams}g)`);
    setTimeout(() => {
      setAddedItemName(null);
    }, 2500);
  };

  const handleDeleteSavedFood = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFoodFromUserLibrary(id, userEmail);
    setSavedFoods(loadUserSavedFoods(userEmail));
  };

  const mealLabels: Record<MealType, string> = {
    breakfast: '☕ Desayuno',
    lunch: '🍽️ Almuerzo',
    dinner: '🌙 Cena',
    snacks: '🍎 Snacks',
  };

  return (
    <div className="space-y-6 pb-12" id="foods-screen">
      {/* Header & Search */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-emerald-600" />
              Catálogo de Alimentos Saludables
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Selecciona alimentos y agrégalos a tu diario en cualquier momento
            </p>
          </div>

          {/* Destination meal selector & Open Modal Button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 pl-2">Añadir a:</span>
              {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((m) => {
                const isSelected = targetMeal === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setTargetMeal(m)}
                    className={`text-xs py-1 px-2 rounded-lg font-bold transition-all ${
                      isSelected
                        ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                    }`}
                  >
                    {mealLabels[m]}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-xs flex items-center gap-1.5 transition-all"
            >
              <Scale className="w-3.5 h-3.5" />
              <span>Calculadora de Porciones</span>
            </button>
          </div>
        </div>

        {/* Search input & category chips */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder='Buscar alimento argentino (ej: "huevo", "bife", "empanada", "dulce de leche")...'
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full font-bold shrink-0 transition-all text-[11px] ${
                  selectedCategory === cat.id
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {addedItemName && (
        <div className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 border border-emerald-300 dark:border-emerald-800 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Añadido con éxito al diario: <strong>{addedItemName}</strong></span>
        </div>
      )}

      {/* Grid of Saved & Scanned Foods (if any) */}
      {filteredSavedFoods.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <Camera className="w-4 h-4" />
              <span>Mis Alimentos Escaneados y Guardados ({filteredSavedFoods.length})</span>
            </h2>
            <span className="text-[11px] text-zinc-400">Listos para repetir o sumar porciones</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {filteredSavedFoods.map((saved) => (
              <div
                key={saved.id}
                className="bg-white dark:bg-zinc-900 border-2 border-emerald-500/30 hover:border-emerald-500 dark:border-emerald-500/20 p-4 rounded-2xl flex flex-col justify-between shadow-xs hover:shadow-md transition-all relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-300 bg-emerald-100/70 dark:bg-emerald-950 px-2 py-0.5 rounded tracking-wider flex items-center gap-1">
                      <Camera className="w-3 h-3" />
                      <span>{saved.category || 'Escaneado'}</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 block">
                          {saved.calories} kcal
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          {saved.amountGrams}g
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSavedFood(saved.id, e)}
                        className="text-zinc-300 hover:text-rose-600 dark:text-zinc-600 dark:hover:text-rose-400 p-1 rounded-lg transition-colors"
                        title="Quitar de mis alimentos guardados"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 mt-2">
                    {saved.name}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Por 100g: {saved.per100g?.calories || 0} kcal · {saved.per100g?.protein || 0}g P · {saved.per100g?.carbs || 0}g C · {saved.per100g?.fat || 0}g G
                  </p>

                  {/* Sub-components / ingredients pills if scanned dish has parts (e.g. bife + pastas) */}
                  {saved.components && saved.components.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-1">
                      <span className="text-[10px] font-bold text-zinc-400 block">Sumar ingrediente individual:</span>
                      <div className="flex flex-wrap gap-1">
                        {saved.components.map((comp, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleAddComponent(comp)}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-zinc-100 hover:bg-emerald-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-emerald-950 transition-colors flex items-center gap-1 border border-zinc-200 dark:border-zinc-700"
                            title={`Sumar solo ${comp.name} (${comp.amountGrams}g, ${comp.calories} kcal)`}
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>{comp.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <div className="text-[10px] text-zinc-600 dark:text-zinc-400 space-x-1.5 font-bold">
                    <span className="text-indigo-600 dark:text-indigo-400">{formatGrams(saved.proteinGrams)}g P</span>
                    <span>·</span>
                    <span className="text-amber-600 dark:text-amber-400">{formatGrams(saved.carbsGrams)}g C</span>
                    <span>·</span>
                    <span className="text-rose-600 dark:text-rose-400">{formatGrams(saved.fatGrams)}g G</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddSavedFood(saved)}
                    className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl transition-all flex items-center gap-1 shadow-xs active:scale-95"
                    title={`Añadir plato completo a ${mealLabels[targetMeal]}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Añadir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Separator if both exist */}
      {filteredSavedFoods.length > 0 && filteredArgentine.length > 0 && (
        <div className="pt-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
            <Utensils className="w-4 h-4" />
            <span>Base de Alimentos Típicos Argentinos</span>
          </h2>
        </div>
      )}

      {/* Grid of Argentine foods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filteredArgentine.map((food) => {
          const cal100g = food.per100g.calories;
          const calUnit = Math.round((cal100g * food.gramsPerUnit) / 100);
          const protUnit = ((food.per100g.protein * food.gramsPerUnit) / 100).toFixed(1);
          const carbsUnit = ((food.per100g.carbs * food.gramsPerUnit) / 100).toFixed(1);
          const fatUnit = ((food.per100g.fat * food.gramsPerUnit) / 100).toFixed(1);

          return (
            <div
              key={food.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/50 hover:shadow-md transition-all shadow-xs"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded tracking-wider">
                    {food.category}
                  </span>
                  <div className="text-right">
                    <span className="text-xs font-black text-zinc-900 dark:text-zinc-50 block">
                      {calUnit} kcal
                    </span>
                    <span className="text-[10px] text-zinc-400 block">
                      por 1 {food.unitName} ({food.gramsPerUnit}g)
                    </span>
                  </div>
                </div>

                <h3 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-100 mt-2">
                  {food.name}
                </h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  100g: {cal100g} kcal · {food.per100g.protein}g P · {food.per100g.carbs}g C · {food.per100g.fat}g G
                </p>
              </div>

              <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-[10px] text-zinc-600 dark:text-zinc-400 space-x-1.5 font-bold">
                  <span className="text-indigo-600 dark:text-indigo-400">{protUnit}g P</span>
                  <span>·</span>
                  <span className="text-amber-600 dark:text-amber-400">{carbsUnit}g C</span>
                  <span>·</span>
                  <span className="text-rose-600 dark:text-rose-400">{fatUnit}g G</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleQuickAdd(food)}
                  className="py-1 px-3 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-300 text-xs font-black rounded-xl transition-all flex items-center gap-1 border border-emerald-200 dark:border-emerald-800 active:scale-95"
                  title={`Añadir 1 ${food.unitName} a ${mealLabels[targetMeal]}`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+1 {food.unitName}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Argentine Food Modal */}
      {isModalOpen && (
        <AddArgentineFoodModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          mealType={targetMeal}
          onSaveFoodItem={(item) => {
            onAddFoodToDiary(item, targetMeal);
            setIsModalOpen(false);
            setAddedItemName(`${item.name} (${item.portionDescription})`);
            setTimeout(() => setAddedItemName(null), 2500);
          }}
        />
      )}
    </div>
  );
};
