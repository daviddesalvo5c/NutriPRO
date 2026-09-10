import React, { useState, useEffect } from 'react';
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
  Star,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Gift,
  Calendar
} from 'lucide-react';
import { SubscriptionTier, UserSession, SubscriptionTransaction } from '../types';
import { supabaseRecordTransaction, supabaseUpdateUserTier } from '../services/supabaseService';
import { notificationService } from '../utils/notificationService';
import { recordTransaction, getUserTrialInfo, startProTrial } from '../utils/storage';

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: SubscriptionTier;
  session: UserSession | null;
  onSubscribe: (tier: 'pro_monthly' | 'pro_annual') => void;
  onCancelSubscription?: () => void;
  onStartTrial?: () => void;
}

export const SubscriptionPlansModal: React.FC<SubscriptionPlansModalProps> = ({
  isOpen,
  onClose,
  currentTier,
  session,
  onSubscribe,
  onCancelSubscription,
  onStartTrial,
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [viewMode, setViewMode] = useState<'plans' | 'waiting_verification' | 'success'>('plans');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [activePlanActivated, setActivePlanActivated] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isActivatingTrial, setIsActivatingTrial] = useState<boolean>(false);

  // Real Mercado Pago Argentina checkout payment links
  const MP_LINKS = {
    annual: 'https://mpago.la/1wJvN7B',
    monthly: 'https://mpago.la/33GVesT',
  };

  // Check URL params on mount in case user returned from MP redirect
  useEffect(() => {
    if (isOpen) {
      const params = new URLSearchParams(window.location.search);
      const status = params.get('status') || params.get('collection_status');
      const paymentId = params.get('payment_id') || params.get('collection_id');
      if (status === 'approved' && paymentId) {
        setPaymentRefInput(paymentId);
        setViewMode('waiting_verification');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isVip = currentTier === 'vip' || session?.isFounder;
  const isPaidPro = currentTier === 'pro_monthly' || currentTier === 'pro_annual';
  const userEmail = session?.email || '';
  const trialInfo = userEmail ? getUserTrialInfo(userEmail) : { 
    isTrialActive: false, 
    daysRemaining: 0, 
    hasUsedTrial: false, 
    trialEndsAt: null, 
    trialStartedAt: null 
  };
  const isTrial = currentTier === 'pro_trial' || trialInfo.isTrialActive;
  const isPro = isPaidPro || isTrial;

  const handleActivateFreeTrial = () => {
    if (!userEmail) {
      notificationService.error('Debes iniciar sesión para activar los 30 días de prueba.');
      return;
    }
    setIsActivatingTrial(true);
    try {
      const res = startProTrial(userEmail, session?.name);
      if (res.success) {
        if (onStartTrial) {
          onStartTrial();
        }
        notificationService.success('¡Felicitaciones! Has activado 30 días de prueba gratuita de NutriFit Pro.');
        onClose();
      }
    } catch (e) {
      console.error('Error activating trial:', e);
      notificationService.error('No se pudo activar la prueba. Intenta nuevamente.');
    } finally {
      setIsActivatingTrial(false);
    }
  };

  // Step 1: Open Mercado Pago checkout WITHOUT upgrading prematurely
  const handleOpenMercadoPago = (cycle: 'monthly' | 'annual') => {
    setBillingCycle(cycle);
    setIsProcessing(true);
    setVerificationError(null);

    const mpUrl = cycle === 'annual' ? MP_LINKS.annual : MP_LINKS.monthly;
    window.open(mpUrl, '_blank', 'noopener,noreferrer');

    // Transition to post-payment confirmation screen
    setTimeout(() => {
      setIsProcessing(false);
      setViewMode('waiting_verification');
    }, 400);
  };

  // Step 2: Post-payment verification & activation through backend service
  const handleConfirmAndActivate = async () => {
    setIsVerifying(true);
    setVerificationError(null);

    const plan: 'pro_monthly' | 'pro_annual' = billingCycle === 'annual' ? 'pro_annual' : 'pro_monthly';
    const amount = billingCycle === 'annual' ? 94999 : 12999;
    const userEmail = session?.email || 'usuario@nutrifit.com';
    const userName = session?.name || 'Cliente NutriFit';
    const txRef = paymentRefInput.trim() || `mp_${Date.now()}`;

    try {
      // 1. Verify and update on backend using Service Role
      const response = await fetch('/api/mercadopago/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          plan,
          billingCycle,
          paymentId: txRef,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo verificar el pago en este momento. Intenta nuevamente.');
      }

      // 2. Also register transaction locally and in Supabase client
      await supabaseRecordTransaction({
        id: `tx_${txRef}`,
        userEmail,
        userName,
        plan,
        billingCycle,
        amount,
        status: 'completed',
        date: new Date().toISOString(),
      });

      await supabaseUpdateUserTier(userEmail, plan, billingCycle);
      recordTransaction(userEmail, userName, plan, billingCycle, amount);

      // 3. Update React application tier state
      onSubscribe(plan);
      setActivePlanActivated(billingCycle === 'annual' ? 'Plan Pro Anual' : 'Plan Pro Mensual');

      // 4. Trigger Toast Notification
      notificationService.notifyPlanUpdated(`Plan Pro ${billingCycle === 'annual' ? 'Anual' : 'Mensual'}`);

      setIsVerifying(false);
      setViewMode('success');
    } catch (err: any) {
      console.error('Error confirming payment:', err);
      setIsVerifying(false);
      setVerificationError(err.message || 'Hubo un error al validar la transacción. Por favor reintenta.');
    }
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
            {viewMode === 'success' 
              ? '¡Bienvenido a NutriFit Pro!' 
              : viewMode === 'waiting_verification'
              ? 'Confirmación y Activación de Pago'
              : 'Alcanza tus Objetivos sin Límites'}
          </h2>
          <p className="text-white/80 text-sm sm:text-base mt-1.5 max-w-2xl">
            {viewMode === 'success'
              ? 'Tu suscripción ha sido verificada exitosamente. Todas las funciones avanzadas están ahora desbloqueadas.'
              : viewMode === 'waiting_verification'
              ? 'Finaliza tu pago en la pasarela oficial de Mercado Pago y confirma la activación de tu cuenta.'
              : 'Desbloquea el análisis de alimentos con IA ilimitado, planificación de comidas semanal, historial completo y reportes clínicos en PDF.'}
          </p>

          {/* Billing Cycle Switcher & Gateway Selector (only in plans mode) */}
          {viewMode === 'plans' && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center p-1 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10">
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
                    Ahorra 39%
                  </span>
                </button>
              </div>

              {/* Gateway indicator: Mercado Pago Argentina */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-sky-500/20 text-sky-100 border border-sky-400/30 text-xs font-bold">
                <Zap className="w-3.5 h-3.5 text-sky-300" />
                <span>Mercado Pago Argentina</span>
              </div>
            </div>
          )}
        </div>

        {/* VIEW 1: Waiting / Verification Screen */}
        {viewMode === 'waiting_verification' && (
          <div className="p-6 sm:p-8 space-y-6 animate-in fade-in duration-300">
            <div className="bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl p-5 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div className="space-y-1">
                <h3 className="font-extrabold text-sm text-sky-950 dark:text-sky-100">
                  Pasarela Mercado Pago Abierta
                </h3>
                <p className="text-xs text-sky-800/80 dark:text-sky-300 leading-relaxed">
                  Se ha abierto la pasarela oficial de Mercado Pago Argentina para abonar{' '}
                  <strong className="font-black text-sky-950 dark:text-sky-100">
                    {billingCycle === 'annual' ? '$94.999 ARS (Plan Anual)' : '$12.999 ARS (Plan Mensual)'}
                  </strong>
                  . Puedes abonar con tarjeta de crédito, débito, transferencia bancaria o saldo en cuenta.
                </p>
              </div>
            </div>

            <div className="space-y-4 max-w-lg mx-auto">
              <div className="bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 space-y-3">
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 block">
                  Pasos para completar tu activación:
                </span>
                <ol className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-decimal list-inside">
                  <li>Completa el pago en la ventana de Mercado Pago.</li>
                  <li>Regresa a esta pantalla.</li>
                  <li>Presiona <strong>"Confirmar y Activar Mi Plan Pro"</strong> para validar el pago y habilitar tu acceso.</li>
                </ol>

                <div className="pt-2 border-t border-zinc-200 dark:border-zinc-700">
                  <label className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 block mb-1">
                    ID de Operación / Comprobante Mercado Pago (opcional):
                  </label>
                  <input
                    type="text"
                    id="mp-payment-id-input"
                    value={paymentRefInput}
                    onChange={(e) => setPaymentRefInput(e.target.value)}
                    placeholder="Ej. 9876543210"
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {verificationError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{verificationError}</span>
                </div>
              )}

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  id="btn-confirm-payment-activation"
                  onClick={handleConfirmAndActivate}
                  disabled={isVerifying}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50"
                >
                  {isVerifying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Verificando pago y activando cuenta...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>Confirmar y Activar Mi Plan Pro</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      const url = billingCycle === 'annual' ? MP_LINKS.annual : MP_LINKS.monthly;
                      window.open(url, '_blank', 'noopener,noreferrer');
                    }}
                    className="text-xs text-sky-600 dark:text-sky-400 font-semibold hover:underline flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Reabrir enlace de Mercado Pago</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('plans')}
                    className="text-xs text-zinc-500 dark:text-zinc-400 hover:underline"
                  >
                    Volver a elegir plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: Success Confirmation Screen */}
        {viewMode === 'success' && (
          <div className="p-6 sm:p-10 text-center space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center border-4 border-emerald-500/20 shadow-lg">
              <CheckCircle2 className="w-9 h-9 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="max-w-md mx-auto space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
                Suscripción Activa
              </span>
              <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50">
                ¡Pago Verificado con Éxito!
              </h3>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Se ha activado tu <strong>{activePlanActivated || 'Plan Pro'}</strong>. Ahora dispones de escáner ilimitado con IA, menús semanales inteligentes, exportación de reportes clínicos y mucho más.
              </p>
            </div>

            <div className="max-w-md mx-auto bg-zinc-50 dark:bg-zinc-800/60 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-left text-xs space-y-2">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Estado de cuenta:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">NutriFit Pro (Ilimitado)</strong>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Método de pago:</span>
                <span>Mercado Pago Argentina</span>
              </div>
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-300">
                <span>Ciclo facturación:</span>
                <span>{billingCycle === 'annual' ? 'Anual ($94.999 ARS)' : 'Mensual ($12.999 ARS)'}</span>
              </div>
            </div>

            <div className="max-w-md mx-auto pt-2">
              <button
                type="button"
                id="btn-close-success-modal"
                onClick={onClose}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-md transition-all active:scale-98"
              >
                ¡Comenzar a Disfrutar NutriFit Pro!
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: Standard Plans View */}
        {viewMode === 'plans' && (
          <>
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

            {/* Trial Active Banner */}
            {isTrial && !isVip && !isPaidPro && (
              <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-600/15 border border-emerald-400/40 dark:border-emerald-500/30 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-md">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm sm:text-base">
                        ¡Mes de Prueba Pro Activo! ✦
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white font-black text-[10px] uppercase tracking-wider">
                        {trialInfo.daysRemaining} días restantes
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                      Tienes acceso ilimitado a todas las herramientas avanzadas: escáner IA sin tope diario, asistente de comidas con macros restantes y menús semanales.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenMercadoPago('annual')}
                  className="text-xs font-bold text-emerald-800 dark:text-emerald-200 bg-white dark:bg-zinc-800 px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700 shadow-xs hover:bg-emerald-50 dark:hover:bg-zinc-700 transition-all"
                >
                  Asegurar Anual (-39%)
                </button>
              </div>
            )}

            {/* 30-Day Free Trial Promotional Offer (For Free users who haven't used trial) */}
            {!isPro && !isVip && !trialInfo.hasUsedTrial && (
              <div className="mx-6 sm:mx-8 mt-6 p-5 rounded-3xl bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-emerald-400/30">
                <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="space-y-1.5 max-w-lg z-10">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-[10px] uppercase tracking-wider shadow-xs">
                    <Gift className="w-3 h-3" />
                    <span>Oferta Especial de Bienvenida · 1 Mes Gratis</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight leading-snug text-white">
                    Probá NutriFit Pro durante 30 días sin costo
                  </h3>
                  <p className="text-xs text-emerald-100/90 leading-relaxed">
                    Disfrutá del escáner visual con IA ilimitado, el asistente que arma platos con tus macros restantes y la lista de compras automática. <strong>Sin tarjeta de crédito y activación inmediata con 1 solo clic.</strong>
                  </p>
                </div>

                <div className="z-10 shrink-0 w-full sm:w-auto">
                  <button
                    type="button"
                    id="btn-activate-30-day-trial"
                    onClick={handleActivateFreeTrial}
                    disabled={isActivatingTrial}
                    className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white hover:bg-emerald-50 active:scale-95 text-emerald-900 text-xs font-black shadow-lg transition-all flex items-center justify-center gap-2 hover:shadow-emerald-950/20"
                  >
                    {isActivatingTrial ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                        <span>Activando tu mes gratis...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
                        <span>Iniciar 30 Días Gratis (1 Clic)</span>
                        <ArrowRight className="w-4 h-4 text-emerald-700" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Plan Cards Grid (2 cards for public, 3 for internal VIP/founder) */}
        <div className={`p-6 sm:p-8 grid grid-cols-1 ${isVip ? 'md:grid-cols-3' : 'md:grid-cols-2 max-w-3xl mx-auto'} gap-6`}>
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
                <span className="text-xs text-zinc-500 dark:text-zinc-400 ml-1">ARS para siempre</span>
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

          {/* Card 2: Plan Pro (Destacado en ARS) */}
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
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">$94.999</span>
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">ARS / año</span>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      Equivalente a solo ~$7.916 ARS/mes (¡Ahorra 39%!)
                    </span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">$12.999</span>
                      <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">ARS / mes</span>
                    </div>
                    <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                      Cancela o renueva cuando quieras
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
              ) : isPaidPro ? (
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
              ) : isTrial ? (
                <div className="space-y-2">
                  <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-center">
                    <span className="text-xs font-extrabold text-emerald-800 dark:text-emerald-200 block">
                      Prueba Pro Activa · {trialInfo.daysRemaining} días restantes
                    </span>
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                      Disfrutas de todas las ventajas Pro sin costo
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-subscribe-pro-while-trial"
                    onClick={() => handleOpenMercadoPago(billingCycle)}
                    disabled={isProcessing}
                    className="w-full py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-sky-200" />
                    <span>Asegurar mi Plan ({billingCycle === 'annual' ? '$94.999 ARS/año' : '$12.999 ARS/mes'})</span>
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-subscribe-pro"
                  onClick={() => handleOpenMercadoPago(billingCycle)}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 active:scale-[0.98] text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-1.5"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Abriendo Mercado Pago...</span>
                    </span>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-sky-200 fill-sky-200" />
                      <span>Pagar {billingCycle === 'annual' ? '$94.999 ARS/año' : '$12.999 ARS/mes'} con Mercado Pago</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Card 3: Miembro VIP (Acceso restringido interno, oculto para el público general) */}
          {isVip && (
            <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-gradient-to-b from-amber-50/50 via-yellow-50/20 to-amber-50/40 dark:from-amber-950/20 dark:via-zinc-900 dark:to-amber-950/10 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Acceso Interno
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-amber-950 uppercase tracking-wider">
                    Privado
                  </span>
                </div>
                <h3 className="text-xl font-black text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                  <span>Miembro VIP</span>
                  <span className="text-amber-500">✦</span>
                </h3>

                <div className="mt-3 mb-5">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black text-amber-900 dark:text-amber-200">$0</span>
                    <span className="text-xs text-amber-700 dark:text-amber-400">/ Acceso Interno</span>
                  </div>
                  <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                    Visible exclusivamente para Fundador y Miembros VIP
                  </span>
                </div>

                <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300 border-t border-amber-200 dark:border-amber-900/50 pt-4">
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Acceso 100% ilimitado</strong> a todas las herramientas Pro</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                    <span><strong>Insignia dorada "Miembro VIP ✦"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                    <span>Sin fechas de expiración ni cobros</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0 mt-0.5" />
                    <span>Escáner IA sin cuotas diarias</span>
                  </li>
                </ul>
              </div>

              <div className="mt-6 pt-3">
                <div className="w-full py-2.5 rounded-xl bg-amber-400 text-amber-950 font-black text-xs text-center shadow-xs">
                  ✦ Eres Miembro VIP
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}

        {/* Footer Guarantee / Information */}
        <div className="bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-200 dark:border-zinc-800 px-6 sm:px-8 py-4 flex items-center justify-between flex-wrap gap-3 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Transacciones seguras procesadas por Mercado Pago Argentina en Pesos Argentinos (ARS).</span>
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
