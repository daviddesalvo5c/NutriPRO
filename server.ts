import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeFood, AnalysisError } from './api/_lib/analyzeFood';
import { searchFoods, FoodSearchError, SOURCE } from './api/_lib/foodSearch';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// High body limit for high-resolution camera images
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Búsqueda de alimentos en USDA FoodData Central
app.get('/api/foods-search', async (req, res) => {
  try {
    const results = await searchFoods(String(req.query.q ?? ''));
    return res.json({ source: SOURCE, results });
  } catch (error: any) {
    if (error instanceof FoodSearchError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    console.error('[api/foods-search] Error inesperado:', error);
    return res.status(500).json({ error: 'Error inesperado en la búsqueda.', code: 'unexpected' });
  }
});

// Real visual food analysis endpoint using Gemini Vision
app.post('/api/analyze-food', async (req, res) => {
  try {
    const { image, mimeType } = req.body || {};
    const result = await analyzeFood(image, mimeType);
    return res.json(result);
  } catch (error: any) {
    if (error instanceof AnalysisError) {
      return res.status(error.status).json({ error: error.message, code: error.code });
    }

    console.error('[api/analyze-food] Error inesperado:', error);
    return res
      .status(500)
      .json({ error: 'Error inesperado durante el análisis.', code: 'unexpected' });
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
