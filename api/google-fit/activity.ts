export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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
    const targetDateStr = (req.body?.date as string) || (req.query?.date as string) || new Date().toISOString().split('T')[0];

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
      if (fitnessResponse.status === 401) {
        return res.status(401).json({ success: false, message: 'TOKEN_EXPIRED', error: 'Sesión expirada en Google Fit.' });
      }
      if (fitnessResponse.status === 403) {
        return res.status(403).json({
          success: false,
          message: 'Permisos insuficientes en Google Fit. Asegúrate de conceder acceso a actividad física y métricas corporales.',
        });
      }

      return res.json({
        success: true,
        date: targetDateStr,
        steps: 0,
        calories: 0,
        source: 'google_fitness_api',
        notice: `API de Google Fit respondió con código ${fitnessResponse.status}.`,
      });
    }

    const fitData = (await fitnessResponse.json()) as any;
    let totalSteps = 0;
    let totalCalories = 0;

    if (fitData.bucket && Array.isArray(fitData.bucket)) {
      for (const b of fitData.bucket) {
        if (b.dataset && Array.isArray(b.dataset)) {
          for (const ds of b.dataset) {
            if (ds.point && Array.isArray(ds.point)) {
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
    return res.status(500).json({ success: false, message: err.message || 'Error consultando actividad física.' });
  }
}
