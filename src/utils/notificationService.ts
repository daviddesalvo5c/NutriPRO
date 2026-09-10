// Notification Service for NutriFit Pro
// Handles in-app Toast notifications and Web Browser Push/System Notifications

export type ToastType = 'success' | 'info' | 'warning' | 'achievement' | 'vip';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  timestamp: number;
  durationMs?: number;
}

type ToastListener = (toasts: ToastItem[]) => void;

class NotificationManager {
  private toasts: ToastItem[] = [];
  private listeners: Set<ToastListener> = new Set();
  private hasNotifiedWaterGoal: Record<string, boolean> = {};
  private hasNotifiedCalorieGoal: Record<string, boolean> = {};

  // Subscribe to toast changes
  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener([...this.toasts]);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const copy = [...this.toasts];
    this.listeners.forEach((listener) => listener(copy));
  }

  // Add toast notification
  addToast(type: ToastType, title: string, message: string, durationMs: number = 4500): string {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const toast: ToastItem = {
      id,
      type,
      title,
      message,
      timestamp: Date.now(),
      durationMs,
    };

    this.toasts.unshift(toast);
    this.notifyListeners();

    if (durationMs > 0) {
      setTimeout(() => {
        this.removeToast(id);
      }, durationMs);
    }

    return id;
  }

  removeToast(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.notifyListeners();
  }

  // Quick helper methods
  success(message: string, title: string = 'Éxito'): string {
    return this.addToast('success', title, message);
  }

  error(message: string, title: string = 'Error'): string {
    return this.addToast('warning', title, message);
  }

  warning(message: string, title: string = 'Atención'): string {
    return this.addToast('warning', title, message);
  }

  info(message: string, title: string = 'Información'): string {
    return this.addToast('info', title, message);
  }

  // -------------------------------------------------------------
  // SPECIFIC IN-APP NOTIFICATIONS
  // -------------------------------------------------------------

  notifyLoginSuccess(userName: string): void {
    this.addToast('success', '¡Sesión Iniciada!', `Bienvenido de nuevo a NutriFit Pro, ${userName}.`);
  }

  notifyAccountCreated(userName: string): void {
    this.addToast('success', '¡Cuenta Creada!', `Bienvenido ${userName}. Tu perfil y diario privado están listos.`);
  }

  notifyFoodSaved(foodName: string, calories: number, mealType: string): void {
    const mealLabel: Record<string, string> = {
      breakfast: 'Desayuno',
      lunch: 'Comida',
      dinner: 'Cena',
      snacks: 'Snack',
    };
    this.addToast(
      'success',
      'Comida Registrada',
      `${foodName} (${calories} kcal) añadida a ${mealLabel[mealType] || 'tu diario'}.`
    );
  }

  notifyScanSaved(foodName: string, calories: number): void {
    this.addToast(
      'success',
      'Alimento Escaneado con IA',
      `${foodName} (${calories} kcal) analizado y guardado con éxito.`
    );
  }

  notifySuccess(titleOrMsg: string, message?: string): void {
    if (message !== undefined) {
      this.addToast('success', titleOrMsg, message);
    } else {
      this.addToast('success', '¡Completado!', titleOrMsg);
    }
  }

  notifyError(titleOrMsg: string, message?: string): void {
    if (message !== undefined) {
      this.addToast('warning', titleOrMsg, message);
    } else {
      this.addToast('warning', 'Atención', titleOrMsg);
    }
  }

  notifyInfo(titleOrMsg: string, message?: string): void {
    if (message !== undefined) {
      this.addToast('info', titleOrMsg, message);
    } else {
      this.addToast('info', 'Información', titleOrMsg);
    }
  }

  notifyFoodAdded(foodOrText: string, calories?: number, mealType?: string): void {
    if (calories !== undefined && mealType !== undefined) {
      this.notifyFoodSaved(foodOrText, calories, mealType);
    } else {
      this.addToast('success', 'Registro Exitoso', foodOrText);
    }
  }

  notifyVipGranted(email: string): void {
    this.addToast('vip', 'Acceso VIP Concedido', `Se ha otorgado membresía VIP vitalicia a ${email}.`);
  }

  notifyPlanUpdated(tierName: string): void {
    this.addToast(
      'success',
      'Membresía Actualizada',
      `¡Tu cuenta ahora cuenta con los beneficios del ${tierName}!`
    );
  }

  // Goal notifications
  checkWaterGoal(dateKey: string, waterMl: number, goalMl: number): void {
    if (waterMl >= goalMl && !this.hasNotifiedWaterGoal[dateKey]) {
      this.hasNotifiedWaterGoal[dateKey] = true;
      this.addToast(
        'achievement',
        '¡Meta de Hidratación Alcanzada! 💧',
        `Has completado tus ${goalMl} ml diarios de agua. ¡Excelente trabajo!`,
        6000
      );
      this.sendBrowserNotification(
        '¡Meta de Agua Cumplida! 💧',
        `Has alcanzado tu objetivo diario de ${goalMl} ml. Mantén tu hidratación.`
      );
    }
  }

  checkCalorieGoal(dateKey: string, consumedCalories: number, targetCalories: number): void {
    // Notify when within 5% of target
    const lower = targetCalories * 0.95;
    const upper = targetCalories * 1.05;
    if (consumedCalories >= lower && consumedCalories <= upper && !this.hasNotifiedCalorieGoal[dateKey]) {
      this.hasNotifiedCalorieGoal[dateKey] = true;
      this.addToast(
        'achievement',
        '¡Objetivo Calórico Cumplido! 🎯',
        `Has alcanzado tu meta diaria (${Math.round(consumedCalories)} / ${targetCalories} kcal).`,
        6000
      );
      this.sendBrowserNotification(
        '¡Objetivo Calórico Alcanzado! 🎯',
        `Has cuadrado perfectamente tus calorías del día (${Math.round(consumedCalories)} kcal).`
      );
    }
  }

  // -------------------------------------------------------------
  // BROWSER / PWA SYSTEM NOTIFICATIONS
  // -------------------------------------------------------------

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        this.addToast(
          'info',
          'Notificaciones del Navegador Activadas',
          'Recibirás recordatorios para registrar tus comidas e hidratación.'
        );
      }
      return permission;
    } catch (err) {
      console.warn('Error requesting notification permission:', err);
      return 'denied';
    }
  }

  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  sendBrowserNotification(title: string, body: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
      });
    } catch (err) {
      console.warn('Failed to dispatch system notification:', err);
    }
  }

  schedulePeriodicReminders(): void {
    if (typeof window === 'undefined') return;

    // Check every 2 hours if user hasn't drank water
    const REMINDER_KEY = 'nutrifit_last_water_reminder_v1';
    const last = Number(localStorage.getItem(REMINDER_KEY) || '0');
    const now = Date.now();
    const fourHours = 4 * 60 * 60 * 1000;

    if (now - last > fourHours && Notification.permission === 'granted') {
      this.sendBrowserNotification(
        'Recordatorio NutriFit Pro 💧',
        'No olvides registrar tu consumo de agua y comida de hoy para mantener tu progreso.'
      );
      localStorage.setItem(REMINDER_KEY, String(now));
    }
  }
}

export const notificationService = new NotificationManager();
