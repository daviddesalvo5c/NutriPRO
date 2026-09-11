import { WorkoutItem, StravaActivity } from '../types';

const STRAVA_STORAGE_KEY = 'nutrifit_strava_auth_v1';

export interface StravaAuthConfig {
  clientId: string;
  clientSecret: string;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  athleteName: string | null;
}

export function getStoredStravaConfig(): StravaAuthConfig {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(STRAVA_STORAGE_KEY) : null;
    if (raw && raw !== 'undefined' && raw !== 'null') {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return {
          clientId: parsed.clientId || '153892',
          clientSecret: parsed.clientSecret || '',
          accessToken: parsed.accessToken || null,
          refreshToken: parsed.refreshToken || null,
          expiresAt: parsed.expiresAt || null,
          athleteName: parsed.athleteName || null,
        };
      }
    }
  } catch (err) {
    console.warn('Error reading stored Strava config:', err);
  }
  return {
    clientId: '153892', // Default Strava Application Client ID or configurable
    clientSecret: '',
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    athleteName: null,
  };
}

export function saveStravaConfig(config: Partial<StravaAuthConfig>) {
  const current = getStoredStravaConfig();
  const updated = { ...current, ...config };
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STRAVA_STORAGE_KEY, JSON.stringify(updated));
    }
  } catch (err) {
    console.warn('Error saving Strava config:', err);
  }
  return updated;
}

export function disconnectStrava() {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STRAVA_STORAGE_KEY);
    }
  } catch {
    // ignore
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
