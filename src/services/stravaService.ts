import { WorkoutItem, StravaActivity } from '../types';
import { loadActiveSession, isFounderEmail } from '../utils/storage';
import { cloudSyncService } from './cloudSyncService';

const BASE_STRAVA_STORAGE_KEY = 'nutrifit_strava_auth_v1';

export interface StravaAuthConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  athleteName: string | null;
}

export function getStravaStorageKey(email?: string | null): string {
  const effectiveEmail = email || (typeof window !== 'undefined' ? loadActiveSession()?.email : null);
  if (effectiveEmail && effectiveEmail.trim()) {
    return `${BASE_STRAVA_STORAGE_KEY}_${effectiveEmail.trim().toLowerCase()}`;
  }
  return BASE_STRAVA_STORAGE_KEY;
}

export function getStoredStravaConfig(userEmail?: string | null): StravaAuthConfig {
  const session = typeof window !== 'undefined' ? loadActiveSession() : null;
  const effectiveEmail = userEmail || session?.email || null;
  const isFounder = effectiveEmail ? isFounderEmail(effectiveEmail) : false;
  const storageKey = getStravaStorageKey(effectiveEmail);

  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (raw && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          clientId: parsed.clientId || '278644',
          clientSecret: parsed.clientSecret || '2b34bc09174ce8ca3d159e60b4b1f17e691b7da2',
          accessToken: parsed.accessToken || null,
          refreshToken: parsed.refreshToken || null,
          expiresAt: parsed.expiresAt || null,
          athleteName: parsed.athleteName || null,
        };
      }
    }

    // Check founder generic fallback key
    if (isFounder && typeof window !== 'undefined') {
      const legacyRaw = localStorage.getItem(BASE_STRAVA_STORAGE_KEY);
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (parsed?.accessToken) {
          return {
            clientId: parsed.clientId || '278644',
            clientSecret: parsed.clientSecret || '2b34bc09174ce8ca3d159e60b4b1f17e691b7da2',
            accessToken: parsed.accessToken,
            refreshToken: parsed.refreshToken || null,
            expiresAt: parsed.expiresAt || null,
            athleteName: parsed.athleteName || 'David De Salvo',
          };
        }
      }
    }
  } catch (err) {
    console.warn('Error reading stored Strava config:', err);
  }

  // If user is founder (David), default to his verified token
  if (isFounder) {
    return {
      clientId: '278644',
      clientSecret: '2b34bc09174ce8ca3d159e60b4b1f17e691b7da2',
      accessToken: '392a6d85e37cf57255860e59fd7042b9146317da',
      refreshToken: null,
      expiresAt: 1789152798,
      athleteName: 'David De Salvo',
    };
  }

  // Any other athlete/user starts fresh in disconnected state, ready to link their own Strava
  return {
    clientId: '278644',
    clientSecret: '2b34bc09174ce8ca3d159e60b4b1f17e691b7da2',
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    athleteName: null,
  };
}

export function saveStravaConfig(config: Partial<StravaAuthConfig>, userEmail?: string | null) {
  const session = typeof window !== 'undefined' ? loadActiveSession() : null;
  const effectiveEmail = userEmail || session?.email || null;
  const isFounder = effectiveEmail ? isFounderEmail(effectiveEmail) : false;
  const storageKey = getStravaStorageKey(effectiveEmail);

  const current = getStoredStravaConfig(effectiveEmail);
  const updated = { ...current, ...config };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (isFounder) {
        localStorage.setItem(BASE_STRAVA_STORAGE_KEY, JSON.stringify(updated));
      }
    }
  } catch (err) {
    console.warn('Error saving Strava config:', err);
  }

  // Cross-device synchronization: push to cloud so PC and Mobile are always in sync
  if (effectiveEmail) {
    cloudSyncService.pushUserData({
      email: effectiveEmail,
      stravaConfig: updated,
    }).catch(() => {});
  }

  return updated;
}

export function disconnectStrava(userEmail?: string | null) {
  const session = typeof window !== 'undefined' ? loadActiveSession() : null;
  const effectiveEmail = userEmail || session?.email || null;
  const isFounder = effectiveEmail ? isFounderEmail(effectiveEmail) : false;
  const storageKey = getStravaStorageKey(effectiveEmail);

  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
      if (isFounder) {
        localStorage.removeItem(BASE_STRAVA_STORAGE_KEY);
      }
    }
  } catch {
    // ignore
  }

  // Cross-device synchronization: push disconnect state to cloud
  if (effectiveEmail) {
    cloudSyncService.pushUserData({
      email: effectiveEmail,
      stravaConfig: {
        clientId: '278644',
        clientSecret: '2b34bc09174ce8ca3d159e60b4b1f17e691b7da2',
        accessToken: null,
        refreshToken: null,
        expiresAt: null,
        athleteName: null,
      },
    }).catch(() => {});
  }
}

/**
 * Builds the Strava OAuth2 Authorization URL
 */
export function getStravaAuthUrl(clientId: string, redirectUri: string): string {
  const scope = 'read,activity:read_all';
  return `https://www.strava.com/oauth/authorize?client_id=${encodeURIComponent(
    clientId
  )}&response_type=code&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&approval_prompt=auto&scope=${encodeURIComponent(scope)}`;
}

/**
 * Converts Strava activity types into NutriFit Pro workout category and item
 */
export function stravaActivityToWorkoutItem(act: StravaActivity, dateStr: string): Omit<WorkoutItem, 'id' | 'date'> {
  let category: WorkoutItem['type'] = 'other';
  let typeName = act.name || 'Entrenamiento Strava';

  const lowerType = (act.type || '').toLowerCase();
  if (lowerType.includes('ride') || lowerType.includes('cycling') || lowerType.includes('ebikeride')) {
    category = 'cycling';
    typeName = `Ciclismo Strava · ${act.name}`;
  } else if (lowerType.includes('run') || lowerType.includes('trail')) {
    category = 'running';
    typeName = `Running Strava · ${act.name}`;
  } else if (lowerType.includes('walk') || lowerType.includes('hike')) {
    category = 'outdoor_walk';
    typeName = `Caminata Strava · ${act.name}`;
  } else if (lowerType.includes('swim')) {
    category = 'swimming';
    typeName = `Natación Strava · ${act.name}`;
  } else if (lowerType.includes('weight') || lowerType.includes('crossfit') || lowerType.includes('workout')) {
    category = 'gym';
    typeName = `Gimnasio Strava · ${act.name}`;
  }

  const durationMin = Math.max(1, Math.round((act.moving_time || act.elapsed_time || 0) / 60));
  
  // Calculate or use Strava's calories
  let caloriesBurned = act.calories ? Math.round(act.calories) : 0;
  if (!caloriesBurned) {
    // Estimations if device didn't report kilojoules/kcal
    if (category === 'cycling') {
      caloriesBurned = Math.round(durationMin * 8.5);
    } else if (category === 'running') {
      caloriesBurned = Math.round(durationMin * 11.0);
    } else if (category === 'outdoor_walk') {
      caloriesBurned = Math.round(durationMin * 4.5);
    } else {
      caloriesBurned = Math.round(durationMin * 7.0);
    }
  }

  const km = act.distance ? (act.distance / 1000).toFixed(1) : null;
  const speedKmh = act.average_speed ? (act.average_speed * 3.6).toFixed(1) : null;
  const elevM = act.total_elevation_gain ? Math.round(act.total_elevation_gain) : null;

  const notesParts = [];
  if (km) notesParts.push(`${km} km`);
  if (speedKmh) notesParts.push(`Velocidad med: ${speedKmh} km/h`);
  if (elevM) notesParts.push(`+${elevM}m desnivel`);
  notesParts.push('Sincronizado vía Strava');

  return {
    type: category,
    typeName,
    durationMinutes: durationMin,
    caloriesBurned,
    timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    notes: notesParts.join(' · '),
  };
}
