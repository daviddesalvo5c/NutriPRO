import { BrowserMultiFormatReader } from '@zxing/browser';

export interface PackageProductResult {
  productName: string;
  brand: string;
  barcode?: string;
  unitName: string; // ej: "galletitas", "unidades", "rebanadas", "barritas"
  unitsPerServing: number;
  gramsPerUnit: number;
  caloriesPerUnit: number;
  proteinPerUnit: number;
  carbsPerUnit: number;
  fatPerUnit: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  servingLabel?: string;
  confidence: number;
  notes?: string;
  imageUrl?: string;
  source: 'openfoodfacts' | 'ai_package' | 'database';
}

export interface PortionCalculation {
  unitCount: number;
  unitName: string;
  totalGrams: number;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
}

// Singleton reader instance
let multiFormatReader: BrowserMultiFormatReader | null = null;

function getBarcodeReader(): BrowserMultiFormatReader {
  if (!multiFormatReader) {
    multiFormatReader = new BrowserMultiFormatReader();
  }
  return multiFormatReader;
}

/**
 * Intenta leer un código de barras de una imagen HTML o Canvas
 */
export async function detectBarcodeFromImage(
  imageElementOrCanvas: HTMLImageElement | HTMLCanvasElement
): Promise<string | null> {
  // 1. Probar API nativa de BarcodeDetector si está disponible en el navegador
  if ('BarcodeDetector' in window) {
    try {
      const barcodeDetector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });
      const barcodes = await barcodeDetector.detect(imageElementOrCanvas);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        return barcodes[0].rawValue.trim();
      }
    } catch (err) {
      console.warn('Native BarcodeDetector attempt notice:', err);
    }
  }

  // 2. Fallback con @zxing/browser
  try {
    const reader = getBarcodeReader();
    let result = null;
    if (imageElementOrCanvas instanceof HTMLCanvasElement) {
      result = await reader.decodeFromCanvas(imageElementOrCanvas);
    } else {
      result = await reader.decodeFromImageElement(imageElementOrCanvas);
    }
    if (result && result.getText()) {
      return result.getText().trim();
    }
  } catch (err) {
    // Si no encuentra código en la imagen, es normal cuando la foto es del frente del paquete
  }

  return null;
}

/**
 * Consulta la base internacional y argentina Open Food Facts por código de barras
 */
export async function fetchProductFromOpenFoodFacts(barcode: string): Promise<PackageProductResult | null> {
  const cleanCode = barcode.trim();
  if (!cleanCode) return null;

  try {
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanCode)}.json`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const prod = data.product;
    const nutriments = prod.nutriments || {};

    const productName = prod.product_name_es || prod.product_name || prod.generic_name || `Producto #${cleanCode}`;
    const brand = prod.brands || 'Marca envasada';

    // Calorías por 100g
    const calories100g = Math.round(
      nutriments['energy-kcal_100g'] || 
      (nutriments['energy_100g'] ? nutriments['energy_100g'] / 4.184 : 0) || 
      450
    );
    const protein100g = Number(Number(nutriments['proteins_100g'] || 0).toFixed(2));
    const carbs100g = Number(Number(nutriments['carbohydrates_100g'] || 0).toFixed(2));
    const fat100g = Number(Number(nutriments['fat_100g'] || 0).toFixed(2));

    // Detección de porción
    const servingSizeStr = prod.serving_size || '';
    let servingGrams = parseFloat(nutriments['serving_quantity'] || '30');
    if (isNaN(servingGrams) || servingGrams <= 0) {
      const match = servingSizeStr.match(/(\d+(?:[.,]\d+)?)\s*g/i);
      if (match) {
        servingGrams = parseFloat(match[1].replace(',', '.'));
      } else {
        servingGrams = 30;
      }
    }

    // Inferir tipo de unidad: galletita / unidad
    let unitName = 'galletitas';
    let unitsPerServing = 3;

    const lowerName = productName.toLowerCase();
    if (lowerName.includes('gallet') || lowerName.includes('cookie') || lowerName.includes('biscuit') || lowerName.includes('oreo') || lowerName.includes('chocolina')) {
      unitName = 'galletitas';
      unitsPerServing = 3;
    } else if (lowerName.includes('alfajor')) {
      unitName = 'alfajores';
      unitsPerServing = 1;
    } else if (lowerName.includes('barra') || lowerName.includes('barrita')) {
      unitName = 'barritas';
      unitsPerServing = 1;
    } else if (lowerName.includes('pan') || lowerName.includes('tostada')) {
      unitName = 'rebanadas';
      unitsPerServing = 2;
    } else {
      unitName = 'unidades';
      unitsPerServing = 1;
    }

    const gramsPerUnit = Number((servingGrams / unitsPerServing).toFixed(2));
    const unitFactor = gramsPerUnit / 100;

    const caloriesPerUnit = Math.round(calories100g * unitFactor);
    const proteinPerUnit = Number((protein100g * unitFactor).toFixed(2));
    const carbsPerUnit = Number((carbs100g * unitFactor).toFixed(2));
    const fatPerUnit = Number((fat100g * unitFactor).toFixed(2));

    return {
      productName,
      brand,
      barcode: cleanCode,
      unitName,
      unitsPerServing,
      gramsPerUnit,
      caloriesPerUnit,
      proteinPerUnit,
      carbsPerUnit,
      fatPerUnit,
      caloriesPer100g: calories100g,
      proteinPer100g: protein100g,
      carbsPer100g: carbs100g,
      fatPer100g: fat100g,
      servingLabel: servingSizeStr || `Porción: ${servingGrams}g (~${unitsPerServing} ${unitName})`,
      confidence: 96,
      notes: `Información oficial extraída del código de barras registrado ${cleanCode}.`,
      imageUrl: prod.image_front_small_url || prod.image_front_url || undefined,
      source: 'openfoodfacts',
    };
  } catch (err) {
    console.warn('Open Food Facts lookup error:', err);
    return null;
  }
}

/**
 * Analiza un paquete o producto mediante IA (Gemini Vision) para extraer tabla nutricional y unidades
 */
export async function analyzePackageWithAI(params: {
  image?: string;
  barcode?: string;
  productHint?: string;
}): Promise<PackageProductResult> {
  const res = await fetch('/api/analyze-package', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: params.image,
      barcode: params.barcode,
      productHint: params.productHint,
    }),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error || 'No se pudo analizar el paquete o producto.');
  }

  const data = await res.json();
  return {
    ...data,
    source: 'ai_package',
  };
}

/**
 * Calcula la porción interactiva exacta en base a N galletitas o unidades
 * Ej: Si me como 4 galletitas de este paquete de galletitas cuantas calorías son
 */
export function calculatePortionFromProduct(
  product: PackageProductResult,
  count: number
): PortionCalculation {
  const safeCount = Math.max(0.5, count);
  const totalGrams = Number((safeCount * product.gramsPerUnit).toFixed(2));
  const calories = Math.round(safeCount * product.caloriesPerUnit);
  const proteinGrams = Number((safeCount * product.proteinPerUnit).toFixed(2));
  const carbsGrams = Number((safeCount * product.carbsPerUnit).toFixed(2));
  const fatGrams = Number((safeCount * product.fatPerUnit).toFixed(2));

  return {
    unitCount: safeCount,
    unitName: product.unitName,
    totalGrams,
    calories,
    proteinGrams,
    carbsGrams,
    fatGrams,
  };
}
