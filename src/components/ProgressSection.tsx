import React, { useState } from 'react';
import { 
  Flame, 
  TrendingDown, 
  TrendingUp, 
  Equal, 
  Activity, 
  Scale, 
  PieChart, 
  CheckCircle2, 
  Info,
  Calendar,
  Ruler,
  Camera,
  FileText
} from 'lucide-react';
import { DailyLog, UserProfile, WeightEntry, BodyMeasurementEntry, ProgressPhotoEntry } from '../types';
import { ACTIVITY_OPTIONS, getProfileCalculations } from '../utils/nutritionCalculations';
import { WeightTrackerSubSection } from './WeightTrackerSubSection';
import { MeasurementsSubSection } from './MeasurementsSubSection';
import { ProgressPhotosSubSection } from './ProgressPhotosSubSection';
import { NutritionReportModal } from './NutritionReportModal';

interface ProgressSectionProps {
  profile: UserProfile;
  dailyLogs: Record<string, DailyLog>;
  onOpenProfile: () => void;
  weightHistory: WeightEntry[];
  onSaveWeightEntry: (entry: WeightEntry) => void;
  onDeleteWeightEntry: (id: string) => void;
  measurements: BodyMeasurementEntry[];
  onSaveMeasurement: (entry: BodyMeasurementEntry) => void;
  onDeleteMeasurement: (id: string) => void;
  progressPhotos: ProgressPhotoEntry[];
  onSaveProgressPhoto: (entry: ProgressPhotoEntry) => void;
  onDeleteProgressPhoto: (id: string) => void;
}

export const ProgressSection: React.FC<ProgressSectionProps> = ({
  profile,
  dailyLogs,
  onOpenProfile,
  weightHistory,
  onSaveWeightEntry,
  onDeleteWeightEntry,
  measurements,
  onSaveMeasurement,
  onDeleteMeasurement,
  progressPhotos,
  onSaveProgressPhoto,
  onDeleteProgressPhoto,
}) => {
  const [activeTab, setActiveTab] = useState<'weight' | 'measurements' | 'photos' | 'metabolism'>('weight');
  const [showReportModal, setShowReportModal] = useState(false);

  const calcs = getProfileCalculations(profile);

  // Projected weekly progress
  const weeklyDeficitOrSurplus = calcs.calorieAdjustment * 7;
  const estimatedWeeklyWeightChangeKg = Number((weeklyDeficitOrSurplus / 7700).toFixed(2));
  const activityObj = ACTIVITY_OPTIONS.find((a) => a.id === profile.activityLevel) || ACTIVITY_OPTIONS[0];

  return (
    <div className="space-y-6 pb-12" id="progress-screen">
      {/* Header with Navigation and PDF Export */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
              <Activity className="w-4 h-4" />
              Seguimiento de Progreso & Métricas
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              Evolución Corporal, Peso & Metabolismo
            </h1>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Monitorea cambios de peso, perímetros anatómicos, fotos y gasto energético
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReportModal(true)}
              className="text-xs font-bold px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
              id="progress-btn-export-pdf"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Exportar Informe PDF</span>
            </button>
          </div>
        </div>

        {/* Sub Navigation Bar */}
        <div className="flex flex-wrap items-center gap-2 mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={() => setActiveTab('weight')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'weight'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Registro de Peso</span>
          </button>

          <button
            onClick={() => setActiveTab('measurements')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'measurements'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>Medidas Corporales</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'photos'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Fotos Antes / Después</span>
          </button>

          <button
            onClick={() => setActiveTab('metabolism')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'metabolism'
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Metabolismo & Gasto</span>
          </button>
        </div>
      </div>

      {/* 1. Weight Tracker Tab */}
      {activeTab === 'weight' && (
        <WeightTrackerSubSection
          profile={profile}
          weightHistory={weightHistory}
          onSaveWeightEntry={onSaveWeightEntry}
          onDeleteWeightEntry={onDeleteWeightEntry}
        />
      )}

      {/* 2. Measurements Tab */}
      {activeTab === 'measurements' && (
        <MeasurementsSubSection
          measurements={measurements}
          onSaveMeasurement={onSaveMeasurement}
          onDeleteMeasurement={onDeleteMeasurement}
        />
      )}

      {/* 3. Photos Tab */}
      {activeTab === 'photos' && (
        <ProgressPhotosSubSection
          photos={progressPhotos}
          onSavePhoto={onSaveProgressPhoto}
          onDeletePhoto={onDeleteProgressPhoto}
          currentWeightKg={weightHistory[weightHistory.length - 1]?.weightKg || profile.weightKg}
        />
      )}

      {/* 4. Metabolism Breakdown Tab */}
      {activeTab === 'metabolism' && (
        <div className="space-y-6">
          {/* 3 Metric Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* BMR Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <span className="font-semibold uppercase tracking-wider">1. Gasto Basal (BMR)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800">
                  {profile.formula === 'mifflin' ? 'Mifflin-St Jeor' : 'Harris-Benedict'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-zinc-900 dark:text-zinc-100">
                  {calcs.bmr.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500">kcal / día</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Energía mínima vital que tus órganos requieren solo para mantenerse vivos en reposo 24h.
              </p>
            </div>

            {/* TDEE Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <span className="font-semibold uppercase tracking-wider">2. Gasto Diario (TDEE)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Factor x{activityObj.factor}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                  {calcs.tdee.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500">kcal / día</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                Suma de tu BMR + termogénesis de los alimentos (TEF) + actividad física ({activityObj.name.toLowerCase()}).
              </p>
            </div>

            {/* Target Calories Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs">
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <span className="font-semibold uppercase tracking-wider">3. Meta Diaria Final</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {profile.goal === 'deficit' ? 'Déficit' : profile.goal === 'surplus' ? 'Superávit' : 'Mantenimiento'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-2">
                <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {calcs.targetCalories.toLocaleString()}
                </span>
                <span className="text-xs text-zinc-500">kcal / día</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                {profile.goal === 'deficit'
                  ? `Ajuste de ${calcs.calorieAdjustment} kcal diarias por debajo de tu mantenimiento.`
                  : profile.goal === 'surplus'
                  ? `Ajuste de +${calcs.calorieAdjustment} kcal diarias sobre tu mantenimiento.`
                  : 'Consumo neutro igual a tu TDEE estimado.'}
              </p>
            </div>
          </div>

          {/* Projection & Science Explanation */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-2xl shadow-xs">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              Estimación de Progresión Fisiológica
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-1">
                    Balance energético acumulado semanal:
                  </span>
                  <span className="text-2xl font-black text-zinc-800 dark:text-zinc-200">
                    {weeklyDeficitOrSurplus > 0 ? `+${weeklyDeficitOrSurplus}` : weeklyDeficitOrSurplus} kcal / semana
                  </span>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
                    Equivalente aproximado a un cambio estimado de{' '}
                    <strong className={estimatedWeeklyWeightChangeKg < 0 ? 'text-emerald-600' : 'text-amber-600'}>
                      {estimatedWeeklyWeightChangeKg > 0 ? `+${estimatedWeeklyWeightChangeKg}` : estimatedWeeklyWeightChangeKg} kg
                    </strong>{' '}
                    de peso corporal a la semana manteniendo el cumplimiento del diario.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-800/40">
                  <h3 className="text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Seguridad Metabólica Verificada
                  </h3>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
                    Tu meta calórica está establecida de forma segura por encima de tu umbral crítico saludable, 
                    garantizando una densidad de micronutrientes y preservación de tejido muscular activo.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
                  <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block mb-2">
                    Aporte calórico por macronutriente:
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        Proteínas ({calcs.proteinGrams}g):
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {calcs.proteinCalories} kcal ({calcs.proteinPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        Carbohidratos ({calcs.carbsGrams}g):
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {calcs.carbsCalories} kcal ({calcs.carbsPercent}%)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        Grasas ({calcs.fatGrams}g):
                      </span>
                      <span className="font-bold text-zinc-900 dark:text-zinc-100">
                        {calcs.fatCalories} kcal ({calcs.fatPercent}%)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-zinc-100/60 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-xs text-zinc-600 dark:text-zinc-400">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block mb-1">
                    ¿Cuándo recalcular mi perfil?
                  </span>
                  Te recomendamos actualizar tu peso en el perfil cada 2-4 semanas o si tu nivel de actividad física semanal cambia.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export Modal */}
      <NutritionReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        profile={profile}
        dailyLogs={dailyLogs}
        weightHistory={weightHistory}
        measurements={measurements}
      />
    </div>
  );
};
