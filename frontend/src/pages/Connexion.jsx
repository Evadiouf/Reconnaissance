import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import imgConnexion from '../assets/images/image 12.png'
import authService from '../services/authService';
import { sendVerificationCodes, verifyCode } from '../services/twoFactorService';

function Field({ label, placeholder, type = 'text', value, onChange, name, required = false }) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="font-instrument text-sm font-semibold text-[#002222]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center justify-between gap-4 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-2.5">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="flex-1 bg-transparent outline-none font-instrument text-base text-[#002222] placeholder-[#5A6565]"
        />
      </div>
    </div>
  );
}

function Connexion() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    motDePasse: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isSending2FACode, setIsSending2FACode] = useState(false);
  const [isVerifying2FACode, setIsVerifying2FACode] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [securitySettings, setSecuritySettings] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }

    if (!formData.motDePasse) {
      newErrors.motDePasse = 'Le mot de passe est requis';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await authService.login({
        email: formData.email.trim(),
        password: formData.motDePasse
      });
      
      const { user, token } = result;
      
      // Vérifier que le token a été reçu
      if (!token) {
        throw new Error('Token d\'authentification manquant dans la réponse du serveur');
      }

      if (!user) {
        throw new Error('Données utilisateur manquantes dans la réponse du serveur');
      }
      
      const storedUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const exists = storedUsers.some((u) => u.email === user.email);
      if (!exists) {
        const userRecord = {
          id: user.id || Date.now().toString(),
          prenom: user.prenom || user.firstName || '',
          nom: user.nom || user.lastName || '',
          nomComplet: user.nomComplet || user.fullName || `${user.prenom || user.firstName || ''} ${user.nom || user.lastName || ''}`.trim(),
          nomEntreprise: user.nomEntreprise || user.companyName || '',
          email: user.email,
          roles: user.roles || [],
          dateInscription: user.dateInscription || new Date().toISOString()
        };
        localStorage.setItem('users', JSON.stringify([...storedUsers, userRecord]));
      }

      // Vérifier si l'utilisateur a la 2FA activée
      const savedSecurity = localStorage.getItem('securitySettings');
      if (savedSecurity) {
        const parsed = JSON.parse(savedSecurity);
        if (parsed.twoFactorAuth && parsed.twoFactorPhone && parsed.twoFactorEmail === user.email) {
          // L'utilisateur a la 2FA activée, demander le code
          setLoggedInUser(user);
          setSecuritySettings(parsed);
          setShow2FAModal(true);
          setIsSubmitting(false);
          
          // Envoyer automatiquement les codes
          setIsSending2FACode(true);
          const result = await sendVerificationCodes(parsed.twoFactorPhone, parsed.twoFactorEmail);
          setIsSending2FACode(false);
          
          if (result.success) {
            // Pour les tests, afficher le code dans la console
            console.log('Code de vérification 2FA (pour test):', result.code);
          } else {
            setErrors({ general: 'Erreur lors de l\'envoi des codes de vérification. Veuillez réessayer.' });
            setShow2FAModal(false);
            // Déconnecter l'utilisateur car la 2FA a échoué
            authService.logout();
          }
          return;
        }
      }

      // Pas de 2FA ou 2FA désactivée, rediriger normalement
      alert('Connexion réussie ! Redirection vers le tableau de bord...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      
      // Gestion des erreurs réseau
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        setErrors({ general: 'Impossible de se connecter au serveur. Veuillez vérifier que le backend est démarré sur http://localhost:3000' });
        setIsSubmitting(false);
        return;
      }
      
      // Gestion des erreurs HTTP
      let message = 'Une erreur est survenue lors de la connexion. Veuillez réessayer.';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 401) {
          message = 'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
        } else if (status === 500) {
          message = data?.message || data?.error || 'Erreur serveur interne. Veuillez contacter le support.';
        } else if (status === 400) {
          message = data?.message || data?.error || 'Données invalides. Veuillez vérifier les informations saisies.';
        } else {
          message = data?.message || data?.error || error.message || message;
        }
      } else if (error.message) {
        message = error.message;
      }
      
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Top bar */}
      <div className="w-full h-[70px] bg-white border-b border-[#D4DCDC] flex items-center">
        <div className="max-w-[1440px] w-full mx-auto px-5 sm:px-10 lg:px-20">
          <div className="font-audiowide text-2xl" style={{ color: '#002222' }}>Sen Pointage</div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-2" style={{ minHeight: 'calc(100vh - 70px)' }}>
        {/* Left intro panel */}
        <div className="relative" style={{ background: 'linear-gradient(140deg,#003E3E 44%,#002222 100%)' }}>
          <div className="px-5 sm:px-10 lg:px-20 pt-10 pb-10 md:pb-0">
            <div className="max-w-[544px] space-y-2.5">
              <h1 className="font-audiowide text-5xl leading-tight text-white">
                Bienvenue 
                <br />
                sur SenPointage
              </h1>
              <p className="font-instrument text-base leading-relaxed text-white">
                Connectez-vous pour accéder à votre espace de gestion des présences.
              </p>
            </div>

            {/* Image visuelle (Figma: image 12) */}
            <div className="mt-10 rounded-2xl overflow-hidden max-w-[495px]">
              <img src={imgConnexion} alt="Illustration Connexion" className="w-full h-auto object-cover" />
            </div>
          </div>
        </div>

        {/* Right form card */}
        <div className="flex items-center justify-center px-5 sm:px-10 lg:px-20 py-10">
          <form onSubmit={handleSubmit} className="w-full max-w-[540px] bg-white border border-[#D4DCDC] rounded-2xl p-8 space-y-6">
            {/* Headings */}
            <div className="space-y-2.5">
              <h2 className="font-audiowide text-[34px] leading-none" style={{ color: '#002222' }}>Connexion</h2>
              <p className="font-instrument text-base" style={{ color: '#5A6565' }}>
                Choisissez votre méthode de connexion préférée
              </p>
            </div>

            {/* Fields */}
            <div>
              <Field 
                label="Email" 
                placeholder="votre.email@entreprise.com" 
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
            </div>
            
            <div>
              <Field 
                label="Mot de passe" 
                placeholder="Saisissez votre mot de passe" 
                type="password"
                name="motDePasse"
                value={formData.motDePasse}
                onChange={handleInputChange}
                required
              />
              {errors.motDePasse && <p className="text-red-500 text-sm mt-1">{errors.motDePasse}</p>}
            </div>

            {/* Forgot password */}
            <div className="flex justify-center">
              <Link to="/mot-de-passe-oublie" className="font-instrument text-base underline" style={{ color: '#002222' }}>
                Mot de passe oublié ?
              </Link>
            </div>

            {/* Submit */}
            <div>
              <Button 
                variant="primary" 
                type="submit"
                className="w-full bg-[#0389A6] hover:bg-[#037996] text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
            </div>

            {errors.general && (
              <p className="text-center text-red-500 text-sm">{errors.general}</p>
            )}

            {/* Sign up link */}
            <div className="flex justify-center">
              <p className="font-instrument text-base" style={{ color: '#5A6565' }}>
                Pas encore de compte ?{' '}
                <Link to="/inscription" className="font-instrument text-base font-semibold underline" style={{ color: '#0389A6' }}>
                  S'inscrire
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* Modal 2FA */}
      {show2FAModal && securitySettings && loggedInUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="font-instrument text-xl font-semibold text-[#002222] mb-4">
              Vérification à deux facteurs
            </h3>
            <p className="font-instrument text-sm text-[#5A6565] mb-4">
              Pour sécuriser votre compte, veuillez entrer le code de vérification que vous avez reçu par SMS et email.
            </p>
            
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="font-instrument text-sm text-blue-800">
                Codes envoyés !
              </p>
              <p className="font-instrument text-xs text-blue-600 mt-1">
                Vérifiez votre téléphone ({securitySettings.twoFactorPhone}) et votre email ({securitySettings.twoFactorEmail}) pour obtenir le code à 6 chiffres.
              </p>
            </div>

            <div className="mb-4">
              <label className="font-instrument text-sm font-semibold text-[#002222] mb-2 block">
                Code de vérification <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength="6"
                className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-4 py-2.5 font-instrument text-base text-[#002222] text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <button
                onClick={async () => {
                  setIsSending2FACode(true);
                  const result = await sendVerificationCodes(securitySettings.twoFactorPhone, securitySettings.twoFactorEmail);
                  setIsSending2FACode(false);
                  
                  if (result.success) {
                    alert('Nouveaux codes de vérification envoyés !');
                    console.log('Nouveau code de vérification 2FA (pour test):', result.code);
                  } else {
                    alert('Erreur lors de l\'envoi des codes. Veuillez réessayer.');
                  }
                }}
                disabled={isSending2FACode}
                className="w-full px-4 py-2 text-sm text-[#0389A6] hover:text-[#027A94] underline disabled:opacity-50"
              >
                {isSending2FACode ? 'Envoi en cours...' : 'Renvoyer les codes'}
              </button>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShow2FAModal(false);
                  setTwoFactorCode('');
                  authService.logout();
                  setErrors({ general: 'Connexion annulée. Veuillez vous reconnecter.' });
                }}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-instrument text-sm"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (twoFactorCode.length !== 6) {
                    alert('Veuillez entrer un code à 6 chiffres');
                    return;
                  }
                  
                  setIsVerifying2FACode(true);
                  const result = verifyCode(twoFactorCode, securitySettings.twoFactorPhone, securitySettings.twoFactorEmail);
                  
                  if (result.valid) {
                    // Code valide, finaliser la connexion
                    setShow2FAModal(false);
                    setTwoFactorCode('');
                    alert('Connexion réussie ! Redirection vers le tableau de bord...');
                    navigate('/dashboard');
                  } else {
                    alert('Code invalide. Veuillez réessayer.');
                    setTwoFactorCode('');
                  }
                  setIsVerifying2FACode(false);
                }}
                disabled={isVerifying2FACode || twoFactorCode.length !== 6}
                className="flex-1 px-4 py-2.5 bg-[#0389A6] text-white rounded-xl hover:bg-[#027A94] transition-colors font-instrument text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying2FACode ? 'Vérification...' : 'Vérifier et continuer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Connexion;
