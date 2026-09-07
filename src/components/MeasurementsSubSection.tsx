import React, { useState } from 'react';
import { Ruler, Plus, Calendar, Trash2, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { BodyMeasurementEntry } from '../types';

interface MeasurementsSubSectionProps {
  measurements: BodyMeasurementEntry[];
  onSaveMeasurement: (entry: BodyMeasurementEntry) => void;
  onDeleteMeasurement: (id: string) => void;
}

export const MeasurementsSubSection: React.FC<MeasurementsSubSectionProps> = ({
  measurements,
  onSaveMeasurement,
  onDeleteMeasurement,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState(todayStr);
  const [waist, setWaist] = useState('');
  const [hip, setHip] = useState('');
  const [chest, setChest] = useState('');
  const [arms, setArms] = useState('');
  const [thighs, setThighs] = useState('');
  const [notes, setNotes] = useState('');

  const sorted = [...measurements].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const initial = sorted[0];
  const latest = sorted[sorted.length - 1] || initial;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waist && !hip && !chest && !arms && !thighs) return;

    onSaveMeasurement({
      id: `m_${date}_${Date.now()}`,
      date,
      waistCm: waist ? parseFloat(waist) : undefined,
      hipCm: hip ? parseFloat(hip) : undefined,
      chestCm: chest ? parseFloat(chest) : undefined,
      armsCm: arms ? parseFloat(arms) : undefined,
      thighsCm: thighs ? parseFloat(thighs) : undefined,
      notes: notes.trim() || undefined,
    });

    setWaist('');
    setHip('');
    setChest('');
    setArms('');
    setThighs('');
    setNotes('');
    setShowAddForm(false);
  };

  const getDelta = (latestVal?: number, initialVal?: number) => {
    if (latestVal === undefined || initialVal === undefined) return null;
    return Number((latestVal - initialVal).toFixed(1));
  };

  const metrics = [
    { label: 'Cintura', current: latest?.waistCm, init: initial?.waistCm, unit: 'cm' },
    { label: 'Cadera', current: latest?.hipCm, init: initial?.hipCm, unit: 'cm' },
    { label: 'Pecho / Torso', current: latest?.chestCm, init: initial?.chestCm, unit: 'cm' },
    { label: 'Brazos', current: latest?.armsCm, init: initial?.armsCm, unit: 'cm' },
    { label: 'Muslos', current: latest?.thighsCm, init: initial?.thighsCm, unit: 'cm' },
  ];

  return (
    <div className="space-y-6" id="measurements-section">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {metrics.map((m, idx) => {
          const delta = getDelta(m.current, m.init);
          return (
            <div key={idx} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 rounded-2xl shadow-xs">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
                {m.label}
              </span>
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-zinc-50">
                  {m.current !== undefined ? m.current : '—'}
                </span>
                <span className="text-xs text-zinc-500 font-semibold">{m.unit}</span>
              </div>
              {delta !== null && (
                <div className="flex items-center gap-1 text-[11px] font-bold mt-1">
                  {delta < 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <TrendingDown className="w-3 h-3" /> {delta} cm
                    </span>
                  ) : delta > 0 ? (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" /> +{delta} cm
                    </span>
                  ) : (
                    <span className="text-zinc-400 flex items-center gap-0.5">
                      <Minus className="w-3 h-3" /> 0 cm
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Ruler className="w-4 h-4 text-emerald-500" />
              Perímetros Corporales y Composición
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Registra perímetros con cinta métrica para medir pérdida de grasa o hipertrofia
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddForm(!showAddForm)}
            className="py-2 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
            id="measurements-btn-add"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Medición</span>
          </button>
        </div>

        {/* Add Measurement Form */}
        {showAddForm && (
          <form onSubmit={handleSubmit} className="mb-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 space-y-3">
            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
              Anotar Perímetros (en cm)
            </h4>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Fecha
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Cintura (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={waist}
                  onChange={(e) => setWaist(e.target.value)}
                  placeholder="Ej: 82"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Cadera (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={hip}
                  onChange={(e) => setHip(e.target.value)}
                  placeholder="Ej: 96"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Pecho (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={chest}
                  onChange={(e) => setChest(e.target.value)}
                  placeholder="Ej: 101"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Brazo (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={arms}
                  onChange={(e) => setArms(e.target.value)}
                  placeholder="Ej: 35.5"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Muslo (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={thighs}
                  onChange={(e) => setThighs(e.target.value)}
                  placeholder="Ej: 56"
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                Notas / Referencia
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Medido al despertar con cinta flexible"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 font-medium"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Guardar Perímetros
              </button>
            </div>
          </form>
        )}

        {/* Table of Historic Measurements */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold">
                <th className="pb-2.5">Fecha</th>
                <th className="pb-2.5">Cintura</th>
                <th className="pb-2.5">Cadera</th>
                <th className="pb-2.5">Pecho</th>
                <th className="pb-2.5">Brazos</th>
                <th className="pb-2.5">Muslos</th>
                <th className="pb-2.5">Notas</th>
                <th className="pb-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {[...sorted].reverse().map((entry) => (
                <tr key={entry.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors">
                  <td className="py-2.5 font-medium text-zinc-800 dark:text-zinc-200">{entry.date}</td>
                  <td className="py-2.5 font-bold text-zinc-900 dark:text-zinc-100">{entry.waistCm ? `${entry.waistCm} cm` : '—'}</td>
                  <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{entry.hipCm ? `${entry.hipCm} cm` : '—'}</td>
                  <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{entry.chestCm ? `${entry.chestCm} cm` : '—'}</td>
                  <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{entry.armsCm ? `${entry.armsCm} cm` : '—'}</td>
                  <td className="py-2.5 text-zinc-700 dark:text-zinc-300">{entry.thighsCm ? `${entry.thighsCm} cm` : '—'}</td>
                  <td className="py-2.5 text-zinc-500 dark:text-zinc-400 italic">{entry.notes || '—'}</td>
                  <td className="py-2.5 text-right">
                    {sorted.length > 1 && (
                      <button
                        type="button"
                        onClick={() => onDeleteMeasurement(entry.id)}
                        className="text-zinc-400 hover:text-rose-500 p-1 transition-colors"
                        title="Eliminar registro"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
