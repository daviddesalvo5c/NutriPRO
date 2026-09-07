import React, { useState } from 'react';
import { 
  Activity, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  loadRegisteredUsers, 
  registerNewUser 
} from '../utils/storage';
import { UserSession } from '../types';

interface AuthViewProps {
  onLoginSuccess: (session: UserSession) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Clean form fields
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Status & Validation
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Submit handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMessage('Por favor, ingresa tu correo electrónico.');
      return;
    }

    if (!cleanPassword) {
      setErrorMessage('Por favor, ingresa tu contraseña.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (mode === 'login') {
        const users = loadRegisteredUsers();
        const found = users.find(
          (u) => u.email.toLowerCase() === cleanEmail && u.password === cleanPassword
        );

        if (!found) {
          setIsLoading(false);
          setErrorMessage('Credenciales incorrectas. Verifica tu correo y contraseña.');
          return;
        }

        setSuccessMessage(`¡Bienvenido de nuevo, ${found.name}!`);
        setTimeout(() => {
          onLoginSuccess({
            email: found.email,
            name: found.name,
            isFounder: found.isFounder,
          });
        }, 350);
      } else {
        // Register mode
        const cleanName = name.trim();
        if (!cleanName) {
          setIsLoading(false);
          setErrorMessage('Por favor, ingresa tu nombre completo.');
          return;
        }

        if (cleanPassword.length < 5) {
          setIsLoading(false);
          setErrorMessage('La contraseña debe tener al menos 5 caracteres.');
          return;
        }

        const res = registerNewUser(cleanName, cleanEmail, cleanPassword);
        if (!res.success || !res.user) {
          setIsLoading(false);
          setErrorMessage(res.message || 'No se pudo crear la cuenta.');
          return;
        }

        setSuccessMessage(`¡Cuenta creada con éxito! Iniciando tu sesión privada...`);
        setTimeout(() => {
          onLoginSuccess({
            email: res.user!.email,
            name: res.user!.name,
            isFounder: res.user!.isFounder,
          });
        }, 400);
      }
    }, 300);
  };

  return (
    <div 
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-zinc-950 text-zinc-100 overflow-hidden select-none"
      id="auth-screen-wrapper"
    >
      {/* 1. Subtle Mosaic & Geometric Grid Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* Secondary Dot Matrix Texture Accent */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.35) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Ambient Neumorphic Glow Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-emerald-950/30 rounded-full blur-[150px] pointer-events-none" />

      {/* 2. Polished Glassmorphic Container Card */}
      <motion.div 
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl backdrop-blur-2xl bg-zinc-900/65 border border-white/[0.12] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] overflow-hidden"
      >
        {/* Soft lighting highlight across top edge */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        
        {/* Card Header */}
        <div className="p-7 sm:p-8 pb-5 text-center relative">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 shadow-[0_0_25px_rgba(16,185,129,0.2),inset_0_1px_1px_rgba(255,255,255,0.2)] mb-3.5 text-emerald-400">
            <Activity className="w-7 h-7 stroke-[2.2]" />
          </div>

          <h2 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-2">
            NutriFit Pro
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Privado
            </span>
          </h2>

          <p className="text-xs text-zinc-400 mt-1 max-w-xs mx-auto leading-relaxed">
            Plataforma nutricional con BMR/TDEE, Escáner IA y Diario de Comidas personalizado.
          </p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-300 mt-3 font-medium shadow-inner">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tus datos permanecen 100% aislados y seguros</span>
          </div>
        </div>

        {/* 4. Micro-Animated Tabs (Smooth sliding pill) */}
        <div className="px-7 sm:px-8 mb-5">
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-black/40 border border-white/[0.07] shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] relative">
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`relative z-10 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'login' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {mode === 'login' && (
                <motion.div
                  layoutId="activeAuthTabPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_4px_12px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-emerald-400/40"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Iniciar Sesión
              </span>
            </button>

            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`relative z-10 py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-2 ${
                mode === 'register' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {mode === 'register' && (
                <motion.div
                  layoutId="activeAuthTabPill"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-[0_4px_12px_rgba(16,185,129,0.35),inset_0_1px_1px_rgba(255,255,255,0.25)] border border-emerald-400/40"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                Crear Cuenta
              </span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="px-7 sm:px-8 pb-8 pt-1">
          {/* Alerts */}
          <AnimatePresence mode="wait">
            {errorMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs font-semibold flex items-center gap-2.5 shadow-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Animated Name Field for Register Mode */}
            <AnimatePresence initial={false}>
              {mode === 'register' && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 0 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden space-y-1.5"
                >
                  <label className="block text-xs font-semibold text-zinc-300">
                    Nombre Completo
                  </label>
                  {/* 3. Refined Glassmorphic Input with Inner Depth */}
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-emerald-400 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="auth-input-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre y apellido"
                      className="w-full pl-10 pr-4 py-3 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-black/50 border border-white/[0.1] focus:border-emerald-500/80 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] transition-all font-medium"
                      required={mode === 'register'}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-emerald-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="auth-input-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.correo@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-black/50 border border-white/[0.1] focus:border-emerald-500/80 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-300">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 group-focus-within:text-emerald-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-white/[0.04] hover:bg-white/[0.06] focus:bg-black/50 border border-white/[0.1] focus:border-emerald-500/80 rounded-xl text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)] transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 4. Micro-Animated Submit Button */}
            <motion.button
              whileHover={{ scale: 1.012 }}
              whileTap={{ scale: 0.985 }}
              type="submit"
              id="auth-btn-submit"
              disabled={isLoading}
              className="w-full mt-3 py-3.5 px-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 active:from-emerald-700 active:to-teal-700 text-white font-black text-sm rounded-xl shadow-[0_10px_25px_-5px_rgba(16,185,129,0.4),inset_0_1px_1px_rgba(255,255,255,0.3)] border border-emerald-400/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <span>Ingresar a mi Cuenta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Crear mi Cuenta Privada</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {/* Bottom Security Note */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Privacidad garantizada · Sin publicidad ni rastreadores</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
