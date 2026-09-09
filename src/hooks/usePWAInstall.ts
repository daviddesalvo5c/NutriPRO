import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Detect if already installed / running in standalone mode or added to home screen
    const checkStandalone = (): boolean => {
      const matchStandalone = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
      const navStandalone = typeof window !== 'undefined' && (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const matchFullscreen = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches;
      const matchMinimalUi = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches;
      const androidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');
      const storedInstalled = typeof localStorage !== 'undefined' && localStorage.getItem('pwa_installed') === 'true';

      return Boolean(matchStandalone || navStandalone || matchFullscreen || matchMinimalUi || androidApp || storedInstalled);
    };

    const isStandalone = checkStandalone();
    setIsInstalled(isStandalone);

    // Detect iOS devices (iPhone, iPad, iPod)
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent.toLowerCase() : '';
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // If already installed in standalone mode, ignore prompt and do not show button
      if (checkStandalone()) {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowPrompt(false);
        return;
      }

      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Check if user snoozed in the last 3 days
      const snoozedAt = localStorage.getItem('pwa_install_snoozed_at');
      if (snoozedAt) {
        const diffHours = (Date.now() - Number(snoozedAt)) / (1000 * 60 * 60);
        if (diffHours < 72) {
          return;
        }
      }

      setShowPrompt(true);
    };

    const handleAppInstalled = () => {
      console.log('[PWA] Application installed event detected! Hiding install triggers.');
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
      localStorage.setItem('pwa_installed', 'true');
    };

    // Listen for display-mode media query changes in real time
    let standaloneMedia: MediaQueryList | null = null;
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    };

    if (typeof window !== 'undefined' && window.matchMedia) {
      standaloneMedia = window.matchMedia('(display-mode: standalone)');
      if (standaloneMedia.addEventListener) {
        standaloneMedia.addEventListener('change', handleDisplayModeChange);
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (standaloneMedia && standaloneMedia.removeEventListener) {
        standaloneMedia.removeEventListener('change', handleDisplayModeChange);
      }
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowPrompt(false);
      return true;
    }
    return false;
  };

  const snooze = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_install_snoozed_at', Date.now().toString());
  };

  const openPromptManually = () => {
    setShowPrompt(true);
  };

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    showPrompt,
    install,
    snooze,
    openPromptManually,
    closePrompt: () => setShowPrompt(false),
  };
}
