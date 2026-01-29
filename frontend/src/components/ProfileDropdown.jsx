import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import { getUserData, onUserDataUpdate } from '../services/userDataService';
import { useLanguage } from '../contexts/LanguageContext';
import { translations } from '../utils/translations';

function ProfileDropdown() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  
  // Fonction pour obtenir la traduction
  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  // Charger les données utilisateur et la photo de profil au montage
  useEffect(() => {
    const { user: currentUser } = authService.getStoredAuth();
    const mergedUser = getUserData() || currentUser;
    setUser(mergedUser);
    
    // Charger la photo de profil depuis localStorage uniquement si elle appartient à cet utilisateur
    if (mergedUser && mergedUser.email) {
      const userEmail = mergedUser.email.toLowerCase();
      const savedProfileImage = localStorage.getItem(`profileImage_${userEmail}`);
      if (savedProfileImage) {
        setProfileImage(savedProfileImage);
      } else {
        // S'assurer qu'il n'y a pas d'ancienne photo globale
        setProfileImage(null);
      }
    } else {
      // Pas d'utilisateur connecté, pas de photo
      setProfileImage(null);
    }
  }, []);

  // Garder le dropdown synchronisé quand les données utilisateur changent (MonProfil / updateUserData)
  useEffect(() => {
    const unsubscribe = onUserDataUpdate((updated) => {
      setUser(updated);

      if (updated?.email) {
        const userEmail = updated.email.toLowerCase();
        const savedProfileImage = localStorage.getItem(`profileImage_${userEmail}`);
        setProfileImage(savedProfileImage || null);
      }
    });

    return unsubscribe;
  }, []);

  // Écouter les changements de photo de profil
  useEffect(() => {
    const handleProfileImageUpdate = (event) => {
      if (event.detail) {
        // Vérifier que la photo appartient à l'utilisateur actuel
        const { user: currentUser } = authService.getStoredAuth();
        if (currentUser && currentUser.email) {
          const userEmail = currentUser.email.toLowerCase();
          
          // Si l'événement contient un objet avec userEmail, vérifier qu'il correspond
          if (typeof event.detail === 'object' && event.detail.userEmail) {
            if (event.detail.userEmail === userEmail) {
              setProfileImage(event.detail.imageDataUrl);
            }
          } else if (typeof event.detail === 'string') {
            // Ancien format (string directe) - pour compatibilité
            setProfileImage(event.detail);
          }
        }
      }
    };

    window.addEventListener('profileImageUpdated', handleProfileImageUpdate);
    
    return () => {
      window.removeEventListener('profileImageUpdated', handleProfileImageUpdate);
    };
  }, []);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      try {
        if (!event.target) return;
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      } catch (error) {
        console.error('Erreur dans handleClickOutside:', error);
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const UserIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 10C11.8409 10 13.3333 8.50762 13.3333 6.66667C13.3333 4.82572 11.8409 3.33333 10 3.33333C8.15905 3.33333 6.66667 4.82572 6.66667 6.66667C6.66667 8.50762 8.15905 10 10 10Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16.6667 17.5V16.6667C16.6667 15.0076 15.0076 13.3333 13.3333 13.3333H6.66667C4.99238 13.3333 3.33333 15.0076 3.33333 16.6667V17.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const LogoutIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.5 17.5H4.16667C3.24619 17.5 2.5 16.7538 2.5 15.8333V4.16667C2.5 3.24619 3.24619 2.5 4.16667 2.5H7.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M13.3333 14.1667L17.5 10L13.3333 5.83333" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M17.5 10H7.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Construire le nom complet de l'utilisateur
  const getUserName = () => {
    if (!user) return 'Utilisateur';
    
    // Essayer d'abord le nom complet
    if (user.nomComplet && user.nomComplet.trim()) {
      return user.nomComplet.trim();
    }
    
    // Sinon construire à partir de prénom et nom
    const prenom = user.prenom || user.firstName || '';
    const nom = user.nom || user.lastName || '';
    const fullName = `${prenom} ${nom}`.trim();
    
    if (fullName) {
      return fullName;
    }
    
    // Sinon utiliser l'email ou un nom par défaut
    return user.email || 'Utilisateur';
  };

  // Obtenir le rôle de l'utilisateur
  const getUserRole = () => {
    if (!user) return 'Admin';
    
    // Essayer de récupérer le rôle depuis les données utilisateur
    return user.role || user.roleName || 'Admin';
  };

  const userName = getUserName();
  const userRole = getUserRole();

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-2 py-1 hover:bg-[#D4DCDC] transition-colors cursor-pointer"
      >
        <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#ddd] flex items-center justify-center">
          {profileImage ? (
          <img 
              src={profileImage} 
            alt="Profile" 
            className="w-full h-full object-cover"
          />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#ECEFEF] text-[#5A6565] font-instrument text-xs font-semibold">
              {userName ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
            </div>
          )}
        </div>
        <div className="leading-tight">
          <div className="font-instrument text-sm font-semibold text-[#002222]">{userName}</div>
          <div className="font-instrument text-xs text-[#5A6565]">{userRole}</div>
        </div>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {isOpen && (
        <div 
          className="absolute top-full right-0 mt-2 bg-white rounded-[20px] border border-[#D4DCDC] overflow-hidden z-50"
          style={{ 
            width: '240px',
            boxShadow: '0px 4px 4px 0px rgba(0, 0, 0, 0.08)',
            padding: '10px'
          }}
        >
          {/* Header avec profil */}
          <div className="flex items-center gap-[30px] px-2.5 py-1.5 rounded-[20px]">
            <div className="flex items-center gap-4">
              <div className="w-[38px] h-[38px] rounded-[19px] overflow-hidden border border-[#D4DCDC] flex-shrink-0 flex items-center justify-center bg-[#ECEFEF]">
                {profileImage ? (
                <img 
                    src={profileImage} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[#5A6565] font-instrument text-xs font-semibold">
                    {userName ? userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-0.5">
                <div className="font-instrument text-base font-semibold text-[#002222] leading-[18px]">
                  {userName}
                </div>
                <div className="font-instrument text-xs text-[#5A6565] leading-[18px]">
                  {userRole === 'Admin' ? 'Administrateur' : userRole}
                </div>
              </div>
            </div>
          </div>

          {/* Séparateur */}
          <div className="h-px bg-[#D4DCDC] my-2.5"></div>

          {/* Menu items */}
          <button
            type="button"
            onClick={() => {
              navigate('/mon-profil');
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-2.5 py-[11px] rounded-[20px] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
          >
            <UserIcon />
            <span className="font-instrument text-base text-[#5A6565] leading-[18px]">
              {t('Voir profil')}
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              authService.logout();
              navigate('/connexion');
              setIsOpen(false);
            }}
            className="w-full flex items-center gap-4 px-2.5 py-[11px] rounded-[20px] hover:bg-[#ECEFEF] transition-colors cursor-pointer"
          >
            <LogoutIcon />
            <span className="font-instrument text-base text-[#5A6565] leading-[18px]">
              {t('Se déconnecter')}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

export default ProfileDropdown;

