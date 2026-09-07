import { GoogleGenAI, Type } from '@google/genai';

/**
 * Análisis visual de un plato con Gemini.
 *
 * Este módulo lo comparten el servidor Express de desarrollo (`server.ts`) y la
 * función serverless de Vercel (`api/analyze-food.ts`).
 *
 * Regla: si el análisis no se puede hacer, se lanza un error. Nunca se
 * devuelven valores nutricionales inventados. Un plato ficticio presentado como
 * resultado acaba en el diario del usuario y falsea su balance calórico sin que
 * él pueda notarlo.
 */

export interface AnalyzedIngredient {
  name: string;
  amount: string;
}

export interface AnalysisResult {
  name: string;
  category: string;
  weightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  observation?: string;
  ingredients: AnalyzedIngredient[];
}

/** Error con un mensaje presentable en la interfaz y un código HTTP. */
export class AnalysisError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 502, code = 'analysis_failed') {
    super(message);
    this.name = 'AnalysisError';
    this.status = status;
    this.code = code;
  }
}

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

let client: GoogleGenAI | null = null;

function getClient(apiKey: string): GoogleGenAI {
  if (!client) {
    client = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'nutripro' } },
    });
  }
  return client;
}

const SYSTEM_PROMPT = `Eres un nutricionista clínico experto en análisis fotográfico de alimentos.
Analiza la imagen proporcionada.

1. Identifica el nombre gastronómico del plato en español.
2. Determina la categoría (ej. "Desayuno", "Almuerzo", "Cena Ligera", "Snack").
3. Estima el peso total de la porción servida en gramos, usando las referencias
   visibles (tamaño del plato, cubiertos, vaso).
4. Calcula las calorías totales estimadas (kcal).
5. Calcula los gramos de proteína, carbohidratos y grasas.
6. Asigna un porcentaje de confianza HONESTO entre 0 y 100. Bájalo cuando el
   plato esté parcialmente oculto, la luz sea mala o no puedas determinar el
   método de cocción. No infles la confianza.
7. Desglosa los ingredientes visibles con sus cantidades estimadas.
8. En "observation", menciona brevemente lo que no se ve y afecta al cálculo
   (aceite de cocción, salsas, azúcar añadido).

Coherencia obligatoria: (proteína × 4) + (carbohidratos × 4) + (grasas × 9)
debe aproximarse a las calorías totales.

Si la imagen NO contiene comida reconocible, devuelve isFood = false y ceros en
el resto de campos.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    isFood: {
      type: Type.BOOLEAN,
      description: 'false si la imagen no contiene comida reconocible',
    },
    name: { type: Type.STRING, description: 'Nombre del plato en español' },
    category: { type: Type.STRING, description: 'Categoría culinaria' },
    weightGrams: { type: Type.NUMBER, description: 'Peso total aproximado en gramos' },
    calories: { type: Type.NUMBER, description: 'Calorías totales en kcal' },
    protein: { type: Type.NUMBER, description: 'Gramos de proteína' },
    carbs: { type: Type.NUMBER, description: 'Gramos de carbohidratos' },
    fat: { type: Type.NUMBER, description: 'Gramos de grasa' },
    confidence: { type: Type.NUMBER, description: 'Confianza honesta entre 0 y 100' },
    observation: { type: Type.STRING, description: 'Qué no se ve y afecta al cálculo' },
    ingredients: {
      type: Type.ARRAY,
      description: 'Ingredientes detectados',
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.STRING },
        },
        required: ['name', 'amount'],
      },
    },
  },
  required: [
    'isFood',
    'name',
    'category',
    'weightGrams',
    'calories',
    'protein',
    'carbs',
    'fat',
    'confidence',
    'ingredients',
  ],
};

/** Separa el prefijo `data:` de una imagen en base64. */
export function parseImagePayload(
  image: string,
  fallbackMime = 'image/jpeg'
): { data: string; mimeType: string } {
  if (!image.startsWith('data:')) {
    return { data: image, mimeType: fallbackMime };
  }

  const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
  if (matches) {
    return { mimeType: matches[1], data: matches[2] };
  }

  return { data: image.replace(/^data:[^;]+;base64,/, ''), mimeType: fallbackMime };
}

/**
 * Analiza una imagen y devuelve la estimación nutricional.
 * @throws {AnalysisError} si no hay clave, la imagen no es comida o falla la API.
 */
export async function analyzeFood(
  image: string,
  mimeType = 'image/jpeg'
): Promise<AnalysisResult> {
  if (!image) {
    throw new AnalysisError('No se recibió ninguna imagen.', 400, 'missing_image');
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new AnalysisError(
      'El análisis por IA no está configurado en el servidor.',
      503,
      'not_configured'
    );
  }

  const payload = parseImagePayload(image, mimeType);

  let response;
  try {
    response = await getClient(apiKey).models.generateContent({
      model: MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType: payload.mimeType, data: payload.data } },
          { text: '¿Qué plato es y cuántas calorías y macros aporta la ración servida?' },
        ],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    });
  } catch (error: any) {
    // El mensaje real de la API se registra para poder diagnosticar; al cliente
    // se le da uno legible.
    console.error('[analyzeFood] Gemini request failed:', error?.message || error);
    throw new AnalysisError('El servicio de análisis no respondió. Inténtalo de nuevo.');
  }

  const text = response.text;
  if (!text) {
    throw new AnalysisError('El servicio de análisis devolvió una respuesta vacía.');
  }

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('[analyzeFood] Respuesta no parseable:', text.slice(0, 300));
    throw new AnalysisError('No se pudo interpretar la respuesta del análisis.');
  }

  if (parsed.isFood === false) {
    throw new AnalysisError(
      'No se ha reconocido comida en la foto. Prueba con otro encuadre.',
      422,
      'not_food'
    );
  }

  if (!(parsed.weightGrams > 0) || !(parsed.calories >= 0)) {
    throw new AnalysisError('La estimación recibida no es utilizable. Repite la foto.');
  }

  return {
    name: String(parsed.name || 'Plato detectado'),
    category: String(parsed.category || 'Comida'),
    weightGrams: Math.round(parsed.weightGrams),
    calories: Math.round(parsed.calories),
    protein: Math.round(parsed.protein * 10) / 10,
    carbs: Math.round(parsed.carbs * 10) / 10,
    fat: Math.round(parsed.fat * 10) / 10,
    confidence: Math.min(100, Math.max(0, Math.round(parsed.confidence))),
    observation: parsed.observation ? String(parsed.observation) : undefined,
    ingredients: Array.isArray(parsed.ingredients)
      ? parsed.ingredients.map((i: any) => ({
          name: String(i?.name ?? ''),
          amount: String(i?.amount ?? ''),
        }))
      : [],
  };
}
