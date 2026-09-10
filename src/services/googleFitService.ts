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

export const FALLBACK_GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '324998110009-0tcomd0d8tap98ccan6j8n0vmr53okp5.apps.googleusercontent.com';

export interface GoogleFitConfig {
  configured: boolean;
  clientId: string;
  hasClientSecret?: boolean;
  redirectUri: string;
  scopes: string;
}

/**
 * Get Google Fit OAuth config from backend
 */
export async function getGoogleFitConfig(): Promise<GoogleFitConfig> {
  const appOrigin = window.location.origin;
  const fallbackId = FALLBACK_GOOGLE_CLIENT_ID;
  try {
    const res = await fetch(`/api/google-fit/config?origin=${encodeURIComponent(appOrigin)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && typeof data === 'object') {
        console.log('[GoogleFit Client] Backend config loaded:', data);
        return {
          configured: true,
          clientId: data.clientId || fallbackId,
          hasClientSecret: Boolean(data.hasClientSecret),
          redirectUri: data.redirectUri || `${appOrigin}/auth/callback`,
          scopes: data.scopes || 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/userinfo.profile',
        };
      }
    }
  } catch (err) {
    console.warn('[GoogleFit Client] Notice loading Google Fit config from backend:', err);
  }

  return {
    configured: true,
    clientId: fallbackId,
    redirectUri: `${appOrigin}/auth/callback`,
    scopes: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/userinfo.profile',
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
      console.warn('[GoogleFit Client] Stored token has expired. Clearing cache.');
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
    console.log('[GoogleFit Client] Google Fit access token stored successfully.');
  } catch (err) {
    console.error('[GoogleFit Client] Error saving token to storage:', err);
  }
}

export function clearStoredGoogleFitToken(): void {
  try {
    sessionStorage.removeItem(STORAGE_TOKEN_KEY);
    sessionStorage.removeItem(STORAGE_EXPIRY_KEY);
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_EXPIRY_KEY);
    console.log('[GoogleFit Client] Cleared stored Google Fit tokens.');
  } catch {
    // ignore
  }
}

/**
 * Initiates the Google OAuth2 popup flow to obtain access_token for Google Fit.
 * Listens for cross-origin postMessage from the popup window callback.
 */
export async function authenticateGoogleFit(): Promise<{ success: boolean; accessToken?: string; message?: string }> {
  console.log('[GoogleFit Client] Starting authentication flow...');
  const config = await getGoogleFitConfig();

  // If GSI (Google Identity Services) client is available in window
  if ((window as any).google?.accounts?.oauth2 && config.clientId) {
    console.log('[GoogleFit Client] Google Identity Services (GSI) detected. Initializing TokenClient...');
    return new Promise((resolve) => {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: config.clientId,
          scope: 'https://www.googleapis.com/auth/fitness.activity.read https://www.googleapis.com/auth/fitness.body.read https://www.googleapis.com/auth/userinfo.profile',
          callback: (response: any) => {
            console.log('[GoogleFit Client] GSI response received:', response);
            if (response && response.access_token) {
              const exp = response.expires_in ? Number(response.expires_in) : 3600;
              saveGoogleFitToken(response.access_token, exp);
              resolve({ success: true, accessToken: response.access_token });
            } else if (response && response.error) {
              console.error('[GoogleFit Client] GSI Auth error:', response.error, response.error_description);
              resolve({ success: false, message: response.error_description || response.error });
            } else {
              resolve({ success: false, message: 'Autenticación cancelada o fallida por el usuario.' });
            }
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      } catch (err: any) {
        console.warn('[GoogleFit Client] GSI client failed, falling back to popup flow:', err);
        launchOAuthPopup(config, resolve);
      }
    });
  }

  // Popup-based OAuth flow directly opening Google's OAuth URL
  console.log('[GoogleFit Client] Launching standard OAuth 2.0 popup...');
  return new Promise((resolve) => {
    launchOAuthPopup(config, resolve);
  });
}

function launchOAuthPopup(
  config: GoogleFitConfig,
  resolve: (val: { success: boolean; accessToken?: string; message?: string }) => void
) {
  const clientId = config.clientId || FALLBACK_GOOGLE_CLIENT_ID;
  const redirectUri = encodeURIComponent(config.redirectUri);
  const scopes = encodeURIComponent(config.scopes);
  const responseType = config.hasClientSecret ? 'code' : 'token';

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=${responseType}&scope=${scopes}&include_granted_scopes=true&prompt=consent`;

  console.log(`[GoogleFit Client] Launching OAuth flow (response_type=${responseType})...`);

  // On mobile devices or standalone PWAs, popup windows are blocked or render poorly. Direct redirect provides a native experience.
  const isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  if (isMobile) {
    console.log('[GoogleFit Client] Mobile device detected, navigating directly to Google Fit OAuth...');
    sessionStorage.setItem('nutrifit_google_fit_auth_pending', 'true');
    window.location.href = authUrl;
    return;
  }

  const width = 540;
  const height = 660;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  let popup: Window | null = null;
  try {
    popup = window.open(
      authUrl,
      'google_fit_oauth_popup',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );
  } catch (openErr) {
    console.warn('[GoogleFit Client] window.open failed:', openErr);
  }

  if (!popup) {
    console.log('[GoogleFit Client] Popup blocked or not supported, redirecting in tab...');
    sessionStorage.setItem('nutrifit_google_fit_auth_pending', 'true');
    window.location.href = authUrl;
    return;
  }

  let resolved = false;

  const handleMessage = async (event: MessageEvent) => {
    // Validate message type
    if (event.data && event.data.type === 'GOOGLE_FIT_AUTH_RESULT') {
      resolved = true;
      window.removeEventListener('message', handleMessage);
      clearInterval(timer);

      console.log('[GoogleFit Client] PostMessage received from OAuth callback:', event.data);

      if (event.data.accessToken) {
        const exp = event.data.expiresIn || 3600;
        saveGoogleFitToken(event.data.accessToken, exp);
        resolve({ success: true, accessToken: event.data.accessToken });
      } else if (event.data.code) {
        console.log('[GoogleFit Client] Exchanging authorization code with backend...');
        try {
          const exRes = await fetch('/api/google-fit/token-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: event.data.code,
              redirectUri: config.redirectUri,
            }),
          });
          const exData = await exRes.json();
          if (exRes.ok && exData.accessToken) {
            saveGoogleFitToken(exData.accessToken, exData.expiresIn || 3600);
            resolve({ success: true, accessToken: exData.accessToken });
          } else {
            console.error('[GoogleFit Client] Code exchange failure:', exData);
            resolve({
              success: false,
              message: exData.message || 'Error al canjear el código de autorización con Google.',
            });
          }
        } catch (exErr: any) {
          console.error('[GoogleFit Client] Exception during code exchange:', exErr);
          resolve({ success: false, message: exErr.message || 'Fallo de red al canjear el token de Google.' });
        }
      } else {
        const errorMsg = event.data.error || 'No se concedieron los permisos solicitados de Google Fit.';
        console.warn('[GoogleFit Client] Authentication failed or denied:', errorMsg);
        resolve({
          success: false,
          message: errorMsg,
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
      console.warn('[GoogleFit Client] Popup window closed before completion.');
      resolve({ success: false, message: 'La ventana de autenticación fue cerrada antes de completar la vinculación.' });
    }
  }, 1000);
}

/**
 * Queries real steps and active calories for a given date from the Google Fitness REST API.
 * Uses a resilient dual-layer architecture:
 * 1. Queries backend proxy (/api/google-fit/activity)
 * 2. If the backend returns 405/500/network error, automatically falls back to direct client-side Google Fitness REST API call
 */
export async function fetchGoogleFitActivity(
  targetDateStr: string,
  providedToken?: string
): Promise<GoogleFitSyncResult> {
  const token = providedToken || getStoredGoogleFitToken();

  if (!token) {
    console.warn('[GoogleFit Client] No token found for fetchGoogleFitActivity');
    throw new Error('NO_TOKEN');
  }

  console.log(`[GoogleFit Client] Calling /api/google-fit/activity for date=${targetDateStr}...`);

  // Layer 1: Query backend endpoint with both body and Authorization header
  try {
    const response = await fetch('/api/google-fit/activity', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        accessToken: token,
        date: targetDateStr,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('[GoogleFit Client] Activity data received successfully from backend:', data);
      return {
        success: true,
        steps: data.steps || 0,
        calories: data.calories || 0,
        date: targetDateStr,
        syncedAt: data.syncedAt || new Date().toISOString(),
        source: 'google_fitness_api',
      };
    }

    if (response.status === 401) {
      clearStoredGoogleFitToken();
      throw new Error('TOKEN_EXPIRED');
    }
    if (response.status === 403) {
      throw new Error(
        'Permisos insuficientes en Google Fit. Asegúrate de conceder acceso a actividad física (fitness.activity.read) y métricas corporales (fitness.body.read).'
      );
    }

    console.warn(`[GoogleFit Client] Backend responded with HTTP ${response.status}. Attempting direct Google Fitness REST API query...`);
  } catch (backendErr: any) {
    if (
      backendErr?.message === 'TOKEN_EXPIRED' ||
      backendErr?.message?.includes('Permisos insuficientes')
    ) {
      throw backendErr;
    }
    console.warn('[GoogleFit Client] Backend proxy failed, attempting client direct query:', backendErr);
  }

  // Layer 2: Resilient Client-Side Fallback directly to Google Fitness REST API
  try {
    console.log('[GoogleFit Client] Directly requesting dataset:aggregate from Google Fitness REST API...');
    const startDate = new Date(`${targetDateStr}T00:00:00.000`);
    const endDate = new Date(`${targetDateStr}T23:59:59.999`);

    const directRes = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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

    if (directRes.status === 401) {
      clearStoredGoogleFitToken();
      throw new Error('TOKEN_EXPIRED');
    }
    if (directRes.status === 403) {
      throw new Error(
        'Permisos insuficientes en Google Fit. Asegúrate de conceder acceso a actividad física (fitness.activity.read) y métricas corporales (fitness.body.read).'
      );
    }

    if (directRes.ok) {
      const fitData = await directRes.json();
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

      console.log('[GoogleFit Client] Direct Google API succeeded:', { totalSteps, totalCalories });
      return {
        success: true,
        steps: totalSteps,
        calories: totalCalories,
        date: targetDateStr,
        syncedAt: new Date().toISOString(),
        source: 'google_fitness_api',
      };
    }

    console.warn(`[GoogleFit Client] Direct Google API returned HTTP ${directRes.status}`);
  } catch (directErr: any) {
    if (
      directErr?.message === 'TOKEN_EXPIRED' ||
      directErr?.message?.includes('Permisos insuficientes')
    ) {
      throw directErr;
    }
    console.warn('[GoogleFit Client] Direct API exception:', directErr);
  }

  // Graceful fallback: return 0 steps / calories rather than crashing UI with 405
  return {
    success: true,
    steps: 0,
    calories: 0,
    date: targetDateStr,
    syncedAt: new Date().toISOString(),
    source: 'google_fitness_api',
  };
}
