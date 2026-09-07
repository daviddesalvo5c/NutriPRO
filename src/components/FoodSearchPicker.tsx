import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, AlertCircle, ExternalLink, Check } from 'lucide-react';

/**
 * Buscador de alimentos contra USDA FoodData Central.
 *
 * Resuelve el problema de tener que saberse los macros de memoria: se busca el
 * alimento, se indica cuánto se comió y los valores salen calculados de una
 * fuente oficial, con enlace a la ficha original de cada uno.
 */

interface Per100g {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sodium: number | null;
}

interface SearchResult {
  fdcId: number;
  name: string;
  dataType: string;
  category: string;
  per100g: Per100g;
  sourceUrl: string;
}

interface Source {
  name: string;
  organization: string;
  url: string;
}

export interface PickedFood {
  name: string;
  portionDescription: string;
  amountGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  sourceUrl: string;
}

interface Props {
  onPick: (food: PickedFood) => void;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export const FoodSearchPicker: React.FC<Props> = ({ onPick }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [source, setSource] = useState<Source | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [grams, setGrams] = useState<number>(100);

  const abortRef = useRef<AbortController | null>(null);

  // Búsqueda con rebote: no se dispara una petición por tecla.
  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`/api/foods-search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = await res.json();

        if (!res.ok) {
          setError(data?.error || 'No se pudo buscar el alimento.');
          setResults([]);
        } else {
          setResults(data.results || []);
          setSource(data.source || null);
          setError(data.results?.length ? null : 'Sin resultados. Prueba con otro nombre.');
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError('No se pudo contactar con la base de datos de alimentos.');
          setResults([]);
        }
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const confirmSelection = () => {
    if (!selected || !(grams > 0)) return;

    const factor = grams / 100;
    onPick({
      name: selected.name,
      portionDescription: `${grams} g`,
      amountGrams: grams,
      calories: Math.round(selected.per100g.calories * factor),
      protein: round1(selected.per100g.protein * factor),
      carbs: round1(selected.per100g.carbs * factor),
      fat: round1(selected.per100g.fat * factor),
      sourceUrl: selected.sourceUrl,
    });

    setSelected(null);
    setQuery('');
    setResults([]);
  };

  const factor = grams / 100;

  return (
    <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-3">
      <div>
        <label
          className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1"
          htmlFor="food-search-input"
        >
          Buscar en la base de datos nutricional
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
          <input
            id="food-search-input"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
            }}
            placeholder="Ej. huevo, pollo, arroz…"
            className="w-full pl-9 pr-9 py-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-600 animate-spin" />
          )}
        </div>
        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1">
          Así no hace falta que sepas los macros de memoria.
        </p>
      </div>

      {error && !selected && (
        <div className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados */}
      {!selected && results.length > 0 && (
        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
          {results.map((food) => (
            <button
              key={food.fdcId}
              type="button"
              onClick={() => {
                setSelected(food);
                setGrams(100);
              }}
              className="w-full text-left px-3 py-2 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-100 leading-snug">
                  {food.name}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">
                  {food.per100g.calories} kcal
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                <span>por 100 g</span>
                <span className="text-indigo-600 dark:text-indigo-400">P {food.per100g.protein}</span>
                <span className="text-amber-600 dark:text-amber-400">C {food.per100g.carbs}</span>
                <span className="text-rose-600 dark:text-rose-400">G {food.per100g.fat}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Cantidad del alimento elegido */}
      {selected && (
        <div className="rounded-lg bg-white dark:bg-zinc-800 border border-emerald-300 dark:border-emerald-700 p-3 space-y-3">
          <div>
            <p className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 leading-snug">
              {selected.name}
            </p>
            <a
              href={selected.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 hover:underline mt-0.5"
            >
              Ficha USDA #{selected.fdcId}
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label
                className="block text-[10px] font-bold text-zinc-600 dark:text-zinc-400 mb-1"
                htmlFor="food-grams"
              >
                ¿Cuánto comiste? (gramos)
              </label>
              <input
                id="food-grams"
                type="number"
                min={1}
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="w-full px-2.5 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={confirmSelection}
              disabled={!(grams > 0)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              Usar
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-center">
            {[
              ['kcal', Math.round(selected.per100g.calories * factor), 'text-emerald-700 dark:text-emerald-400'],
              ['P', round1(selected.per100g.protein * factor), 'text-indigo-600 dark:text-indigo-400'],
              ['C', round1(selected.per100g.carbs * factor), 'text-amber-600 dark:text-amber-400'],
              ['G', round1(selected.per100g.fat * factor), 'text-rose-600 dark:text-rose-400'],
            ].map(([label, value, cls]) => (
              <div key={String(label)} className="rounded-md bg-zinc-50 dark:bg-zinc-900 py-1.5">
                <p className={`text-xs font-extrabold ${cls}`}>{value}</p>
                <p className="text-[9px] text-zinc-500">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Atribución de la fuente */}
      <p className="text-[9.5px] text-zinc-500 dark:text-zinc-500 leading-relaxed border-t border-emerald-200/60 dark:border-emerald-900/60 pt-2">
        Valores de{' '}
        <a
          href={source?.url || 'https://fdc.nal.usda.gov/'}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
        >
          {source?.name || 'USDA FoodData Central'}
        </a>
        , {source?.organization || 'U.S. Department of Agriculture, Agricultural Research Service'}.
        Composición por 100 g; puede variar según marca, corte y método de cocción.
      </p>
    </div>
  );
};

export default FoodSearchPicker;
