import React, { useState } from 'react';
import { Search, Plus, Utensils, Check, Sparkles } from 'lucide-react';
import { FoodItem, MealType } from '../types';

interface FoodsSectionProps {
  onAddFoodToDiary: (item: Omit<FoodItem, 'id'>, mealType: MealType) => void;
}

interface FoodDatabaseEntry {
  name: string;
  category: string;
  portion: string;
  amountGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const FOODS_DATABASE: FoodDatabaseEntry[] = [
  { name: 'Pechuga de pollo (cruda/plancha)', category: 'Proteína', portion: '150g', amountGrams: 150, calories: 165, protein: 35, carbs: 0, fat: 3 },
  { name: 'Huevos enteros (clase M)', category: 'Proteína', portion: '2 unidades (110g)', amountGrams: 110, calories: 155, protein: 13, carbs: 1, fat: 11 },
  { name: 'Claras de huevo pasteurizadas', category: 'Proteína', portion: '200ml', amountGrams: 200, calories: 96, protein: 22, carbs: 1, fat: 0 },
  { name: 'Salmón fresco', category: 'Pescado', portion: '150g', amountGrams: 150, calories: 312, protein: 30, carbs: 0, fat: 20 },
  { name: 'Atún al natural en lata', category: 'Pescado', portion: '1 lata escurrida (80g)', amountGrams: 80, calories: 88, protein: 20, carbs: 0, fat: 1 },
  { name: 'Lentejas cocidas', category: 'Legumbres', portion: '1 plato hondo (200g)', amountGrams: 200, calories: 230, protein: 18, carbs: 40, fat: 1 },
  { name: 'Avena en copos suaves', category: 'Carbohidratos', portion: '50g (ración estándar)', amountGrams: 50, calories: 185, protein: 7, carbs: 32, fat: 3 },
  { name: 'Arroz basmati / jazmín (en crudo)', category: 'Carbohidratos', portion: '80g', amountGrams: 80, calories: 280, protein: 6, carbs: 62, fat: 1 },
  { name: 'Patata / Papa al horno', category: 'Carbohidratos', portion: '1 unidad mediana (200g)', amountGrams: 200, calories: 160, protein: 4, carbs: 36, fat: 0 },
  { name: 'Plátano / Banana maduro', category: 'Frutas', portion: '1 pieza mediana (120g)', amountGrams: 120, calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Manzana verde o roja', category: 'Frutas', portion: '1 unidad (180g)', amountGrams: 180, calories: 95, protein: 0, carbs: 25, fat: 0 },
  { name: 'Aguacate / Palta fresca', category: 'Grasas Saludables', portion: 'Media unidad (100g)', amountGrams: 100, calories: 160, protein: 2, carbs: 9, fat: 15 },
  { name: 'Aceite de oliva virgen extra', category: 'Grasas Saludables', portion: '1 cucharada sopera (12ml)', amountGrams: 12, calories: 108, protein: 0, carbs: 0, fat: 12 },
  { name: 'Nueces peladas naturales', category: 'Frutos Secos', portion: '1 puñado (30g)', amountGrams: 30, calories: 195, protein: 4, carbs: 4, fat: 19 },
  { name: 'Yogur griego natural 0% grasa', category: 'Lácteos', portion: '1 tarrina (125g)', amountGrams: 125, calories: 73, protein: 12, carbs: 4, fat: 0 },
  { name: 'Queso fresco batido / Quark', category: 'Lácteos', portion: '200g', amountGrams: 200, calories: 110, protein: 18, carbs: 7, fat: 0 },
  { name: 'Proteína Whey en polvo (80%)', category: 'Suplementos', portion: '1 cazo (30g)', amountGrams: 30, calories: 118, protein: 24, carbs: 2, fat: 1 },
];

export const FoodsSection: React.FC<FoodsSectionProps> = ({ onAddFoodToDiary }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [targetMeal, setTargetMeal] = useState<MealType>('lunch');
  const [addedItemName, setAddedItemName] = useState<string | null>(null);

  const categories = ['all', 'Proteína', 'Carbohidratos', 'Grasas Saludables', 'Frutas', 'Pescado', 'Lácteos'];

  const filtered = FOODS_DATABASE.filter((f) => {
    const matchesQuery = f.name.toLowerCase().includes(query.toLowerCase());
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    return matchesQuery && matchesCat;
  });

  const handleAdd = (food: FoodDatabaseEntry) => {
    onAddFoodToDiary(
      {
        name: food.name,
        portionDescription: food.portion,
        amountGrams: food.amountGrams,
        calories: food.calories,
        proteinGrams: food.protein,
        carbsGrams: food.carbs,
        fatGrams: food.fat,
        mealType: targetMeal,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      targetMeal
    );

    setAddedItemName(food.name);
    setTimeout(() => {
      setAddedItemName(null);
    }, 2000);
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

          {/* Destination meal selector */}
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

        {/* Search input & category chips */}
        <div className="mt-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre de alimento..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {categories.map((cat) => (
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
          Añadido al diario: {addedItemName}
        </div>
      )}

      {/* Grid of foods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {filtered.map((food, idx) => (
          <div
            key={idx}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl flex flex-col justify-between hover:border-emerald-500/40 transition-all shadow-xs"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                  {food.category}
                </span>
                <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">
                  {food.calories} kcal
                </span>
              </div>
              <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 mt-1">
                {food.name}
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                {food.portion}
              </p>
            </div>

            <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="text-[10px] text-zinc-600 dark:text-zinc-400 space-x-2">
                <span className="text-indigo-600 font-semibold">{food.protein}g P</span>
                <span className="text-amber-600 font-semibold">{food.carbs}g C</span>
                <span className="text-rose-600 font-semibold">{food.fat}g G</span>
              </div>

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
        ))}
      </div>
    </div>
  );
};
