import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import apiClient from '../services/apiClient';

function Contact() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    category: '',
    subject: '',
    description: '',
    email: '',
    phone: ''
  });
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const dropdownRef = useRef(null);

  // Fermer le dropdown si on clique en dehors
  useEffect(() => {
    if (!isCategoryDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCategoryDropdownOpen]);

  const categories = [
    'Problème technique',
    'Question sur les fonctionnalités',
    'Demande d\'assistance',
    'Problème de facturation',
    'Suggestion d\'amélioration',
    'Signalement de bug',
    'Autre'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.category.trim()) {
      newErrors.category = 'La catégorie est requise';
    }
    if (!formData.subject.trim()) {
      newErrors.subject = 'Le sujet est requis';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La description est requise';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const generateRequestNumber = () => {
    const randomNum = Math.floor(Math.random() * 100000000);
    return `REQ-${randomNum}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await apiClient.post('/api/v1/support-requests', {
        category: formData.category,
        subject: formData.subject,
        description: formData.description,
        email: formData.email,
        phone: formData.phone || undefined,
      });

      const reqNumber = response?.data?.requestNumber || '';
      setRequestNumber(reqNumber);
      setShowSuccess(true);
    } catch (error) {
      console.error('Erreur lors de l\'envoi de la demande:', error);
      const message =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Une erreur est survenue lors de l\'envoi de votre demande. Veuillez réessayer.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      category: '',
      subject: '',
      description: '',
      email: '',
      phone: ''
    });
    setErrors({});

    navigate(-1);
  };

  // Icônes SVG
  const CallIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 3.33333C2.5 2.89131 2.67559 2.46738 2.98816 2.15482C3.30072 1.84226 3.72464 1.66667 4.16667 1.66667H6.66667C7.10869 1.66667 7.53262 1.84226 7.84518 2.15482C8.15774 2.46738 8.33333 2.89131 8.33333 3.33333V5.83333C8.33333 6.27536 8.15774 6.69928 7.84518 7.01184C7.53262 7.32441 7.10869 7.5 6.66667 7.5H5.83333M2.5 16.6667C2.5 17.1087 2.67559 17.5326 2.98816 17.8452C3.30072 18.1577 3.72464 18.3333 4.16667 18.3333H6.66667C7.10869 18.3333 7.53262 18.1577 7.84518 17.8452C8.15774 17.5326 8.33333 17.1087 8.33333 16.6667V14.1667C8.33333 13.7246 8.15774 13.3007 7.84518 12.9882C7.53262 12.6756 7.10869 12.5 6.66667 12.5H5.83333" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M11.6667 1.66667C12.1087 1.66667 12.5326 1.84226 12.8452 2.15482C13.1577 2.46738 13.3333 2.89131 13.3333 3.33333V5.83333C13.3333 6.27536 13.1577 6.69928 12.8452 7.01184C12.5326 7.32441 12.1087 7.5 11.6667 7.5H10.8333M11.6667 18.3333C12.1087 18.3333 12.5326 18.1577 12.8452 17.8452C13.1577 17.5326 13.3333 17.1087 13.3333 16.6667V14.1667C13.3333 13.7246 13.1577 13.3007 12.8452 12.9882C12.5326 12.6756 12.1087 12.5 11.6667 12.5H10.8333" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const MailIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 5L10 10L17.5 5M2.5 5C2.5 4.07989 3.24619 3.33333 4.16667 3.33333H15.8333C16.7538 3.33333 17.5 4.07989 17.5 5M2.5 5V15C2.5 15.9201 3.24619 16.6667 4.16667 16.6667H15.8333C16.7538 16.6667 17.5 15.9201 17.5 15V5" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const CheckmarkIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="#0389A6" strokeWidth="1.5"/>
      <path d="M8 12L11 15L16 9" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  const ArrowDownIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );

  // Page de succès
  if (showSuccess) {
    return (
      <div className="min-h-screen flex flex-col bg-dark-bg">
        <Navbar />
        <main className="flex-grow flex items-center justify-center py-20 px-5">
          <div className="bg-white rounded-[30px] w-full max-w-[469px] p-[30px]">
            <div className="flex flex-col items-center gap-5">
              {/* Icône de succès */}
              <div className="w-[60px] h-[60px] rounded-2xl bg-[rgba(1,160,78,0.1)] flex items-center justify-center">
                <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="15" cy="15" r="12.5" stroke="#01A04E" strokeWidth="2.5"/>
                  <path d="M10 15L13.5 18.5L20 12" stroke="#01A04E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              {/* Texte de succès */}
              <div className="flex flex-col items-center gap-[22px] w-full">
                <div className="flex flex-col items-center gap-1.5 w-full">
                  <h2 className="font-instrument text-base font-bold text-[#002222] leading-[34px] text-center">
                    Demande envoyée avec succès !
                  </h2>
                  <p className="font-instrument text-sm text-[#5A6565] leading-[24px] text-center">
                    Numéro de demande: {requestNumber}
                  </p>
                  <p className="font-instrument text-sm text-[#5A6565] leading-[24px] text-center">
                    Nous vous contacterons sous 24h
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Formulaire de contact
  return (
    <div className="min-h-screen flex flex-col bg-dark-bg">
      <Navbar />
      <main className="flex-grow py-20 px-5 sm:px-10 lg:px-20">
        <div className="max-w-[694px] mx-auto">
          <div className="bg-white border border-[#D4DCDC] rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
              <h2 className="font-instrument text-base font-semibold text-[#002222] leading-[24px]">
                Contacter le support
              </h2>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-5 py-5">
              {/* Description */}
              <p className="font-instrument text-base text-[#5A6565] leading-[19.52px]">
                Notre équipe est disponible 24/7 pour vous aider. Décrivez votre problème et nous vous répondrons rapidement.
              </p>

              {/* Section Assistance immédiate */}
              <div className="bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-2xl p-4 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <CallIcon />
                  <span className="font-instrument text-base font-bold text-[#0389A6] leading-[19.52px]">
                    Besoin d'une assistance immédiate ?
                  </span>
                </div>
                <div className="flex gap-[100px]">
                  <div className="flex items-center gap-4">
                    <CallIcon />
                    <span className="font-instrument text-base text-[#0389A6] leading-[24px]">
                      +221 33 XXX XX XX
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <MailIcon />
                    <span className="font-instrument text-base text-[#0389A6] leading-[24px]">
                      contact@naratechvision.com
                    </span>
                  </div>
                </div>
              </div>

              {/* Catégorie de la demande */}
              <div className="flex flex-col gap-0.5">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Catégorie de la demande *
                </label>
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                    className={`w-full bg-[#ECEFEF] border ${errors.category ? 'border-red-500' : 'border-[#D4DCDC]'} rounded-2xl px-[26px] py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors`}
                  >
                    <span className={`font-instrument text-base leading-[26px] ${formData.category ? 'text-[#002222]' : 'text-[#5A6565]'}`}>
                      {formData.category || 'Sélectionnez une catégorie...'}
                    </span>
                    <ArrowDownIcon />
                  </button>
                  
                  {isCategoryDropdownOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-10 overflow-hidden">
                      {categories.map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => {
                            handleInputChange('category', category);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className="w-full px-[26px] py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF] transition-colors"
                        >
                          {category}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.category && (
                  <span className="px-2.5 text-sm text-red-500">{errors.category}</span>
                )}
              </div>

              {/* Sujet */}
              <div className="flex flex-col gap-0.5">
                <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                  Sujet *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Ex: Problème de connexion à la caméra"
                  className={`w-full bg-[#ECEFEF] border ${errors.subject ? 'border-red-500' : 'border-[#D4DCDC]'} rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:border-[#0389A6]`}
                />
                {errors.subject && (
                  <span className="px-2.5 text-sm text-red-500">{errors.subject}</span>
                )}
              </div>

              {/* Description détaillée */}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Description détaillée *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Décrivez votre problème ou votre question en détail...

Informations utiles :
- Étapes pour reproduire le problème
- Messages d'erreur
- Navigateur utilisé
- Captures d'écran (si disponibles)"
                    rows="8"
                    className={`w-full bg-[#ECEFEF] border ${errors.description ? 'border-red-500' : 'border-[#D4DCDC]'} rounded-2xl px-[26px] py-4 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:border-[#0389A6] resize-none`}
                  />
                  {errors.description && (
                    <span className="px-2.5 text-sm text-red-500">{errors.description}</span>
                  )}
                </div>
                <p className="px-2.5 font-instrument text-base text-[#5A6565] leading-[19.52px]">
                  Plus vous nous donnez de détails, plus nous pourrons vous aider rapidement.
                </p>
              </div>

              {/* Email et Téléphone */}
              <div className="flex gap-5">
                <div className="flex-1 flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Email de contact *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="votre@email.com"
                    className={`w-full bg-[#ECEFEF] border ${errors.email ? 'border-red-500' : 'border-[#D4DCDC]'} rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:border-[#0389A6]`}
                  />
                  {errors.email && (
                    <span className="px-2.5 text-sm text-red-500">{errors.email}</span>
                  )}
                </div>
                <div className="flex-1 flex flex-col gap-0.5">
                  <label className="px-2.5 font-instrument text-base font-semibold text-[#002222] leading-[26px]">
                    Téléphone (facultatif)
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 font-instrument text-base text-[#002222] leading-[26px] placeholder:text-[#5A6565] focus:outline-none focus:border-[#0389A6]"
                  />
                </div>
              </div>

              {/* Notre engagement */}
              <div className="bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-2xl p-4 flex items-start gap-4">
                <CheckmarkIcon />
                <div className="flex flex-col gap-0">
                  <span className="font-instrument text-base font-bold text-[#0389A6] leading-[30px]">
                    Notre engagement :<br />
                    Support en français et wolof<br />
                    Suivi par email de votre demande<br />
                    Accès à la base de connaissances<br />
                    Support 24/7 pour les urgences
                  </span>
                </div>
              </div>

              {/* Footer avec boutons */}
              <div className="flex justify-end items-center gap-5 px-[30px] py-2.5 border-t border-[#D4DCDC] mt-5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl bg-white hover:bg-[#ECEFEF] transition-colors font-instrument text-base text-[#002222] leading-[19.52px] cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2.5 bg-[#0389A6] text-white rounded-2xl hover:bg-[#027A94] transition-colors font-instrument text-base leading-[19.52px] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default Contact;
