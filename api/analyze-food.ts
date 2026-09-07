import { analyzeFood, AnalysisError } from './_lib/analyzeFood.js';

/**
 * Función serverless de Vercel para el análisis de platos.
 *
 * Vercel no ejecuta el Express de `server.ts` (ese sirve para desarrollo local
 * y para el despliegue en Cloud Run de AI Studio). En Vercel, cada archivo de
 * `api/` es una función; los que empiezan por `_` no son rutas, así que
 * `_lib/analyzeFood.ts` queda como código compartido entre ambos.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido.', code: 'method_not_allowed' });
  }

  try {
    const { image, mimeType } = req.body || {};
    const result = await analyzeFood(image, mimeType);
    return res.status(200).json(result);
  } catch (error: any) {
    if (error instanceof AnalysisError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    console.error('[api/analyze-food] Error inesperado:', error);
    return res
      .status(500)
      .json({ error: 'Error inesperado durante el análisis.', code: 'unexpected' });
  }
}
