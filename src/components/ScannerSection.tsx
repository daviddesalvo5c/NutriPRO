import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Scan, 
  Sparkles, 
  RotateCcw, 
  CheckCircle2, 
  Flame, 
  Zap, 
  Check, 
  RefreshCw, 
  AlertCircle,
  SwitchCamera,
  Layers,
  Info,
  Sliders,
  ChevronRight,
  FileImage,
  Lock,
  Crown,
  Barcode,
  Search,
  Cookie,
  Package
} from 'lucide-react';
import { FoodItem, MealType, SubscriptionTier } from '../types';
import { canUserPerformAiScan, incrementTodayAiScansCount, hasUserProAccess } from '../utils/storage';
import { downscaleImage } from '../utils/image';
import { 
  detectBarcodeFromImage, 
  fetchProductFromOpenFoodFacts, 
  analyzePackageWithAI, 
  calculatePortionFromProduct, 
  PackageProductResult 
} from '../services/barcodeService';
import { formatGrams, roundGrams } from '../utils/nutritionCalculations';
import { ARGENTINE_FOOD_DATABASE } from '../data/argentineFoodDatabase';
import { saveFoodToUserLibrary } from '../utils/userFoodsStorage';

interface ScannerSectionProps {
  onAddFoodToDiary: (item: Omit<FoodItem, 'id'>, mealType: MealType) => void;
  onNavigateToDiary: () => void;
  userEmail?: string;
  currentTier?: SubscriptionTier;
  onOpenPlansModal?: () => void;
}

interface AnalysisResult {
  name: string;
  category: string;
  weightGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  observation?: string;
  ingredients: { name: string; amount: string }[];
}

export const ScannerSection: React.FC<ScannerSectionProps> = ({
  onAddFoodToDiary,
  onNavigateToDiary,
  userEmail = '',
  currentTier = 'free' as SubscriptionTier,
  onOpenPlansModal,
}) => {
  // Quota state
  const scanQuota = canUserPerformAiScan(userEmail, currentTier);
  const isProOrVip = hasUserProAccess(userEmail, currentTier);

  // Stages: 'viewfinder' | 'analyzing' | 'result'
  const [stage, setStage] = useState<'viewfinder' | 'analyzing' | 'error' | 'result'>('viewfinder');

  // Scanner Mode: 'plate' (foto de plato con IA) vs 'barcode' (código de barras y paquetes/galletitas)
  const [scanMode, setScanMode] = useState<'plate' | 'barcode'>('plate');
  const [packageResult, setPackageResult] = useState<PackageProductResult | null>(null);
  const [cookieUnitCount, setCookieUnitCount] = useState<number>(4);
  const [manualBarcodeInput, setManualBarcodeInput] = useState<string>('');
  const [isBarcodeSearching, setIsBarcodeSearching] = useState<boolean>(false);

  // Camera & Device states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [streamActive, setStreamActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [flashEffect, setFlashEffect] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<'1x' | '2x'>('1x');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // Analysis states
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<string>('Iniciando escaneo visual...');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Result states
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [editableDishName, setEditableDishName] = useState<string>('');
  const [portionMultiplier, setPortionMultiplier] = useState<number>(1.0);
  const [selectedMeal, setSelectedMeal] = useState<MealType>('lunch');
  const [splitIngredients, setSplitIngredients] = useState<boolean>(false);

  // User contextual hints to guarantee 100% accuracy on the FIRST photo
  const [userHint, setUserHint] = useState<string>('');
  const [showHintBar, setShowHintBar] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [refineText, setRefineText] = useState<string>('');
  const [isStabilizing, setIsStabilizing] = useState<boolean>(false);

  // Start real camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('La API de cámara no está disponible en este entorno.');
      }

      // Stop any existing stream
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setStreamActive(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Permiso de cámara denegado. Puedes permitir el acceso o subir una foto desde la galería.'
          : 'No se pudo activar la cámara en este dispositivo. Puedes seleccionar una foto de tu galería.'
      );
    }
  }, [facingMode]);

  // Handle camera activation / cleanup
  useEffect(() => {
    let currentStream: MediaStream | null = null;

    if (stage === 'viewfinder') {
      startCamera();
    }

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        currentStream = videoRef.current.srcObject as MediaStream;
        currentStream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
        setStreamActive(false);
      }
    };
  }, [stage, startCamera]);

  // Toggle camera direction (front / rear)
  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Process captured image through visual AI analysis
  const processImage = async (base64Image: string, customHint?: string) => {
    // Check scan limits for Free users
    const currentQuota = canUserPerformAiScan(userEmail, currentTier);
    if (!currentQuota.allowed) {
      if (onOpenPlansModal) {
        onOpenPlansModal();
      }
      return;
    }

    setCapturedImage(base64Image);
    setStage('analyzing');
    setAnalysisError(null);
    setAnalysisStatus('Calibrando nitidez, vajilla y encuadre visual...');

    const activeHint = customHint !== undefined ? customHint : userHint;

    // Progress updates for a responsive visual feel
    const timer1 = setTimeout(() => {
      setAnalysisStatus('Identificando ingredientes y porciones reales...');
    }, 800);

    const timer2 = setTimeout(() => {
      setAnalysisStatus('Calculando macronutrientes y balance Atwater...');
    }, 1600);

    try {
      // Se reduce antes de enviar manteniendo alta resolución para ver texturas
      const compact = await downscaleImage(base64Image);

      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: compact,
          userHint: activeHint.trim() || undefined,
        }),
      });

      if (!response.ok) {
        // El servidor manda { error, code } cuando puede; si no, queda el estado.
        const detail = await response.json().catch(() => null);
        throw new Error(detail?.error || `El servidor respondió con un error (${response.status}).`);
      }

      const data: AnalysisResult = await response.json();
      setResult(data);
      setEditableDishName(data.name || 'Plato Detectado');
      setPortionMultiplier(1.0);
      setStage('result');
      setIsRefining(false);
      setRefineText('');

      // Increment daily scan count for Free users
      if (!isProOrVip && userEmail) {
        incrementTodayAiScansCount(userEmail);
      }
    } catch (err: any) {
      // Nunca se inventa un resultado: un plato ficticio acabaría en el diario
      // del usuario falseando su balance sin que pueda darse cuenta.
      console.error('Analysis failed:', err);
      setAnalysisError(
        err?.message || 'No se pudo analizar la foto. Revisa tu conexión e inténtalo de nuevo.'
      );
      setStage('error');
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
    }
  };

  // Process captured image for barcode & package analysis
  const processBarcodeImage = async (base64Image: string) => {
    // Check scan limits for Free users
    const currentQuota = canUserPerformAiScan(userEmail, currentTier);
    if (!currentQuota.allowed) {
      if (onOpenPlansModal) onOpenPlansModal();
      return;
    }

    setCapturedImage(base64Image);
    setStage('analyzing');
    setAnalysisError(null);
    setAnalysisStatus('Buscando código de barras en el paquete...');

    try {
      // 1. Crear un elemento de imagen temporal para intentar decodificar código de barras
      const img = new Image();
      img.src = base64Image;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      const detectedBarcode = await detectBarcodeFromImage(img);

      if (detectedBarcode) {
        setAnalysisStatus(`Código de barras detectado (${detectedBarcode}). Buscando datos en Open Food Facts...`);
        const offProduct = await fetchProductFromOpenFoodFacts(detectedBarcode);
        if (offProduct) {
          setPackageResult(offProduct);
          setCookieUnitCount(4);
          setStage('result');
          if (!isProOrVip && userEmail) incrementTodayAiScansCount(userEmail);
          return;
        }
      }

      // 2. Si no hay código en la base internacional o en la foto, analizar paquete y tabla nutricional con IA
      setAnalysisStatus('Analizando tabla nutricional, porciones y unidades del paquete con IA...');
      const compact = await downscaleImage(base64Image);
      const aiProduct = await analyzePackageWithAI({
        image: compact,
        barcode: detectedBarcode || undefined,
      });

      setPackageResult(aiProduct);
      setCookieUnitCount(4);
      setStage('result');

      if (!isProOrVip && userEmail) {
        incrementTodayAiScansCount(userEmail);
      }
    } catch (err: any) {
      console.error('Package barcode analysis failed:', err);
      setAnalysisError(
        err?.message || 'No se pudo leer el código o identificar el paquete. Puedes buscarlo por nombre o número de barras.'
      );
      setStage('error');
    }
  };

  // Manual search or barcode input lookup
  const handleManualSearch = async (queryParam?: string) => {
    const query = (queryParam || manualBarcodeInput).trim();
    if (!query) return;

    setIsBarcodeSearching(true);
    setAnalysisError(null);

    try {
      // Si es un código numérico (ej: 7790040133036)
      if (/^\d{6,14}$/.test(query)) {
        const off = await fetchProductFromOpenFoodFacts(query);
        if (off) {
          setPackageResult(off);
          setCookieUnitCount(4);
          setStage('result');
          setIsBarcodeSearching(false);
          return;
        }
      }

      // Buscar en base local argentina
      const qLower = query.toLowerCase();
      const localMatch = ARGENTINE_FOOD_DATABASE.find(
        (f) =>
          f.name.toLowerCase().includes(qLower) ||
          f.tags.some((t) => t.toLowerCase().includes(qLower))
      );

      if (localMatch) {
        const unitName = localMatch.unitName.includes('gallet')
          ? 'galletitas'
          : localMatch.unitName.includes('alfajor')
          ? 'alfajores'
          : localMatch.unitName.includes('barrita')
          ? 'barritas'
          : 'unidades';
        const gramsPerUnit = localMatch.gramsPerUnit || 10;
        const calsPerUnit = Math.round((localMatch.per100g.calories * gramsPerUnit) / 100);
        const protPerUnit = Number(((localMatch.per100g.protein * gramsPerUnit) / 100).toFixed(2));
        const carbsPerUnit = Number(((localMatch.per100g.carbs * gramsPerUnit) / 100).toFixed(2));
        const fatPerUnit = Number(((localMatch.per100g.fat * gramsPerUnit) / 100).toFixed(2));

        const pkg: PackageProductResult = {
          productName: localMatch.name,
          brand: 'Base de Alimentos',
          unitName,
          unitsPerServing: localMatch.defaultUnitCount || 3,
          gramsPerUnit,
          caloriesPerUnit: calsPerUnit,
          proteinPerUnit: protPerUnit,
          carbsPerUnit: carbsPerUnit,
          fatPerUnit: fatPerUnit,
          caloriesPer100g: localMatch.per100g.calories,
          proteinPer100g: localMatch.per100g.protein,
          carbsPer100g: localMatch.per100g.carbs,
          fatPer100g: localMatch.per100g.fat,
          servingLabel: `Porción estimada: ${localMatch.gramsPerUnit * (localMatch.defaultUnitCount || 1)}g`,
          confidence: 98,
          notes: 'Datos validados de composición nutricional argentina.',
          source: 'database',
        };

        setPackageResult(pkg);
        setCookieUnitCount(4);
        setStage('result');
        setIsBarcodeSearching(false);
        return;
      }

      // Fallback a análisis IA por texto/nombre del paquete
      const aiPkg = await analyzePackageWithAI({ productHint: query });
      setPackageResult(aiPkg);
      setCookieUnitCount(4);
      setStage('result');
    } catch (err: any) {
      console.warn('Manual search error:', err);
      alert(err.message || 'No se encontró el producto. Prueba con otro nombre o código.');
    } finally {
      setIsBarcodeSearching(false);
    }
  };

  // Confirm and save package portion to diary
  const handleConfirmPackagePortion = () => {
    if (!packageResult) return;
    const calc = calculatePortionFromProduct(packageResult, cookieUnitCount);

    const foodItem: Omit<FoodItem, 'id'> = {
      name: `${packageResult.productName} (${packageResult.brand})`,
      portionDescription: `${calc.unitCount} ${calc.unitName} (${formatGrams(calc.totalGrams)}g)`,
      amountGrams: roundGrams(calc.totalGrams),
      calories: calc.calories,
      proteinGrams: calc.proteinGrams,
      carbsGrams: calc.carbsGrams,
      fatGrams: calc.fatGrams,
      mealType: selectedMeal,
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Auto-register into user's saved foods library so it can be repeated or edited anytime
    saveFoodToUserLibrary(
      {
        name: `${packageResult.productName} (${packageResult.brand})`,
        category: 'Código de barras',
        amountGrams: roundGrams(calc.totalGrams),
        portionDescription: `${calc.unitCount} ${calc.unitName} (${formatGrams(calc.totalGrams)}g)`,
        calories: calc.calories,
        proteinGrams: calc.proteinGrams,
        carbsGrams: calc.carbsGrams,
        fatGrams: calc.fatGrams,
        source: 'barcode',
      },
      userEmail
    );

    onAddFoodToDiary(foodItem, selectedMeal);
    onNavigateToDiary();
  };

  // Shutter button capture from camera video stream
  const handleCaptureShutter = async () => {
    if (!videoRef.current || !streamActive) {
      // If stream not active, trigger file upload
      fileInputRef.current?.click();
      return;
    }

    setIsStabilizing(true);

    // Haptic feedback if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate?.([30, 20, 50]);
      } catch {}
    }

    // Micro stabilization delay (80ms) to ensure lens is not moving from finger press
    await new Promise((resolve) => setTimeout(resolve, 80));

    setFlashEffect(true);
    setTimeout(() => setFlashEffect(false), 200);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context available');

      // Draw current video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.88);

      setIsStabilizing(false);

      if (scanMode === 'barcode') {
        processBarcodeImage(dataUrl);
      } else {
        processImage(dataUrl);
      }
    } catch (err) {
      setIsStabilizing(false);
      console.error('Shutter capture failed:', err);
      fileInputRef.current?.click();
    }
  };

  // File picker handler (gallery or camera roll)
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (scanMode === 'barcode') {
        processBarcodeImage(dataUrl);
      } else {
        processImage(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = '';
  };

  // Drag and Drop handlers
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        if (scanMode === 'barcode') {
          processBarcodeImage(dataUrl);
        } else {
          processImage(dataUrl);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Confirm and save to diary
  const handleConfirmAndSave = () => {
    if (!result) return;

    const scaledCalories = Math.round(result.calories * portionMultiplier);
    const scaledProtein = roundGrams(result.protein * portionMultiplier);
    const scaledCarbs = roundGrams(result.carbs * portionMultiplier);
    const scaledFat = roundGrams(result.fat * portionMultiplier);
    const scaledWeight = roundGrams(result.weightGrams * portionMultiplier);

    const foodItem: Omit<FoodItem, 'id'> = {
      name: editableDishName.trim() || result.name,
      portionDescription: `Escáner IA (${formatGrams(scaledWeight)}g · ${result.category})`,
      amountGrams: scaledWeight,
      calories: scaledCalories,
      proteinGrams: scaledProtein,
      carbsGrams: scaledCarbs,
      fatGrams: scaledFat,
      mealType: selectedMeal,
      timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Auto-save the whole scanned dish to user's permanent library
    const numIngredients = result.ingredients && result.ingredients.length > 0 ? result.ingredients.length : 1;
    const components = result.ingredients?.map((ing) => ({
      name: ing.name,
      amountGrams: Math.round(scaledWeight / numIngredients),
      calories: Math.round(scaledCalories / numIngredients),
      proteinGrams: roundGrams(scaledProtein / numIngredients),
      carbsGrams: roundGrams(scaledCarbs / numIngredients),
      fatGrams: roundGrams(scaledFat / numIngredients),
    })) || [];

    // 1. Guardar plato completo en la biblioteca permanente
    saveFoodToUserLibrary(
      {
        name: editableDishName.trim() || result.name,
        category: result.category || 'Escáner IA',
        amountGrams: scaledWeight,
        portionDescription: `Escáner IA (${formatGrams(scaledWeight)}g)`,
        calories: scaledCalories,
        proteinGrams: scaledProtein,
        carbsGrams: scaledCarbs,
        fatGrams: scaledFat,
        components,
        source: 'ai_scan',
      },
      userEmail
    );

    // 2. Guardar cada ingrediente individual en la biblioteca permanente (ej. Bife, Pastas)
    // para que el usuario pueda volver a buscarlos, sumarlos o editarlos independientemente
    if (result.ingredients && result.ingredients.length > 0) {
      result.ingredients.forEach((ing) => {
        const compGrams = Math.round(scaledWeight / numIngredients);
        const compCals = Math.round(scaledCalories / numIngredients);
        const compProt = roundGrams(scaledProtein / numIngredients);
        const compCarbs = roundGrams(scaledCarbs / numIngredients);
        const compFat = roundGrams(scaledFat / numIngredients);

        saveFoodToUserLibrary(
          {
            name: ing.name,
            category: result.category || 'Ingrediente Escaneado',
            amountGrams: compGrams,
            portionDescription: `${ing.amount || `${compGrams}g`} (de ${editableDishName.trim() || result.name})`,
            calories: compCals,
            proteinGrams: compProt,
            carbsGrams: compCarbs,
            fatGrams: compFat,
            source: 'ai_scan',
          },
          userEmail
        );
      });
    }

    // 3. Añadir al Diario: desglosado o combinado
    if (splitIngredients && result.ingredients && result.ingredients.length > 1) {
      result.ingredients.forEach((ing) => {
        const compGrams = Math.round(scaledWeight / numIngredients);
        const compCals = Math.round(scaledCalories / numIngredients);
        const compProt = roundGrams(scaledProtein / numIngredients);
        const compCarbs = roundGrams(scaledCarbs / numIngredients);
        const compFat = roundGrams(scaledFat / numIngredients);

        onAddFoodToDiary(
          {
            name: ing.name,
            portionDescription: `${ing.amount || `${compGrams}g`} (${editableDishName.trim() || result.name})`,
            amountGrams: compGrams,
            calories: compCals,
            proteinGrams: compProt,
            carbsGrams: compCarbs,
            fatGrams: compFat,
            mealType: selectedMeal,
            timeAdded: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
          selectedMeal
        );
      });
    } else {
      onAddFoodToDiary(foodItem, selectedMeal);
    }

    onNavigateToDiary();
  };

  // Reset to viewfinder for new capture
  const handleReset = () => {
    setCapturedImage(null);
    setResult(null);
    setPackageResult(null);
    setAnalysisError(null);
    setStage('viewfinder');
  };

  // Retry the analysis with the same photo, sin volver a sacarla
  const handleRetryAnalysis = () => {
    if (capturedImage) {
      if (scanMode === 'barcode' || packageResult) {
        processBarcodeImage(capturedImage);
      } else {
        processImage(capturedImage);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto" id="scanner-section-container">
      {/* Hidden file input for gallery upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInput}
        accept="image/*"
        capture={undefined}
        className="hidden"
        id="camera-gallery-hidden-input"
      />

      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-0.5">
            <Camera className="w-4 h-4" />
            Visor Fotográfico Real con IA
          </div>
          <h1 className="text-xl font-black text-zinc-900 dark:text-zinc-50">
            Escáner Nutricional de Platos
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Toma una fotografía con tu cámara o selecciona una de tu galería para identificar el plato y sus macronutrientes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quota Badge */}
          {isProOrVip ? (
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold border border-emerald-300 dark:border-emerald-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Escáner IA Ilimitado ✦</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onOpenPlansModal}
              className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all ${
                scanQuota.remaining === 0
                  ? 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 animate-pulse'
                  : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 hover:bg-amber-100'
              }`}
              title="Haz clic para ver planes y obtener escaneos ilimitados"
            >
              <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
              <span>
                {scanQuota.remaining === 0
                  ? 'Límite alcanzado (0/3 hoy)'
                  : `${scanQuota.remaining}/3 escaneos libres hoy`}
              </span>
            </button>
          )}

          {stage === 'result' && (
            <button
              type="button"
              id="scanner-btn-reset-top"
              onClick={handleReset}
              className="text-xs font-bold px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Escanear otra foto
            </button>
          )}
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="flex p-1.5 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 max-w-lg mx-auto shadow-xs">
        <button
          type="button"
          id="tab-scanner-mode-plate"
          onClick={() => {
            setScanMode('plate');
            if (stage === 'result' && packageResult) {
              setPackageResult(null);
              setStage('viewfinder');
            }
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            scanMode === 'plate'
              ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Plato de Comida (IA)</span>
        </button>

        <button
          type="button"
          id="tab-scanner-mode-barcode"
          onClick={() => {
            setScanMode('barcode');
            if (stage === 'result' && result) {
              setResult(null);
              setStage('viewfinder');
            }
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            scanMode === 'barcode'
              ? 'bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Barcode className="w-4 h-4" />
          <span>Código de Barras y Paquetes</span>
        </button>
      </div>

      {/* Free tier limit reached banner */}
      {!isProOrVip && !scanQuota.allowed && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-amber-500/15 border border-amber-400/50 dark:border-amber-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold shrink-0 shadow-sm">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base text-zinc-900 dark:text-zinc-100">
                Has alcanzado el límite diario de 3 escaneos con IA
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                El Plan Gratuito incluye 3 escaneos diarios. Pasa a NutriFit Pro para escanear ilimitadamente y desbloquear el generador de menús.
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-scanner-upgrade-pro"
            onClick={onOpenPlansModal}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black shadow-md shrink-0 flex items-center gap-1.5 transition-transform hover:scale-105"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>Actualizar a Pro ($12.999 ARS/mes)</span>
          </button>
        </div>
      )}

      {/* STAGE 1: Live Camera Viewfinder & Image Selector */}
      {stage === 'viewfinder' && (
        <div className="space-y-6">
          <div 
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative bg-zinc-950 rounded-3xl overflow-hidden shadow-2xl border-4 transition-colors aspect-[4/3] sm:aspect-[16/10] flex items-center justify-center ${
              isDragOver ? 'border-emerald-400 bg-zinc-900' : 'border-zinc-800'
            }`}
          >
            {/* White Flash Effect on Shutter */}
            {flashEffect && (
              <div className="absolute inset-0 bg-white z-50 animate-out fade-out duration-200 pointer-events-none" />
            )}

            {/* Video Feed (Real Camera) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transition-transform duration-300 ${
                streamActive ? 'opacity-100' : 'opacity-0 hidden'
              } ${zoomLevel === '2x' ? 'scale-125' : 'scale-100'} ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Fallback View when camera is loading or permission not granted */}
            {!streamActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-zinc-900/90 backdrop-blur-xs text-white z-10">
                <div className="w-16 h-16 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-4 text-emerald-400 shadow-inner">
                  <Camera className="w-8 h-8 stroke-[1.8]" />
                </div>
                <h3 className="text-base font-bold text-zinc-100 mb-1">
                  {cameraError ? 'Cámara no disponible' : 'Iniciando cámara...'}
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm mb-5">
                  {cameraError || 'Permite el acceso a la cámara en tu navegador o selecciona directamente una foto de tu plato desde la galería.'}
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button
                    type="button"
                    id="btn-scanner-select-file"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar Foto de la Galería
                  </button>

                  <button
                    type="button"
                    onClick={startCamera}
                    className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs rounded-xl border border-zinc-700 flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Reintentar Cámara
                  </button>
                </div>
              </div>
            )}

            {/* Overlays on Active Camera */}
            {streamActive && (
              <>
                {/* Rule of Thirds Grid Overlay */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-r border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-r border-white" />
                  <div className="border-r border-white" />
                  <div />
                </div>

                {/* Laser Scanning Line Animation */}
                <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce pointer-events-none top-1/3 opacity-80" />

                {/* Viewfinder Focus Frame (HUD Corners) */}
                <div className="absolute inset-8 sm:inset-14 pointer-events-none flex flex-col justify-between">
                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg shadow-xs" />
                    <div className="w-8 h-8 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg shadow-xs" />
                  </div>

                  {/* Center Target Crosshair or Barcode Framing Box */}
                  <div className="self-center flex flex-col items-center justify-center">
                    {scanMode === 'barcode' ? (
                      <div className="w-56 sm:w-72 h-28 sm:h-36 rounded-2xl border-2 border-dashed border-emerald-400 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs relative overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.35)]">
                        <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-bounce top-1/2" />
                        <Barcode className="w-10 h-10 text-emerald-400 mb-1" />
                        <span className="text-[10px] font-bold text-white/95 bg-black/70 px-2.5 py-0.5 rounded-full border border-white/15">
                          Enfoca el código de barras o paquete
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="w-16 h-16 rounded-full border border-dashed border-emerald-400/80 flex items-center justify-center animate-pulse">
                          <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full" />
                        </div>
                        <span className="text-[11px] font-bold text-white/90 bg-black/60 px-3 py-1 rounded-full mt-2 backdrop-blur-md border border-white/10 shadow-lg">
                          Centra tu plato en el visor
                        </span>
                      </>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <div className="w-8 h-8 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg shadow-xs" />
                    <div className="w-8 h-8 border-b-2 border-r-2 border-emerald-400 rounded-br-lg shadow-xs" />
                  </div>
                </div>

                {/* Top Camera Controls (HUD Bar) */}
                <div className="absolute top-4 inset-x-4 flex items-center justify-between pointer-events-auto z-20">
                  <span className="bg-black/60 backdrop-blur-md text-emerald-400 font-mono text-[11px] px-2.5 py-1 rounded-lg border border-white/10 font-bold flex items-center gap-1.5">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    VISION IA · ACTIVA
                  </span>

                  <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md p-1 rounded-full border border-white/10 text-white text-xs">
                    <button
                      type="button"
                      id="scanner-btn-zoom"
                      onClick={() => setZoomLevel(zoomLevel === '1x' ? '2x' : '1x')}
                      className="px-2.5 py-0.5 rounded-full font-bold bg-white/20 hover:bg-white/30 text-[11px] transition-colors"
                      title="Alternar zoom digital"
                    >
                      {zoomLevel}
                    </button>
                    <button
                      type="button"
                      id="scanner-btn-switch-camera"
                      onClick={toggleFacingMode}
                      className="p-1 rounded-full hover:bg-white/20 text-white transition-colors"
                      title="Girar cámara (frontal / trasera)"
                    >
                      <SwitchCamera className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Viewfinder Controls (Shutter, Gallery, Flip) */}
                <div className="absolute bottom-6 inset-x-6 flex items-center justify-around z-20 pointer-events-auto">
                  {/* Gallery upload button */}
                  <button
                    type="button"
                    id="btn-upload-food-image"
                    onClick={() => fileInputRef.current?.click()}
                    title="Seleccionar foto de comida de la galería"
                    className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg transition-transform active:scale-95 group"
                  >
                    <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>

                  {/* Main Shutter Button */}
                  <button
                    type="button"
                    id="btn-camera-shutter"
                    onClick={handleCaptureShutter}
                    title="Tomar fotografía del plato ahora"
                    className="w-20 h-20 rounded-full border-4 border-white bg-white/10 backdrop-blur-xs flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_25px_rgba(255,255,255,0.4)]"
                  >
                    <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-emerald-700 shadow-inner">
                      <Camera className="w-7 h-7" />
                    </div>
                  </button>

                  {/* Switch Camera Button */}
                  <button
                    type="button"
                    id="btn-switch-camera-bottom"
                    onClick={toggleFacingMode}
                    title="Cambiar entre cámara trasera y frontal"
                    className="w-12 h-12 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-lg transition-transform active:scale-95 group"
                  >
                    <SwitchCamera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Quick Precision Hint Bar for 1st-Photo Accuracy */}
          {scanMode === 'food' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-200/50">
                    ✦
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      Pista de Preparación para 100% de Precisión al 1er Intento
                      <span className="text-[10px] font-normal text-zinc-400">(opcional)</span>
                    </h3>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Toca un atajo o escribe detalles invisibles a la cámara (ej: "pechuga de pollo", "sin aceite", "bife de 250g")
                    </p>
                  </div>
                </div>
                {userHint && (
                  <button
                    type="button"
                    onClick={() => setUserHint('')}
                    className="text-[11px] font-bold text-rose-500 hover:text-rose-600 px-2 py-0.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    Borrar
                  </button>
                )}
              </div>

              {/* Input field */}
              <div className="relative">
                <input
                  type="text"
                  value={userHint}
                  onChange={(e) => setUserHint(e.target.value)}
                  placeholder="Ej: Milanesa de ternera al horno con puré de papas casero..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              {/* 1-Tap Quick Shortcut Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '🍗 Pollo', val: 'Pechuga o presa de pollo' },
                  { label: '🥩 Carne vacuna', val: 'Carne vacuna / bife' },
                  { label: '🔥 Al horno', val: 'Cocinado al horno con poco aceite' },
                  { label: '🍳 Frito', val: 'Frito con aceite' },
                  { label: '🥗 Sin aceite / Light', val: 'Sin aceite añadido, cocción limpia o al vapor' },
                  { label: '⚖️ Abundante (+350g)', val: 'Porción abundante de más de 350g' },
                  { label: '🍚 Con arroz', val: 'Acompañado de guarnición de arroz' },
                  { label: '🥔 Puré casero', val: 'Puré de papas casero con manteca y leche' },
                ].map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      if (userHint) {
                        setUserHint((prev) => `${prev}, ${chip.val}`);
                      } else {
                        setUserHint(chip.val);
                      }
                    }}
                    className="px-2.5 py-1 text-[11px] rounded-lg font-medium bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Upload Action Card & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all cursor-pointer group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-emerald-100 dark:border-emerald-900/40">
                <Upload className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Elegir de la Galería
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Sube cualquier foto tomada previamente desde tu smartphone o computadora.
                </p>
              </div>
            </div>

            <div 
              onClick={handleCaptureShutter}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs hover:border-emerald-500/60 dark:hover:border-emerald-500/60 transition-all cursor-pointer group flex items-center gap-4"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform border border-zinc-200 dark:border-zinc-700">
                <Camera className="w-6 h-6 stroke-[2]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                  Capturar con Cámara
                  <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Usa el disparador del visor para fotografiar tu comida en tiempo real.
                </p>
              </div>
            </div>
          </div>

          {/* Barcode / Package Manual Search & Quick Selection Chips */}
          {scanMode === 'barcode' && (
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Búsqueda manual o rápida de paquete
                </span>
                <span className="text-[10px] font-semibold text-zinc-400">
                  Open Food Facts & Alimentos
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleManualSearch();
                }}
                className="flex flex-col sm:flex-row gap-2"
              >
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={manualBarcodeInput}
                    onChange={(e) => setManualBarcodeInput(e.target.value)}
                    placeholder="Escribe código (ej: 7790040133036) o producto (ej: Chocolinas, Oreo, Cerealitas)..."
                    className="w-full pl-9 pr-4 py-2.5 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                </div>

                <button
                  type="submit"
                  disabled={isBarcodeSearching || !manualBarcodeInput.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {isBarcodeSearching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                  Buscar
                </button>
              </form>

              {/* Quick Package Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-medium text-zinc-400 mr-1 flex items-center gap-1">
                  <Cookie className="w-3.5 h-3.5 text-amber-500" />
                  Ejemplos rápidos:
                </span>
                {[
                  { label: 'Chocolinas', query: 'Chocolinas' },
                  { label: 'Galletitas Oreo', query: 'Oreo' },
                  { label: 'Cerealitas', query: 'Cerealitas' },
                  { label: 'Criollitas', query: 'Criollitas' },
                  { label: 'Alfajor Havanna', query: 'Alfajor' },
                  { label: 'Frutillas', query: 'Frutillas' },
                ].map((chip) => (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setManualBarcodeInput(chip.query);
                      handleManualSearch(chip.query);
                    }}
                    className="text-[11px] px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-zinc-700 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: Real Visual AI Analysis Animation */}
      {stage === 'analyzing' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 sm:p-12 rounded-3xl text-center space-y-6 shadow-md animate-in fade-in">
          {capturedImage && (
            <div className="relative w-56 h-56 mx-auto rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl">
              <img
                src={capturedImage}
                alt="Plato capturado"
                className="w-full h-full object-cover filter brightness-95"
              />
              {/* Animated Laser Scanning Beam */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 shadow-[0_0_20px_#10b981] animate-bounce top-1/2" />
              <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px]" />
            </div>
          )}

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 animate-pulse">
              <Scan className="w-3.5 h-3.5" />
              Análisis Visual con IA Nutricional
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {analysisStatus}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Evaluando volumen de porción, componentes nutricionales e identificación de ingredientes.
            </p>
          </div>

          {/* Progress Bar Animation */}
          <div className="w-64 mx-auto bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden border border-zinc-200 dark:border-zinc-700">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full w-full animate-pulse rounded-full" />
          </div>
        </div>
      )}

      {/* STAGE 2b: El análisis falló. Se dice, no se inventa un resultado. */}
      {stage === 'error' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 sm:p-12 rounded-3xl text-center space-y-6 shadow-md animate-in fade-in">
          {capturedImage && (
            <div className="relative w-40 h-40 mx-auto rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700 opacity-60">
              <img src={capturedImage} alt="Plato capturado" className="w-full h-full object-cover" />
            </div>
          )}

          <div className="space-y-2 max-w-md mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-3.5 h-3.5" />
              No se pudo completar el análisis
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {analysisError}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              No registramos valores estimados a ciegas: acabarían en tu diario falseando tu
              balance. Reintenta, o añade el alimento a mano desde la sección Alimentos.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-sm mx-auto">
            {capturedImage && (
              <button
                type="button"
                onClick={handleRetryAnalysis}
                className="flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold shadow-md transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            )}
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 py-3 px-5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
            >
              <Camera className="w-4 h-4" />
              Tomar otra foto
            </button>
          </div>
        </div>
      )}

      {/* STAGE 3: AI Recognition Results & Confirmation Screen */}
      {stage === 'result' && result && (
        <div className="space-y-6 animate-in zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Captured Photo & Detected Tags */}
            <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-xs">
              {capturedImage && (
                <div className="relative aspect-square w-full">
                  <img
                    src={capturedImage}
                    alt={result.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-extrabold px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Confianza IA: {result.confidence}%
                  </div>

                  <div className="absolute bottom-3 inset-x-3 bg-black/75 backdrop-blur-md p-2.5 rounded-xl text-white text-xs border border-white/10 flex items-center justify-between">
                    <span className="font-semibold text-[11px]">Foto analizada</span>
                    <span className="text-[10px] text-zinc-300">
                      {Math.round(result.weightGrams * portionMultiplier)}g calculados
                    </span>
                  </div>
                </div>
              )}

              {/* Nutritional Observation & Ingredients */}
              <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                {result.observation && (
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-start gap-2">
                    <Info className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                    <span>{result.observation}</span>
                  </div>
                )}

                <div>
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                    Ingredientes identificados:
                  </span>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {result.ingredients?.map((ing, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border border-zinc-100 dark:border-zinc-700/50"
                      >
                        <span className="font-medium">{ing.name}</span>
                        <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-[11px]">
                          {ing.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Nutrition Breakdown & Registration Form */}
            <div className="lg:col-span-7 space-y-5">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-xs space-y-5">
                {/* Title (Editable) */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Plato Detectado por Visión IA
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 font-medium text-zinc-600 dark:text-zinc-300">
                      {result.category}
                    </span>
                  </div>
                  <input
                    type="text"
                    id="scanner-dish-name-input"
                    value={editableDishName}
                    onChange={(e) => setEditableDishName(e.target.value)}
                    className="w-full text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-50 bg-transparent border-b border-zinc-200 dark:border-zinc-700 pb-1 focus:outline-none focus:border-emerald-500 transition-colors"
                    placeholder="Nombre del alimento..."
                  />
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Puedes editar el nombre si deseas personalizar cómo aparece en tu diario.
                  </p>
                </div>

                {/* Macro Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Calories */}
                  <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-800/80 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-center">
                    <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                      Calorías
                    </span>
                    <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 block mt-0.5">
                      {Math.round(result.calories * portionMultiplier)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">kcal</span>
                  </div>

                  {/* Protein */}
                  <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider block">
                      Proteína
                    </span>
                    <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                      {Math.round(result.protein * portionMultiplier)}g
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {Math.round(result.protein * portionMultiplier * 4)} kcal
                    </span>
                  </div>

                  {/* Carbs */}
                  <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-100 dark:border-amber-900/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider block">
                      Carbohidratos
                    </span>
                    <span className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-0.5">
                      {Math.round(result.carbs * portionMultiplier)}g
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {Math.round(result.carbs * portionMultiplier * 4)} kcal
                    </span>
                  </div>

                  {/* Fats */}
                  <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40 text-center">
                    <span className="text-[10px] uppercase font-bold text-rose-500 tracking-wider block">
                      Grasas
                    </span>
                    <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-0.5">
                      {Math.round(result.fat * portionMultiplier)}g
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {Math.round(result.fat * portionMultiplier * 9)} kcal
                    </span>
                  </div>
                </div>

                {/* Portion Adjuster */}
                <div className="bg-zinc-50 dark:bg-zinc-800/40 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-800 dark:text-zinc-200">
                    <span>Ajuste de Porción Servida:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      {portionMultiplier === 1.0
                        ? `1.0x (${Math.round(result.weightGrams)}g estimada)`
                        : `${portionMultiplier}x (${Math.round(result.weightGrams * portionMultiplier)}g)`}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((scale) => (
                      <button
                        key={scale}
                        type="button"
                        onClick={() => setPortionMultiplier(scale)}
                        className={`py-1.5 text-xs rounded-xl font-bold border transition-all ${
                          portionMultiplier === scale
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {scale === 1.0 ? '1x Estándar' : `${scale}x`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Ingredients Breakdown & Split Options if multiple ingredients */}
                {result.ingredients && result.ingredients.length > 1 && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {result.ingredients.length} Alimentos detectados en el plato:
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                        Se guardan en tu Biblioteca ✦
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {result.ingredients.map((ing, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-xl bg-white dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 shadow-2xs"
                        >
                          {ing.name} {ing.amount ? `(${ing.amount})` : ''}
                        </span>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                          Desglosar en ítems independientes
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Te permite sumar otra porción (ej. +1 bife) o ajustar gramos de cada uno por separado en el diario.
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSplitIngredients(!splitIngredients)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                          splitIngredients
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-700'
                        }`}
                      >
                        {splitIngredients ? '✓ Desglosado' : 'Combinado en 1'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Refine / Recalculate with instant note tool */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                      ¿Querés afinar el cálculo de esta foto?
                    </span>
                    {!isRefining ? (
                      <button
                        type="button"
                        onClick={() => setIsRefining(true)}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        Afinar con IA →
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsRefining(false)}
                        className="text-[11px] text-zinc-400 hover:text-zinc-600"
                      >
                        Cerrar
                      </button>
                    )}
                  </div>

                  {isRefining ? (
                    <div className="space-y-2 pt-1 animate-in fade-in">
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Escribe qué ingrediente o cocción ajustar y la IA recalculará esta misma foto al instante:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={refineText}
                          onChange={(e) => setRefineText(e.target.value)}
                          placeholder="Ej: Es pechuga de pollo y el puré no tiene manteca..."
                          className="flex-1 text-xs px-3 py-2 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (capturedImage && refineText.trim()) {
                              processImage(capturedImage, refineText);
                            }
                          }}
                          disabled={!refineText.trim()}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1 shrink-0"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Recalcular</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
                      No hace falta sacar otra foto: podés darle una indicación exacta a la IA (ej. tipo de carne o método de cocción) para corregir el cálculo en 2 segundos.
                    </p>
                  )}
                </div>

                {/* Select Destination Meal in Diary */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Comida correspondiente para guardar en el Diario:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((m) => {
                      const labels = { 
                        breakfast: 'Desayuno', 
                        lunch: 'Almuerzo', 
                        dinner: 'Cena', 
                        snacks: 'Snacks' 
                      };
                      const isSelected = selectedMeal === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          id={`scanner-meal-choice-${m}`}
                          onClick={() => setSelectedMeal(m)}
                          className={`py-2 px-3 text-xs rounded-xl font-bold border transition-all ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                              : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                          }`}
                        >
                          {labels[m]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action CTA Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    id="btn-confirm-add-to-diary"
                    onClick={handleConfirmAndSave}
                    className="flex-1 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-black rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Confirmar y Guardar en el Diario ({Math.round(result.calories * portionMultiplier)} kcal)
                  </button>

                  <button
                    type="button"
                    id="btn-scanner-retake"
                    onClick={handleReset}
                    className="py-3.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Tomar Otra Foto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3b: Barcode & Package Portion Calculator Result */}
      {stage === 'result' && packageResult && (() => {
        const portionCalc = calculatePortionFromProduct(packageResult, cookieUnitCount);

        return (
          <div className="space-y-6 animate-in zoom-in-95 duration-200">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Product Info & Package Visual Card */}
              <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-xs space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                      <Barcode className="w-4 h-4" />
                      {packageResult.source === 'openfoodfacts'
                        ? 'Base Oficial Open Food Facts'
                        : packageResult.source === 'database'
                        ? 'Base de Alimentos NutriFit'
                        : 'Reconocimiento de Paquete IA'}
                    </div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-snug">
                      {packageResult.productName}
                    </h2>
                    <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Marca: {packageResult.brand}
                    </p>
                  </div>

                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50">
                    <Package className="w-6 h-6" />
                  </div>
                </div>

                {packageResult.barcode && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
                    <Barcode className="w-4 h-4 text-emerald-500" />
                    <span>EAN: {packageResult.barcode}</span>
                  </div>
                )}

                {/* Photo if captured */}
                {capturedImage && (
                  <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700/60 shadow-xs">
                    <img
                      src={capturedImage}
                      alt={packageResult.productName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-white text-[10px] font-bold flex items-center gap-1 border border-white/10">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Foto analizada
                    </div>
                  </div>
                )}

                {/* Reference Nutritional Card */}
                <div className="bg-zinc-50 dark:bg-zinc-800/60 rounded-2xl p-4 border border-zinc-200/80 dark:border-zinc-700/60 space-y-3">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                    Valores nutricionales de referencia:
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-700">
                      <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                        1 {packageResult.unitName} ({formatGrams(packageResult.gramsPerUnit)}g aprox.)
                      </span>
                      <span className="font-black text-emerald-600 dark:text-emerald-400">
                        {packageResult.caloriesPerUnit} kcal
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 text-center">
                      <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <span className="text-zinc-400 block text-[10px]">Prot</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatGrams(packageResult.proteinPerUnit)}g</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <span className="text-zinc-400 block text-[10px]">Carbs</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatGrams(packageResult.carbsPerUnit)}g</span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900 p-2 rounded-xl border border-zinc-200 dark:border-zinc-800">
                        <span className="text-zinc-400 block text-[10px]">Grasas</span>
                        <span className="font-bold text-zinc-800 dark:text-zinc-200">{formatGrams(packageResult.fatPerUnit)}g</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>Por cada 100g de producto:</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-300">{packageResult.caloriesPer100g} kcal</span>
                    </div>
                  </div>
                </div>

                {packageResult.notes && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 italic">
                    💡 {packageResult.notes}
                  </p>
                )}
              </div>

              {/* Right Column: Interactive Unit / Cookie Calculator & Diary Logger */}
              <div className="lg:col-span-7 space-y-5">
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 rounded-3xl shadow-xs space-y-6">
                  {/* Dynamic Stepper Header */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Calculadora de Porciones Exactas
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-zinc-900 dark:text-zinc-100">
                      ¿Cuántas {packageResult.unitName} te vas a comer de este paquete?
                    </h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Indica las unidades exactas (ej: 4 galletitas) y calcularemos automáticamente los gramos y macros precisos sin redondeos deformados.
                    </p>
                  </div>

                  {/* Interactive Stepper Control */}
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-700/60 flex flex-col items-center justify-center gap-4">
                    <div className="flex items-center gap-6">
                      <button
                        type="button"
                        id="btn-stepper-cookie-minus"
                        onClick={() => setCookieUnitCount(Math.max(1, cookieUnitCount - 1))}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-zinc-700 flex items-center justify-center font-black text-2xl shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        -
                      </button>

                      <div className="text-center min-w-[120px]">
                        <div className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                          {cookieUnitCount}
                        </div>
                        <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300 capitalize mt-0.5">
                          {cookieUnitCount === 1 ? packageResult.unitName.replace(/s$/, '') : packageResult.unitName}
                        </div>
                        <div className="text-[11px] font-semibold text-zinc-400 mt-0.5">
                          ≈ {formatGrams(portionCalc.totalGrams)} gramos netos
                        </div>
                      </div>

                      <button
                        type="button"
                        id="btn-stepper-cookie-plus"
                        onClick={() => setCookieUnitCount(cookieUnitCount + 1)}
                        className="w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-zinc-700 flex items-center justify-center font-black text-2xl shadow-xs transition-all active:scale-95 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {/* Quick Selection Buttons */}
                    <div className="w-full pt-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block text-center mb-2">
                        Selección rápida de unidades:
                      </span>
                      <div className="flex flex-wrap justify-center gap-1.5">
                        {[1, 2, 3, 4, 5, 6, 8, 10, 12, 15].map((cnt) => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setCookieUnitCount(cnt)}
                            className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${
                              cookieUnitCount === cnt
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 cursor-pointer'
                            }`}
                          >
                            {cnt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Calculated Macros Box for this portion */}
                  <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-amber-500" />
                        Total para {cookieUnitCount} {packageResult.unitName}:
                      </span>
                      <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                        {portionCalc.calories} <span className="text-sm font-bold">kcal</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div className="bg-white dark:bg-zinc-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Proteínas</span>
                        <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          {formatGrams(portionCalc.proteinGrams)}g
                        </span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Carbohidratos</span>
                        <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          {formatGrams(portionCalc.carbsGrams)}g
                        </span>
                      </div>
                      <div className="bg-white dark:bg-zinc-900/90 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 text-center">
                        <span className="text-[10px] font-bold text-zinc-400 block uppercase">Grasas</span>
                        <span className="text-base font-black text-zinc-900 dark:text-zinc-100">
                          {formatGrams(portionCalc.fatGrams)}g
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Meal Destination Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                      Momento de la comida en el Diario:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['breakfast', 'lunch', 'dinner', 'snacks'] as MealType[]).map((m) => {
                        const labels = {
                          breakfast: 'Desayuno',
                          lunch: 'Almuerzo',
                          dinner: 'Cena',
                          snacks: 'Snacks / Merienda',
                        };
                        const isSelected = selectedMeal === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            id={`package-meal-choice-${m}`}
                            onClick={() => setSelectedMeal(m)}
                            className={`py-2 px-3 text-xs rounded-xl font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs ring-1 ring-emerald-600'
                                : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50'
                            }`}
                          >
                            {labels[m]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="pt-2 flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      id="btn-confirm-add-package-to-diary"
                      onClick={handleConfirmPackagePortion}
                      className="flex-1 py-3.5 px-5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-black rounded-2xl shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-5 h-5" />
                      Añadir {cookieUnitCount} {packageResult.unitName} al Diario ({portionCalc.calories} kcal)
                    </button>

                    <button
                      type="button"
                      id="btn-scanner-retake-package"
                      onClick={handleReset}
                      className="py-3.5 px-4 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Escanear Otro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
