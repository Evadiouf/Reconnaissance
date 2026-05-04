import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';

const KioskSessionContext = createContext(null);

export function KioskSessionProvider({ children }) {
  const userPausedKioskRef = useRef(false);
  const [kioskActive, setKioskActive] = useState(false);

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
   * Activer / désactiver sans toucher à userPaused — désactivation RH, reconnect HLS, etc.
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
