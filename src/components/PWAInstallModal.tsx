import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Share2, 
  PlusSquare, 
  Zap, 
  ShieldCheck,
  WifiOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BrandLogo } from './BrandLogo';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstall: () => Promise<boolean>;
  isIOS?: boolean;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onInstall,
  isIOS = false,
}) => {
  const [installing, setInstalling] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(isIOS);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }

    setInstalling(true);
    try {
      const accepted = await onInstall();
      if (accepted) {
        onClose();
      }
    } catch (err) {
      console.error('Install prompt error:', err);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      <div 
        id="pwa-install-modal-overlay"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
      >
        {/* Ambient Neumorphic Glows matching Login */}
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 bg-teal-500/20 rounded-full blur-[120px] pointer-events-none" />

        <motion.div
          id="pwa-install-modal-card"
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md rounded-3xl backdrop-blur-2xl bg-zinc-950/90 border border-white/[0.12] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] text-zinc-100 overflow-hidden my-auto"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />

          {/* Close button */}
          <button
            type="button"
            id="pwa-close-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-zinc-100 transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header content */}
          <div className="p-6 sm:p-8 pb-4 text-center">
            {/* Official App Emblem */}
            <div className="flex justify-center mb-3">
              <BrandLogo 
                variant="vertical" 
                size="lg" 
                showSubtitle={true} 
                subtitleText="Calculadora Nutricional & Perfil de Usuario"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 text-xs font-bold uppercase tracking-wider mb-2.5 mt-1">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>Acceso Directo & App Nativa</span>
            </div>

            <p className="text-zinc-400 text-xs sm:text-sm max-w-sm mx-auto leading-relaxed">
              Instala la aplicación en la pantalla de inicio de tu celular o computadora para abrirla con 1 toque, pantalla completa y acceso offline.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="px-6 sm:px-8 py-3 space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Acceso Rápido en 1 Toque</div>
                <div className="text-[11px] text-zinc-400">Se abre como app nativa a pantalla completa sin barras de navegador.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Modo Offline Inteligente</div>
                <div className="text-[11px] text-zinc-400">Registra comidas y calorías incluso cuando no tengas internet.</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-white">Sincronización Segura</div>
                <div className="text-[11px] text-zinc-400">Datos privados guardados y sincronizados en la nube automáticamente.</div>
              </div>
            </div>
          </div>

          {/* iOS Specific step guide if detected */}
          {showIOSSteps && (
            <div className="px-6 sm:px-8 py-3 my-2 mx-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-left">
              <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5 mb-2">
                <Share2 className="w-4 h-4" />
                <span>Instalación en iPhone / iPad (Safari)</span>
              </div>
              <ol className="text-xs text-zinc-300 space-y-1.5 list-decimal pl-4">
                <li>Presiona el botón <strong>Compartir</strong> <Share2 className="w-3 h-3 inline mx-0.5 text-emerald-400" /> en la barra inferior de Safari.</li>
                <li>Desliza hacia abajo y selecciona <strong>"Agregar a Inicio"</strong> <PlusSquare className="w-3 h-3 inline mx-0.5 text-emerald-400" />.</li>
                <li>Toca <strong>"Agregar"</strong> arriba a la derecha.</li>
              </ol>
            </div>
          )}

          {/* Action Buttons: Instalar App & Quizás más tarde */}
          <div className="p-6 sm:p-8 pt-4 space-y-2.5">
            <button
              type="button"
              id="pwa-btn-confirm-install"
              onClick={handleInstallClick}
              disabled={installing}
              className="w-full py-3.5 px-5 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>{installing ? 'Instalando...' : 'Instalar App'}</span>
            </button>

            <button
              type="button"
              id="pwa-btn-snooze-later"
              onClick={onClose}
              className="w-full py-3 px-5 rounded-2xl font-semibold text-xs text-zinc-400 hover:text-zinc-200 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] active:scale-[0.98] transition-all"
            >
              Quizás más tarde
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
