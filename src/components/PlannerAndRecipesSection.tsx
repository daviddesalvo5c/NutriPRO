import React, { useState } from 'react';
import { 
  Sparkles, 
  ChefHat, 
  ShoppingCart, 
  Plus, 
  Check, 
  Clock, 
  Flame, 
  Copy, 
  RotateCcw, 
  BookOpen, 
  Search, 
  ArrowRight,
  Filter,
  CheckCircle2,
  Trash2,
  Lock,
  Crown
} from 'lucide-react';
import { UserProfile, FoodItem, MealType, GoalType, SubscriptionTier } from '../types';
import { getProfileCalculations } from '../utils/nutritionCalculations';
import { hasUserProAccess } from '../utils/storage';

interface PlannerAndRecipesSectionProps {
  profile: UserProfile;
  onAddFoodToDiary: (item: Omit<FoodItem, 'id'>, mealType: MealType) => void;
  onAddMultipleFoodsToDiary: (items: { item: Omit<FoodItem, 'id'>; mealType: MealType }[]) => void;
  onNavigateToDiary: () => void;
  userEmail?: string;
  currentTier?: SubscriptionTier;
  onOpenPlansModal?: () => void;
}

interface PlannedMeal {
  mealType: MealType;
  mealLabel: string;
  name: string;
  portion: string;
  amountGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
}

interface Recipe {
  id: string;
  title: string;
  category: MealType;
  goal: GoalType | 'all';
  prepTime: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving: string;
  ingredients: string[];
  instructions: string[];
}

const RECIPES_CATALOGUE: Recipe[] = [
  {
    id: 'r_pancake_oat',
    title: 'Tortitas de Avena y Claras Proteicas',
    category: 'breakfast',
    goal: 'deficit',
    prepTime: '12 min',
    calories: 290,
    protein: 26,
    carbs: 35,
    fat: 4,
    serving: '3 tortitas medianas',
    ingredients: ['60g avena molida', '150ml claras de huevo', '1 cda canela en polvo', '1 pizca de estevia', '50g arándanos frescos'],
    instructions: [
      'Bate las claras con la avena molida y la canela hasta que quede homogéneo.',
      'Calienta una sartén antiadherente a fuego medio con unas gotas de aceite.',
      'Vierte 1/3 de la mezcla y cocina 2 minutos por lado hasta dorar.',
      'Sirve decorado con los arándanos frescos.'
    ]
  },
  {
    id: 'r_avocado_toast_egg',
    title: 'Tostada de Centeno con Aguacate y Huevo Poché',
    category: 'breakfast',
    goal: 'maintenance',
    prepTime: '10 min',
    calories: 340,
    protein: 16,
    carbs: 28,
    fat: 18,
    serving: '1 tostada grande',
    ingredients: ['1 rebanada pan de centeno 100% (60g)', '50g aguacate maduro', '1 huevo entero grande', 'Semillas de chía o sésamo', 'Pizca de sal marina y pimienta'],
    instructions: [
      'Tuesta la rebanada de pan de centeno.',
      'Tritura el aguacate con un tenedor, sal y pimienta, y úntalo en el pan.',
      'Pocha o haz a la plancha el huevo a la sartén con la yema tierna.',
      'Coloca el huevo encima y espolvorea las semillas.'
    ]
  },
  {
    id: 'r_salmon_quinoa',
    title: 'Salmón a la Plancha con Quinoa y Espárragos',
    category: 'lunch',
    goal: 'deficit',
    prepTime: '20 min',
    calories: 460,
    protein: 38,
    carbs: 36,
    fat: 17,
    serving: '1 plato completo',
    ingredients: ['160g lomo de salmón fresco', '50g quinoa en crudo', '1 manojo espárragos verdes', '1 cdta aceite de oliva virgen extra', 'Zumo de medio limón'],
    instructions: [
      'Cuece la quinoa en agua con sal durante 12-14 minutos y escurre.',
      'Cocina los espárragos a la plancha con unas gotas de aceite de oliva hasta que estén tiernos.',
      'Marca el salmón en la misma plancha caliente 3 minutos por lado.',
      'Emplata la quinoa como base, el salmón encima y rocía con limón.'
    ]
  },
  {
    id: 'r_beef_rice_bowl',
    title: 'Bowl de Ternera Magra con Arroz Jazmín y Brócoli',
    category: 'lunch',
    goal: 'surplus',
    prepTime: '18 min',
    calories: 590,
    protein: 46,
    carbs: 68,
    fat: 14,
    serving: '1 bowl potente',
    ingredients: ['180g picada de ternera magra (<5% grasa)', '90g arroz jazmín o basmati', '150g brócoli al vapor', '1 cda salsa de soja baja en sal', '1 cdta aceite de sésamo'],
    instructions: [
      'Cocina el arroz jazmín al vapor.',
      'Saltea la ternera a fuego vivo con especias (ajo, pimentón) y la salsa de soja.',
      'Cuece el brócoli al dente durante 4 minutos.',
      'Monta el bowl con el arroz de base, la carne y el brócoli.'
    ]
  },
  {
    id: 'r_chicken_fajita_bowl',
    title: 'Fajita Bowl de Pollo Especiado con Pimientos',
    category: 'dinner',
    goal: 'deficit',
    prepTime: '15 min',
    calories: 380,
    protein: 42,
    carbs: 22,
    fat: 12,
    serving: '1 plato hondo',
    ingredients: ['180g pechuga de pollo en tiras', '1 pimiento rojo en tiras', '1 pimiento verde', 'Media cebolla morada', '1 cdta pimentón dulce y comino', '1 cdta aceite de oliva'],
    instructions: [
      'Saltea la cebolla y los pimientos a fuego medio-alto 5 minutos.',
      'Añade las tiras de pollo y las especias, salteando hasta dorar completamente.',
      'Sirve caliente con un toque de cilantro fresco o lima.'
    ]
  },
  {
    id: 'r_yogurt_berries_snack',
    title: 'Bowl de Yogur Griego 0% con Frutos Rojos y Nueces',
    category: 'snacks',
    goal: 'maintenance',
    prepTime: '5 min',
    calories: 220,
    protein: 20,
    carbs: 16,
    fat: 8,
    serving: '1 tazón',
    ingredients: ['180g yogur griego natural 0%', '60g mezcla de frambuesas y arándanos', '15g nueces troceadas', 'Canela al gusto'],
    instructions: [
      'Coloca el yogur griego en un bol.',
      'Agrega los frutos rojos por encima y las nueces troceadas.',
      'Finaliza con un toque de canela.'
    ]
  },
];

export const PlannerAndRecipesSection: React.FC<PlannerAndRecipesSectionProps> = ({
  profile,
  onAddFoodToDiary,
  onAddMultipleFoodsToDiary,
  onNavigateToDiary,
  userEmail = '',
  currentTier = 'free' as SubscriptionTier,
  onOpenPlansModal,
}) => {
  const isProOrVip = hasUserProAccess(userEmail, currentTier);
  const [activeSubTab, setActiveSubTab] = useState<'planner' | 'recipes' | 'shopping'>('planner');
  const [copiedShopping, setCopiedShopping] = useState(false);
  const [addedSuccessMessage, setAddedSuccessMessage] = useState<string | null>(null);

  // Recipes filter state
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeGoalFilter, setRecipeGoalFilter] = useState<string>('all');
  const [recipeMealFilter, setRecipeMealFilter] = useState<string>('all');

  // Shopping List checked items & custom items
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [customShoppingItem, setCustomShoppingItem] = useState('');
  const [customShoppingList, setCustomShoppingList] = useState<string[]>([]);

  const calcs = getProfileCalculations(profile);

  // Generate an intelligent meal plan mathematically matched to the user's calorie and macro targets
  const generatePlan = (): PlannedMeal[] => {
    const targetCals = calcs.targetCalories;
    const targetProt = calcs.proteinGrams;

    // Split target across meals
    const breakfastCals = Math.round(targetCals * 0.25);
    const lunchCals = Math.round(targetCals * 0.35);
    const dinnerCals = Math.round(targetCals * 0.25);
    const snackCals = targetCals - (breakfastCals + lunchCals + dinnerCals);

    const breakfastProt = Math.round(targetProt * 0.25);
    const lunchProt = Math.round(targetProt * 0.35);
    const dinnerProt = Math.round(targetProt * 0.25);
    const snackProt = targetProt - (breakfastProt + lunchProt + dinnerProt);

    return [
      {
        mealType: 'breakfast',
        mealLabel: 'Desayuno Energético',
        name: 'Bowl de Avena con Claras, Plátano y Chía',
        portion: '1 tazón completo',
        amountGrams: 280,
        calories: breakfastCals,
        protein: breakfastProt,
        carbs: Math.round(breakfastCals * 0.5 / 4),
        fat: Math.round(breakfastCals * 0.2 / 9),
        ingredients: ['60g copos de avena', '150ml claras de huevo', '1 plátano maduro', '10g semillas de chía', 'Canela'],
      },
      {
        mealType: 'lunch',
        mealLabel: 'Comida / Almuerzo Principal',
        name: 'Pechuga de Pollo con Arroz Basmati y Verduras Salteadas',
        portion: '1 plato principal',
        amountGrams: 350,
        calories: lunchCals,
        protein: lunchProt,
        carbs: Math.round(lunchCals * 0.45 / 4),
        fat: Math.round(lunchCals * 0.2 / 9),
        ingredients: ['180g pechuga de pollo', '80g arroz basmati', '150g calabacín y zanahoria', '10ml aceite de oliva virgen extra'],
      },
      {
        mealType: 'snacks',
        mealLabel: 'Merienda Saludable',
        name: 'Yogur Griego 0% con Nueces y Manzana',
        portion: '1 ración',
        amountGrams: 220,
        calories: snackCals,
        protein: snackProt,
        carbs: Math.round(snackCals * 0.4 / 4),
        fat: Math.round(snackCals * 0.3 / 9),
        ingredients: ['150g yogur griego 0%', '20g nueces naturales', '1 manzana troceada'],
      },
      {
        mealType: 'dinner',
        mealLabel: 'Cena Ligera & Reparadora',
        name: 'Lomo de Salmón / Pescado Blanco con Espárragos y Ensalada',
        portion: '1 plato ligero',
        amountGrams: 320,
        calories: dinnerCals,
        protein: dinnerProt,
        carbs: Math.round(dinnerCals * 0.25 / 4),
        fat: Math.round(dinnerCals * 0.35 / 9),
        ingredients: ['170g salmón fresco', '120g espárragos verdes', '100g tomate cherry', 'Aceite de oliva virgen extra'],
      },
    ];
  };

  const [currentPlan, setCurrentPlan] = useState<PlannedMeal[]>(generatePlan());

  const handleRegeneratePlan = () => {
    setCurrentPlan(generatePlan());
    setAddedSuccessMessage('¡Menú generado y adaptado a tus macros actuales!');
    setTimeout(() => setAddedSuccessMessage(null), 3000);
  };

  const handleAddFullPlanToDiary = () => {
    const itemsToAdd = currentPlan.map((meal) => ({
      item: {
        name: meal.name,
        portionDescription: meal.portion,
        amountGrams: meal.amountGrams,
        calories: meal.calories,
        proteinGrams: meal.protein,
        carbsGrams: meal.carbs,
        fatGrams: meal.fat,
        mealType: meal.mealType,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      mealType: meal.mealType,
    }));

    onAddMultipleFoodsToDiary(itemsToAdd);
    setAddedSuccessMessage('¡Se añadieron las 4 comidas planificadas al Diario de hoy!');
    setTimeout(() => setAddedSuccessMessage(null), 3000);
  };

  const handleAddSingleMeal = (meal: PlannedMeal) => {
    onAddFoodToDiary(
      {
        name: meal.name,
        portionDescription: meal.portion,
        amountGrams: meal.amountGrams,
        calories: meal.calories,
        proteinGrams: meal.protein,
        carbsGrams: meal.carbs,
        fatGrams: meal.fat,
        mealType: meal.mealType,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      meal.mealType
    );
    setAddedSuccessMessage(`¡Añadido ${meal.mealLabel} al diario!`);
    setTimeout(() => setAddedSuccessMessage(null), 2500);
  };

  const handleAddRecipeToDiary = (recipe: Recipe) => {
    onAddFoodToDiary(
      {
        name: recipe.title,
        portionDescription: recipe.serving,
        amountGrams: 200,
        calories: recipe.calories,
        proteinGrams: recipe.protein,
        carbsGrams: recipe.carbs,
        fatGrams: recipe.fat,
        mealType: recipe.category,
        timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      recipe.category
    );
    setAddedSuccessMessage(`¡Receta "${recipe.title}" agregada al diario en ${recipe.category}!`);
    setTimeout(() => setAddedSuccessMessage(null), 2500);
  };

  // Build combined shopping list
  const baseIngredients = currentPlan.flatMap((m) => m.ingredients);
  const allShoppingItems = Array.from(new Set([...baseIngredients, ...customShoppingList]));

  const toggleCheck = (item: string) => {
    setCheckedItems((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  const handleAddCustomShoppingItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customShoppingItem.trim()) return;
    setCustomShoppingList((prev) => [...prev, customShoppingItem.trim()]);
    setCustomShoppingItem('');
  };

  const handleCopyShoppingList = () => {
    const text = allShoppingItems
      .map((item) => `${checkedItems[item] ? '✅' : '⬜'} ${item}`)
      .join('\n');
    navigator.clipboard.writeText(`Lista de la Compra - NutriFit Pro:\n\n${text}`);
    setCopiedShopping(true);
    setTimeout(() => setCopiedShopping(false), 2000);
  };

  const filteredRecipes = RECIPES_CATALOGUE.filter((r) => {
    const matchesQuery = r.title.toLowerCase().includes(recipeSearch.toLowerCase()) ||
      r.ingredients.some((ing) => ing.toLowerCase().includes(recipeSearch.toLowerCase()));
    const matchesGoal = recipeGoalFilter === 'all' || r.goal === 'all' || r.goal === recipeGoalFilter;
    const matchesMeal = recipeMealFilter === 'all' || r.category === recipeMealFilter;
    return matchesQuery && matchesGoal && matchesMeal;
  });

  return (
    <div className="space-y-6" id="planner-recipes-section">
      {/* Success Notification Bar */}
      {addedSuccessMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>{addedSuccessMessage}</span>
          </div>
          <button
            onClick={onNavigateToDiary}
            className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[11px] hover:bg-emerald-500"
          >
            Ver Diario →
          </button>
        </div>
      )}

      {/* Header & Sub-navigation Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Nutrición Inteligente & Planificación
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Menús IA, Recetas & Lista de la Compra
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Diseñado exactamente para tu objetivo de {calcs.targetCalories} kcal diarias ({profile.goal})
            </p>
          </div>

          {/* Sub-tab Navigation */}
          <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
            <button
              onClick={() => setActiveSubTab('planner')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'planner'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Menú IA
            </button>

            <button
              onClick={() => setActiveSubTab('recipes')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'recipes'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Recetas
            </button>

            <button
              onClick={() => setActiveSubTab('shopping')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                activeSubTab === 'shopping'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Lista Compra
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 1. AI MEAL PLANNER TAB                                              */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'planner' && (
        !isProOrVip ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div className="max-w-lg mx-auto">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-300/60">
                Función Exclusiva NutriFit Pro
              </span>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
                Generador de Menús Inteligentes con IA
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                El generador de menús con IA calcula y distribuye automáticamente las 4 comidas de tu día para cumplir al gramo con tus calorías ({calcs.targetCalories} kcal) y macronutrientes.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              {onOpenPlansModal && (
                <button
                  type="button"
                  id="btn-planner-unlock-pro"
                  onClick={onOpenPlansModal}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Actualizar a NutriFit Pro ($12.999 ARS/mes)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSubTab('recipes')}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
              >
                Explorar Recetario
              </button>
            </div>
          </div>
        ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl">
            <div>
              <h3 className="text-sm font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Plan Diario de Comidas Ajustado a tus Metas
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Total acumulado del menú: {currentPlan.reduce((a, m) => a + m.calories, 0)} kcal · {currentPlan.reduce((a, m) => a + m.protein, 0)}g Proteína
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRegeneratePlan}
                className="px-3 py-2 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Regenerar con IA
              </button>

              <button
                type="button"
                onClick={handleAddFullPlanToDiary}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Check className="w-4 h-4" />
                Añadir Menú Completo al Diario
              </button>
            </div>
          </div>

          {/* Meal Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentPlan.map((meal) => (
              <div
                key={meal.mealType}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {meal.mealLabel}
                    </span>
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      {meal.calories} kcal
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {meal.name}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    Porción: {meal.portion}
                  </p>

                  {/* Macronutrients breakdown */}
                  <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 mb-3 text-center text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Proteína</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{meal.protein}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Carbohidratos</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{meal.carbs}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Grasas</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{meal.fat}g</span>
                    </div>
                  </div>

                  {/* Ingredients */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                      Ingredientes Clave:
                    </span>
                    <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-0.5 list-disc list-inside">
                      {meal.ingredients.map((ing, idx) => (
                        <li key={idx} className="truncate">{ing}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddSingleMeal(meal)}
                  className="w-full py-2 px-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 text-zinc-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 border border-zinc-200 dark:border-zinc-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir solo esta comida al Diario</span>
                </button>
              </div>
            ))}
          </div>
        </div>
        )
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 2. HEALTHY RECIPES CATALOGUE TAB                                    */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'recipes' && (
        <div className="space-y-5">
          {/* Search & Filters */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recipeSearch}
                  onChange={(e) => setRecipeSearch(e.target.value)}
                  placeholder="Buscar receta o ingrediente (ej. salmón, avena, aguacate)..."
                  className="w-full pl-10 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={recipeGoalFilter}
                  onChange={(e) => setRecipeGoalFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="all">Todos los Objetivos</option>
                  <option value="deficit">Déficit (Definición)</option>
                  <option value="maintenance">Mantenimiento</option>
                  <option value="surplus">Superávit (Volumen)</option>
                </select>

                <select
                  value={recipeMealFilter}
                  onChange={(e) => setRecipeMealFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 font-medium"
                >
                  <option value="all">Todas las Comidas</option>
                  <option value="breakfast">Desayuno</option>
                  <option value="lunch">Almuerzo</option>
                  <option value="dinner">Cena</option>
                  <option value="snacks">Snacks</option>
                </select>
              </div>
            </div>
          </div>

          {/* Recipes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-emerald-500/50 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      {recipe.category}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {recipe.prepTime}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-1 leading-snug">
                    {recipe.title}
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
                    {recipe.serving}
                  </p>

                  {/* Nutrients */}
                  <div className="flex items-center justify-between py-2 px-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 mb-3 text-xs">
                    <div>
                      <span className="text-[10px] text-zinc-400 block">Calorías</span>
                      <span className="font-extrabold text-zinc-900 dark:text-zinc-100">{recipe.calories} kcal</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">P</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">{recipe.protein}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">C</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">{recipe.carbs}g</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-400 block">G</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">{recipe.fat}g</span>
                    </div>
                  </div>

                  {/* Instructions Preview */}
                  <div className="space-y-1 mb-4">
                    <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider block">
                      Preparación Rápida:
                    </span>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 italic">
                      "{recipe.instructions.join(' ')}"
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleAddRecipeToDiary(recipe)}
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir al Diario</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 3. AUTOMATED SHOPPING LIST TAB                                      */}
      {/* ------------------------------------------------------------------- */}
      {activeSubTab === 'shopping' && (
        !isProOrVip ? (
          <div className="p-8 sm:p-10 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center mx-auto shadow-xs">
              <Lock className="w-7 h-7" />
            </div>
            <div className="max-w-lg mx-auto">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-300/60">
                Función Exclusiva NutriFit Pro
              </span>
              <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 mt-2">
                Lista de la Compra Automática
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                Genera tu lista de ingredientes automáticamente a partir de tu menú semanal y recetas planificadas, con casillas interactivas y exportación rápida.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
              {onOpenPlansModal && (
                <button
                  type="button"
                  id="btn-shopping-unlock-pro"
                  onClick={onOpenPlansModal}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5 hover:scale-105"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Actualizar a NutriFit Pro ($12.999 ARS/mes)</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setActiveSubTab('recipes')}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all"
              >
                Explorar Recetas
              </button>
            </div>
          </div>
        ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                Lista de la Compra Semanal Inteligente
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Generada automáticamente a partir de tu menú nutricional planificado
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyShoppingList}
                className="py-2 px-3.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                {copiedShopping ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>¡Copiada al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Lista</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Add custom item */}
          <form onSubmit={handleAddCustomShoppingItem} className="flex gap-2">
            <input
              type="text"
              value={customShoppingItem}
              onChange={(e) => setCustomShoppingItem(e.target.value)}
              placeholder="Añadir otro artículo al carrito (ej: café descafeinado, aceite)..."
              className="flex-1 px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>Añadir</span>
            </button>
          </form>

          {/* Checklist Items */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {allShoppingItems.map((item, idx) => {
              const isChecked = !!checkedItems[item];
              return (
                <div
                  key={idx}
                  onClick={() => toggleCheck(item)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isChecked
                      ? 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 line-through'
                      : 'bg-zinc-50/70 dark:bg-zinc-800/40 hover:bg-zinc-100 dark:hover:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium'
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                    isChecked ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className="text-xs truncate">{item}</span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500">
            <span>
              {Object.values(checkedItems).filter(Boolean).length} de {allShoppingItems.length} artículos completados
            </span>
            <button
              type="button"
              onClick={() => setCheckedItems({})}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Reiniciar casillas
            </button>
          </div>
        </div>
        )
      )}
    </div>
  );
};
