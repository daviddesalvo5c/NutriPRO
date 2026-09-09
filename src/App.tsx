import React, { useState, useEffect } from 'react';
import { AppTab, Navbar } from './components/Navbar';
import { UserProfileSection } from './components/UserProfileSection';
import { DiarySection } from './components/DiarySection';
import { ScannerSection } from './components/ScannerSection';
import { ProgressSection } from './components/ProgressSection';
import { PlannerAndRecipesSection } from './components/PlannerAndRecipesSection';
import { FoodsSection } from './components/FoodsSection';
import { ActivitySection } from './components/ActivitySection';
import { AuthView } from './components/AuthView';
import { SubscriptionPlansModal } from './components/SubscriptionPlansModal';
import { PWAInstallModal } from './components/PWAInstallModal';
import { usePWAInstall } from './hooks/usePWAInstall';
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
  supabaseSubscribeToUserData,
  emailToUuid,
  isSupabaseConfigured
} from './services/supabaseService';
import { supabase } from './lib/supabase';
import { cloudSyncService } from './services/cloudSyncService';
import { 
  DailyLog, 
  FoodItem, 
  MealType, 
  UserProfile, 
  UserSession,
  WeightEntry,
  BodyMeasurementEntry,
  ProgressPhotoEntry,
  SubscriptionTier,
  ActivityDayLog,
  WorkoutItem
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
  recordSubscriptionTransaction,
  loadActivityLogsForUser,
  saveActivityLogsForUser,
  loadDiscountActivityCaloriesPreference,
  saveDiscountActivityCaloriesPreference
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

  // PWA Install prompt hook
  const { 
    showPrompt, 
    closePrompt, 
    openPromptManually, 
    isInstallable, 
    isInstalled, 
    isIOS, 
    install 
  } = usePWAInstall();

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

  // User-isolated activity logs state
  const [activityLogs, setActivityLogs] = useState<Record<string, ActivityDayLog>>(() => {
    const initialSession = loadActiveSession();
    if (initialSession) {
      return loadActivityLogsForUser(initialSession.email);
    }
    return {};
  });

  // User-isolated discount activity calories preference (default true)
  const [discountActivityCalories, setDiscountActivityCalories] = useState<boolean>(() => {
    const initialSession = loadActiveSession();
    if (initialSession) {
      return loadDiscountActivityCaloriesPreference(initialSession.email);
    }
    return true;
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

  // Listen for native Supabase Auth session changes on startup
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session: sbSession } }) => {
      if (sbSession?.user) {
        setSession((prev) => {
          if (prev && prev.email.toLowerCase() === sbSession.user.email?.toLowerCase()) {
            if (prev.userId !== sbSession.user.id) {
              const updated = { ...prev, userId: sbSession.user.id };
              saveActiveSession(updated);
              return updated;
            }
            return prev;
          }
          const email = sbSession.user.email || '';
          const name = sbSession.user.user_metadata?.full_name || email.split('@')[0];
          const newSess: UserSession = {
            email,
            name,
            userId: sbSession.user.id,
            loginTime: new Date().toISOString(),
          };
          saveActiveSession(newSess);
          return newSess;
        });
      }
    }).catch((err) => console.warn('Supabase getSession notice:', err));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sbSession) => {
      if (sbSession?.user) {
        setSession((prev) => {
          const email = sbSession.user.email || '';
          const name = sbSession.user.user_metadata?.full_name || email.split('@')[0];
          const updated: UserSession = {
            email,
            name,
            userId: sbSession.user.id,
            loginTime: prev?.loginTime || new Date().toISOString(),
          };
          saveActiveSession(updated);
          return updated;
        });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Whenever session changes, reload that user's private data & connect automatic Realtime sync
  useEffect(() => {
    if (!session) return;

    const email = session.email;
    const userId = session.userId || emailToUuid(email);

    // 1. Instant local load from device storage
    const userProfile = loadStoredProfileForUser(email, session.name);
    const userLogs = loadDailyLogsForUser(email);
    const userWeights = loadWeightHistoryForUser(email, userProfile.weightKg);
    const userMeasurements = loadMeasurementsForUser(email);
    const userPhotos = loadProgressPhotosForUser(email);
    const userActivity = loadActivityLogsForUser(email);
    const userDiscount = loadDiscountActivityCaloriesPreference(email);

    setProfile(userProfile);
    setDailyLogs(userLogs);
    setActivityLogs(userActivity);
    setDiscountActivityCalories(userDiscount);
    setWeightHistory(userWeights);
    setMeasurements(userMeasurements);
    setProgressPhotos(userPhotos);
    setCurrentTier(getUserTier(email));

    // 2. 100% Automatic Native Supabase Fetch (Mobile ↔ PC automatic data hydration)
    if (isSupabaseConfigured) {
      supabaseFetchDailyLogs(email, userId)
        .then((remoteLogs) => {
          if (remoteLogs && Object.keys(remoteLogs).length > 0) {
            setDailyLogs((prev) => {
              const merged = { ...prev, ...remoteLogs };
              saveDailyLogsForUser(email, merged);
              return merged;
            });
          }
        })
        .catch((err) => console.warn('Supabase fetch logs notice:', err));

      supabaseFetchUserProfile(email, userId)
        .then((remoteProfile) => {
          if (remoteProfile) {
            const currentLocal = loadStoredProfileForUser(email, session.name);
            const localTime = currentLocal.updatedAt ? new Date(currentLocal.updatedAt).getTime() : 0;
            const remoteTime = remoteProfile.updatedAt ? new Date(remoteProfile.updatedAt).getTime() : 0;

            const hasRealBiometrics = remoteProfile.age && remoteProfile.heightCm && remoteProfile.weightKg;
            // Only overwrite local if remote profile is strictly newer and has real biometric data
            if (remoteTime > localTime && hasRealBiometrics) {
              setProfile(remoteProfile);
              saveStoredProfileForUser(email, remoteProfile);
            } else if (localTime >= remoteTime && currentLocal.weightKg) {
              supabaseSaveUserProfile(currentLocal, email, userId).catch((err) =>
                console.warn('Syncing local profile to Supabase:', err)
              );
            }
          }
        })
        .catch((err) => console.warn('Supabase fetch profile notice:', err));
    }

    // 3. Supabase Realtime Subscription (Instant live reflection between Mobile and PC)
    let unsubscribeRealtime = () => {};
    if (isSupabaseConfigured && userId) {
      unsubscribeRealtime = supabaseSubscribeToUserData(userId, {
        onFoodLogsChange: () => {
          supabaseFetchDailyLogs(email, userId).then((freshLogs) => {
            if (freshLogs) {
              setDailyLogs((prev) => {
                const merged = { ...prev, ...freshLogs };
                saveDailyLogsForUser(email, merged);
                return merged;
              });
            }
          });
        },
        onProfileChange: (freshProfile) => {
          if (freshProfile && freshProfile.age && freshProfile.weightKg) {
            setProfile(freshProfile);
            saveStoredProfileForUser(email, freshProfile);
          }
        },
      });
    }

    // 4. Secondary background sync with cloudSyncService for offline/legacy fallback
    cloudSyncService.pullUserData(email).then((cloudData) => {
      if (cloudData) {
        if (cloudData.dailyLogs && Object.keys(cloudData.dailyLogs).length > 0) {
          setDailyLogs((prev) => {
            const mergedLogs = { ...prev, ...cloudData.dailyLogs };
            saveDailyLogsForUser(email, mergedLogs);
            return mergedLogs;
          });
        }
        if (cloudData.profile && Object.keys(cloudData.profile).length > 0) {
          setProfile((prev) => {
            const currentLocal = loadStoredProfileForUser(email, session.name);
            const localTime = currentLocal.updatedAt ? new Date(currentLocal.updatedAt).getTime() : 0;
            const cloudTime = cloudData.updatedAt ? new Date(cloudData.updatedAt).getTime() : 0;

            const hasRealCloudBiometrics = cloudData.profile?.age && cloudData.profile?.heightCm && cloudData.profile?.weightKg;
            if (cloudTime > localTime && hasRealCloudBiometrics) {
              const mergedProfile: UserProfile = { ...currentLocal, ...cloudData.profile };
              saveStoredProfileForUser(email, mergedProfile);
              return mergedProfile;
            }
            return prev;
          });
        }
        if (cloudData.weightHistory && cloudData.weightHistory.length > 0) {
          setWeightHistory(cloudData.weightHistory);
          saveWeightHistoryForUser(email, cloudData.weightHistory);
        }
        if (cloudData.measurements && cloudData.measurements.length > 0) {
          setMeasurements(cloudData.measurements);
          saveMeasurementsForUser(email, cloudData.measurements);
        }
        if (cloudData.tier) {
          setCurrentTier(cloudData.tier);
          setUserTier(email, cloudData.tier);
        }
      }
    }).catch((err) => console.warn('Cloud sync pull notice:', err));

    // Check browser periodic notifications
    notificationService.schedulePeriodicReminders();

    return () => {
      unsubscribeRealtime();
    };
  }, [session?.email, session?.userId]);

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

    const amount = billingCycle === 'annual' ? 94999 : 12999;
    const description = billingCycle === 'annual' 
      ? 'Suscripción Anual NutriFit Pro ($94.999 ARS/año)' 
      : 'Suscripción Mensual NutriFit Pro ($12.999 ARS/mes)';

    recordSubscriptionTransaction({
      userEmail: session.email,
      userName: session.name,
      tier: newTier,
      billingCycle,
      amount,
      currency: 'ARS',
      status: 'completed',
      paymentMethod: 'Mercado Pago Argentina',
      description,
    });

    setIsPlansModalOpen(false);
  };

  // Handle session logout
  const handleLogout = () => {
    clearActiveSession();
    setSession(null);
    setActiveTab('diary');
    if (isSupabaseConfigured) {
      supabase.auth.signOut().catch(() => {});
    }
  };

  // Save profile changes to the active user's isolated storage
  const handleUpdateProfile = (updated: UserProfile) => {
    if (!session) return;
    const profileWithTime: UserProfile = {
      ...updated,
      updatedAt: updated.updatedAt || new Date().toISOString(),
    };
    setProfile(profileWithTime);
    saveStoredProfileForUser(session.email, profileWithTime);

    // Sync to Cloud Backend
    cloudSyncService.pushUserData({
      email: session.email,
      name: session.name,
      profile: profileWithTime,
      userId: session.userId,
    }).catch((err) => console.warn('Cloud sync profile notice:', err));

    if (isSupabaseConfigured) {
      supabaseSaveUserProfile(profileWithTime, session.email, session.userId).catch((err) =>
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

    // Sync to Cloud Backend in real-time
    cloudSyncService.addFoodItem(session.email, date, newItem).catch((err) =>
      console.warn('Cloud sync add item notice:', err)
    );

    // Sync to Supabase in background with explicit user_id
    if (isSupabaseConfigured) {
      supabaseAddFoodItem(session.email, date, newItem, session.userId).catch((err) =>
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

      // Sync updated logs to Cloud
      cloudSyncService.pushUserData({
        email: session.email,
        dailyLogs: updatedLogs,
      }).catch((err) => console.warn('Cloud sync multiple items notice:', err));

      return updatedLogs;
    });

    // Notify user
    const totalCal = newItems.reduce((acc, it) => acc + it.calories, 0);
    notificationService.notifyScanSaved(
      newItems.length === 1 ? newItems[0].name : `${newItems.length} alimentos`,
      totalCal
    );

    // Sync to Supabase in background with explicit user_id
    if (isSupabaseConfigured) {
      supabaseAddMultipleFoods(session.email, selectedDate, newItems, session.userId).catch((err) =>
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

    // Sync removal to Cloud
    cloudSyncService.removeFoodItem(session.email, itemId).catch((err) =>
      console.warn('Cloud sync remove item notice:', err)
    );

    if (isSupabaseConfigured) {
      supabaseRemoveFoodItem(session.email, itemId, session.userId).catch((err) =>
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

    // Sync water hydration to Cloud
    cloudSyncService.updateWater(session.email, date, amountMl).catch((err) =>
      console.warn('Cloud sync water notice:', err)
    );

    // Sync to Supabase
    if (isSupabaseConfigured) {
      supabaseUpdateWater(session.email, date, amountMl, session.userId).catch((err) =>
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

      // Sync weight history to Cloud
      cloudSyncService.pushUserData({
        email: session.email,
        weightHistory: updated,
      }).catch((err) => console.warn('Cloud sync weight notice:', err));

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

  // Activity Log Handlers
  const handleSaveWorkout = (date: string, workout: Omit<WorkoutItem, 'id' | 'date'>) => {
    if (!session) return;
    setActivityLogs((prev) => {
      const day = prev[date] || {
        date,
        connectedService: null,
        syncedSteps: 0,
        syncedCalories: 0,
        workouts: [],
      };
      const newWorkoutItem: WorkoutItem = {
        ...workout,
        id: `workout_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        date,
      };
      const updatedDay: ActivityDayLog = {
        ...day,
        workouts: [newWorkoutItem, ...day.workouts],
      };
      const updatedLogs = { ...prev, [date]: updatedDay };
      saveActivityLogsForUser(session.email, updatedLogs);
      return updatedLogs;
    });
  };

  const handleDeleteWorkout = (date: string, workoutId: string) => {
    if (!session) return;
    setActivityLogs((prev) => {
      const day = prev[date];
      if (!day) return prev;
      const updatedDay: ActivityDayLog = {
        ...day,
        workouts: day.workouts.filter((w) => w.id !== workoutId),
      };
      const updatedLogs = { ...prev, [date]: updatedDay };
      saveActivityLogsForUser(session.email, updatedLogs);
      return updatedLogs;
    });
  };

  const handleUpdateSyncData = (
    date: string,
    service: 'google_fit' | null,
    steps: number,
    calories: number
  ) => {
    if (!session) return;
    setActivityLogs((prev) => {
      const day = prev[date] || {
        date,
        connectedService: null,
        syncedSteps: 0,
        syncedCalories: 0,
        workouts: [],
      };
      const updatedDay: ActivityDayLog = {
        ...day,
        connectedService: service,
        syncedSteps: steps,
        syncedCalories: calories,
      };
      const updatedLogs = { ...prev, [date]: updatedDay };
      saveActivityLogsForUser(session.email, updatedLogs);
      return updatedLogs;
    });
  };

  const handleToggleDiscountCalories = (enabled: boolean) => {
    if (!session) return;
    setDiscountActivityCalories(enabled);
    saveDiscountActivityCaloriesPreference(session.email, enabled);
  };

  // Calculate total activity burned for the selected date
  const currentDayActivity = activityLogs[selectedDate];
  const manualWorkoutBurn = (currentDayActivity?.workouts || []).reduce(
    (sum, w) => sum + (w.caloriesBurned || 0),
    0
  );
  const syncedBurn = currentDayActivity?.syncedCalories || 0;
  const totalActivityBurned = manualWorkoutBurn + syncedBurn;

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
        onOpenInstallPrompt={openPromptManually}
        isInstallable={!isInstalled && (isInstallable || isIOS)}
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
            onNavigateToActivity={() => setActiveTab('activity')}
            totalActivityBurned={totalActivityBurned}
            discountActivityCalories={discountActivityCalories}
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

        {activeTab === 'activity' && (
          <ActivitySection
            profile={profile}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            activityLogs={activityLogs}
            onSaveWorkout={handleSaveWorkout}
            onDeleteWorkout={handleDeleteWorkout}
            onUpdateSyncData={handleUpdateSyncData}
            discountCalories={discountActivityCalories}
            onToggleDiscountCalories={handleToggleDiscountCalories}
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
            onRefreshUserData={() => {
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
              }
            }}
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

      {/* PWA Custom Premium Install Modal */}
      <PWAInstallModal
        isOpen={showPrompt && !isInstalled}
        onClose={closePrompt}
        onInstall={install}
        isIOS={isIOS}
      />

      {/* Global In-App Toast Notification Center */}
      <ToastContainer />
    </div>
  );
}
