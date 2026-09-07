/**
 * Búsqueda de alimentos en USDA FoodData Central.
 *
 * Fuente: U.S. Department of Agriculture, Agricultural Research Service,
 * FoodData Central — https://fdc.nal.usda.gov/
 *
 * Se consulta en vivo en lugar de mantener una copia local por dos razones:
 * cubre cientos de miles de alimentos en vez de unas decenas, y cada resultado
 * conserva su `fdcId`, de modo que cualquier valor mostrado en la app es
 * rastreable hasta su ficha oficial.
 *
 * La clave va en el servidor (USDA_API_KEY), nunca en el bundle del cliente.
 */

/** Identificadores de nutrientes en FoodData Central. Valores por 100 g. */
const NUTRIENT = {
  energyKcal: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sodium: 1093,
} as const;

/**
 * Conjuntos de datos, de más a menos fiable para composición genérica:
 *  - SR Legacy: la referencia clásica, analizada en laboratorio.
 *  - Foundation Foods: análisis nuevos, menos alimentos.
 *  - Survey (FNDDS): platos preparados tal como se consumen.
 * Se excluye "Branded" (etiquetas declaradas por fabricantes, calidad desigual).
 */
const DATA_TYPES = 'SR Legacy,Foundation,Survey (FNDDS)';

export const SOURCE = {
  id: 'usda-fdc',
  name: 'USDA FoodData Central',
  organization: 'U.S. Department of Agriculture, Agricultural Research Service',
  url: 'https://fdc.nal.usda.gov/',
} as const;

export interface FoodSearchResult {
  fdcId: number;
  name: string;
  dataType: string;
  category: string;
  /** Todos los valores son por 100 g de alimento. */
  per100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    sodium: number | null;
  };
  sourceUrl: string;
}

export class FoodSearchError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = 'search_failed') {
    super(message);
    this.name = 'FoodSearchError';
    this.status = status;
    this.code = code;
  }
}

function nutrientValue(nutrients: any[], id: number): number | null {
  const found = nutrients?.find((n) => n.nutrientId === id);
  return typeof found?.value === 'number' ? found.value : null;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

/**
 * Busca alimentos por nombre.
 * @throws {FoodSearchError} si no hay clave o la API falla.
 */
export async function searchFoods(query: string, limit = 25): Promise<FoodSearchResult[]> {
  const term = (query || '').trim();
  if (term.length < 2) {
    throw new FoodSearchError('Escribe al menos dos letras.', 400, 'query_too_short');
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    throw new FoodSearchError(
      'La búsqueda de alimentos no está configurada en el servidor.',
      503,
      'not_configured'
    );
  }

  const url =
    `https://api.nal.usda.gov/fdc/v1/foods/search` +
    `?query=${encodeURIComponent(term)}` +
    `&dataType=${encodeURIComponent(DATA_TYPES)}` +
    `&pageSize=${Math.min(Math.max(limit, 1), 50)}` +
    `&api_key=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error: any) {
    console.error('[searchFoods] red:', error?.message || error);
    throw new FoodSearchError('No se pudo contactar con la base de datos de alimentos.');
  }

  if (response.status === 429) {
    throw new FoodSearchError(
      'Se alcanzó el límite de consultas a la base de datos. Prueba en unos minutos.',
      429,
      'rate_limited'
    );
  }

  if (!response.ok) {
    console.error('[searchFoods] HTTP', response.status);
    throw new FoodSearchError('La base de datos de alimentos devolvió un error.');
  }

  const json: any = await response.json();

  return (json.foods || [])
    .map((food: any): FoodSearchResult | null => {
      const nutrients = food.foodNutrients || [];

      const calories = nutrientValue(nutrients, NUTRIENT.energyKcal);
      const protein = nutrientValue(nutrients, NUTRIENT.protein);
      const carbs = nutrientValue(nutrients, NUTRIENT.carbs);
      const fat = nutrientValue(nutrients, NUTRIENT.fat);

      // Sin los cuatro macros el alimento no sirve para el diario.
      if (calories === null || protein === null || carbs === null || fat === null) {
        return null;
      }

      return {
        fdcId: food.fdcId,
        name: food.description,
        dataType: food.dataType,
        category: food.foodCategory || '',
        per100g: {
          calories: Math.round(calories),
          protein: round1(protein),
          carbs: round1(carbs),
          fat: round1(fat),
          fiber: nutrientValue(nutrients, NUTRIENT.fiber),
          sodium: nutrientValue(nutrients, NUTRIENT.sodium),
        },
        sourceUrl: `https://fdc.nal.usda.gov/food-details/${food.fdcId}/nutrients`,
      };
    })
    .filter(Boolean) as FoodSearchResult[];
}
