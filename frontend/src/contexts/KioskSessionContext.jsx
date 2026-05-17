import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const KioskSessionContext = createContext(null);

const STORAGE_KEY = 'kioskActive';

export function KioskSessionProvider({ children }) {
  const userPausedKioskRef = useRef(false);

  const [kioskActive, setKioskActive] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // Persiste l'état dans localStorage pour survivre aux rafraîchissements de page
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(kioskActive));
    } catch (_) {}
  }, [kioskActive]);

  // Restaure userPausedKioskRef selon l'état persisté au démarrage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'false') {
        // Le kiosque avait été arrêté explicitement
        userPausedKioskRef.current = true;
      }
    } catch (_) {}
  }, []);

  /** Démarrage explicite (bouton ou auto-config) — efface la pause utilisateur */
  const startKiosk = useCallback(() => {
    userPausedKioskRef.current = false;
    setKioskActive(true);
  }, []);

  /** Arrêt explicite — marque comme pause utilisateur (bloque auto-démarrage config) */
  const stopKiosk = useCallback(() => {
    userPausedKioskRef.current = true;
    setKioskActive(false);
  }, []);

  /**
   * Activer / désactiver sans toucher à userPaused — reconnect HLS, auto-start schedule, etc.
   */
  const setKioskRunning = useCallback((active) => {
    setKioskActive(!!active);
  }, []);

  const value = useMemo(
    () => ({
      kioskActive,
      userPausedKioskRef,
      startKiosk,
      stopKiosk,
      setKioskRunning,
    }),
    [kioskActive, startKiosk, stopKiosk, setKioskRunning],
  );

  return (
    <KioskSessionContext.Provider value={value}>
      {children}
    </KioskSessionContext.Provider>
  );
}

export function useKioskSession() {
  const ctx = useContext(KioskSessionContext);
  if (!ctx) {
    throw new Error('useKioskSession must be used within KioskSessionProvider');
  }
  return ctx;
}
