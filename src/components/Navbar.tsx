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
  Crown
} from 'lucide-react';
import { UserProfile, UserSession, SubscriptionTier } from '../types';
import { getProfileCalculations } from '../utils/nutritionCalculations';

export type AppTab = 'diary' | 'scanner' | 'profile' | 'progress' | 'foods' | 'planner';

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
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Logo and App Title */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('diary')}
              className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg group"
              id="navbar-brand-logo-btn"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-sm shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Activity className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <span className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-1.5">
                  NutriFit Pro
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                    Privado
                  </span>
                </span>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block truncate max-w-[200px]">
                  {session?.email || 'Diario & Escáner IA'}
                </p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-zinc-100/80 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60">
            <button
              id="nav-tab-diary"
              onClick={() => setActiveTab('diary')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'diary'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Diario
            </button>

            {/* Escáner Tab */}
            <button
              id="nav-tab-scanner"
              onClick={() => setActiveTab('scanner')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'scanner'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Escáner IA</span>
            </button>

            {/* Menús & Recetas Tab */}
            <button
              id="nav-tab-planner"
              onClick={() => setActiveTab('planner')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'planner'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              Menú & Recetas
            </button>

            {/* Biblioteca de Alimentos Tab */}
            <button
              id="nav-tab-foods"
              onClick={() => setActiveTab('foods')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'foods'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Utensils className="w-3.5 h-3.5" />
              Alimentos
            </button>

            {/* Progreso & Métricas Tab */}
            <button
              id="nav-tab-progress"
              onClick={() => setActiveTab('progress')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'progress'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Progreso & Métricas
            </button>

            <button
              id="nav-tab-profile"
              onClick={() => setActiveTab('profile')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-zinc-900 text-emerald-700 dark:text-emerald-400 shadow-xs font-bold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Perfil & Metas
            </button>
          </nav>

          {/* User Quick Profile Target Pill, Theme Toggle, VIP Badge & Session Logout */}
          <div className="flex items-center gap-2">
            {/* VIP / Pro / Plans Badge Button */}
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
                    <span className="tracking-tight">Miembro VIP ✦</span>
                  </button>
                ) : currentTier === 'pro_monthly' || currentTier === 'pro_annual' ? (
                  <button
                    type="button"
                    id="topbar-pro-badge-btn"
                    onClick={onOpenPlansModal}
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-xs hover:bg-emerald-700 transition-all"
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
                    title="Ver Planes de Suscripción"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Planes Pro</span>
                  </button>
                )}
              </>
            )}

            {/* Dark / Light Mode Switcher */}
            {onToggleTheme && (
              <button
                type="button"
                id="theme-toggle-button"
                onClick={onToggleTheme}
                title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 transition-all flex items-center justify-center"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400 fill-amber-400/20" />
                ) : (
                  <Moon className="w-4 h-4 text-zinc-700" />
                )}
              </button>
            )}

            <button
              id="topbar-user-profile-button"
              onClick={onOpenProfile}
              title="Abrir y configurar Perfil de Usuario"
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:border-emerald-500/50 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                    {profile.name || session?.name || 'Mi Perfil'}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded border font-medium ${goalBadgeColor}`}>
                    {goalText}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  <Flame className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {calculations.targetCalories.toLocaleString()} kcal
                  </span>
                </div>
              </div>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              id="topbar-logout-button"
              onClick={onLogout}
              title={`Cerrar sesión (${session?.email || 'Usuario'})`}
              className="p-2 sm:px-3 sm:py-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-zinc-200 dark:border-zinc-800 transition-all flex items-center gap-1.5 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden lg:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Subnav (visible on small screens) with highlighted center scanner */}
      <div className="flex md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 py-1 justify-around items-center">
        <button
          id="mobile-nav-diary"
          onClick={() => setActiveTab('diary')}
          className={`flex flex-col items-center py-1 px-1.5 text-[10px] font-medium rounded-lg ${
            activeTab === 'diary'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <BookOpen className="w-4 h-4 mb-0.5" />
          Diario
        </button>

        <button
          id="mobile-nav-planner"
          onClick={() => setActiveTab('planner')}
          className={`flex flex-col items-center py-1 px-1.5 text-[10px] font-medium rounded-lg ${
            activeTab === 'planner'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <ChefHat className="w-4 h-4 mb-0.5" />
          Menús
        </button>

        {/* Highlighted Scanner Central Action Button */}
        <button
          id="mobile-nav-scanner"
          onClick={() => setActiveTab('scanner')}
          className="flex flex-col items-center -mt-4 group"
        >
          <div className="w-11 h-11 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 group-hover:scale-105 active:scale-95 transition-transform">
            <Scan className="w-5 h-5 stroke-[2.3]" />
          </div>
          <span className={`text-[10px] font-bold mt-0.5 ${
            activeTab === 'scanner' ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-600 dark:text-zinc-400'
          }`}>
            Escáner
          </span>
        </button>

        <button
          id="mobile-nav-progress"
          onClick={() => setActiveTab('progress')}
          className={`flex flex-col items-center py-1 px-1.5 text-[10px] font-medium rounded-lg ${
            activeTab === 'progress'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <BarChart3 className="w-4 h-4 mb-0.5" />
          Progreso
        </button>

        <button
          id="mobile-nav-profile"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center py-1 px-1.5 text-[10px] font-medium rounded-lg ${
            activeTab === 'profile'
              ? 'text-emerald-600 dark:text-emerald-400 font-bold'
              : 'text-zinc-500 dark:text-zinc-400'
          }`}
        >
          <User className="w-4 h-4 mb-0.5" />
          Perfil
        </button>
      </div>
    </header>
  );
};
