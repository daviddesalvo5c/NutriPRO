import { searchFoods, FoodSearchError, SOURCE } from './_lib/foodSearch.js';

/**
 * GET /api/foods-search?q=huevo
 *
 * Devuelve alimentos de USDA FoodData Central con sus macros por 100 g.
 * La clave de USDA se queda en el servidor.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido.', code: 'method_not_allowed' });
  }

  try {
    const query = String(req.query?.q ?? '');
    const results = await searchFoods(query);

    // Se cachea en el borde: la composición de un alimento no cambia.
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');

    return res.status(200).json({ source: SOURCE, results });
  } catch (error: any) {
    if (error instanceof FoodSearchError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    console.error('[api/foods-search] Error inesperado:', error);
    return res
      .status(500)
      .json({ error: 'Error inesperado en la búsqueda.', code: 'unexpected' });
  }
}
