/**
 * Reducción de imágenes antes de enviarlas a analizar.
 *
 * Una foto de móvil moderna pesa entre 3 y 8 MB; en base64 crece un tercio más
 * y supera el límite de 4,5 MB del cuerpo de una función de Vercel. Además, una
 * imagen grande tarda más en subir y en procesarse, y el análisis se acerca al
 * tiempo máximo de la función.
 *
 * 1024 px de lado mayor es de sobra para identificar un plato.
 */

const MAX_SIZE = 1280;
const QUALITY = 0.85;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen.'));
    img.src = src;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Devuelve la imagen como data URL JPEG, reducida si hace falta.
 * Si algo falla, devuelve el original: mejor intentar el análisis que cortarlo.
 */
export async function downscaleImage(source: File | string): Promise<string> {
  try {
    const original = typeof source === 'string' ? source : await readAsDataUrl(source);
    const img = await loadImage(original);

    const largest = Math.max(img.width, img.height);
    if (largest <= MAX_SIZE && typeof source === 'string') {
      return original;
    }

    const scale = largest > MAX_SIZE ? MAX_SIZE / largest : 1;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return original;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.90);
  } catch (error) {
    console.error('[downscaleImage] no se pudo reducir:', error);
    return typeof source === 'string' ? source : '';
  }
}
