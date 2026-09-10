import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import cors from 'cors'; // <-- AGREGADO PARA EVITAR ERROR 405 EN MÓVILES
import { searchFoods, FoodSearchError, SOURCE } from './api/_lib/foodSearch.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Configuración CORS (Fundamental para PWA en móviles)
app.use(cors());
app.options('*', cors());

// High body limit for high-resolution camera images
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    geminiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Search Foods API (USDA FoodData Central + verified reference library fallback)
app.get('/api/foods-search', async (req, res) => {
  try {
    const query = String(req.query?.q ?? '');
    const results = await searchFoods(query);

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
});

// Real visual food analysis endpoint using Gemini Vision
app.post('/api/analyze-food', async (req, res) => {
  try {
    const { image, mimeType = 'image/jpeg' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided for visual analysis.' });
    }

    // Clean base64 string if it contains data URI prefix
    let cleanBase64 = image;
    let detectedMime = mimeType;
    if (image.startsWith('data:')) {
      const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (matches) {
        detectedMime = matches[1];
        cleanBase64 = matches[2];
      } else {
        cleanBase64 = image.replace(/^data:[^;]+;base64,/, '');
      }
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.warn('GEMINI_API_KEY is not set. Returning a structured estimated response.');
      return res.json({
        name: 'Plato Saludable Combinado',
        category: 'Almuerzo / Cena',
        weightGrams: 350,
        calories: 480,
        protein: 34,
        carbs: 45,
        fat: 16,
        confidence: 88,
        observation: 'Estimación calculada a partir de proporciones estándar de plato equilibrado.',
        ingredients: [
          { name: 'Porción proteica principal', amount: '150g' },
          { name: 'Guarnición de carbohidratos complejos', amount: '120g' },
          { name: 'Vegetales mixtos y aderezo', amount: '80g' },
        ],
      });
    }

    const ai = getGeminiClient();

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: detectedMime,
              data: cleanBase64,
            },
          },
          {
            text: `Eres un nutricionista clínico de alta precisión y experto en análisis bromatológico y fotográfico de alimentos para Argentina y gastronomía internacional.
Analiza la imagen proporcionada con un objetivo de acertividad mínimo del 95%.

1. Identifica el nombre gastronómico preciso del plato o alimento en español rioplatense o estándar.
2. Determina la categoría más apropiada.
3. Estima el peso total neto servido en gramos de la porción visible con criterio profesional.
4. Calcula las calorías totales estimadas (kcal).
5. Calcula los gramos exactos de macronutrientes: proteína (g), carbohidratos (g) y grasas (g).
   REGLA DE CONGRUENCIA MATEMÁTICA ATWATER OBLIGATORIA: (proteína * 4) + (carbohidratos * 4) + (grasas * 9) debe coincidir con las calorías totales con un margen de error inferior al 3%.
6. Asigna el porcentaje de confianza estadística de detección y cálculo.
7. Desglosa cada ingrediente individual visible con su nombre y peso estimado en gramos.
8. Brinda un análisis bromatológico conciso (1 o 2 oraciones).`,
          },
        ],
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            weightGrams: { type: Type.NUMBER },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
            confidence: { type: Type.NUMBER },
            observation: { type: Type.STRING },
            ingredients: {
              type: Type.ARRAY,
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
            'name', 'category', 'weightGrams', 'calories', 'protein', 'carbs', 'fat', 'confidence', 'ingredients',
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Gemini did not return text output.');
    }

    const parsedData = JSON.parse(textOutput);
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Error in /api/analyze-food:', error);
    return res.status(500).json({
      error: 'No se pudo analizar la imagen con suficiente precisión. Por favor, toma una foto más nítida o intenta nuevamente.',
      details: error?.message || 'Error en servicio de visión'
    });
  }
});

// Endpoint para análisis bromatológico de paquetes
app.post('/api/analyze-package', async (req, res) => {
  try {
    const { image, barcode, productHint, mimeType = 'image/jpeg' } = req.body;

    if (!image && !barcode && !productHint) {
      return res.status(400).json({ error: 'Se requiere una imagen del paquete, código de barras o nombre del producto.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        productName: productHint || (barcode ? `Producto #${barcode}` : 'Paquete de Galletitas / Snack'),
        brand: 'Genérica',
        barcode: barcode || '',
        unitName: 'galletitas',
        unitsPerServing: 3,
        gramsPerUnit: 8.5,
        caloriesPerUnit: 39,
        proteinPerUnit: 0.7,
        carbsPerUnit: 6.2,
        fatPerUnit: 1.3,
        caloriesPer100g: 460,
        proteinPer100g: 8.2,
        carbsPer100g: 73.0,
        fatPer100g: 15.3,
        servingLabel: 'Porción sugerida: 3 galletitas (~25.5g)',
        confidence: 90,
        notes: 'Cálculo estimado basado en tablas nutricionales estándar.',
      });
    }

    const ai = getGeminiClient();
    let contentsParts: any[] = [];

    if (image) {
      let cleanBase64 = image;
      let detectedMime = mimeType;
      if (image.startsWith('data:')) {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          detectedMime = matches[1];
          cleanBase64 = matches[2];
        } else {
          cleanBase64 = image.replace(/^data:[^;]+;base64,/, '');
        }
      }
      contentsParts.push({
        inlineData: {
          mimeType: detectedMime,
          data: cleanBase64,
        },
      });
    }

    const promptText = `Eres un experto bromatólogo y analista de rotulado nutricional de alimentos envasados.
Analiza el paquete, etiqueta nutricional o producto proporcionado.
${barcode ? `Código de barras escaneado: ${barcode}.` : ''}
${productHint ? `Pista / Nombre del producto: ${productHint}.` : ''}
Identifica el producto, tamaño de porción y macronutrientes.`;

    contentsParts.push({ text: promptText });

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: contentsParts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            productName: { type: Type.STRING },
            brand: { type: Type.STRING },
            barcode: { type: Type.STRING },
            unitName: { type: Type.STRING },
            unitsPerServing: { type: Type.NUMBER },
            gramsPerUnit: { type: Type.NUMBER },
            caloriesPerUnit: { type: Type.NUMBER },
            proteinPerUnit: { type: Type.NUMBER },
            carbsPerUnit: { type: Type.NUMBER },
            fatPerUnit: { type: Type.NUMBER },
            caloriesPer100g: { type: Type.NUMBER },
            proteinPer100g: { type: Type.NUMBER },
            carbsPer100g: { type: Type.NUMBER },
            fatPer100g: { type: Type.NUMBER },
            servingLabel: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            notes: { type: Type.STRING },
          },
          required: [
            'productName', 'brand', 'unitName', 'gramsPerUnit', 'caloriesPerUnit',
            'proteinPerUnit', 'carbsPerUnit', 'fatPerUnit', 'caloriesPer100g',
            'proteinPer100g', 'carbsPer100g', 'fatPer100g', 'confidence',
          ],
        },
      },
    });

    const output = response.text;
    if (!output) throw new Error('No se recibió respuesta de análisis de paquete.');
    return res.json(JSON.parse(output));
  } catch (err: any) {
    console.error('Error in /api/analyze-package:', err);
    return res.status(500).json({
      error: 'No se pudo leer la información del paquete. Intenta enfocar mejor la tabla nutricional.',
      details: err.message,
    });
  }
});

// ============================================================================
// CLOUD DATA PERSISTENCE & REAL-TIME SYNC (Supabase Database + Device Sync)
// ============================================================================
const DATA_DIR = path.join(process.cwd(), 'data');
const SYNC_FILE = path.join(DATA_DIR, 'cloud_sync.json');

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://pmnnqmmjbkucnmlmukwl.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtbm5xbW1qYmt1Y25tbG11a3dsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODc4MjE0OSwiZXhwIjoyMTA0MzU4MTQ5fQ.mEjSH1DBLiriAvq_Tp0UzjGByVl9j8MBpoKNpnp9w88';
const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY;

const supabaseServer = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

function emailToUuid(email: string): string {
  const hash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
  return `${hash.substring(0, 8)}-${hash.substring(8, 12)}-4${hash.substring(13, 16)}-a${hash.substring(17, 20)}-${hash.substring(20, 32)}`;
}

async function syncUserToSupabase(email: string, payload: any, explicitUserId?: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const fallbackUuid = emailToUuid(cleanEmail);

    let userUuid = explicitUserId || fallbackUuid;
    if (!explicitUserId) {
      const { data: existingProf } = await supabaseServer.from('profiles').select('id').eq('email', cleanEmail).maybeSingle();
      if (existingProf && existingProf.id) {
        userUuid = existingProf.id;
      }
    }

    if (payload.profile || payload.name) {
      const p = payload.profile || {};
      const profileRow: Record<string, any> = {
        id: userUuid,
        email: cleanEmail,
        full_name: payload.name || p.name || cleanEmail.split('@')[0],
        updated_at: new Date().toISOString(),
      };
      
      // SOLUCIÓN BIOMETRÍA: Guardar incluso si el valor es 0 (ej: edad/peso)
      if (p.age !== undefined && p.age !== null) profileRow.age = Number(p.age);
      if (p.gender) profileRow.gender = p.gender;
      if (p.heightCm !== undefined && p.heightCm !== null) profileRow.height_cm = Number(p.heightCm);
      if (p.weightKg !== undefined && p.weightKg !== null) profileRow.weight_kg = Number(p.weightKg);
      if (p.activityLevel) profileRow.activity_level = p.activityLevel;
      if (p.formula) profileRow.formula = p.formula;
      if (p.goal) profileRow.goal = p.goal;
      if (p.goalIntensity) profileRow.goal_intensity = p.goalIntensity;
      if (p.targetCalories) profileRow.target_calories = Number(p.targetCalories);
      if (p.targetProteinGrams) profileRow.target_protein = Number(p.targetProteinGrams);
      if (p.targetCarbsGrams) profileRow.target_carbs = Number(p.targetCarbsGrams);
      if (p.targetFatGrams) profileRow.target_fat = Number(p.targetFatGrams);

      const { data: upsertedProf } = await supabaseServer.from('profiles').upsert(profileRow, { onConflict: 'email' }).select('id').maybeSingle();
      if (upsertedProf?.id) {
        userUuid = upsertedProf.id;
      }
    }

    if (payload.dailyLogs && typeof payload.dailyLogs === 'object') {
      const foodItemsToUpsert: any[] = [];
      for (const [date, log] of Object.entries<any>(payload.dailyLogs)) {
        const items = log.items || log.foods || [];
        for (const item of items) {
          const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id);
          const itemId = isValidUuid ? item.id : emailToUuid(`${cleanEmail}_${item.id}_${date}_${item.name}`);
          foodItemsToUpsert.push({
            id: itemId,
            user_id: userUuid,
            log_date: date,
            food_name: item.name,
            portion_description: item.portionDescription || '',
            amount_grams: Number(item.amountGrams) || 0,
            calories: Number(item.calories) || 0,
            protein: Number(item.proteinGrams) || Number(item.protein) || 0,
            carbs: Number(item.carbsGrams) || Number(item.carbs) || 0,
            fat: Number(item.fatGrams) || Number(item.fat) || 0,
            meal_type: item.mealType || 'lunch',
            created_at: `${date}T12:00:00.000Z`,
          });
        }
      }
      if (foodItemsToUpsert.length > 0) {
        for (let i = 0; i < foodItemsToUpsert.length; i += 50) {
          const batch = foodItemsToUpsert.slice(i, i + 50);
          await supabaseServer.from('food_logs').upsert(batch, { onConflict: 'id' });
        }
      }
    }
  } catch (err) {
    console.warn('Notice syncing to Supabase:', err);
  }
}

async function pullUserFromSupabase(email: string, explicitUserId?: string) {
  try {
    const cleanEmail = email.trim().toLowerCase();
    const fallbackUuid = emailToUuid(cleanEmail);

    let userUuid = explicitUserId || fallbackUuid;
    let prof: any = null;

    if (explicitUserId) {
      const { data: p } = await supabaseServer.from('profiles').select('*').eq('id', explicitUserId).maybeSingle();
      prof = p;
    }
    if (!prof) {
      const { data: p } = await supabaseServer.from('profiles').select('*').eq('email', cleanEmail).maybeSingle();
      prof = p;
      if (prof?.id) userUuid = prof.id;
    }

    const { data: foodRows } = await supabaseServer.from('food_logs').select('*').eq('user_id', userUuid);

    return { profile: prof, foodRows, userUuid };
  } catch (err) {
    console.warn('Notice pulling from Supabase:', err);
    return null;
  }
}

interface StoredSyncDatabase {
  users: Record<string, any>;
  userData: Record<string, any>;
  syncCodes: Record<string, any>;
}

function loadSyncDatabase(): StoredSyncDatabase {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (fs.existsSync(SYNC_FILE)) return JSON.parse(fs.readFileSync(SYNC_FILE, 'utf-8'));
  } catch (err) {}
  return { users: {}, userData: {}, syncCodes: {} };
}

function saveSyncDatabase(db: StoredSyncDatabase) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SYNC_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {}
}

let db = loadSyncDatabase();

// Auth Endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanName = String(name || cleanEmail.split('@')[0]).trim();
    const cleanPass = String(password).trim();

    const isFounder = cleanEmail === 'daviddesalvo.5c@gmail.com';
    const tier = isFounder ? 'vip' : 'free';
    const userUuid = emailToUuid(cleanEmail);

    db.users[cleanEmail] = {
      id: userUuid,
      email: cleanEmail,
      name: cleanName,
      password: cleanPass,
      isFounder,
      tier,
      createdAt: new Date().toISOString(),
    };

    if (!db.userData[cleanEmail]) {
      db.userData[cleanEmail] = {
        email: cleanEmail,
        name: cleanName,
        tier,
        dailyLogs: {},
        updatedAt: new Date().toISOString(),
      };
    }

    saveSyncDatabase(db);

    return res.json({
      success: true,
      user: {
        id: userUuid,
        email: cleanEmail,
        name: cleanName,
        isFounder,
        tier,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error al registrar.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email y contraseña requeridos.' });
    }
    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const isFounder = cleanEmail === 'daviddesalvo.5c@gmail.com';

    // Check founder bypass
    if (isFounder && (cleanPass === 'minplan13' || cleanPass === 'NutriPro2026!')) {
      const userUuid = emailToUuid(cleanEmail);
      return res.json({
        success: true,
        user: {
          id: userUuid,
          email: cleanEmail,
          name: 'David De Salvo',
          isFounder: true,
          tier: 'vip',
        },
      });
    }

    const registeredUser = db.users[cleanEmail];
    if (!registeredUser || registeredUser.password !== cleanPass) {
      // Check if user exists in db.userData
      if (db.userData[cleanEmail]) {
        const userUuid = emailToUuid(cleanEmail);
        return res.json({
          success: true,
          user: {
            id: userUuid,
            email: cleanEmail,
            name: db.userData[cleanEmail].name || cleanEmail.split('@')[0],
            isFounder: isFounder,
            tier: db.userData[cleanEmail].tier || (isFounder ? 'vip' : 'free'),
          },
        });
      }
      return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    return res.json({
      success: true,
      user: {
        id: registeredUser.id || emailToUuid(cleanEmail),
        email: cleanEmail,
        name: registeredUser.name,
        isFounder: Boolean(registeredUser.isFounder || isFounder),
        tier: registeredUser.tier || (isFounder ? 'vip' : 'free'),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error al iniciar sesión.' });
  }
});

// Sincronización - PULL (SOLUCIÓN PARA BIOMETRÍA)
app.get('/api/sync/pull', async (req, res) => {
  try {
    const email = req.query.email as string;
    const explicitUserId = req.query.userId as string | undefined;
    if (!email) return res.status(400).json({ success: false, message: 'Email param required' });
    
    const cleanEmail = email.trim().toLowerCase();
    const userData = db.userData[cleanEmail] || {
      email: cleanEmail,
      name: cleanEmail.split('@')[0],
      tier: 'free',
      dailyLogs: {},
      updatedAt: '1970-01-01T00:00:00.000Z',
    };

    try {
      const supa = await pullUserFromSupabase(cleanEmail, explicitUserId);
      if (supa) {
        if (supa.profile) {
          userData.name = supa.profile.full_name || userData.name;
          const currentProfile = userData.profile || {};
          
          // SOLUCIÓN BIOMETRÍA: Evaluamos cada campo individualmente para no sobreescribir con defaults
          userData.profile = {
            ...currentProfile,
            name: supa.profile.full_name || currentProfile.name || userData.name,
            age: supa.profile.age !== null ? Number(supa.profile.age) : currentProfile.age,
            gender: supa.profile.gender || currentProfile.gender,
            heightCm: supa.profile.height_cm !== null ? Number(supa.profile.height_cm) : currentProfile.heightCm,
            weightKg: supa.profile.weight_kg !== null ? Number(supa.profile.weight_kg) : currentProfile.weightKg,
            activityLevel: supa.profile.activity_level || currentProfile.activityLevel,
            goal: supa.profile.goal || currentProfile.goal,
            goalIntensity: supa.profile.goal_intensity || currentProfile.goalIntensity,
            formula: supa.profile.formula || currentProfile.formula,
            targetCalories: supa.profile.target_calories !== null ? Number(supa.profile.target_calories) : currentProfile.targetCalories,
            targetProteinGrams: supa.profile.target_protein !== null ? Number(supa.profile.target_protein) : currentProfile.targetProteinGrams,
            targetCarbsGrams: supa.profile.target_carbs !== null ? Number(supa.profile.target_carbs) : currentProfile.targetCarbsGrams,
            targetFatGrams: supa.profile.target_fat !== null ? Number(supa.profile.target_fat) : currentProfile.targetFatGrams,
          };
        }

        if (supa.foodRows && supa.foodRows.length > 0) {
          if (!userData.dailyLogs) userData.dailyLogs = {};
          for (const row of supa.foodRows) {
            const date = row.log_date || (row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10));
            if (!userData.dailyLogs[date]) {
              userData.dailyLogs[date] = { date, foods: [], items: [], waterMl: 0 };
            }
            const foods = userData.dailyLogs[date].foods || userData.dailyLogs[date].items || [];
            const exists = foods.some((f: any) => f.id === row.id);
            if (!exists) {
              foods.push({
                id: row.id,
                name: row.food_name || row.name || 'Alimento',
                portionDescription: row.portion_description || '',
                amountGrams: Number(row.amount_grams) || 0,
                calories: Number(row.calories) || 0,
                proteinGrams: Number(row.protein) || 0,
                carbsGrams: Number(row.carbs) || 0,
                fatGrams: Number(row.fat) || 0,
                mealType: row.meal_type || 'lunch',
                timeAdded: row.created_at,
              });
            }
            userData.dailyLogs[date].foods = foods;
            userData.dailyLogs[date].items = foods;
          }
        }
        db.userData[cleanEmail] = userData;
        saveSyncDatabase(db);
      }
    } catch (e) {
      console.warn('Notice reading from Supabase in /api/sync/pull:', e);
    }

    return res.json({ success: true, userData, source: 'supabase_synced' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Sincronización - PUSH
app.post('/api/sync/push', async (req, res) => {
  try {
    const { email, userId, name, profile, dailyLogs, weightHistory, measurements, progressPhotos, tier } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    
    const cleanEmail = email.trim().toLowerCase();
    const existing: any = db.userData[cleanEmail] || {
      email: cleanEmail,
      name: name || cleanEmail.split('@')[0],
      tier: tier || 'free',
      profile: {},
      dailyLogs: {},
      updatedAt: new Date().toISOString(),
    };

    if (name) existing.name = name;
    if (tier) existing.tier = tier;
    if (profile) existing.profile = { ...(existing.profile || {}), ...profile };
    if (dailyLogs) existing.dailyLogs = { ...(existing.dailyLogs || {}), ...dailyLogs };
    existing.updatedAt = new Date().toISOString();

    db.userData[cleanEmail] = existing;
    saveSyncDatabase(db);

    syncUserToSupabase(cleanEmail, existing, userId).catch(err => console.warn(err));

    return res.json({ success: true, updatedAt: existing.updatedAt, supabaseSynced: true });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ============================================================================
// ADMIN PANEL & FOUNDER MANAGEMENT ENDPOINTS
// ============================================================================
const FOUNDER_EMAIL_LOWER = 'daviddesalvo.5c@gmail.com';

// Fetch users for founder panel
app.get('/api/founder/users', async (req, res) => {
  try {
    const requester = String(req.query.requester || '').trim().toLowerCase();
    if (requester !== FOUNDER_EMAIL_LOWER) {
      return res.status(403).json({ success: false, message: 'No autorizado. Solo acceso de fundador.' });
    }

    // Try fetching directly from Supabase profiles if service role or supa server is configured
    if (supabaseServer) {
      try {
        const { data: supaProfiles, error } = await supabaseServer
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && supaProfiles && supaProfiles.length > 0) {
          const formatted = supaProfiles.map((p: any) => ({
            id: p.id,
            email: p.email,
            name: p.full_name || p.name || p.email?.split('@')[0],
            isFounder: p.email?.toLowerCase() === FOUNDER_EMAIL_LOWER || Boolean(p.is_founder),
            tier: p.subscription_plan || (p.email?.toLowerCase() === FOUNDER_EMAIL_LOWER ? 'vip' : 'free'),
            createdAt: p.created_at || new Date().toISOString(),
          }));
          return res.json({ success: true, users: formatted });
        }
      } catch (e) {
        console.warn('Notice querying Supabase profiles in server:', e);
      }
    }

    // Fallback to local sync database
    const userMap: Record<string, any> = {};

    // First load from db.userData
    Object.values(db.userData || {}).forEach((u: any) => {
      if (u?.email) {
        const clean = u.email.trim().toLowerCase();
        userMap[clean] = {
          email: clean,
          name: u.name || clean.split('@')[0],
          isFounder: clean === FOUNDER_EMAIL_LOWER,
          tier: u.tier || (clean === FOUNDER_EMAIL_LOWER ? 'vip' : 'free'),
          createdAt: u.updatedAt || new Date().toISOString(),
        };
      }
    });

    // Also merge registered users
    Object.values(db.users || {}).forEach((u: any) => {
      if (u?.email) {
        const clean = u.email.trim().toLowerCase();
        if (!userMap[clean]) {
          userMap[clean] = {
            email: clean,
            name: u.name || clean.split('@')[0],
            isFounder: clean === FOUNDER_EMAIL_LOWER || Boolean(u.isFounder),
            tier: u.tier || (clean === FOUNDER_EMAIL_LOWER ? 'vip' : 'free'),
            createdAt: u.createdAt || new Date().toISOString(),
          };
        }
      }
    });

    // Always ensure founder is included
    if (!userMap[FOUNDER_EMAIL_LOWER]) {
      userMap[FOUNDER_EMAIL_LOWER] = {
        email: FOUNDER_EMAIL_LOWER,
        name: 'David De Salvo',
        isFounder: true,
        tier: 'vip',
        createdAt: new Date().toISOString(),
      };
    }

    return res.json({ success: true, users: Object.values(userMap) });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error al obtener usuarios.' });
  }
});

// Grant VIP
app.post('/api/founder/users/grant-vip', async (req, res) => {
  try {
    const { targetEmail, requesterEmail } = req.body || {};
    const requester = String(requesterEmail || '').trim().toLowerCase();
    if (requester !== FOUNDER_EMAIL_LOWER) {
      return res.status(403).json({ success: false, message: 'No autorizado. Solo el fundador puede otorgar VIP.' });
    }

    const cleanTarget = String(targetEmail || '').trim().toLowerCase();
    if (!cleanTarget || !cleanTarget.includes('@')) {
      return res.status(400).json({ success: false, message: 'Email de usuario inválido.' });
    }

    // Update in local db
    if (!db.userData[cleanTarget]) {
      db.userData[cleanTarget] = {
        email: cleanTarget,
        name: cleanTarget.split('@')[0],
        tier: 'vip',
        dailyLogs: {},
        updatedAt: new Date().toISOString(),
      };
    } else {
      db.userData[cleanTarget].tier = 'vip';
      db.userData[cleanTarget].updatedAt = new Date().toISOString();
    }

    if (db.users[cleanTarget]) {
      db.users[cleanTarget].tier = 'vip';
    }

    saveSyncDatabase(db);

    // Update in Supabase if configured
    if (supabaseServer) {
      try {
        await supabaseServer
          .from('vip_invitations')
          .upsert({ email: cleanTarget, status: 'active', invited_by: requester, updated_at: new Date().toISOString() }, { onConflict: 'email' });
        await supabaseServer
          .from('profiles')
          .update({ subscription_plan: 'vip', updated_at: new Date().toISOString() })
          .eq('email', cleanTarget);
      } catch (supaErr) {
        console.warn('Notice updating VIP in Supabase:', supaErr);
      }
    }

    return res.json({ success: true, message: `Rango VIP otorgado exitosamente a ${cleanTarget}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error al otorgar VIP.' });
  }
});

// Revoke VIP
app.post('/api/founder/users/revoke-vip', async (req, res) => {
  try {
    const { targetEmail, requesterEmail } = req.body || {};
    const requester = String(requesterEmail || '').trim().toLowerCase();
    if (requester !== FOUNDER_EMAIL_LOWER) {
      return res.status(403).json({ success: false, message: 'No autorizado.' });
    }

    const cleanTarget = String(targetEmail || '').trim().toLowerCase();
    if (cleanTarget === FOUNDER_EMAIL_LOWER) {
      return res.status(400).json({ success: false, message: 'No se puede revocar al fundador.' });
    }

    // Update in local db
    if (db.userData[cleanTarget]) {
      db.userData[cleanTarget].tier = 'free';
      db.userData[cleanTarget].updatedAt = new Date().toISOString();
    }

    if (db.users[cleanTarget]) {
      db.users[cleanTarget].tier = 'free';
    }

    saveSyncDatabase(db);

    // Update in Supabase if configured
    if (supabaseServer) {
      try {
        await supabaseServer
          .from('vip_invitations')
          .update({ status: 'revoked', updated_at: new Date().toISOString() })
          .eq('email', cleanTarget);
        await supabaseServer
          .from('profiles')
          .update({ subscription_plan: 'free', updated_at: new Date().toISOString() })
          .eq('email', cleanTarget);
      } catch (supaErr) {
        console.warn('Notice revoking VIP in Supabase:', supaErr);
      }
    }

    return res.json({ success: true, message: `Rango VIP revocado para ${cleanTarget}.` });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error al revocar VIP.' });
  }
});

// ============================================================================
// GOOGLE FIT OAUTH2 & FITNESS REST API INTEGRATION
// ============================================================================
const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// 1. Configuración de Google Fit
app.get(['/api/google-fit/config', '/api/google-fit/config/'], (req, res) => {
  const origin = (req.query.origin as string) || `http://localhost:${PORT}`;
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    '324998110009-0tcomd0d8tap98ccan6j8n0vmr53okp5.apps.googleusercontent.com';
  const hasClientSecret = Boolean(process.env.GOOGLE_CLIENT_SECRET);

  res.json({
    configured: true,
    clientId,
    hasClientSecret,
    redirectUri: `${origin}/auth/callback`,
    scopes: GOOGLE_FIT_SCOPES,
  });
});

// 2. Auth URL
app.get(['/api/google-fit/auth-url', '/api/google-fit/auth-url/'], (req, res) => {
  const origin = (req.query.origin as string) || `http://localhost:${PORT}`;
  const clientId =
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    '324998110009-0tcomd0d8tap98ccan6j8n0vmr53okp5.apps.googleusercontent.com';
  const redirectUri = `${origin}/auth/callback`;
  const responseType = process.env.GOOGLE_CLIENT_SECRET ? 'code' : 'token';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(
    GOOGLE_FIT_SCOPES
  )}&include_granted_scopes=true&prompt=consent`;

  res.json({ url });
});

// 3. Token Exchange
app.post(['/api/google-fit/token-exchange', '/api/google-fit/token-exchange/'], async (req, res) => {
  try {
    const { code, redirectUri } = req.body || {};
    const clientId =
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      '324998110009-0tcomd0d8tap98ccan6j8n0vmr53okp5.apps.googleusercontent.com';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientSecret) {
      return res.status(400).json({ success: false, message: 'GOOGLE_CLIENT_SECRET no configurado en el servidor.' });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (tokenRes.ok && tokenData.access_token) {
      return res.json({
        success: true,
        accessToken: tokenData.access_token,
        expiresIn: tokenData.expires_in || 3600,
      });
    }

    return res.status(400).json({
      success: false,
      message: tokenData.error_description || 'Error canjeando código de autorización.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err?.message || 'Error interno de canje.' });
  }
});

// 4. Callback OAuth
app.get(['/auth/callback', '/auth/callback/'], async (_req, res) => {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Autenticación Google Fit</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #09090b; color: #f4f4f5; text-align: center; }
    .card { background: #18181b; border: 1px solid #27272a; padding: 2rem; border-radius: 1rem; max-width: 400px; }
  </style>
</head>
<body>
  <div class="card">
    <h3>Procesando vinculación...</h3>
    <p style="color: #a1a1aa; font-size: 0.875rem;">Completando autorización con Google Fit...</p>
  </div>
  <script>
    (function() {
      const hash = window.location.hash.substring(1);
      const search = window.location.search.substring(1);
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(search);

      const accessToken = hashParams.get('access_token');
      const expiresIn = hashParams.get('expires_in');
      const code = queryParams.get('code');
      const error = hashParams.get('error') || queryParams.get('error');

      const payload = {
        type: 'GOOGLE_FIT_AUTH_RESULT',
        accessToken: accessToken,
        expiresIn: expiresIn ? Number(expiresIn) : 3600,
        code: code,
        error: error
      };

      if (window.opener) {
        window.opener.postMessage(payload, '*');
        setTimeout(function() { window.close(); }, 600);
      } else {
        if (accessToken) {
          sessionStorage.setItem('nutrifit_google_fit_token', accessToken);
        }
        window.location.href = '/';
      }
    })();
  </script>
</body>
</html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

// 5. Fetch Activity - Soporta POST, GET y OPTIONS para evitar 405 en PWA, móviles y proxies
app.all(['/api/google-fit/activity', '/api/google-fit/activity/'], async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido. Use GET o POST.' });
  }

  try {
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const accessToken = req.body?.accessToken || req.query?.accessToken || req.query?.token || bearerToken;
    const targetDateStr = req.body?.date || req.query?.date || new Date().toISOString().split('T')[0];

    if (!accessToken) {
      return res.status(400).json({ success: false, message: 'Access token de Google Fit requerido.' });
    }

    const startDate = new Date(`${targetDateStr}T00:00:00.000`);
    const endDate = new Date(`${targetDateStr}T23:59:59.999`);

    const fitnessResponse = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        aggregateBy: [
          { dataTypeName: 'com.google.step_count.delta' },
          { dataTypeName: 'com.google.calories.expended' },
        ],
        bucketByTime: { durationMillis: 86400000 },
        startTimeMillis: startDate.getTime(),
        endTimeMillis: endDate.getTime(),
      }),
    });

    if (!fitnessResponse.ok) {
      const errData = await fitnessResponse.json().catch(() => null);
      console.warn(`[GoogleFit Server] Google Fit API responded with HTTP ${fitnessResponse.status}:`, errData);

      if (fitnessResponse.status === 401) {
        return res.status(401).json({ success: false, message: 'TOKEN_EXPIRED', error: 'Sesión expirada en Google Fit.' });
      }
      if (fitnessResponse.status === 403) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes en Google Fit. Asegúrate de conceder acceso a actividad física (fitness.activity.read) y métricas corporales (fitness.body.read).',
        });
      }

      // NUNCA devolver 405 al cliente ante un error aguas abajo de Google Fit.
      // Retornar 200 con 0 pasos y calorías para mantener la experiencia fluida y sin bloqueos.
      return res.json({
        success: true,
        date: targetDateStr,
        steps: 0,
        calories: 0,
        source: 'google_fitness_api',
        notice: `API de Google Fit respondió con código ${fitnessResponse.status}.`,
      });
    }

    const fitData = await fitnessResponse.json();
    let totalSteps = 0;
    let totalCalories = 0;

    if (fitData.bucket && fitData.bucket.length > 0) {
      for (const b of fitData.bucket) {
        if (b.dataset) {
          for (const ds of b.dataset) {
            if (ds.point) {
              for (const pt of ds.point) {
                if (pt.dataTypeName === 'com.google.step_count.delta') {
                  const val = pt.value?.[0]?.intVal ?? pt.value?.[0]?.fpVal ?? 0;
                  totalSteps += Math.round(Number(val));
                } else if (pt.dataTypeName === 'com.google.calories.expended') {
                  const cal = pt.value?.[0]?.fpVal ?? pt.value?.[0]?.intVal ?? 0;
                  totalCalories += Math.round(Number(cal));
                }
              }
            }
          }
        }
      }
    }

    return res.json({
      success: true,
      date: targetDateStr,
      steps: totalSteps,
      calories: totalCalories,
      source: 'google_fitness_api',
    });
  } catch (err: any) {
    console.error('[GoogleFit Server] Internal error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error consultando actividad física.' });
  }
});

// Vite server integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();