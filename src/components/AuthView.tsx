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
  Sparkles,
  Sun,
  Moon,
  Smartphone,
  KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  loadRegisteredUsers, 
  registerNewUser,
  FOUNDER_EMAIL,
  FOUNDER_PASSWORD,
  FOUNDER_NAME,
  saveDailyLogsForUser,
  saveStoredProfileForUser,
  saveWeightHistoryForUser,
  saveMeasurementsForUser,
  setUserTier
} from '../utils/storage';
import { 
  supabaseLogin, 
  supabaseRegister, 
  isSupabaseConfigured 
} from '../services/supabaseService';
import { cloudSyncService } from '../services/cloudSyncService';
import { UserSession } from '../types';
import { BrandLogo } from './BrandLogo';

interface AuthViewProps {
  onLoginSuccess: (session: UserSession) => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ 
  onLoginSuccess,
  theme = 'dark',
  onToggleTheme,
}) => {
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
  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      if (mode === 'login') {
        // 1. Founder fast-track bypass with credentials check
        if (cleanEmail === FOUNDER_EMAIL.toLowerCase() && cleanPassword === FOUNDER_PASSWORD) {
          // Attempt native Supabase Auth in background to acquire real user_id
          let founderUserId = 'a0000000-0000-0000-0000-000000000001';
          if (isSupabaseConfigured) {
            try {
              const supaRes = await supabaseLogin(cleanEmail, cleanPassword);
              if (supaRes.success && supaRes.user?.id) {
                founderUserId = supaRes.user.id;
              }
            } catch {}
          }

          setSuccessMessage(`¡Bienvenido Fundador, ${FOUNDER_NAME}! Sincronizando datos automáticamente...`);
          setTimeout(() => {
            onLoginSuccess({
              email: FOUNDER_EMAIL,
              name: FOUNDER_NAME,
              isFounder: true,
              userId: founderUserId,
            });
          }, 350);
          return;
        }

        // 2. Native Supabase Auth & Cloud Login
        if (isSupabaseConfigured) {
          const res = await supabaseLogin(cleanEmail, cleanPassword);
          if (res.success && res.user) {
            registerNewUser(res.user.name, res.user.email, cleanPassword);
            setSuccessMessage(`¡Bienvenido de nuevo, ${res.user.name}! Sincronizando tu diario...`);
            setTimeout(() => {
              onLoginSuccess({
                email: res.user!.email,
                name: res.user!.name,
                isFounder: res.user!.isFounder,
                userId: res.user!.id,
              });
            }, 350);
            return;
          } else if (res.message && !res.message.includes('Usuario no encontrado')) {
            // Error returned from server (e.g. incorrect password)
            setIsLoading(false);
            setErrorMessage(res.message);
            return;
          }
        }

        // 3. Fallback Cloud Backend Login
        const cloudRes = await cloudSyncService.login(cleanEmail, cleanPassword);
        if (cloudRes.success && cloudRes.user) {
          registerNewUser(cloudRes.user.name, cloudRes.user.email, cleanPassword);
          setSuccessMessage(`¡Bienvenido de nuevo, ${cloudRes.user.name}!`);
          setTimeout(() => {
            onLoginSuccess({
              email: cloudRes.user!.email,
              name: cloudRes.user!.name,
              isFounder: cloudRes.user!.isFounder,
            });
          }, 350);
          return;
        }

        // 4. Fallback to local stored registry
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

        let createdUserId: string | undefined;

        // 1. Native Supabase Auth Register
        if (isSupabaseConfigured) {
          const res = await supabaseRegister(cleanName, cleanEmail, cleanPassword);
          if (res.success && res.user) {
            createdUserId = res.user.id;
          }
        }

        // 2. Cloud Backend Register & local storage
        await cloudSyncService.register(cleanName, cleanEmail, cleanPassword);
        registerNewUser(cleanName, cleanEmail, cleanPassword);

        setSuccessMessage(`¡Cuenta creada con éxito! Sincronización automática activa.`);
        setTimeout(() => {
          onLoginSuccess({
            email: cleanEmail,
            name: cleanName,
            isFounder: cleanEmail === FOUNDER_EMAIL.toLowerCase(),
            userId: createdUserId,
          });
        }, 400);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setIsLoading(false);
      setErrorMessage(`Error durante la autenticación: ${msg}`);
    }
  };

  return (
    <div 
      className="relative min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden select-none transition-colors duration-200"
      id="auth-screen-wrapper"
    >
      {/* Top right theme toggle button */}
      {onToggleTheme && (
        <div className="absolute top-4 right-4 z-30">
          <button
            type="button"
            onClick={onToggleTheme}
            id="auth-theme-toggle-btn"
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className="p-2.5 rounded-2xl bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 dark:hover:text-white shadow-md transition-all active:scale-90 flex items-center justify-center"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400 fill-amber-400/30" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700 fill-zinc-700/20" />
            )}
          </button>
        </div>
      )}

      {/* Subtle Grid Background Pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-40 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(120, 120, 120, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(120, 120, 120, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, black 40%, transparent 100%)',
        }}
      />

      {/* Dot Matrix Texture */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'radial-gradient(rgba(16, 185, 129, 0.35) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />

      {/* Ambient Glow Orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-emerald-950/30 rounded-full blur-[150px] pointer-events-none" />

      {/* Glassmorphic Container Card */}
      <motion.div 
        initial={{ opacity: 0, y: 22, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md rounded-3xl backdrop-blur-2xl bg-white/90 dark:bg-zinc-900/75 border border-zinc-200/90 dark:border-white/[0.12] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] dark:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.18)] overflow-hidden"
      >
        {/* Soft lighting highlight across top edge */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />
        
        {/* Card Header with Official Emblem Logo */}
        <div className="p-7 sm:p-8 pb-5 text-center relative">
          <BrandLogo 
            variant="vertical" 
            size="lg" 
            showSubtitle={true} 
            subtitleText="Calculadora Nutricional & Perfil de Usuario"
          />

          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 max-w-xs mx-auto leading-relaxed">
            Inicia sesión para acceder a tu diario nutricional, metas metabólicas y seguimiento de progreso.
          </p>
        </div>

        {/* 2 Tabs: Entrar y Registro */}
        <div className="px-5 sm:px-8 mb-5">
          <div className="grid grid-cols-2 p-1.5 rounded-2xl bg-zinc-200/80 dark:bg-black/40 border border-zinc-300/80 dark:border-white/[0.07] shadow-inner relative text-xs">
            <button
              type="button"
              id="auth-tab-login"
              onClick={() => {
                setMode('login');
                setErrorMessage(null);
              }}
              className={`relative z-10 py-2.5 font-bold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'login' ? 'text-white' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
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
                <span>Iniciar Sesión</span>
              </span>
            </button>

            <button
              type="button"
              id="auth-tab-register"
              onClick={() => {
                setMode('register');
                setErrorMessage(null);
              }}
              className={`relative z-10 py-2.5 font-bold transition-colors flex items-center justify-center gap-1.5 ${
                mode === 'register' ? 'text-white' : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
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
                <span>Crear Cuenta</span>
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
                className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-300 text-xs font-semibold flex items-center gap-2.5 shadow-sm"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 dark:text-rose-400" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {successMessage && (
              <motion.div 
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2.5 shadow-sm"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
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
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    Nombre Completo
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      id="auth-input-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Tu nombre y apellido"
                      className="w-full pl-10 pr-4 py-3 bg-zinc-100/90 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.06] focus:bg-white dark:focus:bg-black/50 border border-zinc-300 dark:border-white/[0.1] focus:border-emerald-500/80 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 shadow-inner transition-all font-medium"
                      required={mode === 'register'}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Correo Electrónico
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  id="auth-input-email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu.correo@ejemplo.com"
                  className="w-full pl-10 pr-4 py-3 bg-zinc-100/90 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.06] focus:bg-white dark:focus:bg-black/50 border border-zinc-300 dark:border-white/[0.1] focus:border-emerald-500/80 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 shadow-inner transition-all font-medium"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Contraseña
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400 dark:text-zinc-400 group-focus-within:text-emerald-600 dark:group-focus-within:text-emerald-400 transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="auth-input-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-zinc-100/90 hover:bg-zinc-100 dark:bg-white/[0.04] dark:hover:bg-white/[0.06] focus:bg-white dark:focus:bg-black/50 border border-zinc-300 dark:border-white/[0.1] focus:border-emerald-500/80 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/15 shadow-inner transition-all font-medium"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
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

          {/* Bottom Note */}
          <div className="mt-6 text-center">
            <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Sincronización en la nube automática · Privacidad garantizada</span>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
