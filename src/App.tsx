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
import { LeaderboardModal } from './components/LeaderboardModal';
import { calculateStreakStats } from './utils/streakCalculations';
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
  supabaseCheckUserSubscription,
  supabaseSubscribeToUserData,
  emailToUuid,
  isSupabaseConfigured
} from './services/supabaseService';
import { supabase } from './lib/supabase';
import { cloudSyncService } from './services/cloudSyncService';
import { saveStravaConfig } from './services/stravaService';
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
  WorkoutItem,
  ConnectedActivityService
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
  grantVipToUser,
  recordSubscriptionTransaction,
  loadActivityLogsForUser,
  saveActivityLogsForUser,
  loadDiscountActivityCaloriesPreference,
  saveDiscountActivityCaloriesPreference,
  isFounderEmail
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
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState<boolean>(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier>(() => {
    const initialSession = loadActiveSession();
    if (!initialSession) return 'free';
    if (isFounderEmail(initialSession.email)) return 'vip';
    return getUserTier(initialSession.email);
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
          const isFounder = isFounderEmail(email);
          const newSess: UserSession = {
            email,
            name,
            userId: sbSession.user.id,
            isFounder,
            tier: isFounder ? 'vip' : 'free',
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
          const isFounder = isFounderEmail(email);
          const updated: UserSession = {
            email,
            name,
            userId: sbSession.user.id,
            isFounder,
            tier: isFounder ? 'vip' : 'free',
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

  // Handle return from Strava OAuth redirect on mobile
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const search = window.location.search;
      if (search.includes('strava_connected=1') || search.includes('st_token')) {
        setActiveTab('activity');
      }
    }
  }, []);

  // Whenever session changes, reload that user's private data & connect automatic Realtime sync
  useEffect(() => {
    if (!session) return;

    const email = session.email;
    const userId = session.userId || emailToUuid(email);
    const isFounder = isFounderEmail(email);

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
    setCurrentTier(isFounder ? 'vip' : getUserTier(email));

    // Subscription & VIP tier synchronization from Supabase / Cloud
    supabaseCheckUserSubscription(email, userId)
      .then((remoteTier) => {
        if (isFounder) {
          setCurrentTier('vip');
          setUserTier(email, 'vip');
          grantVipToUser(email);
          return;
        }
        if (remoteTier) {
          setCurrentTier(remoteTier);
          setUserTier(email, remoteTier);
          if (remoteTier === 'vip') {
            grantVipToUser(email);
          }
        }
      })
      .catch(() => {});

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
            if (remoteTime > localTime + 2000 && hasRealBiometrics) {
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
            const cloudProfileTime = cloudData.profile?.updatedAt 
              ? new Date(cloudData.profile.updatedAt).getTime() 
              : 0;

            const hasRealCloudBiometrics = cloudData.profile?.age && cloudData.profile?.heightCm && cloudData.profile?.weightKg;
            if (cloudProfileTime > localTime + 2000 && hasRealCloudBiometrics) {
              const mergedProfile: UserProfile = { ...currentLocal, ...cloudData.profile };
              saveStoredProfileForUser(email, mergedProfile);
              return mergedProfile;
            } else if (localTime >= cloudProfileTime && currentLocal.weightKg) {
              // Local profile is newer, ensure cloud backend is kept up to date
              cloudSyncService.pushUserData({
                email,
                name: session.name,
                profile: currentLocal,
                userId: session.userId,
              }).catch(() => {});
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
        if (cloudData.activityLogs && Object.keys(cloudData.activityLogs).length > 0) {
          setActivityLogs((prev) => {
            const merged = { ...prev, ...cloudData.activityLogs };
            saveActivityLogsForUser(email, merged);
            return merged;
          });
        }
        if (typeof cloudData.discountActivityCalories === 'boolean') {
          setDiscountActivityCalories(cloudData.discountActivityCalories);
          saveDiscountActivityCaloriesPreference(email, cloudData.discountActivityCalories);
        }
        if (cloudData.stravaConfig && cloudData.stravaConfig.accessToken) {
          try {
            saveStravaConfig(cloudData.stravaConfig, email);
            localStorage.setItem('nutrifit_active_activity_tab', 'strava');
          } catch {}
        }
        if (cloudData.tier) {
          const effectiveTier = isFounder ? 'vip' : cloudData.tier;
          setCurrentTier(effectiveTier);
          setUserTier(email, effectiveTier);
        }
      }
    }).catch((err) => console.warn('Cloud sync pull notice:', err));

    // Real-time synchronization across devices (Mobile <-> PC):
    // Whenever the user switches back to this window or tab, pull the latest state
    const handleRecheckSync = () => {
      cloudSyncService.pullUserData(email).then((cloudData) => {
        if (!cloudData) return;
        if (cloudData.dailyLogs && Object.keys(cloudData.dailyLogs).length > 0) {
          setDailyLogs((prev) => {
            const merged = { ...prev, ...cloudData.dailyLogs };
            saveDailyLogsForUser(email, merged);
            return merged;
          });
        }
        if (cloudData.activityLogs && Object.keys(cloudData.activityLogs).length > 0) {
          setActivityLogs((prev) => {
            const merged = { ...prev, ...cloudData.activityLogs };
            saveActivityLogsForUser(email, merged);
            return merged;
          });
        }
        if (typeof cloudData.discountActivityCalories === 'boolean') {
          setDiscountActivityCalories(cloudData.discountActivityCalories);
        }
        if (cloudData.stravaConfig && cloudData.stravaConfig.accessToken) {
          saveStravaConfig(cloudData.stravaConfig, email);
        }
      }).catch(() => {});
    };

    window.addEventListener('focus', handleRecheckSync);
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleRecheckSync();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Check browser periodic notifications
    notificationService.schedulePeriodicReminders();

    return () => {
      unsubscribeRealtime();
      window.removeEventListener('focus', handleRecheckSync);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
    supabaseCheckUserSubscription(newSession.email, newSession.userId)
      .then((remoteTier) => {
        if (remoteTier) {
          setCurrentTier(remoteTier);
          setUserTier(newSession.email, remoteTier);
          if (remoteTier === 'vip') {
            grantVipToUser(newSession.email);
          }
        }
      })
      .catch(() => {});
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

  // Handle start 30-day free trial
  const handleStartTrial = () => {
    if (!session) return;
    setCurrentTier('pro_trial');
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
      updatedAt: new Date().toISOString(),
    };
    setProfile(profileWithTime);
    saveStoredProfileForUser(session.email, profileWithTime);

    // Provide immediate in-app Toast notification confirmation as requested by user
    notificationService.notifySuccess(
      '¡Perfil Guardado con Éxito!',
      `Tus datos (${profileWithTime.age} años, ${profileWithTime.heightCm} cm, ${profileWithTime.weightKg} kg) y metas metabólicas (${profileWithTime.targetCalories} kcal) se guardaron y sincronizaron correctamente.`
    );

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

  // Edit food item in a date log
  const handleEditFoodItem = (date: string, updatedItem: FoodItem) => {
    if (!session) return;
    setDailyLogs((prev) => {
      const existingLog = prev[date];
      if (!existingLog) return prev;
      const updatedLogs: Record<string, DailyLog> = {
        ...prev,
        [date]: {
          ...existingLog,
          items: existingLog.items.map((i) => (i.id === updatedItem.id ? updatedItem : i)),
        },
      };
      saveDailyLogsForUser(session.email, updatedLogs);
      return updatedLogs;
    });

    // Sync to Cloud
    cloudSyncService.pushUserData({
      email: session.email,
      dailyLogs: {
        [date]: {
          date,
          items: [updatedItem],
        },
      },
      userId: session.userId,
    }).catch(() => {});

    if (isSupabaseConfigured) {
      supabaseAddFoodItem(session.email, date, updatedItem, session.userId).catch((err) =>
        console.warn('Supabase edit food notice:', err)
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

  // Toggle close day and trigger database synchronization
  const handleToggleCloseDay = (date: string) => {
    if (!session) return;
    setDailyLogs((prev) => {
      const existingLog = prev[date] || { date, items: [] };
      const willClose = !existingLog.isClosed;
      const updatedDay: DailyLog = {
        ...existingLog,
        isClosed: willClose,
        closedAt: willClose ? new Date().toISOString() : undefined,
      };
      const updatedLogs: Record<string, DailyLog> = {
        ...prev,
        [date]: updatedDay,
      };
      saveDailyLogsForUser(session.email, updatedLogs);

      // Persistir y sincronizar inmediatamente en la base de datos
      cloudSyncService.pushUserData({
        email: session.email,
        name: session.name,
        profile,
        dailyLogs: updatedLogs,
        userId: session.userId,
      }).catch((err) => console.warn('Cloud sync close day notice:', err));

      if (willClose) {
        notificationService.notifySuccess(
          '¡Día Cerrado con Éxito!',
          'Registro guardado y sincronizado en la base de datos.'
        );
      } else {
        notificationService.notifyInfo(
          'Día Reabierto',
          'El día está ahora disponible para edición y nuevos alimentos.'
        );
      }

      return updatedLogs;
    });
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
      cloudSyncService.pushUserData({
        email: session.email,
        activityLogs: updatedLogs,
        discountActivityCalories,
      }).catch(() => {});
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
      cloudSyncService.pushUserData({
        email: session.email,
        activityLogs: updatedLogs,
        discountActivityCalories,
      }).catch(() => {});
      return updatedLogs;
    });
  };

  const handleUpdateSyncData = (
    date: string,
    service: ConnectedActivityService,
    steps: number,
    calories: number,
    deviceModel?: string,
    isCalibratedManually?: boolean
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
        deviceModel: deviceModel ?? day.deviceModel,
        isCalibratedManually: isCalibratedManually ?? day.isCalibratedManually,
        lastSyncedAt: new Date().toISOString(),
      };
      const updatedLogs = { ...prev, [date]: updatedDay };
      saveActivityLogsForUser(session.email, updatedLogs);
      cloudSyncService.pushUserData({
        email: session.email,
        activityLogs: updatedLogs,
        discountActivityCalories,
      }).catch(() => {});
      return updatedLogs;
    });
  };

  const handleToggleDiscountCalories = (enabled: boolean) => {
    if (!session) return;
    setDiscountActivityCalories(enabled);
    saveDiscountActivityCaloriesPreference(session.email, enabled);
    cloudSyncService.pushUserData({
      email: session.email,
      discountActivityCalories: enabled,
    }).catch(() => {});
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
        onOpenLeaderboard={() => setIsLeaderboardOpen(true)}
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
            onEditFoodItem={handleEditFoodItem}
            onUpdateWater={handleUpdateWater}
            onToggleCloseDay={handleToggleCloseDay}
            onOpenProfile={() => setActiveTab('profile')}
            onNavigateToScanner={() => setActiveTab('scanner')}
            onNavigateToActivity={() => setActiveTab('activity')}
            totalActivityBurned={totalActivityBurned}
            discountActivityCalories={discountActivityCalories}
            userEmail={session.email}
            currentTier={currentTier}
            onOpenPlansModal={() => setIsPlansModalOpen(true)}
            onUpdateProfile={handleUpdateProfile}
            weightHistory={weightHistory}
            measurements={measurements}
          />
        )}

        {activeTab === 'foods' && (
          <FoodsSection
            userEmail={session.email}
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
            userEmail={session.email}
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
        onStartTrial={handleStartTrial}
      />

      {/* PWA Custom Premium Install Modal */}
      <PWAInstallModal
        isOpen={showPrompt && !isInstalled}
        onClose={closePrompt}
        onInstall={install}
        isIOS={isIOS}
      />

      {/* Community Leaderboard & Military Escalafón Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        currentUserStreak={calculateStreakStats(dailyLogs, profile).currentStreak}
        currentUserName={profile.name || session?.name || 'David De Salvo'}
        currentUserEmail={session?.email || 'daviddesalvo.5c@gmail.com'}
      />

      {/* Global In-App Toast Notification Center */}
      <ToastContainer />
    </div>
  );
}
