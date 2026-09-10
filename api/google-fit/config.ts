const GOOGLE_FIT_SCOPES = [
  'https://www.googleapis.com/auth/fitness.activity.read',
  'https://www.googleapis.com/auth/fitness.body.read',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

export default function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const origin = (req.query.origin as string) || req.headers.origin || 'http://localhost:3000';
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
}
