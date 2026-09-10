// PWA and Push Notifications Service
export interface ReminderSettings {
  waterRemindersEnabled: boolean;
  waterIntervalHours: number; // e.g., every 2 hours
  foodRemindersEnabled: boolean;
  breakfastTime: string; // "09:00"
  lunchTime: string;     // "13:30"
  dinnerTime: string;    // "20:30"
}

const REMINDER_SETTINGS_KEY = 'nutrifit_pwa_reminders_v1';

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  waterRemindersEnabled: true,
  waterIntervalHours: 2,
  foodRemindersEnabled: true,
  breakfastTime: '09:00',
  lunchTime: '13:30',
  dinnerTime: '20:30',
};

export class PWAPushService {
  private swRegistration: ServiceWorkerRegistration | null = null;

  async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      this.swRegistration = reg;
      console.log('[PWA] Service worker registrado con éxito:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('[PWA] Error registrando service worker:', err);
      return null;
    }
  }

  getPermissionState(): NotificationPermission {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  }

  async requestPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (err) {
      console.warn('[PWA] Error solicitando permiso de notificación:', err);
      return false;
    }
  }

  async sendLocalNotification(title: string, options?: NotificationOptions): Promise<boolean> {
    if (this.getPermissionState() !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    try {
      if (this.swRegistration && 'showNotification' in this.swRegistration) {
        await this.swRegistration.showNotification(title, {
          icon: '/pwa-192x192.png',
          badge: '/favicon.png',
          ...options,
        });
        return true;
      } else if ('Notification' in window) {
        new Notification(title, {
          icon: '/pwa-192x192.png',
          ...options,
        });
        return true;
      }
    } catch (err) {
      console.warn('[PWA] Error enviando notificación local:', err);
    }
    return false;
  }

  loadReminderSettings(): ReminderSettings {
    try {
      const saved = localStorage.getItem(REMINDER_SETTINGS_KEY);
      if (saved) return { ...DEFAULT_REMINDER_SETTINGS, ...JSON.parse(saved) };
    } catch {
      // ignore
    }
    return DEFAULT_REMINDER_SETTINGS;
  }

  saveReminderSettings(settings: ReminderSettings) {
    try {
      localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }
}

export const pwaPushService = new PWAPushService();
