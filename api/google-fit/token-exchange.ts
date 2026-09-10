export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido. Use POST.' });
  }

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
}
