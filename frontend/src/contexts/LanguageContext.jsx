import { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    // Charger la langue depuis localStorage ou utiliser 'Français' par défaut
    const savedLanguage = localStorage.getItem('interfaceLanguage');
    const savedSettings = localStorage.getItem('appearanceSettings');
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        return parsed.interfaceLanguage || savedLanguage || 'Français';
      } catch (e) {
        return savedLanguage || 'Français';
      }
    }
    
    return savedLanguage || 'Français';
  });

  useEffect(() => {
    // Sauvegarder la langue dans localStorage
    localStorage.setItem('interfaceLanguage', language);
    
    // Mettre à jour appearanceSettings si nécessaire
    const savedSettings = localStorage.getItem('appearanceSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        parsed.interfaceLanguage = language;
        localStorage.setItem('appearanceSettings', JSON.stringify(parsed));
      } catch (e) {
        // Ignorer les erreurs
      }
    }
  }, [language]);

  const changeLanguage = (newLanguage) => {
    setLanguage(newLanguage);
    // Déclencher un événement pour notifier les autres composants
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: newLanguage }));
  };

  return (
    <LanguageContext.Provider value={{ language, changeLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

