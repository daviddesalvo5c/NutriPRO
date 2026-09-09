import React from 'react';
import { 
  Flame, 
  User, 
  BookOpen, 
  BarChart3, 
  Utensils, 
  Sparkles, 
  Activity, 
  Scan, 
  LogOut,
  ShieldCheck,
  Sun,
  Moon,
  ChefHat,
  TrendingUp,
  Crown,
  Smartphone
} from 'lucide-react';
import { UserProfile, UserSession, SubscriptionTier } from '../types';
import { getProfileCalculations } from '../utils/nutritionCalculations';
import { BrandLogo } from './BrandLogo';

export type AppTab = 'diary' | 'foods' | 'activity' | 'scanner' | 'planner' | 'progress' | 'profile';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  profile: UserProfile;
  onOpenProfile: () => void;
  session: UserSession | null;
  onLogout: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
  currentTier?: SubscriptionTier;
  onOpenPlansModal?: () => void;
  onOpenInstallPrompt?: () => void;
  isInstallable?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onOpenProfile,
  session,
  onLogout,
  theme = 'light',
  onToggleTheme,
  currentTier = 'free',
  onOpenPlansModal,
  onOpenInstallPrompt,
  isInstallable = false,
}) => {
  const calculations = getProfileCalculations(profile);

  const goalBadgeColor = {
    deficit: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    maintenance: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    surplus: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  }[profile.goal];

  const goalText = {
    deficit: 'Déficit Calórico',
    maintenance: 'Mantenimiento',
    surplus: 'Superávit Calórico',
  }[profile.goal];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-xs transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Logo and App Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('diary')}
                className="flex items-center gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded-lg group"
                id="navbar-brand-logo-btn"
              >
                <div className="w-10 h-10 rounded-2xl overflow-hidden shadow-sm shadow-teal-500/20 group-hover:scale-105 transition-transform shrink-0 border border-teal-500/30">
                  <img
                    src="/icon.svg"
                    alt="NutriFit Pro Logo"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-black text-base tracking-tight leading-none text-zinc-900 dark:text-white">
                    <span>NUTRIFIT</span>
                    <span className="text-teal-500 dark:text-teal-400">PRO</span>
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                      Privado
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden sm:block truncate max-w-[200px] mt-1 font-medium">
                    {session?.email || 'Calculadora Nutricional'}
                  </p>
                </div>
              </button>
            </div>

            {/* Desktop Center Navigation Pills */}
            <nav className="hidden md:flex items-center gap-1 bg-zinc-100/90 dark:bg-zinc-800/80 p-1 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-xs">
              <button
                type="button"
                id="header-nav-diary"
                onClick={() => setActiveTab('diary')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'diary'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Diario</span>
              </button>

              <button
                type="button"
                id="header-nav-foods"
                onClick={() => setActiveTab('foods')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'foods'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>Alimentos</span>
              </button>

              <button
                type="button"
                id="header-nav-activity"
                onClick={() => setActiveTab('activity')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'activity'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Actividad</span>
              </button>

              <button
                type="button"
                id="header-nav-scanner"
                onClick={() => setActiveTab('scanner')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'scanner'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-xs'
                    : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Escáner IA</span>
              </button>

              <button
                type="button"
                id="header-nav-planner"
                onClick={() => setActiveTab('planner')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'planner'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Menús</span>
              </button>

              <button
                type="button"
                id="header-nav-progress"
                onClick={() => setActiveTab('progress')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'progress'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Progreso</span>
              </button>

              <button
                type="button"
                id="header-nav-profile"
                onClick={() => setActiveTab('profile')}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  activeTab === 'profile'
                    ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Perfil</span>
              </button>
            </nav>

            {/* Top Bar: User Goal Pill, VIP/Plans Badge, Theme Toggle & Session Logout */}
            <div className="flex items-center gap-2">
              {/* Quick Calories Goal Display */}
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/90 border border-zinc-200/70 dark:border-zinc-700/70 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                <Flame className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                <span>{calculations.targetCalories.toLocaleString()} kcal</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ml-1 ${goalBadgeColor}`}>
                  {goalText}
                </span>
              </div>

              {/* VIP / Pro / Plans Badge Button (Mercado Pago Argentina) */}
              {onOpenPlansModal && (
                <>
                  {currentTier === 'vip' || session?.isFounder ? (
                    <button
                      type="button"
                      id="topbar-vip-badge-btn"
                      onClick={onOpenPlansModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-amber-950 text-xs font-black shadow-sm shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all border border-amber-300"
                      title="✦ Miembro VIP: Acceso Total Gratuito"
                    >
                      <span className="text-sm font-black">✦</span>
                      <span className="tracking-tight">VIP Activo</span>
                    </button>
                  ) : currentTier === 'pro_monthly' || currentTier === 'pro_annual' ? (
                    <button
                      type="button"
                      id="topbar-pro-badge-btn"
                      onClick={onOpenPlansModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-all"
                      title="Plan Pro Activo"
                    >
                      <Crown className="w-3.5 h-3.5 text-amber-300" />
                      <span>Plan Pro</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      id="topbar-upgrade-plans-btn"
                      onClick={onOpenPlansModal}
                      className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-[11px] sm:text-xs font-black shadow-xs hover:scale-105 transition-all"
                      title="Ver Planes Pro (Mercado Pago)"
                    >
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Planes Pro</span>
                    </button>
                  )}
                </>
              )}

              {/* Install PWA Button if available and not yet installed */}
              {isInstallable && onOpenInstallPrompt && (
                <button
                  type="button"
                  id="topbar-install-pwa-btn"
                  onClick={onOpenInstallPrompt}
                  title="Instalar NutriFit AI como aplicación nativa"
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-emerald-50 dark:bg-zinc-800 dark:hover:bg-emerald-950/40 text-zinc-700 hover:text-emerald-700 dark:text-zinc-300 dark:hover:text-emerald-300 border border-zinc-200 dark:border-zinc-700 text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                >
                  <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="hidden sm:inline">Instalar App</span>
                </button>
              )}

              {/* Dark / Light Mode Switcher */}
              {onToggleTheme && (
                <button
                  type="button"
                  id="theme-toggle-button"
                  onClick={onToggleTheme}
                  title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                  className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-all flex items-center justify-center active:scale-90"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-amber-400 fill-amber-400/30 transition-transform duration-200" />
                  ) : (
                    <Moon className="w-4 h-4 text-zinc-700 fill-zinc-700/20 transition-transform duration-200" />
                  )}
                </button>
              )}

              {/* User Profile Header Button */}
              <button
                id="topbar-user-profile-button"
                onClick={onOpenProfile}
                title="Abrir Perfil"
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-black text-xs shrink-0">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 hidden sm:inline truncate max-w-[100px]">
                  {profile.name || session?.name || 'Perfil'}
                </span>
              </button>

              {/* Logout Button */}
              <button
                type="button"
                id="topbar-logout-button"
                onClick={onLogout}
                title={`Cerrar sesión (${session?.email || 'Usuario'})`}
                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-zinc-200 dark:border-zinc-800 transition-all flex items-center justify-center active:scale-90"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Unified Bottom Dock Bar (3 Left — Floating Center Escáner IA — 3 Right) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none pb-2 sm:pb-3 px-1.5 sm:px-4">
        <nav 
          id="unified-bottom-dock"
          className="pointer-events-auto max-w-2xl w-full mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200/90 dark:border-zinc-800/90 rounded-2xl sm:rounded-3xl shadow-[0_12px_36px_rgba(0,0,0,0.15)] dark:shadow-[0_12px_36px_rgba(0,0,0,0.65)] px-1 sm:px-2 py-1.5 sm:py-2 grid grid-cols-7 items-center justify-items-center ring-1 ring-black/5 dark:ring-white/5 transition-all"
        >
          {/* 1. Diario */}
          <button
            type="button"
            id="dock-tab-diary"
            onClick={() => setActiveTab('diary')}
            className={`w-full flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'diary'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/40'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 whitespace-nowrap truncate max-w-full">Diario</span>
            {activeTab === 'diary' && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
            )}
          </button>

          {/* 2. Alimentos */}
          <button
            type="button"
            id="dock-tab-foods"
            onClick={() => setActiveTab('foods')}
            className={`w-full flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'foods'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/40'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Utensils className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 whitespace-nowrap truncate max-w-full">Alimentos</span>
            {activeTab === 'foods' && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
            )}
          </button>

          {/* 3. Actividad */}
          <button
            type="button"
            id="dock-tab-activity"
            onClick={() => setActiveTab('activity')}
            className={`w-full flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'activity'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/40'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 whitespace-nowrap truncate max-w-full">Actividad</span>
            {activeTab === 'activity' && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
            )}
          </button>

          {/* [CENTRO] 4. Escáner IA (Hero Center Button) */}
          <button
            type="button"
            id="dock-tab-scanner"
            onClick={() => setActiveTab('scanner')}
            className="w-full flex flex-col items-center -mt-5 sm:-mt-6 group px-0.5 active:scale-95 transition-transform"
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all ${
              activeTab === 'scanner'
                ? 'bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-500 ring-4 ring-emerald-500/20 shadow-emerald-500/40 scale-110'
                : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 group-hover:scale-105'
            }`}>
              <Scan className="w-6 h-6 stroke-[2.5]" />
            </div>
            <span className={`text-[9px] sm:text-[11px] font-black mt-0.5 whitespace-nowrap truncate max-w-full ${
              activeTab === 'scanner' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-300'
            }`}>
              Escáner IA
            </span>
          </button>

          {/* 5. Menús */}
          <button
            type="button"
            id="dock-tab-planner"
            onClick={() => setActiveTab('planner')}
            className={`w-full flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'planner'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/40'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <ChefHat className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 whitespace-nowrap truncate max-w-full">Menús</span>
            {activeTab === 'planner' && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
            )}
          </button>

          {/* 6. Progreso */}
          <button
            type="button"
            id="dock-tab-progress"
            onClick={() => setActiveTab('progress')}
            className={`w-full flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'progress'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/40'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 whitespace-nowrap truncate max-w-full">Progreso</span>
            {activeTab === 'progress' && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
            )}
          </button>

          {/* 7. Perfil */}
          <button
            type="button"
            id="dock-tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all duration-200 active:scale-95 ${
              activeTab === 'profile'
                ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50/80 dark:bg-emerald-950/40'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60'
            }`}
          >
            <User className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.2]" />
            <span className="text-[9px] sm:text-[11px] mt-0.5 whitespace-nowrap truncate max-w-full">Perfil</span>
            {activeTab === 'profile' && (
              <span className="w-1 h-1 rounded-full bg-emerald-600 dark:bg-emerald-400 mt-0.5" />
            )}
          </button>
        </nav>
      </div>
    </>
  );
};
