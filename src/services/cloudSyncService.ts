import { 
  DailyLog, 
  FoodItem, 
  UserProfile, 
  UserSession, 
  WeightEntry, 
  BodyMeasurementEntry, 
  ProgressPhotoEntry, 
  SubscriptionTier 
} from '../types';
import { isFounderEmail } from '../utils/storage';
import {
  supabaseFetchDailyLogs,
  supabaseFetchUserProfile,
  supabaseAddFoodItem,
  supabaseRemoveFoodItem,
  supabaseSaveUserProfile,
  supabaseAddMultipleFoods,
} from './supabaseService';

async function safeJson<T = any>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text || text.trim() === '') return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export interface CloudUserData {
  email: string;
  name: string;
  tier: SubscriptionTier;
  profile?: UserProfile;
  dailyLogs?: Record<string, DailyLog>;
  weightHistory?: WeightEntry[];
  measurements?: BodyMeasurementEntry[];
  progressPhotos?: ProgressPhotoEntry[];
  updatedAt: string;
}

export interface CloudAuthResponse {
  success: boolean;
  message?: string;
  user?: {
    email: string;
    name: string;
    isFounder: boolean;
    tier: SubscriptionTier;
  };
}

class CloudSyncService {
  private baseUrl = '/api/sync';
  private authUrl = '/api/auth';

  /**
   * Register user in cloud backend
   */
  async register(name: string, email: string, password: string): Promise<CloudAuthResponse> {
    try {
      const res = await fetch(`${this.authUrl}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await safeJson<CloudAuthResponse>(res);
      return data || { success: false, message: 'Respuesta vacía del servidor.' };
    } catch (err) {
      console.warn('Cloud register network error:', err);
      return { success: false, message: 'No se pudo conectar con el servidor de la nube.' };
    }
  }

  /**
   * Login user in cloud backend
   */
  async login(email: string, password: string): Promise<CloudAuthResponse> {
    try {
      const res = await fetch(`${this.authUrl}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await safeJson<CloudAuthResponse>(res);
      return data || { success: false, message: 'Respuesta vacía del servidor.' };
    } catch (err) {
      console.warn('Cloud login network error:', err);
      return { success: false, message: 'Error al contactar con el servidor de sincronización.' };
    }
  }

  /**
   * Pull complete user state from Supabase and cloud backend
   */
  async pullUserData(email: string): Promise<CloudUserData | null> {
    const cleanEmail = email.trim().toLowerCase();
    const isFounder = isFounderEmail(cleanEmail);
    let result: CloudUserData | null = null;

    // 1. Fetch from server sync endpoint (which also queries Supabase)
    try {
      const res = await fetch(`${this.baseUrl}/pull?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const data = await safeJson<any>(res);
        if (data && data.success && data.userData) {
          result = data.userData;
        }
      }
    } catch (err) {
      console.warn('Notice pulling from server sync:', err);
    }

    // 2. Direct client-side Supabase fetch to guarantee latest state
    try {
      const [supaLogs, supaProfile] = await Promise.all([
        supabaseFetchDailyLogs(cleanEmail).catch(() => ({})),
        supabaseFetchUserProfile(cleanEmail).catch(() => null),
      ]);

      if (!result) {
        result = {
          email: cleanEmail,
          name: supaProfile?.name || cleanEmail.split('@')[0],
          tier: isFounder ? 'vip' : 'free',
          updatedAt: supaProfile?.updatedAt || '1970-01-01T00:00:00.000Z',
        };
      }

      if (supaProfile) {
        result.profile = { ...(result.profile || {}), ...supaProfile };
      }

      if (supaLogs && Object.keys(supaLogs).length > 0) {
        result.dailyLogs = { ...(result.dailyLogs || {}), ...supaLogs };
      }
    } catch (err) {
      console.warn('Notice during client Supabase pull:', err);
    }

    // Guard founder status
    if (result && isFounder) {
      result.tier = 'vip';
    }

    return result;
  }

  /**
   * Push full or partial user state to Supabase and the cloud
   */
  async pushUserData(payload: {
    email: string;
    name?: string;
    profile?: UserProfile;
    dailyLogs?: Record<string, DailyLog>;
    weightHistory?: WeightEntry[];
    measurements?: BodyMeasurementEntry[];
    progressPhotos?: ProgressPhotoEntry[];
    tier?: SubscriptionTier;
    userId?: string;
  }): Promise<boolean> {
    const cleanEmail = payload.email.trim().toLowerCase();

    // 1. Client-side direct Supabase sync
    try {
      if (payload.profile) {
        supabaseSaveUserProfile(payload.profile, cleanEmail, payload.userId).catch((e) => {
          console.warn('Client notice saving profile to Supabase:', e);
        });
      }

      if (payload.dailyLogs) {
        for (const [date, log] of Object.entries(payload.dailyLogs)) {
          if (log.items && log.items.length > 0) {
            supabaseAddMultipleFoods(cleanEmail, date, log.items).catch((e) => {
              console.warn('Client notice saving food logs to Supabase:', e);
            });
          }
        }
      }
    } catch (err) {
      console.warn('Client notice preparing Supabase sync:', err);
    }

    // 2. Server-side sync endpoint
    try {
      const res = await fetch(`${this.baseUrl}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await safeJson<{ success?: boolean }>(res);
      return Boolean(json?.success);
    } catch (err) {
      console.warn('Cloud push network notice:', err);
      return false;
    }
  }

  /**
   * Push a single added food item in real-time to Supabase & Cloud
   */
  async addFoodItem(email: string, date: string, item: FoodItem): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    // 1. Direct Supabase write
    supabaseAddFoodItem(cleanEmail, date, item).catch((e) => {
      console.warn('Client notice writing item to Supabase:', e);
    });

    // 2. Server sync write
    try {
      const res = await fetch(`${this.baseUrl}/item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, date, item }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Remove a food item in real-time from Supabase & Cloud
   */
  async removeFoodItem(email: string, itemId: string): Promise<boolean> {
    const cleanEmail = email.trim().toLowerCase();
    // 1. Direct Supabase delete
    supabaseRemoveFoodItem(cleanEmail, itemId).catch((e) => {
      console.warn('Client notice removing item from Supabase:', e);
    });

    // 2. Server sync delete
    try {
      const res = await fetch(`${this.baseUrl}/item`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, itemId }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Update water log in real-time
   */
  async updateWater(email: string, date: string, amountMl: number): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/water`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, date, amountMl }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Generate 6-digit cross-device sync PIN code
   */
  async generateSyncCode(email: string): Promise<string | null> {
    try {
      const res = await fetch(`${this.baseUrl}/code/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await safeJson<{ code?: string }>(res);
      return data?.code || null;
    } catch {
      return null;
    }
  }

  /**
   * Redeem 6-digit sync PIN code on new device
   */
  async redeemSyncCode(code: string): Promise<CloudUserData | null> {
    try {
      const res = await fetch(`${this.baseUrl}/code/redeem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });
      const data = await safeJson<{ success?: boolean; userData?: CloudUserData }>(res);
      if (data?.success && data?.userData) {
        return data.userData;
      }
      return null;
    } catch {
      return null;
    }
  }
}

export const cloudSyncService = new CloudSyncService();
