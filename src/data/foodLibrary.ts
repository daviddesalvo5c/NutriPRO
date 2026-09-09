/**
 * Biblioteca de alimentos.
 *
 * Cada entrada declara de dónde salen sus valores:
 *
 *  - `usda`: verificado contra USDA FoodData Central, con su `fdcId`. El dato
 *    se puede comprobar en https://fdc.nal.usda.gov/food-details/{fdcId}/nutrients
 *  - `reference`: valores de composición media de uso común, sin respaldo
 *    institucional individual. Se marcan como tales en la interfaz para no
 *    atribuirles una autoridad que no tienen.
 *
 * Todo se expresa por 100 g. La porción habitual es solo una sugerencia de
 * cantidad; los macros se calculan siempre escalando desde per100g.
 */

export type FoodProvenance = 'usda' | 'reference' | 'custom';

export interface LibraryFood {
  id: string;
  name: string;
  category: string;
  provenance: FoodProvenance;
  /** Presente cuando provenance === 'usda'. */
  fdcId?: number;
  /** Nombre original en la fuente, para poder rastrear el dato. */
  sourceName?: string;
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Cantidad sugerida al añadirlo, en gramos. */
  defaultGrams: number;
  defaultPortionLabel: string;
}

export const USDA_SOURCE = {
  name: 'USDA FoodData Central',
  organization: 'U.S. Department of Agriculture, Agricultural Research Service',
  url: 'https://fdc.nal.usda.gov/',
};

export function usdaUrl(fdcId: number): string {
  return `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`;
}

/** Verificados uno a uno contra FoodData Central (dataset SR Legacy). */
const USDA_FOODS: LibraryFood[] = [
  {
    id: 'usda-172187',
    name: 'Huevos revueltos',
    category: 'Proteína',
    provenance: 'usda',
    fdcId: 172187,
    sourceName: 'Egg, whole, cooked, scrambled',
    per100g: { calories: 149, protein: 9.99, carbs: 1.61, fat: 11 },
    defaultGrams: 120,
    defaultPortionLabel: '2 huevos revueltos (120 g)',
  },
  {
    id: 'usda-171287',
    name: 'Huevo entero crudo',
    category: 'Proteína',
    provenance: 'usda',
    fdcId: 171287,
    sourceName: 'Egg, whole, raw, fresh',
    per100g: { calories: 143, protein: 12.6, carbs: 0.72, fat: 9.51 },
    defaultGrams: 100,
    defaultPortionLabel: '2 unidades (100 g)',
  },
  {
    id: 'usda-172183',
    name: 'Clara de huevo',
    category: 'Proteína',
    provenance: 'usda',
    fdcId: 172183,
    sourceName: 'Egg, white, raw, fresh',
    per100g: { calories: 52, protein: 10.9, carbs: 0.73, fat: 0.17 },
    defaultGrams: 99,
    defaultPortionLabel: '3 claras (99 g)',
  },
  {
    id: 'usda-171098',
    name: 'Pechuga de pavo cruda',
    category: 'Proteína',
    provenance: 'usda',
    fdcId: 171098,
    sourceName: 'Turkey, whole, breast, meat only, raw',
    per100g: { calories: 114, protein: 23.7, carbs: 0.14, fat: 1.48 },
    defaultGrams: 150,
    defaultPortionLabel: '1 filete (150 g)',
  },
  {
    id: 'usda-175167',
    name: 'Salmón atlántico crudo',
    category: 'Pescado',
    provenance: 'usda',
    fdcId: 175167,
    sourceName: 'Fish, salmon, Atlantic, farmed, raw',
    per100g: { calories: 208, protein: 20.4, carbs: 0, fat: 13.4 },
    defaultGrams: 150,
    defaultPortionLabel: '1 lomo (150 g)',
  },
  {
    id: 'usda-173713',
    name: 'Merluza cruda',
    category: 'Pescado',
    provenance: 'usda',
    fdcId: 173713,
    sourceName: 'Fish, whiting, mixed species, raw',
    per100g: { calories: 90, protein: 18.3, carbs: 0, fat: 1.31 },
    defaultGrams: 150,
    defaultPortionLabel: '1 lomo (150 g)',
  },
  {
    id: 'usda-175180',
    name: 'Gambas cocidas',
    category: 'Pescado',
    provenance: 'usda',
    fdcId: 175180,
    sourceName: 'Crustaceans, shrimp, cooked',
    per100g: { calories: 99, protein: 24, carbs: 0.2, fat: 0.28 },
    defaultGrams: 120,
    defaultPortionLabel: '1 ración (120 g)',
  },
];

/**
 * Valores de composición media, sin verificar contra una fuente institucional.
 * Se conservan por utilidad, pero la interfaz los distingue de los anteriores.
 */
const REFERENCE_FOODS: LibraryFood[] = [
  {
    id: 'ref-pollo-pechuga',
    name: 'Pechuga de pollo',
    category: 'Proteína',
    provenance: 'reference',
    per100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
    defaultGrams: 150,
    defaultPortionLabel: '1 filete (150 g)',
  },
  {
    id: 'ref-atun-agua',
    name: 'Atún al natural, escurrido',
    category: 'Pescado',
    provenance: 'reference',
    per100g: { calories: 116, protein: 26, carbs: 0, fat: 1 },
    defaultGrams: 80,
    defaultPortionLabel: '1 lata escurrida (80 g)',
  },
  {
    id: 'ref-lentejas',
    name: 'Lentejas cocidas',
    category: 'Legumbres',
    provenance: 'reference',
    per100g: { calories: 116, protein: 9, carbs: 20, fat: 0.4 },
    defaultGrams: 200,
    defaultPortionLabel: '1 plato (200 g)',
  },
  {
    id: 'ref-avena',
    name: 'Avena en copos',
    category: 'Carbohidratos',
    provenance: 'reference',
    per100g: { calories: 370, protein: 13, carbs: 59, fat: 7 },
    defaultGrams: 50,
    defaultPortionLabel: '1 ración (50 g)',
  },
  {
    id: 'ref-arroz',
    name: 'Arroz blanco cocido',
    category: 'Carbohidratos',
    provenance: 'reference',
    per100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
    defaultGrams: 150,
    defaultPortionLabel: '1 ración (150 g)',
  },
  {
    id: 'ref-patata',
    name: 'Patata cocida',
    category: 'Carbohidratos',
    provenance: 'reference',
    per100g: { calories: 87, protein: 2, carbs: 20, fat: 0.1 },
    defaultGrams: 200,
    defaultPortionLabel: '1 unidad (200 g)',
  },
  {
    id: 'ref-frutillas',
    name: 'Frutillas / Fresas frescas',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 32, protein: 0.7, carbs: 7.7, fat: 0.3 },
    defaultGrams: 150,
    defaultPortionLabel: '1 taza (150 g)',
  },
  {
    id: 'ref-arandanos',
    name: 'Arándanos frescos / Blueberries',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3 },
    defaultGrams: 100,
    defaultPortionLabel: '1 pocillo / taza (100 g)',
  },
  {
    id: 'ref-naranja',
    name: 'Naranja',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 47, protein: 0.9, carbs: 11.8, fat: 0.1 },
    defaultGrams: 150,
    defaultPortionLabel: '1 unidad mediana pelada (150 g)',
  },
  {
    id: 'ref-mandarina',
    name: 'Mandarina',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 53, protein: 0.8, carbs: 13.3, fat: 0.3 },
    defaultGrams: 100,
    defaultPortionLabel: '1 unidad (100 g)',
  },
  {
    id: 'ref-platano',
    name: 'Plátano / Banana',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
    defaultGrams: 120,
    defaultPortionLabel: '1 unidad (120 g)',
  },
  {
    id: 'ref-manzana',
    name: 'Manzana',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
    defaultGrams: 180,
    defaultPortionLabel: '1 unidad (180 g)',
  },
  {
    id: 'ref-pera',
    name: 'Pera',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 57, protein: 0.4, carbs: 15.2, fat: 0.1 },
    defaultGrams: 160,
    defaultPortionLabel: '1 unidad mediana (160 g)',
  },
  {
    id: 'ref-durazno',
    name: 'Durazno / Melocotón',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 39, protein: 0.9, carbs: 9.5, fat: 0.3 },
    defaultGrams: 150,
    defaultPortionLabel: '1 unidad mediana (150 g)',
  },
  {
    id: 'ref-kiwi',
    name: 'Kiwi',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 61, protein: 1.1, carbs: 14.7, fat: 0.5 },
    defaultGrams: 80,
    defaultPortionLabel: '1 unidad pelada (80 g)',
  },
  {
    id: 'ref-sandia',
    name: 'Sandía',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 30, protein: 0.6, carbs: 7.6, fat: 0.2 },
    defaultGrams: 250,
    defaultPortionLabel: '1 tajada (250 g)',
  },
  {
    id: 'ref-melon',
    name: 'Melón',
    category: 'Frutas',
    provenance: 'reference',
    per100g: { calories: 34, protein: 0.8, carbs: 8.2, fat: 0.2 },
    defaultGrams: 200,
    defaultPortionLabel: '1 tajada (200 g)',
  },
  {
    id: 'ref-aguacate',
    name: 'Aguacate',
    category: 'Grasas Saludables',
    provenance: 'reference',
    per100g: { calories: 160, protein: 2, carbs: 8.5, fat: 14.7 },
    defaultGrams: 100,
    defaultPortionLabel: 'Medio aguacate (100 g)',
  },
  {
    id: 'ref-aove',
    name: 'Aceite de oliva virgen extra',
    category: 'Grasas Saludables',
    provenance: 'reference',
    per100g: { calories: 884, protein: 0, carbs: 0, fat: 100 },
    defaultGrams: 10,
    defaultPortionLabel: '1 cucharada (10 g)',
  },
  {
    id: 'ref-nueces',
    name: 'Nueces',
    category: 'Grasas Saludables',
    provenance: 'reference',
    per100g: { calories: 654, protein: 15, carbs: 14, fat: 65 },
    defaultGrams: 30,
    defaultPortionLabel: '1 puñado (30 g)',
  },
  {
    id: 'ref-yogur-griego',
    name: 'Yogur griego natural 0%',
    category: 'Lácteos',
    provenance: 'reference',
    per100g: { calories: 59, protein: 10, carbs: 3.6, fat: 0.4 },
    defaultGrams: 150,
    defaultPortionLabel: '1 envase (150 g)',
  },
  {
    id: 'ref-queso-batido',
    name: 'Queso fresco batido 0%',
    category: 'Lácteos',
    provenance: 'reference',
    per100g: { calories: 47, protein: 8, carbs: 4, fat: 0.2 },
    defaultGrams: 200,
    defaultPortionLabel: '1 ración (200 g)',
  },
  {
    id: 'ref-whey',
    name: 'Proteína whey en polvo',
    category: 'Suplementos',
    provenance: 'reference',
    per100g: { calories: 380, protein: 78, carbs: 8, fat: 4 },
    defaultGrams: 30,
    defaultPortionLabel: '1 cazo (30 g)',
  },
];

export const BUILT_IN_FOODS: LibraryFood[] = [...USDA_FOODS, ...REFERENCE_FOODS];

export const FOOD_CATEGORIES = [
  'Proteína',
  'Pescado',
  'Carbohidratos',
  'Legumbres',
  'Grasas Saludables',
  'Frutas',
  'Lácteos',
  'Suplementos',
  'Mis alimentos',
];

// ------------------------------------------------- alimentos propios guardados

const CUSTOM_KEY = 'nutrifit_custom_foods_v1';

export function loadCustomFoods(): LibraryFood[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((f) => f?.id && f?.per100g) : [];
  } catch {
    return [];
  }
}

export function saveCustomFoods(foods: LibraryFood[]): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(foods));
  } catch (err) {
    console.error('No se pudieron guardar los alimentos propios:', err);
  }
}

/** Escala los macros de un alimento a la cantidad indicada. */
export function scaleFood(food: LibraryFood, grams: number) {
  const factor = grams / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  return {
    calories: Math.round(food.per100g.calories * factor),
    protein: round1(food.per100g.protein * factor),
    carbs: round1(food.per100g.carbs * factor),
    fat: round1(food.per100g.fat * factor),
  };
}
