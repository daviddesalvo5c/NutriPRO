/**
 * Google Fit / Google Fitness REST API Integration Service
 * Handles OAuth2 authentication (Popup / GSI token client) and
 * queries real-time activity metrics (steps and active calories burned)
 * via the Google Fitness REST API dataset:aggregate endpoint.
 */

const STORAGE_TOKEN_KEY = 'nutrifit_google_fit_token';
const STORAGE_EXPIRY_KEY = 'nutrifit_google_fit_token_exp';

export interface GoogleFitSyncResult {
  success: boolean;
  steps: number;
  calories: number;
  date: string;
  syncedAt: string;
  source: 'google_fitness_api';
  error?: string;
}

export interface GoogleFitConfig {
  configured: boolean;
  clientId: string;
  redirectUri: string;
  scopes: string;
}

/**
 * Get Google Fit OAuth config from backend
 */
export async function getGoogleFitConfig(): Promise<GoogleFitConfig> {
  try {
    const res = await fetch('/api/google-fit/config');
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('Notice loading Google Fit config:', err);
  }
  const appOrigin = window.location.origin;
  return {
    configured: Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID),
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
    redirectUri: `${appOrigin}/auth/callback`,
    scopes: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read',
  };
}

/**
 * Check if we currently have an active stored access token
 */
export function getStoredGoogleFitToken(): string | null {
  try {
    const token = sessionStorage.getItem(STORAGE_TOKEN_KEY) || localStorage.getItem(STORAGE_TOKEN_KEY);
    const exp = Number(sessionStorage.getItem(STORAGE_EXPIRY_KEY) || localStorage.getItem(STORAGE_EXPIRY_KEY) || 0);
    if (token && exp && Date.now() < exp) {
      return token;
    }
    // Expired or missing
    if (token && exp && Date.now() >= exp) {
      clearStoredGoogleFitToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function saveGoogleFitToken(token: string, expiresInSeconds: number = 3600): void {
  try {
    const exp = Date.now() + (expiresInSeconds * 1000) - 30000; // 30s buffer
    sessionStorage.setItem(STORAGE_TOKEN_KEY, token);
    sessionStorage.setItem(STORAGE_EXPIRY_KEY, String(exp));
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
    localStorage.setItem(STORAGE_EXPIRY_KEY, String(exp));
  } catch {
    // ignore
  }
}

export function clearStoredGoogleFitToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Initiates the Google OAuth2 popup flow to obtain access_token for Google Fit.
 * Listens for cross-origin postMessage from the popup window callback.
 */
export async function authenticateGoogleFit(): Promise<{ success: boolean; accessToken?: string; message?: string }> {
  const config = await getGoogleFitConfig();

  // If GSI (Google Identity Services) client is available in window
  if ((window as any).google?.accounts?.oauth2 && config.clientId) {
    return new Promise((resolve) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read',
          callback: (response: any) => {
            if (response && response.access_token) {
              const exp = response.expires_in ? Number(response.expires_in) : 3600;
              saveGoogleFitToken(response.access_token, exp);
              resolve({ success: true, accessToken: response.access_token });
            } else if (response && response.error) {
              resolve({ success: false, message: response.error_description || response.error });
            } else {
              resolve({ success: false, message: 'Autenticación cancelada o fallida.' });
            }
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        console.warn('GSI client error, falling back to popup:', err);
        launchOAuthPopup(config, resolve);
      }
    });
  }

  // Popup-based OAuth flow directly opening Google's OAuth URL
  return new Promise((resolve) => {
    launchOAuthPopup(config, resolve);
  });
}

function launchOAuthPopup(
  config: GoogleFitConfig,
  resolve: (val: { success: boolean; accessToken?: string; message?: string }) => void
) {
  if (!config.configured && !config.clientId) {
    // Notice to configure Google Client ID
    resolve({
      success: false,
      message: 'GOOGLE_CLIENT_ID no configurado. Se requiere un Client ID de Google Cloud Console con la API Google Fitness activada.',
    });
    return;
  }

  const clientId = config.clientId;
  const redirectUri = encodeURIComponent(config.redirectUri);
  const scopes = encodeURIComponent(config.scopes);

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scopes}&include_granted_scopes=true&prompt=consent`;

  const width = 520;
  const height = 650;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const popup = window.open(
    authUrl,
    'google_fit_oauth_popup',
    `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
  );

  if (!popup) {
    resolve({
      success: false,
      message: 'El navegador bloqueó la ventana emergente. Por favor permite popups para conectar Google Fit.',
    });
    return;
  }

  let resolved = false;

  const handleMessage = (event: MessageEvent) => {
    // Validate message type
    if (event.data && event.data.type === 'GOOGLE_FIT_AUTH_RESULT') {
      resolved = true;
      window.removeEventListener('message', handleMessage);
      clearInterval(timer);

      if (event.data.success && event.data.accessToken) {
        saveGoogleFitToken(event.data.accessToken, 3600);
        resolve({ success: true, accessToken: event.data.accessToken });
      } else {
        resolve({
          success: false,
          message: event.data.error || 'No se concedieron los permisos solicitados de Google Fit.',
        });
      }
    }
  };

  window.addEventListener('message', handleMessage);

  // Check if popup was closed by user
  const timer = setInterval(() => {
    if (popup.closed && !resolved) {
      clearInterval(timer);
      window.removeEventListener('message', handleMessage);
      resolve({ success: false, message: 'La ventana de autenticación fue cerrada antes de completar la vinculación.' });
    }
  }, 1000);
}

/**
 * Queries real steps and active calories for a given date from the Google Fitness REST API
 */
export async function fetchGoogleFitActivity(
  targetDateStr: string,
  providedToken?: string
): Promise<GoogleFitSyncResult> {
  const token = providedToken || getStoredGoogleFitToken();

  if (!token) {
    throw new Error('NO_TOKEN');
  }

  const response = await fetch('/api/google-fit/activity', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken: token,
      date: targetDateStr,
    }),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearStoredGoogleFitToken();
      throw new Error('TOKEN_EXPIRED');
    }
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Error del servidor al consultar Google Fit (${response.status})`);
  }

  const data = await response.json();
  return {
    success: true,
    steps: data.steps || 0,
    calories: data.calories || 0,
    date: targetDateStr,
    syncedAt: data.syncedAt || new Date().toISOString(),
    source: 'google_fitness_api',
  };
}
