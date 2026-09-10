import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Crown, 
  Users, 
  TrendingUp, 
  DollarSign, 
  UserCheck, 
  UserX, 
  Search, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Sparkles,
  ArrowUpRight,
  Filter,
  BarChart2,
  RefreshCw,
  Database
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  Legend 
} from 'recharts';
import { AuthUser, SubscriptionTransaction, SubscriptionTier } from '../types';
import { 
  loadRegisteredUsers, 
  loadTransactions, 
  grantVipToUser, 
  revokeVipFromUser, 
  FOUNDER_EMAIL,
  isFounderEmail
} from '../utils/storage';
import {
  supabaseFetchRegisteredUsers,
  supabaseFetchTransactions,
  supabaseGrantVip,
  supabaseRevokeVip,
  isSupabaseConfigured,
  checkSupabaseHealth
} from '../services/supabaseService';

interface FounderManagementPanelProps {
  currentUserEmail: string;
}

export const FounderManagementPanel: React.FC<FounderManagementPanelProps> = ({
  currentUserEmail,
}) => {
  // STRICT RESTRICTION: Only the founder email may view this panel
  if (!isFounderEmail(currentUserEmail)) {
    return null;
  }

  const [users, setUsers] = useState<AuthUser[]>(() => loadRegisteredUsers());
  const [transactions, setTransactions] = useState<SubscriptionTransaction[]>(() => loadTransactions());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDbLive, setIsDbLive] = useState<boolean>(isSupabaseConfigured);
  
  // VIP invitation form
  const [newVipEmail, setNewVipEmail] = useState<string>('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [planFilter, setPlanFilter] = useState<'all' | 'vip' | 'pro' | 'free'>('all');

  // Load real data from Supabase (profiles) or fallback
  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch directly through founder service_role endpoint which queries Supabase profiles bypassing RLS
      const remoteUsers = await supabaseFetchRegisteredUsers(currentUserEmail);
      const remoteTxs = isSupabaseConfigured ? await supabaseFetchTransactions() : [];
      if (remoteUsers && remoteUsers.length > 0) {
        setUsers(remoteUsers);
        setIsDbLive(true);
      } else {
        setUsers(loadRegisteredUsers());
      }
      setTransactions(remoteTxs || []);
    } catch (err) {
      console.error('Error refreshing founder data:', err);
      setUsers(loadRegisteredUsers());
      setTransactions(loadTransactions());
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [currentUserEmail]);

  const handleGrantVip = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    // 1. Immediate optimistic UI update so mobile and desktop show VIP instantaneously
    setUsers((prev) =>
      prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, tier: 'vip' } : u))
    );
    grantVipToUser(cleanEmail);

    setIsRefreshing(true);
    try {
      const res = await supabaseGrantVip(cleanEmail, currentUserEmail);
      if (res.success) {
        setNotification({ type: 'success', message: res.message });
        setNewVipEmail('');
      } else {
        setNotification({ type: 'error', message: res.message });
      }
      await refreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Error al otorgar VIP' });
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRevokeVip = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    // 1. Immediate optimistic UI update
    setUsers((prev) =>
      prev.map((u) => (u.email.toLowerCase() === cleanEmail ? { ...u, tier: 'free' } : u))
    );
    revokeVipFromUser(cleanEmail);

    setIsRefreshing(true);
    try {
      const res = await supabaseRevokeVip(cleanEmail, currentUserEmail);
      if (res.success) {
        setNotification({ type: 'success', message: res.message });
      } else {
        setNotification({ type: 'error', message: res.message });
      }
      await refreshData();
    } catch (err: any) {
      setNotification({ type: 'error', message: err?.message || 'Error al revocar VIP' });
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // KPI Calculations
  const totalUsers = users.length;
  const proMonthlyUsers = users.filter((u) => u.tier === 'pro_monthly').length;
  const proAnnualUsers = users.filter((u) => u.tier === 'pro_annual').length;
  const proSubscribersCount = proMonthlyUsers + proAnnualUsers;
  const vipMembersCount = users.filter((u) => u.tier === 'vip' && !u.isFounder).length;
  const freeUsersCount = users.filter((u) => u.tier === 'free' || !u.tier).length;

  // Monthly Recurring Revenue (MRR)
  // Monthly plan: $12.999 ARS, Annual plan: $94.999 ARS / 12 = ~$7.916 ARS/month
  const mrr = Math.round((proMonthlyUsers * 12999) + (proAnnualUsers * (94999 / 12)));
  const arr = mrr * 12;

  // Pie chart distribution data
  const distributionData = [
    { name: 'Gratuito', value: freeUsersCount, color: '#94a3b8' },
    { name: 'Pro Mensual', value: proMonthlyUsers, color: '#10b981' },
    { name: 'Pro Anual', value: proAnnualUsers, color: '#059669' },
    { name: 'Miembros VIP', value: vipMembersCount + 1, color: '#f59e0b' },
  ].filter((d) => d.value > 0);

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch = 
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (planFilter === 'vip') return u.tier === 'vip';
    if (planFilter === 'pro') return u.tier === 'pro_monthly' || u.tier === 'pro_annual';
    if (planFilter === 'free') return u.tier === 'free' || !u.tier;
    return true;
  });

  return (
    <div id="founder-exclusive-panel" className="space-y-8 mt-10">
      {/* Founder Identification Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 text-white rounded-3xl p-6 sm:p-8 border border-amber-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40 text-xs font-bold uppercase tracking-wider mb-2">
              <Crown className="w-3.5 h-3.5 text-amber-400" />
              <span>Acceso Maestro · David De Salvo (Fundador)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Panel del Fundador & Métricas de Negocio
            </h2>
            <p className="text-zinc-400 text-sm mt-1 max-w-2xl">
              Vista restringida confidencial para administración de suscripciones, gestión de invitaciones VIP y análisis del Ingreso Mensual Recurrente (MRR).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
              isDbLive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
            }`}>
              <Database className="w-3.5 h-3.5" />
              <span>{isDbLive ? 'Supabase Conectado' : 'Modo Seguro Local'}</span>
            </span>
            <button
              type="button"
              onClick={refreshData}
              disabled={isRefreshing}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-extrabold transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              title="Consultar datos y transacciones reales en Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Sincronizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div className={`p-4 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all ${
          notification.type === 'success'
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
            : 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Usuarios</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">{totalUsers}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center">
              <ArrowUpRight className="w-3 h-3" />
              <span>Registrados</span>
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {freeUsersCount} en Plan Gratuito
          </span>
        </div>

        {/* Pro Active Subscribers */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Suscriptores Pro</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{proSubscribersCount}</span>
            <span className="text-xs font-semibold text-zinc-500">
              ({proMonthlyUsers}m / {proAnnualUsers}a)
            </span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {totalUsers > 0 ? `${Math.round((proSubscribersCount / totalUsers) * 100)}% conversión Pro` : '0%'}
          </span>
        </div>

        {/* VIP Invited Members */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Miembros VIP</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center">
              <Crown className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{vipMembersCount}</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">Invitados</span>
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Acceso Total Gratuito Vitalicio
          </span>
        </div>

        {/* Estimated MRR */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">MRR Estimado</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-zinc-900 dark:text-zinc-50">${mrr.toLocaleString('es-AR')}</span>
            <span className="text-xs font-semibold text-zinc-400">ARS/mes</span>
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1 block">
            ARR Proyectado: ${arr.toLocaleString('es-AR')} ARS/año
          </span>
        </div>
      </div>

      {/* Distribution Chart & MRR Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pie Chart: User Distribution by Plan */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <span>Distribución de Usuarios por Plan</span>
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Proporción de cuentas Gratuito vs Pro Mensual vs Pro Anual vs VIP
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distributionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {distributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(val: any, name: any) => [`${val} usuarios`, name]}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderRadius: '12px',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 'bold',
                  }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Breakdown Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
            <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <span className="text-[10px] text-zinc-500 uppercase block font-bold">Gratuito</span>
              <span className="text-sm font-black text-zinc-700 dark:text-zinc-300">{freeUsersCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30">
              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 uppercase block font-bold">Pro Mensual</span>
              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{proMonthlyUsers}</span>
            </div>
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/30">
              <span className="text-[10px] text-teal-700 dark:text-teal-400 uppercase block font-bold">Pro Anual</span>
              <span className="text-sm font-black text-teal-700 dark:text-teal-400">{proAnnualUsers}</span>
            </div>
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30">
              <span className="text-[10px] text-amber-700 dark:text-amber-400 uppercase block font-bold">VIP</span>
              <span className="text-sm font-black text-amber-700 dark:text-amber-400">{vipMembersCount + 1}</span>
            </div>
          </div>
        </div>

        {/* VIP Invitation Form */}
        <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                ✦
              </div>
              <div>
                <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100">
                  Gestión de Invitados VIP
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Otorga acceso total gratuito de por vida a clientes especiales, amigos o socios.
                </p>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newVipEmail.trim()) {
                  handleGrantVip(newVipEmail.trim());
                }
              }}
              className="mt-5 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Correo electrónico del usuario a invitar
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    id="input-vip-invite-email"
                    value={newVipEmail}
                    onChange={(e) => setNewVipEmail(e.target.value)}
                    placeholder="ejemplo@usuario.com"
                    required
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  />
                  <button
                    type="submit"
                    id="btn-grant-vip-submit"
                    className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-zinc-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-1.5 shrink-0 transition-all hover:scale-[1.02]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Hacer VIP ✦</span>
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Al asignar el rol VIP, el usuario verá la insignia dorada "Miembro VIP ✦" y tendrá todas las herramientas Pro liberadas sin costo.
              </p>
            </form>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Privacidad y Control Maestro</span>
            </h4>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
              Solo tú ({FOUNDER_EMAIL}) puedes acceder a esta consola de administración. Puedes revocar el rango VIP en cualquier momento desde la tabla de abajo.
            </p>
          </div>
        </div>
      </div>

      {/* Users Directory & VIP Controls */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Directorio de Usuarios Registrados (Supabase profiles)</span>
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Service Role (Bypass RLS)
              </span>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {filteredUsers.length} de {users.length} cuentas registradas
              </p>
            </div>
          </div>

          {/* Search, filter controls & reload */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={refreshData}
              disabled={isRefreshing}
              className="p-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 disabled:opacity-50"
              title="Recargar usuarios desde Supabase"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o correo..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1 text-xs">
              <button
                type="button"
                onClick={() => setPlanFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  planFilter === 'all'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setPlanFilter('vip')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  planFilter === 'vip'
                    ? 'bg-amber-400 text-amber-950 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                VIP
              </button>
              <button
                type="button"
                onClick={() => setPlanFilter('pro')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  planFilter === 'pro'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Pro
              </button>
              <button
                type="button"
                onClick={() => setPlanFilter('free')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  planFilter === 'free'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                Gratis
              </button>
            </div>
          </div>
        </div>

        {/* Mobile View: Clean, tactile User Cards */}
        <div className="block md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {filteredUsers.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              No se encontraron usuarios con ese criterio.
            </div>
          ) : (
            filteredUsers.map((u) => {
              const isUserFounder = isFounderEmail(u.email);
              const isUserVip = u.tier === 'vip' || isUserFounder;
              const isUserPro = u.tier === 'pro_monthly' || u.tier === 'pro_annual';

              return (
                <div key={u.email} className="py-3 px-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100 truncate">{u.name}</span>
                        {isUserFounder && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-400 text-amber-950 font-black text-[9px] uppercase tracking-wider">
                            Fundador
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{u.email}</p>
                    </div>
                    <div>
                      {isUserFounder ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 text-[10px] font-black">
                          ✦ Fundador VIP
                        </span>
                      ) : isUserVip ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow-xs">
                          ✦ Miembro VIP
                        </span>
                      ) : isUserPro ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 text-[10px] font-bold">
                          {u.tier === 'pro_annual' ? 'Pro Anual' : 'Pro Mensual'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold">
                          Plan Gratuito
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-zinc-400">
                      Reg: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                    </span>
                    <div>
                      {isUserFounder ? (
                        <span className="text-[11px] text-zinc-400 italic">Inmutable</span>
                      ) : isUserVip ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeVip(u.email)}
                          className="px-3 py-1.5 rounded-lg text-rose-600 active:bg-rose-100 dark:active:bg-rose-950/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-bold transition-all"
                          title="Quitar rango VIP"
                        >
                          Revocar VIP
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleGrantVip(u.email)}
                          className="px-3 py-1.5 rounded-lg bg-amber-400 active:bg-amber-600 hover:bg-amber-500 text-amber-950 text-xs font-black transition-all shadow-xs flex items-center gap-1.5"
                          title="Asignar acceso total gratuito"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>Hacer VIP ✦</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-black border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo Electrónico</th>
                <th className="py-3 px-4">Plan Actual</th>
                <th className="py-3 px-4">Registro</th>
                <th className="py-3 px-4 text-right">Acción de Rango</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-zinc-400">
                    No se encontraron usuarios con ese criterio.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isUserFounder = isFounderEmail(u.email);
                  const isUserVip = u.tier === 'vip' || isUserFounder;
                  const isUserPro = u.tier === 'pro_monthly' || u.tier === 'pro_annual';

                  return (
                    <tr key={u.email} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                      <td className="py-3 px-4 text-zinc-900 dark:text-zinc-100 font-bold flex items-center gap-2">
                        <span>{u.name}</span>
                        {isUserFounder && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-amber-950 font-black text-[9px] uppercase tracking-wider">
                            Fundador
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{u.email}</td>
                      <td className="py-3 px-4">
                        {isUserFounder ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-700 dark:text-amber-300 border border-amber-400/40 text-[10px] font-black">
                            ✦ Fundador VIP
                          </span>
                        ) : isUserVip ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 text-[10px] font-black shadow-xs">
                            ✦ Miembro VIP
                          </span>
                        ) : isUserPro ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300 text-[10px] font-bold">
                            {u.tier === 'pro_annual' ? 'Pro Anual' : 'Pro Mensual'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-[10px] font-bold">
                            Plan Gratuito
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isUserFounder ? (
                          <span className="text-[11px] text-zinc-400 italic">Inmutable</span>
                        ) : isUserVip ? (
                          <button
                            type="button"
                            onClick={() => handleRevokeVip(u.email)}
                            className="px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] font-bold transition-all"
                            title="Quitar rango VIP"
                          >
                            Revocar VIP
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleGrantVip(u.email)}
                            className="px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-500 text-amber-950 text-[11px] font-black transition-all shadow-xs flex items-center gap-1 ml-auto"
                            title="Asignar acceso total gratuito"
                          >
                            <Crown className="w-3 h-3" />
                            <span>Hacer VIP ✦</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions History Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h3 className="text-base font-extrabold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Historial de Pagos y Suscripciones Recibidas</span>
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Registro auditado de cobros simulados procesados
            </p>
          </div>
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-xl">
            {transactions.length} transacciones registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 uppercase text-[10px] font-black border-b border-zinc-200 dark:border-zinc-800">
              <tr>
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Usuario</th>
                <th className="py-3 px-4">Correo</th>
                <th className="py-3 px-4">Plan Adquirido</th>
                <th className="py-3 px-4">Monto</th>
                <th className="py-3 px-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 font-medium">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-zinc-400">
                    No hay transacciones registradas todavía.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-3 px-4 text-zinc-400 text-[11px]">
                      {new Date(tx.date).toLocaleDateString([], { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {tx.userName}
                    </td>
                    <td className="py-3 px-4">{tx.userEmail}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.plan === 'pro_annual'
                          ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-300'
                          : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                      }`}>
                        {tx.plan === 'pro_annual' ? 'Pro Anual ($94.999 ARS)' : 'Pro Mensual ($12.999 ARS)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-extrabold text-emerald-600 dark:text-emerald-400">
                      ${Number(tx.amount).toLocaleString('es-AR')} {tx.currency || 'ARS'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completado</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
