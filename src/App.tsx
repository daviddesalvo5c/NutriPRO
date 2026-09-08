import React, { useState, useEffect } from 'react';
import { AppTab, Navbar } from './components/Navbar';
import { UserProfileSection } from './components/UserProfileSection';
import { DiarySection } from './components/DiarySection';
import { ScannerSection } from './components/ScannerSection';
import { ProgressSection } from './components/ProgressSection';
import { PlannerAndRecipesSection } from './components/PlannerAndRecipesSection';
import { FoodsSection } from './components/FoodsSection';
import { AuthView } from './components/AuthView';
import { SubscriptionPlansModal } from './components/SubscriptionPlansModal';
import { ToastContainer } from './components/ToastContainer';
import { notificationService } from './utils/notificationService';
import { 
  supabaseFetchDailyLogs,
  supabaseAddFoodItem,
  supabaseAddMultipleFoods,
  supabaseRemoveFoodItem,
  supabaseUpdateWater,
  supabaseSaveUserProfile,
  supabaseFetchUserProfile,
  isSupabaseConfigured
} from './services/supabaseService';
import { 
  DailyLog, 
  FoodItem, 
  MealType, 
  UserProfile, 
  UserSession,
  WeightEntry,
  BodyMeasurementEntry,
  ProgressPhotoEntry,
  SubscriptionTier
} from './types';
import { 
  getTodayString, 
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
  loadStoredProfileForUser,
  saveStoredProfileForUser,
  loadDailyLogsForUser,
  saveDailyLogsForUser,
  createDefaultProfile,
  loadWeightHistoryForUser,
  saveWeightHistoryForUser,
  loadMeasurementsForUser,
  saveMeasurementsForUser,
  loadProgressPhotosForUser,
  saveProgressPhotosForUser,
  loadThemePreference,
  saveThemePreference,
  getUserTier,
  setUserTier,
  recordSubscriptionTransaction
} from './utils/storage';

export default function App() {
  // Theme state (Dark / Light mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = loadThemePreference();
    if (typeof document !== 'undefined') {
      if (saved === 'dark') {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
    return saved;
  });

  // Dynamically update documentElement, body, and storage whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      document.body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      document.body.classList.remove('dark');
    }
    saveThemePreference(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Session authentication state (persisted per user email)
  const [session, setSession] = useState<UserSession | null>(() => loadActiveSession());
  const [activeTab, setActiveTab] = useState<AppTab>('diary');
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayString());

  // Subscription plan & modal state
  const [isPlansModalOpen, setIsPlansModalOpen] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(() => {
    const initialSession = loadActiveSession();
    return initialSession ? getUserTier(initialSession.email) : 'free';
  });

  // User-isolated profile state
  const [profile, setProfile] = useState<UserProfile>(() => {
    const initialSession = loadActiveSession();
    if (initialSession) {
      return loadStoredProfileForUser(initialSession.email, initialSession.name);
    }
    return createDefaultProfile('Usuario');
  });

  // User-isolated daily logs state
  const [dailyLogs, setDailyLogs] = useState<Record<string, DailyLog>>(() => {
    const initialSession = loadActiveSession();
    if (initialSession) {
      return loadDailyLogsForUser(initialSession.email);
    }
    return {};
  });

  // User-isolated weight tracking
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => {
    const initialSession = loadActiveSession();
    if (initialSession) {
      return loadWeightHistoryForUser(initialSession.email, profile.weightKg);
    }
    return [];
  });

  // User-isolated measurements
  const [measurements, setMeasurements] = useState<BodyMeasurementEntry[]>(() => {
    const initialSession = loadActiveSession();
    if (initialSession) {
      return loadMeasurementsForUser(initialSession.email);
    }
    return [];
  });

  // User-isolated progress photos
  const [progressPhotos, setProgressPhotos] = useState<ProgressPhotoEntry[]>(() => {
    const initialSession = loadActiveSession();
    if (initialSession) {
      return loadProgressPhotosForUser(initialSession.email);
    }
    return [];
  });

  // Whenever session changes, reload that user's private data
  useEffect(() => {
    if (session) {
      const userProfile = loadStoredProfileForUser(session.email, session.name);
      const userLogs = loadDailyLogsForUser(session.email);
      const userWeights = loadWeightHistoryForUser(session.email, userProfile.weightKg);
      const userMeasurements = loadMeasurementsForUser(session.email);
      const userPhotos = loadProgressPhotosForUser(session.email);

      setProfile(userProfile);
      setDailyLogs(userLogs);
      setWeightHistory(userWeights);
      setMeasurements(userMeasurements);
      setProgressPhotos(userPhotos);
      setCurrentTier(getUserTier(session.email));

      // Attempt background fetch from Supabase if connected
      if (isSupabaseConfigured) {
        supabaseFetchDailyLogs(session.email)
          .then((remoteLogs) => {
            if (remoteLogs && Object.keys(remoteLogs).length > 0) {
              setDailyLogs((prev) => ({ ...prev, ...remoteLogs }));
              saveDailyLogsForUser(session.email, remoteLogs);
            }
          })
          .catch((err) => console.warn('Supabase fetch logs:', err));

        supabaseFetchUserProfile(session.email)
          .then((remoteProfile) => {
            if (remoteProfile) {
              const currentLocal = loadStoredProfileForUser(session.email, session.name);
              const localTime = currentLocal.updatedAt ? new Date(currentLocal.updatedAt).getTime() : 0;
              const remoteTime = remoteProfile.updatedAt ? new Date(remoteProfile.updatedAt).getTime() : 0;

              // Only overwrite local if remote profile is strictly newer
              if (remoteTime > localTime) {
                setProfile(remoteProfile);
                saveStoredProfileForUser(session.email, remoteProfile);
              } else if (localTime > remoteTime && currentLocal.weightKg) {
                // Local is more up-to-date; push newest local values to Supabase
                supabaseSaveUserProfile(currentLocal, session.email).catch((err) =>
                  console.warn('Syncing local profile to Supabase:', err)
                );
              }
            }
          })
          .catch((err) => console.warn('Supabase fetch profile:', err));
      }

      // Check browser periodic notifications
      notificationService.schedulePeriodicReminders();
    }
  }, [session?.email]);

  // Handle successful login or registration
  const handleLoginSuccess = (newSession: UserSession) => {
    saveActiveSession(newSession);
    setSession(newSession);
    const userProfile = loadStoredProfileForUser(newSession.email, newSession.name);
    const userLogs = loadDailyLogsForUser(newSession.email);
    const userWeights = loadWeightHistoryForUser(newSession.email, userProfile.weightKg);
    const userMeasurements = loadMeasurementsForUser(newSession.email);
    const userPhotos = loadProgressPhotosForUser(newSession.email);

    setProfile(userProfile);
    setDailyLogs(userLogs);
    setWeightHistory(userWeights);
    setMeasurements(userMeasurements);
    setProgressPhotos(userPhotos);
    setCurrentTier(getUserTier(newSession.email));
    setActiveTab('diary');

    // Trigger in-app notification & optional browser push
    notificationService.notifyLoginSuccess(newSession.name);
    notificationService.requestNotificationPermission();
  };

  // Select/Upgrade subscription plan
  const handleSelectTier = (newTier: SubscriptionTier, billingCycle: 'monthly' | 'annual') => {
    if (!session) return;
    setUserTier(session.email, newTier);
    setCurrentTier(newTier);

    const amount = billingCycle === 'annual' ? 59.99 : 7.99;
    const description = billingCycle === 'annual' 
      ? 'Suscripción Anual NutriFit Pro ($59.99/año)' 
      : 'Suscripción Mensual NutriFit Pro ($7.99/mes)';

    recordSubscriptionTransaction({
      userEmail: session.email,
      userName: session.name,
      tier: newTier,
      billingCycle,
      amount,
      currency: 'USD',
      status: 'completed',
      paymentMethod: 'Stripe / Mercado Pago Checkout Real',
      description,
    });

    setIsPlansModalOpen(false);
  };

  // Handle session logout
  const handleLogout = () => {
    clearActiveSession();
    setSession(null);
    setActiveTab('diary');
  };

  // Save profile changes to the active user's isolated storage
  const handleUpdateProfile = (updated: UserProfile) => {
    if (!session) return;
    setProfile(updated);
    saveStoredProfileForUser(session.email, updated);
    if (isSupabaseConfigured) {
      supabaseSaveUserProfile(updated, session.email).catch((err) =>
        console.warn('Supabase profile save error:', err)
      );
    }
  };

  // Add food item to a specific date log for the active user
  const handleAddFoodItem = (date: string, itemWithoutId: Omit<FoodItem, 'id'>) => {
    if (!session) return;
    const newItem: FoodItem = {
      ...itemWithoutId,
      id: 'food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    };

    setDailyLogs((prev) => {
      const existingLog = prev[date] || { date, items: [] };
      const updatedLogs: Record<string, DailyLog> = {
        ...prev,
        [date]: {
          ...existingLog,
          items: [newItem, ...(existingLog.items || [])],
        },
      };
      saveDailyLogsForUser(session.email, updatedLogs);

      // Check calorie goals for notification
      const todayTotalCalories = (updatedLogs[date]?.items || []).reduce(
        (sum, it) => sum + it.calories,
        0
      );
      notificationService.checkCalorieGoal(
        date,
        todayTotalCalories,
        profile.dailyCalorieTarget
      );

      return updatedLogs;
    });

    // Notify user in-app
    notificationService.notifyFoodSaved(newItem.name, newItem.calories, newItem.mealType);

    // Sync to Supabase in background
    if (isSupabaseConfigured) {
      supabaseAddFoodItem(session.email, date, newItem).catch((err) =>
        console.warn('Supabase add food error:', err)
      );
    }
  };

  // Add multiple foods at once (e.g. from AI meal generator)
  const handleAddMultipleFoods = (itemsToAdd: { item: Omit<FoodItem, 'id'>; mealType: MealType }[]) => {
    if (!session) return;
    const newItems: FoodItem[] = itemsToAdd.map((entry) => ({
      ...entry.item,
      mealType: entry.mealType,
      id: 'food_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    }));

    setDailyLogs((prev) => {
      const existingLog = prev[selectedDate] || { date: selectedDate, items: [] };
      const updatedLogs: Record<string, DailyLog> = {
        ...prev,
        [selectedDate]: {
          ...existingLog,
          items: [...newItems, ...(existingLog.items || [])],
        },
      };
      saveDailyLogsForUser(session.email, updatedLogs);
      return updatedLogs;
    });

    // Notify user
    const totalCal = newItems.reduce((acc, it) => acc + it.calories, 0);
    notificationService.notifyScanSaved(
      newItems.length === 1 ? newItems[0].name : `${newItems.length} alimentos`,
      totalCal
    );

    // Sync to Supabase in background
    if (isSupabaseConfigured) {
      supabaseAddMultipleFoods(session.email, selectedDate, newItems).catch((err) =>
        console.warn('Supabase add multiple foods error:', err)
      );
    }
  };

  // Remove food item from a date log for the active user
  const handleRemoveFoodItem = (date: string, itemId: string) => {
    if (!session) return;
    setDailyLogs((prev) => {
      const existingLog = prev[date];
      if (!existingLog) return prev;
      const updatedLogs: Record<string, DailyLog> = {
        ...prev,
        [date]: {
          ...existingLog,
          items: existingLog.items.filter((i) => i.id !== itemId),
        },
      };
      saveDailyLogsForUser(session.email, updatedLogs);
      return updatedLogs;
    });

    if (isSupabaseConfigured) {
      supabaseRemoveFoodItem(session.email, itemId).catch((err) =>
        console.warn('Supabase remove food error:', err)
      );
    }
  };

  // Update daily water hydration
  const handleUpdateWater = (date: string, amountMl: number) => {
    if (!session) return;
    setDailyLogs((prev) => {
      const existingLog = prev[date] || { date, items: [] };
      const updatedLogs: Record<string, DailyLog> = {
        ...prev,
        [date]: {
          ...existingLog,
          waterMl: amountMl,
        },
      };
      saveDailyLogsForUser(session.email, updatedLogs);
      return updatedLogs;
    });

    // Check water goal
    notificationService.checkWaterGoal(
      date,
      amountMl,
      profile.dailyWaterGoalMl || 2500
    );

    // Sync to Supabase
    if (isSupabaseConfigured) {
      supabaseUpdateWater(session.email, date, amountMl).catch((err) =>
        console.warn('Supabase update water error:', err)
      );
    }
  };

  // Save weight entry
  const handleSaveWeightEntry = (entry: WeightEntry) => {
    if (!session) return;
    setWeightHistory((prev) => {
      const filtered = prev.filter((e) => e.date !== entry.date && e.id !== entry.id);
      const updated = [...filtered, entry].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      saveWeightHistoryForUser(session.email, updated);
      return updated;
    });
  };

  // Delete weight entry
  const handleDeleteWeightEntry = (id: string) => {
    if (!session) return;
    setWeightHistory((prev) => {
      const updated = prev.filter((e) => e.id !== id);
      saveWeightHistoryForUser(session.email, updated);
      return updated;
    });
  };

  // Save measurement entry
  const handleSaveMeasurement = (entry: BodyMeasurementEntry) => {
    if (!session) return;
    setMeasurements((prev) => {
      const filtered = prev.filter((m) => m.date !== entry.date && m.id !== entry.id);
      const updated = [...filtered, entry].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      saveMeasurementsForUser(session.email, updated);
      return updated;
    });
  };

  // Delete measurement entry
  const handleDeleteMeasurement = (id: string) => {
    if (!session) return;
    setMeasurements((prev) => {
      const updated = prev.filter((m) => m.id !== id);
      saveMeasurementsForUser(session.email, updated);
      return updated;
    });
  };

  // Save progress photo
  const handleSaveProgressPhoto = (entry: ProgressPhotoEntry) => {
    if (!session) return;
    setProgressPhotos((prev) => {
      const updated = [entry, ...prev];
      saveProgressPhotosForUser(session.email, updated);
      return updated;
    });
  };

  // Delete progress photo
  const handleDeleteProgressPhoto = (id: string) => {
    if (!session) return;
    setProgressPhotos((prev) => {
      const updated = prev.filter((p) => p.id !== id);
      saveProgressPhotosForUser(session.email, updated);
      return updated;
    });
  };

  // IF NO ACTIVE SESSION: Restrict access and present AuthView (Login / Register)
  if (!session) {
    return (
      <div className={`${theme === 'dark' ? 'dark' : ''} min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans transition-colors duration-200`}>
        <AuthView 
          onLoginSuccess={handleLoginSuccess} 
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        <ToastContainer />
      </div>
    );
  }

  // ACTIVE SESSION: Render authenticated application views with isolated data
  return (
    <div className={`${theme === 'dark' ? 'dark' : ''} min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200`}>
      {/* Top Navigation Bar with user profile info, theme switch & logout button */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onOpenProfile={() => setActiveTab('profile')}
        session={session}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        currentTier={currentTier}
        onOpenPlansModal={() => setIsPlansModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-28 sm:pb-36">
        {activeTab === 'diary' && (
          <DiarySection
            profile={profile}
            dailyLogs={dailyLogs}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            onAddFoodItem={handleAddFoodItem}
            onRemoveFoodItem={handleRemoveFoodItem}
            onUpdateWater={handleUpdateWater}
            onOpenProfile={() => setActiveTab('profile')}
            onNavigateToScanner={() => setActiveTab('scanner')}
            userEmail={session.email}
            currentTier={currentTier}
            onOpenPlansModal={() => setIsPlansModalOpen(true)}
          />
        )}

        {activeTab === 'foods' && (
          <FoodsSection
            onAddFoodToDiary={(item, mealType) => {
              handleAddFoodItem(selectedDate, { ...item, mealType });
              setActiveTab('diary');
            }}
          />
        )}

        {activeTab === 'planner' && (
          <PlannerAndRecipesSection
            profile={profile}
            onAddFoodToDiary={(item, mealType) => {
              handleAddFoodItem(selectedDate, { ...item, mealType });
            }}
            onAddMultipleFoodsToDiary={handleAddMultipleFoods}
            onNavigateToDiary={() => setActiveTab('diary')}
            userEmail={session.email}
            currentTier={currentTier}
            onOpenPlansModal={() => setIsPlansModalOpen(true)}
          />
        )}

        {activeTab === 'scanner' && (
          <ScannerSection
            onAddFoodToDiary={(item, mealType) => {
              handleAddFoodItem(selectedDate, { ...item, mealType });
            }}
            onNavigateToDiary={() => setActiveTab('diary')}
            userEmail={session.email}
            currentTier={currentTier}
            onOpenPlansModal={() => setIsPlansModalOpen(true)}
          />
        )}

        {activeTab === 'profile' && (
          <UserProfileSection
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            onNavigateToDiary={() => setActiveTab('diary')}
            session={session}
            currentTier={currentTier}
            onOpenPlansModal={() => setIsPlansModalOpen(true)}
          />
        )}

        {activeTab === 'progress' && (
          <ProgressSection
            profile={profile}
            dailyLogs={dailyLogs}
            onOpenProfile={() => setActiveTab('profile')}
            weightHistory={weightHistory}
            onSaveWeightEntry={handleSaveWeightEntry}
            onDeleteWeightEntry={handleDeleteWeightEntry}
            measurements={measurements}
            onSaveMeasurement={handleSaveMeasurement}
            onDeleteMeasurement={handleDeleteMeasurement}
            progressPhotos={progressPhotos}
            onSaveProgressPhoto={handleSaveProgressPhoto}
            onDeleteProgressPhoto={handleDeleteProgressPhoto}
          />
        )}
      </main>

      {/* Subscription Plans & Upgrade Modal */}
      <SubscriptionPlansModal
        isOpen={isPlansModalOpen}
        onClose={() => setIsPlansModalOpen(false)}
        currentTier={currentTier}
        session={session}
        onSubscribe={(tier) => handleSelectTier(tier, tier === 'pro_annual' ? 'annual' : 'monthly')}
      />

      {/* Global In-App Toast Notification Center */}
      <ToastContainer />
    </div>
  );
}
