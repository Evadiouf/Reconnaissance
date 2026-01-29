import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import imgImage13 from '../assets/images/image 13.png';
import authService from '../services/authService';

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M3 12C4.8 7.8 8.1 5 12 5C15.9 5 19.2 7.8 21 12C19.2 16.2 15.9 19 12 19C8.1 19 4.8 16.2 3 12Z"
          stroke="#5A6565"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
          stroke="#5A6565"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M3 12C4.8 7.8 8.1 5 12 5C15.9 5 19.2 7.8 21 12C19.2 16.2 15.9 19 12 19C8.1 19 4.8 16.2 3 12Z"
        stroke="#5A6565"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 4L20 20"
        stroke="#5A6565"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Field({ label, placeholder, type = 'text', value, onChange, name, required = false, error }) {
  const [isVisible, setIsVisible] = useState(false);
  const isPassword = type === 'password';

  return (
    <div className="flex flex-col gap-0.5">
      <label className="font-instrument text-sm font-semibold text-[#002222]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex items-center justify-between gap-4 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-2.5">
        <input
          type={isPassword ? (isVisible ? 'text' : 'password') : type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          className="flex-1 bg-transparent outline-none font-instrument text-base text-[#002222] placeholder-[#5A6565]"
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setIsVisible((v) => !v)}
            className="shrink-0"
            aria-label={isVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            title={isVisible ? 'Masquer' : 'Afficher'}
          >
            <EyeIcon open={isVisible} />
          </button>
        )}
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
}

function ReinitialiserMotDePasse() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') || '';
  
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!formData.newPassword) {
      newErrors.newPassword = 'Le nouveau mot de passe est requis';
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Le mot de passe doit contenir au moins 6 caractères';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Veuillez confirmer le mot de passe';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Les mots de passe ne correspondent pas';
    }

    if (!token) {
      newErrors.general = 'Token de réinitialisation manquant. Veuillez utiliser le lien reçu par email.';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');

    try {
      const email = searchParams.get('email') || '';
      await authService.resetPassword({
        token,
        newPassword: formData.newPassword,
        email
      });
      setSuccessMessage('Mot de passe réinitialisé avec succès ! Redirection vers la page de connexion...');
      setTimeout(() => {
        navigate('/connexion');
      }, 2000);
    } catch (error) {
      console.error('Erreur lors de la réinitialisation:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Une erreur est survenue. Le token est peut-être invalide ou expiré.';
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
          <div className="px-5 sm:px-10 lg:px-20 pt-10">
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
          </div>
          {/* Image 13 */}
          <div className="absolute bottom-0 left-0 w-full flex justify-center pb-10">
            <div className="w-[529px] h-[529px] overflow-hidden opacity-70">
              <img src={imgImage13} alt="SenPointage" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>

        {/* Right form card */}
        <div className="flex items-center justify-center px-5 sm:px-10 lg:px-20 py-10">
          <form onSubmit={handleSubmit} className="w-full max-w-[540px] bg-white border border-[#D4DCDC] rounded-2xl p-8 space-y-6">
            {/* Headings */}
            <div className="space-y-2.5">
              <h2 className="font-audiowide text-[34px] leading-snug" style={{ color: '#002222' }}>Réinitialisation du mot de passe</h2>
              <p className="font-instrument text-base" style={{ color: '#5A6565' }}>
                Créez un nouveau mot de passe sécurisé pour votre compte
              </p>
            </div>

            <Field 
              label="Nouveau mot de passe" 
              placeholder="Saisissez le nouveau mot de passe" 
              type="password"
              name="newPassword"
              value={formData.newPassword}
              onChange={handleInputChange}
              required
              error={errors.newPassword}
            />
            <Field 
              label="Confirmer le mot de passe" 
              placeholder="Confirmer votre mot de passe" 
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              required
              error={errors.confirmPassword}
            />

            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                <p className="font-instrument text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {errors.general && (
              <p className="text-center text-red-500 text-sm">{errors.general}</p>
            )}

            <div>
              <Button 
                variant="primary" 
                type="submit"
                className="w-full bg-[#0389A6] hover:bg-[#037996] text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isSubmitting || !token}
              >
                {isSubmitting ? 'Réinitialisation en cours...' : 'Réinitialiser le mot de passe'}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white" />
              <Link to="/connexion" className="font-instrument text-base" style={{ color: '#3E4B4B' }}>
                Retour à la connexion
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ReinitialiserMotDePasse;

