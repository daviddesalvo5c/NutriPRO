import React, { useRef } from 'react';
import { FileText, Printer, Download, CheckCircle2, User, Activity, Calendar, ShieldCheck } from 'lucide-react';
import { UserProfile, DailyLog, WeightEntry, BodyMeasurementEntry } from '../types';
import { getProfileCalculations } from '../utils/nutritionCalculations';

interface NutritionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  dailyLogs: Record<string, DailyLog>;
  weightHistory: WeightEntry[];
  measurements: BodyMeasurementEntry[];
}

export const NutritionReportModal: React.FC<NutritionReportModalProps> = ({
  isOpen,
  onClose,
  profile,
  dailyLogs,
  weightHistory,
  measurements,
}) => {
  if (!isOpen) return null;

  const calcs = getProfileCalculations(profile);
  const printRef = useRef<HTMLDivElement>(null);

  const sortedWeights = [...weightHistory].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const initialWeight = sortedWeights[0]?.weightKg || profile.weightKg;
  const currentWeight = sortedWeights[sortedWeights.length - 1]?.weightKg || profile.weightKg;
  const weightChange = Number((currentWeight - initialWeight).toFixed(1));

  // Recent 7 days diary logs
  const logEntries: [string, DailyLog][] = (Object.entries(dailyLogs) as [string, DailyLog][])
    .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
    .slice(0, 7);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white text-zinc-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-auto border border-zinc-200">
        {/* Top Modal Controls (Hidden in Print) */}
        <div className="bg-zinc-900 text-white px-6 py-4 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm sm:text-base font-bold">
              Informe Nutricional y Clínico de Progreso
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Guardar en PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white text-sm font-bold"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div ref={printRef} className="p-8 sm:p-10 space-y-8 bg-white text-zinc-900" id="printable-nutrition-report">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b-2 border-zinc-900 pb-6 gap-4">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-widest text-emerald-700 block">
                NutriFit Pro · Expediente de Seguimiento
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight mt-1">
                Informe de Composición y Gasto Energético
              </h1>
              <p className="text-xs text-zinc-500 mt-1">
                Fecha de emisión: {new Date().toLocaleDateString('es-ES', { dateStyle: 'full' })}
              </p>
            </div>

            <div className="text-right sm:self-center bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
              <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider block">
                Paciente / Usuario
              </span>
              <span className="text-base font-black text-zinc-900 block">
                {profile.name}
              </span>
              <span className="text-xs text-zinc-600">
                {profile.age} años · {profile.gender === 'male' ? 'Hombre' : 'Mujer'} · {profile.heightCm} cm
              </span>
            </div>
          </div>

          {/* Biometrics & Metabolic Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Peso Actual</span>
              <span className="text-2xl font-black text-zinc-900 mt-1 block">{currentWeight} kg</span>
              <span className="text-[11px] text-zinc-500">
                Evolución: {weightChange > 0 ? `+${weightChange}` : weightChange} kg
              </span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Metabolismo Basal (BMR)</span>
              <span className="text-2xl font-black text-zinc-900 mt-1 block">{calcs.bmr} kcal</span>
              <span className="text-[11px] text-zinc-500">Fórmula: {profile.formula}</span>
            </div>

            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block">Gasto Total (TDEE)</span>
              <span className="text-2xl font-black text-amber-600 mt-1 block">{calcs.tdee} kcal</span>
              <span className="text-[11px] text-zinc-500">Actividad: {profile.activityLevel}</span>
            </div>

            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Meta Diaria</span>
              <span className="text-2xl font-black text-emerald-700 mt-1 block">{calcs.targetCalories} kcal</span>
              <span className="text-[11px] text-emerald-800 font-semibold capitalize">
                {profile.goal} ({profile.goalIntensity})
              </span>
            </div>
          </div>

          {/* Target Macronutrients Bar */}
          <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800">
              Distribución de Macronutrientes Prescrita
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-white border border-zinc-200 rounded-xl">
                <span className="text-[11px] font-bold text-emerald-700 block">Proteínas</span>
                <span className="text-xl font-black text-zinc-900">{calcs.proteinGrams}g</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">{calcs.proteinCalories} kcal ({calcs.proteinPercent}%)</span>
              </div>

              <div className="p-3 bg-white border border-zinc-200 rounded-xl">
                <span className="text-[11px] font-bold text-amber-700 block">Carbohidratos</span>
                <span className="text-xl font-black text-zinc-900">{calcs.carbsGrams}g</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">{calcs.carbsCalories} kcal ({calcs.carbsPercent}%)</span>
              </div>

              <div className="p-3 bg-white border border-zinc-200 rounded-xl">
                <span className="text-[11px] font-bold text-rose-700 block">Grasas</span>
                <span className="text-xl font-black text-zinc-900">{calcs.fatGrams}g</span>
                <span className="text-[10px] text-zinc-500 block mt-0.5">{calcs.fatCalories} kcal ({calcs.fatPercent}%)</span>
              </div>
            </div>
          </div>

          {/* Recent 7 Days Consumption Summary Table */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-2">
              Resumen de Consumo Alimentario Reciente (Últimos Días Registrados)
            </h3>
            <table className="w-full text-left text-xs border border-zinc-200 rounded-xl overflow-hidden">
              <thead className="bg-zinc-100 text-zinc-700 font-bold border-b border-zinc-200">
                <tr>
                  <th className="p-2.5">Fecha</th>
                  <th className="p-2.5">Calorías Totales</th>
                  <th className="p-2.5">Proteína (g)</th>
                  <th className="p-2.5">Carbos (g)</th>
                  <th className="p-2.5">Grasas (g)</th>
                  <th className="p-2.5">Agua (ml)</th>
                  <th className="p-2.5">Alimentos Reg.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {logEntries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-zinc-400">
                      Sin registros en el diario
                    </td>
                  </tr>
                ) : (
                  logEntries.map(([dateKey, log]) => {
                    const cals = log.items.reduce((a, i) => a + (i.calories || 0), 0);
                    const prot = log.items.reduce((a, i) => a + (i.proteinGrams || 0), 0);
                    const carb = log.items.reduce((a, i) => a + (i.carbsGrams || 0), 0);
                    const fat = log.items.reduce((a, i) => a + (i.fatGrams || 0), 0);
                    return (
                      <tr key={dateKey} className="hover:bg-zinc-50">
                        <td className="p-2.5 font-semibold text-zinc-900">{dateKey}</td>
                        <td className="p-2.5 font-bold text-emerald-700">{cals} kcal</td>
                        <td className="p-2.5">{prot}g</td>
                        <td className="p-2.5">{carb}g</td>
                        <td className="p-2.5">{fat}g</td>
                        <td className="p-2.5 font-medium text-cyan-700">{log.waterMl || 0} ml</td>
                        <td className="p-2.5 text-zinc-500">{log.items.length} ítems</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Clinical Sign-off / Notes */}
          <div className="pt-6 border-t border-zinc-200 flex flex-col sm:flex-row justify-between items-end gap-6 text-[11px] text-zinc-500">
            <div className="space-y-1">
              <p className="font-semibold text-zinc-700">Anotaciones del Profesional:</p>
              <p className="border-b border-dashed border-zinc-300 w-64 pb-4"> </p>
              <p className="border-b border-dashed border-zinc-300 w-64 pb-4"> </p>
            </div>

            <div className="text-right space-y-1">
              <div className="w-48 border-b border-zinc-400 pb-8 text-center text-zinc-400 italic">
                Firma / Sello
              </div>
              <p className="font-bold text-zinc-800">NutriFit Pro Health Engine</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
