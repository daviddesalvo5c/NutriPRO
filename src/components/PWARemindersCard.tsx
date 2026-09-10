import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Droplets, 
  Utensils, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Send,
  Smartphone,
  ShieldCheck
} from 'lucide-react';
import { pwaPushService, ReminderSettings } from '../utils/pwaPushService';

export const PWARemindersCard: React.FC = () => {
  const [settings, setSettings] = useState<ReminderSettings>(() => pwaPushService.loadReminderSettings());
  const [permState, setPermState] = useState<NotificationPermission>(() => pwaPushService.getPermissionState());
  const [requesting, setRequesting] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'warning' | 'error' | 'info') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 3500);
  };

  useEffect(() => {
    pwaPushService.registerServiceWorker();
    setPermState(pwaPushService.getPermissionState());
  }, []);

  const handleRequestPermission = async () => {
    setRequesting(true);
    try {
      const granted = await pwaPushService.requestPermission();
      setPermState(pwaPushService.getPermissionState());
      if (granted) {
        showFeedback('¡Notificaciones push activadas correctamente!', 'success');
        await pwaPushService.sendLocalNotification('¡NutriFit Pro Conectado!', {
          body: 'Notificaciones activas para recordarte hidratación y registro de comidas.',
        });
      } else {
        showFeedback('Permiso de notificaciones denegado en el navegador.', 'warning');
      }
    } catch {
      showFeedback('Error al solicitar permisos de notificación.', 'error');
    } finally {
      setRequesting(false);
    }
  };

  const handleTestNotification = async () => {
    const success = await pwaPushService.sendLocalNotification('💧 Hora de hidratarse', {
      body: 'Recuerda tomar un vaso de agua fresca para mantener tu metabolismo activo.',
    });
    if (success) {
      showFeedback('Notificación de prueba enviada a tu dispositivo.', 'success');
    } else {
      showFeedback('Verifica que los permisos estén concedidos en el navegador.', 'info');
    }
  };

  const handleSaveSettings = (newSettings: ReminderSettings) => {
    setSettings(newSettings);
    pwaPushService.saveReminderSettings(newSettings);
    showFeedback('Configuración de recordatorios guardada.', 'success');
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xs p-6 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm sm:text-base">
                Recordatorios y Notificaciones Push PWA
              </h3>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                permState === 'granted'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${permState === 'granted' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {permState === 'granted' ? 'Notificaciones Activas' : 'Requiere Permiso'}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Alertas nativas en Android e iOS para tomar agua y registrar tus comidas a tiempo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {permState !== 'granted' ? (
            <button
              type="button"
              onClick={handleRequestPermission}
              disabled={requesting}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{requesting ? 'Solicitando...' : 'Activar Notificaciones'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleTestNotification}
              className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5 text-teal-600" />
              <span>Probar Alerta</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Water Reminder Option */}
        <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Droplets className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Recordatorios de Hidratación
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Aviso para beber agua durante el día
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.waterRemindersEnabled}
                onChange={(e) =>
                  handleSaveSettings({
                    ...settings,
                    waterRemindersEnabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {settings.waterRemindersEnabled && (
            <div className="pt-2 border-t border-blue-200/40 dark:border-blue-900/30 flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">Frecuencia de aviso:</span>
              <select
                value={settings.waterIntervalHours}
                onChange={(e) =>
                  handleSaveSettings({
                    ...settings,
                    waterIntervalHours: Number(e.target.value),
                  })
                }
                className="px-2.5 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
              >
                <option value={1}>Cada 1 hora</option>
                <option value={2}>Cada 2 horas (recomendado)</option>
                <option value={3}>Cada 3 horas</option>
                <option value={4}>Cada 4 horas</option>
              </select>
            </div>
          )}
        </div>

        {/* Food Log Reminder Option */}
        <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Utensils className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Recordatorios de Registro de Comidas
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Notificación para no olvidar registrar tus platos
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.foodRemindersEnabled}
                onChange={(e) =>
                  handleSaveSettings({
                    ...settings,
                    foodRemindersEnabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-300 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {settings.foodRemindersEnabled && (
            <div className="pt-2 border-t border-emerald-200/40 dark:border-emerald-900/30 grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5">Desayuno</label>
                <input
                  type="time"
                  value={settings.breakfastTime}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...settings,
                      breakfastTime: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5">Almuerzo</label>
                <input
                  type="time"
                  value={settings.lunchTime}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...settings,
                      lunchTime: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 block mb-0.5">Cena</label>
                <input
                  type="time"
                  value={settings.dinnerTime}
                  onChange={(e) =>
                    handleSaveSettings({
                      ...settings,
                      dinnerTime: e.target.value,
                    })
                  }
                  className="w-full px-2 py-1 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold ${
          feedback.type === 'success'
            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
            : feedback.type === 'warning'
            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
            : feedback.type === 'error'
            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
            : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
};
