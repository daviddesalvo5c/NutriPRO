import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  Crown, 
  Zap, 
  ShieldCheck, 
  Clock, 
  FileText, 
  ChefHat, 
  Scan, 
  Lock,
  ArrowRight,
  Star
} from 'lucide-react';
import { SubscriptionTier, UserSession } from '../types';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  session: UserSession | null;
  onSubscribe: (tier: 'pro_monthly' | 'pro_annual') => void;
  onCancelSubscription?: () => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  session,
  onSubscribe,
  onCancelSubscription,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const isVip = currentTier === 'vip' || session?.isFounder;
  const isPro = currentTier === 'pro_monthly' || currentTier === 'pro_annual';

  const handleActivatePro = (cycle: 'monthly' | 'annual') => {
    setIsProcessing(true);
    setTimeout(() => {
      onSubscribe(cycle === 'annual' ? 'pro_annual' : 'pro_monthly');
      setIsProcessing(false);
      setSuccessMessage('¡Suscripción Pro activada con éxito! Disfruta de acceso ilimitado.');
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 1600);
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div 
        id="subscription-modal-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto relative animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header decoration */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 sm:p-8 text-white relative">
          <button
            type="button"
            id="close-subscription-modal"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/30 text-white/90 transition-all hover:rotate-90"
            title="Cerrar modal de planes"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-xs font-bold uppercase tracking-wider backdrop-blur-xs mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>NutriFit Pro · Membresías y Planes</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Alcanza tus Objetivos sin Límites
          </h2>
          <p className="text-white/80 text-sm sm:text-base mt-1.5 max-w-2xl">
            Desbloquea el análisis de alimentos con IA ilimitado, planificación de comidas semanal, historial completo y reportes clínicos en PDF.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="mt-6 inline-flex items-center p-1 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10">
            <button
              type="button"
              id="billing-toggle-monthly"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Facturación Mensual
            </button>
            <button
              type="button"
              id="billing-toggle-annual"
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'annual'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <span>Facturación Anual</span>
              <span className="bg-amber-400 text-amber-950 text-[10px] font-black px-1.5 py-0.5 rounded-full uppercase">
                Ahorra 37%
              </span>
            </button>
          </div>
        </div>

        {/* Success Banner if upgraded */}
        {successMessage && (
          <div className="bg-emerald-500 text-white text-center py-3 px-4 font-bold text-sm flex items-center justify-center gap-2 animate-bounce">
            <Check className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* VIP User Status Banner */}
        {isVip && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-600/15 border border-amber-400/40 dark:border-amber-500/30 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-black shadow-md">
                ✦
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-amber-800 dark:text-amber-300 text-sm sm:text-base">
                    {session?.isFounder ? 'Cuenta de Fundador — Acceso Máximo' : 'Rango Miembro VIP Activo ✦'}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] uppercase tracking-wider">
                    Acceso Total Gratuito
                  </span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                  {session?.isFounder
                    ? 'Tienes acceso total e ilimitado de por vida y control del panel de administración de invitados.'
                    : 'Has sido invitado como Miembro VIP por el Fundador. Cuentas con todas las funciones Pro sin ningún costo ni vencimiento.'}
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-xl border border-amber-300/40">
              Permanente
            </span>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Plan Gratuito */}
          <div className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
            currentTier === 'free' && !isVip
              ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 ring-1 ring-emerald-500/50'
              : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30'
          }`}>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Básico
                </span>
                {currentTier === 'free' && !isVip && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    Tu Plan Actual
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50">Plan Gratuito</h3>
              <div className="mt-3 mb-5">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">$0</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">para siempre</span>
              </div>

              <ul className="space-y-3 text-xs text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>3 escaneos de alimentos con IA al día</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Historial de comidas:</strong> Últimos 7 días</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Cálculo de BMR, TDEE y macronutrientes</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Control de hidratación y medidas corporales</span>
                </li>
                <li className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="line-through">Generador de menús semanales con IA</span>
                </li>
                <li className="flex items-start gap-2 text-zinc-400 dark:text-zinc-500">
                  <Lock className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span className="line-through">Exportación de informe PDF clínico</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3">
              <button
                type="button"
                disabled
                className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs font-bold bg-zinc-100 dark:bg-zinc-800/60 cursor-default"
              >
                {currentTier === 'free' && !isVip ? 'Plan Activo' : 'Básico Incluido'}
              </button>
            </div>
          </div>

          {/* Card 2: Plan Pro (Destacado) */}
          <div className={`rounded-2xl border-2 p-5 flex flex-col justify-between relative shadow-lg ${
            isPro && !isVip
              ? 'border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20 ring-2 ring-emerald-500'
              : 'border-emerald-500 dark:border-emerald-600 bg-white dark:bg-zinc-900'
          }`}>
            {/* Top pill badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Más Popular</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Acceso Total Pro
                </span>
                {isPro && !isVip && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                    Activo
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <span>Plan Pro</span>
                <Crown className="w-4 h-4 text-amber-500 fill-amber-400" />
              </h3>

              <div className="mt-3 mb-5">
                {billingCycle === 'annual' ? (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">$59.99</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">/ año</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Equivalente a solo $4.99/mes
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">$7.99</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">/ mes</span>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      Cancela en cualquier momento
                    </span>
                  </div>
                )}
              </div>

              <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300 border-t border-zinc-200 dark:border-zinc-700 pt-4">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Escáner de alimentos con IA ILIMITADO</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Historial de diario completo e ilimitado</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Generador de Menús Semanales con IA</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Lista de la Compra Automática</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Exportación e Impresión de Informe PDF</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Comparativa de fotos corporales antes/después</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3">
              {isVip ? (
                <button
                  type="button"
                  disabled
                  className="w-full py-2.5 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-black cursor-default flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ya tienes acceso total (VIP)</span>
                </button>
              ) : isPro ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled
                    className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold cursor-default flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Plan Pro Activo</span>
                  </button>
                  {onCancelSubscription && (
                    <button
                      type="button"
                      onClick={onCancelSubscription}
                      className="w-full text-center text-[11px] text-zinc-500 hover:text-rose-500 font-semibold"
                    >
                      Cancelar suscripción
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-subscribe-pro"
                  onClick={() => handleActivatePro(billingCycle)}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-[0.98] text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <span>Procesando pago seguro...</span>
                  ) : (
                    <>
                      <span>Activar Plan Pro</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Miembro VIP (Exclusivo) */}
          <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-gradient-to-b from-amber-50/50 via-yellow-50/20 to-amber-50/40 dark:from-amber-950/20 dark:via-zinc-900 dark:to-amber-950/10 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Por Invitación
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase tracking-wider">
                  Gratuito
                </span>
              </div>
              <h3 className="text-xl font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <span>Miembro VIP</span>
                <span className="text-amber-500">✦</span>
              </h3>

              <div className="mt-3 mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-amber-900 dark:text-amber-200">$0</span>
                  <span className="text-xs text-amber-700 dark:text-amber-400">/ 100% libre</span>
                </div>
                <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                  Asignado exclusivamente por el Fundador
                </span>
              </div>

              <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300 border-t border-amber-200 dark:border-amber-900/50 pt-4">
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Acceso 100% ilimitado y gratuito</strong> a todas las herramientas Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                  <span><strong>Insignia dorada distintiva "Miembro VIP ✦"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                  <span>Sin fechas de expiración ni cobros periódicos</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                  <span>Escáner IA sin cuotas diarias</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                  <span>Acceso anticipado a nuevas actualizaciones</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-3">
              {isVip ? (
                <div className="w-full py-2.5 rounded-xl bg-amber-400 text-amber-950 font-black text-xs text-center shadow-xs">
                  ✦ Eres Miembro VIP
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-100/70 dark:bg-amber-950/40 text-center border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                  Solicita una invitación al Fundador (David De Salvo) para ser agregado como VIP.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Guarantee / Information */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 px-6 sm:px-8 py-4 flex items-center justify-between flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Transacciones simuladas locales seguras. Sin comisiones ocultas.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:underline"
          >
            Volver a la aplicación
          </button>
        </div>
      </div>
    </div>
  );
};
