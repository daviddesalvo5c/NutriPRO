/**
 * User Saved Foods & AI Scanned Foods Library Storage
 * Manages foods that the user has scanned with Gemini AI or created manually,
 * so they can be repeated, adjusted, and accessed across breakfast, lunch, dinner, and snacks.
 */

export interface ScannedFoodComponent {
  name: string;
  amountGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

export interface UserSavedFood {
  id: string;
  name: string;
  category: string;
  amountGrams: number;
  portionDescription: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  components?: ScannedFoodComponent[];
  scannedAt: string;
  timesUsed: number;
  source: 'ai_scan' | 'barcode' | 'manual';
}

function getStorageKey(email: string): string {
  const clean = (email || 'anonymous').trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  return `nutrifit_saved_foods_${clean}`;
}

/**
 * Loads all user saved foods and scanned meals
 */
export function loadUserSavedFoods(email: string = ''): UserSavedFood[] {
  const key = getStorageKey(email);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => new Date(b.scannedAt || 0).getTime() - new Date(a.scannedAt || 0).getTime());
    }
    return [];
  } catch (err) {
    console.error('Error loading saved foods:', err);
    return [];
  }
}

/**
 * Saves a food item into the user's permanent library
 */
export function saveFoodToUserLibrary(
  food: {
    name: string;
    category?: string;
    amountGrams: number;
    portionDescription?: string;
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
    components?: ScannedFoodComponent[];
    source?: 'ai_scan' | 'barcode' | 'manual';
  },
  email: string = ''
): UserSavedFood {
  const key = getStorageKey(email);
  const existing = loadUserSavedFoods(email);

  const grams = Math.max(1, food.amountGrams || 100);
  const factor = 100 / grams;

  const per100g = {
    calories: Math.round(food.calories * factor),
    protein: Math.round(food.proteinGrams * factor * 10) / 10,
    carbs: Math.round(food.carbsGrams * factor * 10) / 10,
    fat: Math.round(food.fatGrams * factor * 10) / 10,
  };

  // Check if an item with identical name already exists to avoid duplicates
  const existingIdx = existing.findIndex(
    (item) => item.name.trim().toLowerCase() === food.name.trim().toLowerCase()
  );

  const newSavedFood: UserSavedFood = {
    id: existingIdx !== -1 ? existing[existingIdx].id : `scanned_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: food.name.trim(),
    category: food.category || 'Escáner IA',
    amountGrams: food.amountGrams,
    portionDescription: food.portionDescription || `${food.amountGrams}g`,
    calories: Math.round(food.calories),
    proteinGrams: Math.round(food.proteinGrams * 10) / 10,
    carbsGrams: Math.round(food.carbsGrams * 10) / 10,
    fatGrams: Math.round(food.fatGrams * 10) / 10,
    per100g,
    components: food.components || [],
    scannedAt: new Date().toISOString(),
    timesUsed: existingIdx !== -1 ? (existing[existingIdx].timesUsed || 1) + 1 : 1,
    source: food.source || 'ai_scan',
  };

  let updatedList: UserSavedFood[];
  if (existingIdx !== -1) {
    updatedList = [...existing];
    updatedList[existingIdx] = newSavedFood;
  } else {
    updatedList = [newSavedFood, ...existing];
  }

  // Also save individual components if present (e.g., if dish is "Bife con pastas", save "Bife" and "Pastas" separately too)
  if (food.components && food.components.length > 1) {
    for (const comp of food.components) {
      if (comp.name && comp.amountGrams > 0) {
        const compExistingIdx = updatedList.findIndex(
          (item) => item.name.trim().toLowerCase() === comp.name.trim().toLowerCase()
        );
        const compFactor = 100 / Math.max(1, comp.amountGrams);
        const compPer100g = {
          calories: Math.round(comp.calories * compFactor),
          protein: Math.round(comp.proteinGrams * compFactor * 10) / 10,
          carbs: Math.round(comp.carbsGrams * compFactor * 10) / 10,
          fat: Math.round(comp.fatGrams * compFactor * 10) / 10,
        };

        const compSaved: UserSavedFood = {
          id: compExistingIdx !== -1 ? updatedList[compExistingIdx].id : `comp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: comp.name.trim(),
          category: 'Ingrediente Escaneado',
          amountGrams: comp.amountGrams,
          portionDescription: `${comp.amountGrams}g`,
          calories: Math.round(comp.calories),
          proteinGrams: Math.round(comp.proteinGrams * 10) / 10,
          carbsGrams: Math.round(comp.carbsGrams * 10) / 10,
          fatGrams: Math.round(comp.fatGrams * 10) / 10,
          per100g: compPer100g,
          scannedAt: new Date().toISOString(),
          timesUsed: 1,
          source: 'ai_scan',
        };

        if (compExistingIdx !== -1) {
          updatedList[compExistingIdx] = compSaved;
        } else {
          updatedList.push(compSaved);
        }
      }
    }
  }

  try {
    localStorage.setItem(key, JSON.stringify(updatedList));
  } catch (err) {
    console.error('Error saving food to library:', err);
  }

  return newSavedFood;
}

/**
 * Remove a food from the library
 */
export function removeFoodFromUserLibrary(foodId: string, email: string = ''): void {
  const key = getStorageKey(email);
  const existing = loadUserSavedFoods(email);
  const updated = existing.filter((f) => f.id !== foodId);
  try {
    localStorage.setItem(key, JSON.stringify(updated));
  } catch (err) {
    console.error('Error removing food from library:', err);
  }
}

/**
 * Calculates scaled nutrition based on grams
 */
export function scaleUserSavedFood(food: UserSavedFood, targetGrams: number) {
  const grams = Math.max(1, targetGrams);
  const factor = grams / 100;
  return {
    amountGrams: grams,
    calories: Math.round(food.per100g.calories * factor),
    proteinGrams: Math.round(food.per100g.protein * factor * 10) / 10,
    carbsGrams: Math.round(food.per100g.carbs * factor * 10) / 10,
    fatGrams: Math.round(food.per100g.fat * factor * 10) / 10,
  };
}
