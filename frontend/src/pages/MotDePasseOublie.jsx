import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import imgConnexion from '../assets/images/image 12.png';
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

function MotDePasseOublie() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [resetLink, setResetLink] = useState('');

  const handleInputChange = (e) => {
    const { value } = e.target;
    setEmail(value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
    setSuccessMessage('');
    setResetLink('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage('');
    setResetLink('');

    try {
      const result = await authService.forgotPassword({ email: email.trim() });
      
      // L'API backend a envoyé l'email via Mailjet
      setSuccessMessage('Si cet email existe dans notre système, un lien de réinitialisation a été envoyé par email.');
      setResetLink('');
      
      // En mode développement, afficher un message d'information
      if (result.resetToken) {
        const resetUrl = `${window.location.origin}/reinitialiser-mot-de-passe?token=${result.resetToken}&email=${encodeURIComponent(email.trim())}`;
        setResetLink(resetUrl);
        setSuccessMessage('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
      }
    } catch (error) {
      console.error('Erreur lors de la demande de réinitialisation:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Une erreur est survenue. Veuillez réessayer.';
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
              <h2 className="font-audiowide text-[34px] leading-none" style={{ color: '#002222' }}>Mot de passe oublié</h2>
              <p className="font-instrument text-base" style={{ color: '#5A6565' }}>
                Entrez votre adresse email pour recevoir un lien de réinitialisation
              </p>
            </div>

            {/* Fields */}
            <Field 
              label="Email" 
              placeholder="votre.email@entreprise.com" 
              type="email"
              name="email"
              value={email}
              onChange={handleInputChange}
              required
              error={errors.email}
            />

            {successMessage && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl space-y-3">
                <p className="font-instrument text-sm text-green-700">{successMessage}</p>
                
                {resetLink && (
                  <div className="space-y-2">
                    <p className="font-instrument text-xs text-green-600">
                      🔗 Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe :
                    </p>
                    <div className="bg-white border border-green-300 rounded-lg p-3">
                      <a 
                        href={resetLink}
                        className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {resetLink}
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(resetLink);
                          alert('Lien copié dans le presse-papiers !');
                        }}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"
                      >
                        📋 Copier le lien
                      </button>
                      <a
                        href={resetLink}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                      >
                        🔗 Ouvrir le lien
                      </a>
                    </div>
                    <p className="font-instrument text-xs text-gray-500">
                      💡 En production, ce lien serait envoyé automatiquement par email
                    </p>
                  </div>
                )}
              </div>
            )}

            {errors.general && (
              <p className="text-center text-red-500 text-sm">{errors.general}</p>
            )}

            {/* Submit */}
            <div>
              <Button 
                variant="primary" 
                type="submit"
                className="w-full bg-[#0389A6] hover:bg-[#037996] text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer le lien de réinitialisation'}
              </Button>
            </div>

            {/* Back to login */}
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

export default MotDePasseOublie;
