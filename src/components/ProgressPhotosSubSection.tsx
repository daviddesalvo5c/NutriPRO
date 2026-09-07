import React, { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Calendar, 
  Trash2, 
  Columns, 
  Eye, 
  Scale, 
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { ProgressPhotoEntry } from '../types';

interface ProgressPhotosSubSectionProps {
  photos: ProgressPhotoEntry[];
  onSavePhoto: (entry: ProgressPhotoEntry) => void;
  onDeletePhoto: (id: string) => void;
  currentWeightKg?: number;
}

export const ProgressPhotosSubSection: React.FC<ProgressPhotosSubSectionProps> = ({
  photos,
  onSavePhoto,
  onDeletePhoto,
  currentWeightKg,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [date, setDate] = useState(todayStr);
  const [tag, setTag] = useState<'front' | 'side' | 'back' | 'other'>('front');
  const [weightKg, setWeightKg] = useState<string>(currentWeightKg ? String(currentWeightKg) : '');
  const [notes, setNotes] = useState('');
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Comparator states
  const [comparatorBeforeId, setComparatorBeforeId] = useState<string>('');
  const [comparatorAfterId, setComparatorAfterId] = useState<string>('');

  const sorted = [...photos].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Default comparison to oldest vs newest if available
  const beforePhoto = photos.find((p) => p.id === comparatorBeforeId) || sorted[0];
  const afterPhoto = photos.find((p) => p.id === comparatorAfterId) || sorted[sorted.length - 1];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size < 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB para un óptimo almacenamiento en el navegador.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPreviewDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewDataUrl) return;

    setIsUploading(true);
    const newEntry: ProgressPhotoEntry = {
      id: `photo_${date}_${Date.now()}`,
      date,
      photoUrl: previewDataUrl,
      weightKg: weightKg ? parseFloat(weightKg) : undefined,
      tag,
      notes: notes.trim() || undefined,
    };

    onSavePhoto(newEntry);
    setIsUploading(false);
    setPreviewDataUrl(null);
    setNotes('');
    setShowUploadModal(false);
  };

  const tagLabels: Record<string, string> = {
    front: 'Frente',
    side: 'Perfil / Lateral',
    back: 'Espalda',
    other: 'Otro',
  };

  return (
    <div className="space-y-6" id="progress-photos-section">
      {/* Header & Upload Trigger */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-500" />
            Galería Privada de Evolución Física
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Tus fotos se almacenan de forma 100% privada y local en tu navegador para evaluar cambios visuales.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs"
          id="photo-btn-open-upload"
        >
          <Upload className="w-4 h-4" />
          <span>Subir Foto de Progreso</span>
        </button>
      </div>

      {/* Upload Modal Drawer */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Camera className="w-4 h-4 text-emerald-500" />
                Nueva Foto de Evolución
              </h4>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false);
                  setPreviewDataUrl(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Image Input */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  previewDataUrl 
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20' 
                    : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 bg-zinc-50 dark:bg-zinc-800/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />

                {previewDataUrl ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={previewDataUrl}
                      alt="Vista previa"
                      className="max-h-48 object-contain rounded-xl shadow-md border border-zinc-200 dark:border-zinc-700"
                    />
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      Toca para cambiar de imagen
                    </span>
                  </div>
                ) : (
                  <div className="py-6 flex flex-col items-center gap-2 text-zinc-500 dark:text-zinc-400">
                    <Upload className="w-8 h-8 text-emerald-500 stroke-[1.8]" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Haz clic para seleccionar o arrastra una foto aquí
                    </span>
                    <span className="text-[11px] text-zinc-400">JPG, PNG o WEBP (máx. 5MB)</span>
                  </div>
                )}
              </div>

              {/* Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    Fecha de la Foto
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    Ángulo / Pose
                  </label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value as any)}
                    className="w-full px-2.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="front">Frente</option>
                    <option value="side">Perfil / Lateral</option>
                    <option value="back">Espalda</option>
                    <option value="other">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                    Peso ese día (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="Ej: 74.2"
                    className="w-full px-2.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
                  Notas u Observaciones
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Semana 4 de definición, mejor tono en abdomen"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs text-zinc-500 hover:text-zinc-700 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!previewDataUrl || isUploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                >
                  {isUploading ? 'Guardando...' : 'Guardar Foto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparator Card (If 2 or more photos exist) */}
      {sorted.length >= 2 ? (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Columns className="w-4 h-4 text-emerald-500" />
              Comparador Visual "Antes vs Después"
            </h3>
            <span className="text-[11px] font-medium text-zinc-400">
              Selecciona dos fechas para comparar tu transformación
            </span>
          </div>

          {/* Selectors for comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                Foto "Antes" (Punto inicial)
              </label>
              <select
                value={beforePhoto?.id || ''}
                onChange={(e) => setComparatorBeforeId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              >
                {sorted.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.date} · {tagLabels[p.tag]} {p.weightKg ? `(${p.weightKg} kg)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-500 mb-1">
                Foto "Después" (Progreso reciente)
              </label>
              <select
                value={afterPhoto?.id || ''}
                onChange={(e) => setComparatorAfterId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              >
                {sorted.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.date} · {tagLabels[p.tag]} {p.weightKg ? `(${p.weightKg} kg)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Side by Side Display */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Before Box */}
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-3 bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 px-1">
                <span className="px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-[10px] uppercase font-bold">
                  Antes
                </span>
                <span>{beforePhoto?.date}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{beforePhoto?.weightKg ? `${beforePhoto.weightKg} kg` : ''}</span>
              </div>
              <div className="h-64 sm:h-80 w-full flex items-center justify-center bg-black/10 rounded-xl overflow-hidden">
                {beforePhoto ? (
                  <img
                    src={beforePhoto.photoUrl}
                    alt="Antes"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-zinc-400">Sin foto</span>
                )}
              </div>
              {beforePhoto?.notes && (
                <p className="text-[11px] text-zinc-500 italic mt-2 text-center">
                  "{beforePhoto.notes}"
                </p>
              )}
            </div>

            {/* After Box */}
            <div className="border border-emerald-300 dark:border-emerald-800/80 rounded-2xl p-3 bg-emerald-50/20 dark:bg-emerald-950/20 flex flex-col items-center">
              <div className="w-full flex items-center justify-between text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-2 px-1">
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] uppercase font-bold">
                  Después
                </span>
                <span>{afterPhoto?.date}</span>
                <span className="text-emerald-600 dark:text-emerald-400">{afterPhoto?.weightKg ? `${afterPhoto.weightKg} kg` : ''}</span>
              </div>
              <div className="h-64 sm:h-80 w-full flex items-center justify-center bg-black/10 rounded-xl overflow-hidden">
                {afterPhoto ? (
                  <img
                    src={afterPhoto.photoUrl}
                    alt="Después"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-zinc-400">Sin foto</span>
                )}
              </div>
              {afterPhoto?.notes && (
                <p className="text-[11px] text-zinc-500 italic mt-2 text-center">
                  "{afterPhoto.notes}"
                </p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Photo Gallery Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
          Todas las Fotos Guardadas ({photos.length})
        </h3>

        {photos.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center gap-2">
            <Camera className="w-10 h-10 stroke-[1.5] text-zinc-300 dark:text-zinc-700" />
            <p className="text-xs font-medium">Aún no has subido fotos de progreso.</p>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              + Subir la primera foto de tu punto de partida
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[...sorted].reverse().map((photo) => (
              <div
                key={photo.id}
                className="group relative bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="h-44 w-full bg-black/20 flex items-center justify-center overflow-hidden">
                  <img
                    src={photo.photoUrl}
                    alt={`Foto ${photo.date}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <div className="p-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-bold text-zinc-800 dark:text-zinc-200">
                      <span>{photo.date}</span>
                      <span className="text-emerald-600 dark:text-emerald-400">{photo.weightKg ? `${photo.weightKg} kg` : ''}</span>
                    </div>
                    <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded text-zinc-600 dark:text-zinc-300 font-semibold mt-1 inline-block">
                      {tagLabels[photo.tag]}
                    </span>
                    {photo.notes && (
                      <p className="text-[10px] text-zinc-500 truncate mt-1">
                        {photo.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-end pt-2 mt-1 border-t border-zinc-200/60 dark:border-zinc-700/60">
                    <button
                      type="button"
                      onClick={() => onDeletePhoto(photo.id)}
                      className="text-zinc-400 hover:text-rose-500 p-1 transition-colors"
                      title="Eliminar foto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
