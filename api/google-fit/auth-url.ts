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
  const redirectUri = `${origin}/auth/callback`;
  const responseType = process.env.GOOGLE_CLIENT_SECRET ? 'code' : 'token';
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=${responseType}&scope=${encodeURIComponent(
    GOOGLE_FIT_SCOPES
  )}&include_granted_scopes=true&prompt=consent`;

  res.json({ url });
}
