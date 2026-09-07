import React, { useState } from 'react';
import { 
  Scale, 
  Plus, 
  TrendingDown, 
  TrendingUp, 
  Minus, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  Info,
  Award
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { WeightEntry, UserProfile } from '../types';

interface WeightTrackerSubSectionProps {
  profile: UserProfile;
  weightHistory: WeightEntry[];
  onSaveWeightEntry: (entry: WeightEntry) => void;
  onDeleteWeightEntry: (id: string) => void;
}

export const WeightTrackerSubSection: React.FC<WeightTrackerSubSectionProps> = ({
  profile,
  weightHistory,
  onSaveWeightEntry,
  onDeleteWeightEntry,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(todayStr);
  const [weightKg, setWeightKg] = useState<string>(profile.weightKg ? String(profile.weightKg) : '');
  const [note, setNote] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // Sort history chronologically for the graph
  const sortedEntries = [...weightHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const initialEntry = sortedEntries[0];
  const latestEntry = sortedEntries[sortedEntries.length - 1];

  const currentWeight = latestEntry ? latestEntry.weightKg : profile.weightKg;
  const initialWeight = initialEntry ? initialEntry.weightKg : profile.weightKg;
  const totalChangeKg = Number((currentWeight - initialWeight).toFixed(1));

  // Calculate 7-day recent average
  const last7DaysEntries = sortedEntries.slice(-7);
  const avgWeight7Days = last7DaysEntries.length > 0
    ? Number((last7DaysEntries.reduce((acc, curr) => acc + curr.weightKg, 0) / last7DaysEntries.length).toFixed(1))
    : currentWeight;

  // Chart data formatting
  const chartData = sortedEntries.map((item) => ({
    date: item.date.slice(5), // MM-DD
    fullDate: item.date,
    peso: item.weightKg,
    note: item.note,
  }));

  // Min and max for better Y-axis scale padding
  const weights = sortedEntries.map((e) => e.weightKg);
  const minW = Math.max(0, Math.floor(Math.min(...weights, profile.weightKg) - 2));
  const maxW = Math.ceil(Math.max(...weights, profile.weightKg) + 2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(weightKg);
    if (isNaN(val) || val <= 20 || val >= 350) return;

    onSaveWeightEntry({
      id: `w_${date}_${Date.now()}`,
      date,
      weightKg: Number(val.toFixed(1)),
      note: note.trim() || undefined,
    });

    setNote('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6" id="weight-tracker-section">
      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Peso Actual</span>
            <Scale className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {currentWeight}
            </span>
            <span className="text-xs font-semibold text-zinc-500">kg</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Último registro ({latestEntry ? latestEntry.date : 'hoy'})
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Cambio Total</span>
            {totalChangeKg < 0 ? (
              <TrendingDown className="w-4 h-4 text-emerald-500" />
            ) : totalChangeKg > 0 ? (
              <TrendingUp className="w-4 h-4 text-amber-500" />
            ) : (
              <Minus className="w-4 h-4 text-zinc-400" />
            )}
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`text-2xl sm:text-3xl font-black ${
              totalChangeKg < 0 
                ? 'text-emerald-600 dark:text-emerald-400' 
                : totalChangeKg > 0 
                ? 'text-amber-600 dark:text-amber-400' 
                : 'text-zinc-700 dark:text-zinc-300'
            }`}>
              {totalChangeKg > 0 ? `+${totalChangeKg}` : totalChangeKg}
            </span>
            <span className="text-xs font-semibold text-zinc-500">kg</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Desde el inicio ({initialWeight} kg)
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Promedio 7 Días</span>
            <Calendar className="w-4 h-4 text-blue-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-50">
              {avgWeight7Days}
            </span>
            <span className="text-xs font-semibold text-zinc-500">kg</span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Suaviza la retención de líquidos
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs">
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Objetivo Biológico</span>
            <Award className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-lg sm:text-xl font-bold text-zinc-900 dark:text-zinc-100 capitalize">
              {profile.goal === 'deficit' ? 'Pérdida Grasa' : profile.goal === 'surplus' ? 'Ganancia Masa' : 'Mantenimiento'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Ritmo: {profile.goalIntensity}
          </p>
        </div>
      </div>

      {/* Main Graph Card */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 sm:p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              Tendencia y Evolución Temporal
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Visualización continua de tu evolución de masa corporal
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            id="weight-btn-add-entry"
          >
            <Plus className="w-4 h-4" />
            <span>Anotar Peso</span>
          </button>
        </div>

        {/* Add Entry Form Drawer */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Registrar Nuevo Peso Corporal
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Peso (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="Ej: 74.5"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1">
                  Nota u Observación (Opcional)
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ej: En ayunas, tras cardio"
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Guardar Registro
              </button>
            </div>
          </form>
        )}

        {/* Chart */}
        <div className="h-64 sm:h-72 w-full pt-2">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-zinc-400">
              No hay suficientes registros de peso para generar el gráfico
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.25} />
                <XAxis 
                  dataKey="date" 
                  stroke="#9ca3af" 
                  fontSize={11} 
                  tickLine={false} 
                />
                <YAxis 
                  domain={[minW, maxW]} 
                  stroke="#9ca3af" 
                  fontSize={11} 
                  tickLine={false}
                  unit="kg"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-zinc-900 text-white p-2.5 rounded-xl border border-zinc-800 shadow-xl text-xs space-y-1">
                          <p className="text-zinc-400 font-medium">{data.fullDate}</p>
                          <p className="font-extrabold text-emerald-400 text-sm">
                            {data.peso} kg
                          </p>
                          {data.note && (
                            <p className="text-zinc-300 italic text-[11px] border-t border-zinc-800 pt-1 mt-1">
                              "{data.note}"
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={initialWeight} stroke="#6b7280" strokeDasharray="4 4" label={{ value: 'Inicio', fill: '#9ca3af', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="peso"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }}
                  activeDot={{ r: 6, fill: '#059669', stroke: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Historical Records Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-3">
          Historial de Anotaciones
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold">
                <th className="pb-2.5">Fecha</th>
                <th className="pb-2.5">Peso (kg)</th>
                <th className="pb-2.5">Diferencia</th>
                <th className="pb-2.5">Notas</th>
                <th className="pb-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[...sortedEntries].reverse().map((entry, index) => {
                const diff = Number((entry.weightKg - initialWeight).toFixed(1));
                return (
                  <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-2.5 font-medium text-zinc-800 dark:text-zinc-200">{entry.date}</td>
                    <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{entry.weightKg} kg</td>
                    <td className="py-2.5">
                      <span className={`font-semibold ${
                        diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : diff > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-400'
                      }`}>
                        {diff > 0 ? `+${diff}` : diff} kg
                      </span>
                    </td>
                    <td className="py-2.5 text-zinc-500 dark:text-zinc-400 italic">
                      {entry.note || '—'}
                    </td>
                    <td className="py-2.5 text-right">
                      {sortedEntries.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteWeightEntry(entry.id)}
                          className="text-zinc-400 hover:text-rose-500 p-1 transition-colors"
                          title="Eliminar anotación"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
