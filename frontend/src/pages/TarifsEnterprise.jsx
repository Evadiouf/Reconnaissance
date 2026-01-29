import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import paymentImage from '../assets/payment-image-3d1afd.png';
import apiClient from '../services/apiClient';

function TarifsEnterprise() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token');

  const [requestNumber, setRequestNumber] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  
  // État pour le formulaire Enterprise
  const [formData, setFormData] = useState({
    categorieDemande: '',
    categorieDemandeAutre: '',
    sujet: '',
    description: '',
    email: '',
    telephone: ''
  });

  // Options pour la catégorie de demande
  const categoriesDemande = [
    'Problème technique',
    'Facturation',
    'Demande de fonctionnalité',
    'Gestion de compte',
    'Configuration caméra',
    'Intégration système',
    'Autre'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Générer un numéro de demande unique
  const generateRequestNumber = () => {
    const prefix = 'REQ-';
    const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
    return prefix + randomNumber;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const normalizedFormData = {
      ...formData,
      categorieDemande:
        formData.categorieDemande === 'Autre'
          ? (formData.categorieDemandeAutre || '').trim() || 'Autre'
          : formData.categorieDemande,
    };

    console.log('Soumission plan Enterprise:', normalizedFormData);

    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/api/v1/enterprise-requests', {
        categorieDemande: normalizedFormData.categorieDemande,
        sujet: normalizedFormData.sujet,
        description: normalizedFormData.description,
        email: normalizedFormData.email,
        telephone: normalizedFormData.telephone,
      });

      const reqNumber = response?.data?.requestNumber || generateRequestNumber();
      setRequestNumber(reqNumber);

      if (response?.data?.emailSent === false) {
        setSubmitError(response?.data?.emailError || "L'envoi de l'email a échoué.");
        return;
      }

      if (invitationToken) {
        navigate(`/inscription?token=${invitationToken}`, { replace: true });
        return;
      }

      setShowSuccess(true);
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || "Une erreur est survenue lors de l'envoi.";
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Page de succès Enterprise
  const renderSuccessPage = () => (
    <div className="flex justify-center">
      <div className="w-[469px] bg-white rounded-[30px] p-[30px]">
        <div className="flex flex-col items-center gap-5">
          {/* Icône de succès */}
          <div className="w-[60px] h-[60px] bg-[rgba(1,160,78,0.1)] rounded-2xl flex items-center justify-center">
            <div className="w-[30px] h-[30px]">
              <svg viewBox="0 0 30 30" fill="none">
                <circle cx="15" cy="15" r="12.5" stroke="#01A04E" strokeWidth="2.5"/>
                <path d="M9 15l6 6 12-12" stroke="#01A04E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Contenu */}
          <div className="flex flex-col items-center gap-[22px] w-full">
            <div className="flex flex-col items-center gap-1.5 w-full">
              <h2 className="font-['Instrument_Sans',sans-serif] text-base font-bold leading-[2.125] text-center text-[#002222] w-full">
                Demande Enterprise envoyée avec succès !
              </h2>
              <p className="font-['Instrument_Sans',sans-serif] text-sm leading-[1.71] text-center text-[#5A6565] w-full">
                Numéro de demande: {requestNumber}
              </p>
              <p className="font-['Instrument_Sans',sans-serif] text-sm leading-[1.71] text-center text-[#5A6565] w-full">
                Notre équipe vous contactera sous 24h.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Formulaire de contact Enterprise
  const renderContactForm = () => (
    <div className="max-w-[890px] mx-auto">
      <div className="bg-white rounded-2xl border border-[#D4DCDC]">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
          <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
            Contacter le support
          </h2>
        </div>

        {/* Contenu */}
        <div className="p-5">
          <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-5 text-center">
            Notre équipe est disponible 24/7 pour vous aider. Décrivez votre problème et nous vous répondrons rapidement.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {submitError ? (
              <div className="bg-[rgba(255,0,0,0.06)] border border-[rgba(255,0,0,0.2)] rounded-2xl p-3">
                <p className="font-['Instrument_Sans',sans-serif] text-sm text-[#7A1E1E]">{submitError}</p>
              </div>
            ) : null}
            {/* Section Assistance immédiate */}
            <div className="bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-5 h-5">
                  <svg viewBox="0 0 20 20" fill="none">
                    <path d="M1.67 1.67h5l2.5 5-2.5 1.67a12.5 12.5 0 0 0 5.83 5.83L13.33 11.67l5 2.5v5a1.67 1.67 0 0 1-1.67 1.67C7.5 20.83 1.67 15 1.67 5.83A1.67 1.67 0 0 1 1.67 1.67z" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3 className="font-['Instrument_Sans',sans-serif] text-base font-bold text-[#0389A6]">
                  Besoin d'une assistance immédiate ?
                </h3>
              </div>
              
              <div className="flex gap-[100px] mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M1.67 1.67h5l2.5 5-2.5 1.67a12.5 12.5 0 0 0 5.83 5.83L13.33 11.67l5 2.5v5a1.67 1.67 0 0 1-1.67 1.67C7.5 20.83 1.67 15 1.67 5.83A1.67 1.67 0 0 1 1.67 1.67z" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#0389A6]">
                    +221 33 XXX XX XX
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M1.67 2.92h16.67L10 14.17 1.67 2.92z" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M1.67 6.25L10 14.17l8.33-7.92" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#0389A6]">
                    contact@naratechvision.com
                  </span>
                </div>
              </div>
            </div>

            {/* Catégorie de la demande */}
            <div>
              <div className="mb-0.5">
                <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                  Catégorie de la demande *
                </label>
              </div>
              <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5 relative">
                <select
                  value={formData.categorieDemande}
                  onChange={(e) => handleInputChange('categorieDemande', e.target.value)}
                  className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] focus:outline-none appearance-none pr-8"
                  required
                >
                  <option value="">Sélectionnez une catégorie...</option>
                  {categoriesDemande.map(categorie => (
                    <option key={categorie} value={categorie}>{categorie}</option>
                  ))}
                </select>
                <div className="absolute right-[26px] top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M4 6L8 10L12 6" stroke="#002222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>

            {formData.categorieDemande === 'Autre' && (
              <div>
                <div className="mb-0.5">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                    Précisez la catégorie *
                  </label>
                </div>
                <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                  <input
                    type="text"
                    value={formData.categorieDemandeAutre}
                    onChange={(e) => handleInputChange('categorieDemandeAutre', e.target.value)}
                    placeholder="Ex: Autre demande"
                    className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                    required
                  />
                </div>
              </div>
            )}

            {/* Sujet */}
            <div>
              <div className="mb-0.5">
                <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                  Sujet *
                </label>
              </div>
              <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                <input
                  type="text"
                  value={formData.sujet}
                  onChange={(e) => handleInputChange('sujet', e.target.value)}
                  placeholder="Ex: Problème de connexion à la caméra"
                  className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Description détaillée */}
            <div>
              <div className="mb-0.5">
                <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                  Description détaillée *
                </label>
              </div>
              <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-4">
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
                  className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none resize-none"
                  required
                />
              </div>
              <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mt-2.5 px-2.5">
                Plus vous nous donnez de détails, plus nous pourrons vous aider rapidement.
              </p>
            </div>

            {/* Email et Téléphone */}
            <div className="flex gap-5">
              <div className="flex-1">
                <div className="mb-0.5">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                    Email de contact *
                  </label>
                </div>
                <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="votre@email.com"
                    className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                    required
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <div className="mb-0.5">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                    Téléphone (facultatif)
                  </label>
                </div>
                <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                    placeholder="+221 77 123 45 67"
                    className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section Engagement */}
            <div className="bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-2xl p-4">
              <div className="flex items-start gap-4">
                <div className="w-6 h-6 mt-0.5">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#0389A6" strokeWidth="2"/>
                    <path d="M8 12l3 3 5-5" stroke="#0389A6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-['Instrument_Sans',sans-serif] text-base font-bold leading-[1.875] text-[#0389A6]">
                    Notre engagement :<br />
                    Support en français et wolof<br />
                    Suivi par email de votre demande<br />
                    Accès à la base de connaissances<br />
                    Support 24/7 pour les urgences
                  </p>
                </div>
              </div>
            </div>

            {/* Boutons d'action */}
            <div className="flex justify-end items-center gap-5 pt-2.5 border-t border-[#D4DCDC] mt-5">
              <button
                type="button"
                onClick={() => invitationToken ? navigate(`/tarifs?token=${invitationToken}`) : navigate('/tarifs')}
                className="px-4 py-2.5 rounded-2xl border border-[#D4DCDC] font-['Instrument_Sans',sans-serif] text-base text-[#002222] hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-2xl bg-[#0389A6] text-white font-['Instrument_Sans',sans-serif] text-base hover:bg-[#027a94] disabled:opacity-60"
              >
                {isSubmitting ? 'Envoi en cours...' : 'Envoyer la demande'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ECEFEF' }}>
      {/* Header */}
      <div className="bg-white border-b border-[#D4DCDC] px-[50px] py-5">
        <Logo />
      </div>

      {/* Bouton Retour (masqué pour page de succès) */}
      {!showSuccess && (
        <div className="px-20 pt-6">
          <button
            onClick={() => invitationToken ? navigate(`/tarifs?token=${invitationToken}`) : navigate('/tarifs')}
            className="flex items-center gap-5 text-[#3E4B4B] hover:text-[#002222] transition-colors"
          >
            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6.67 4L3.33 8L6.67 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold">
              Retour
            </span>
          </button>
        </div>
      )}

      {/* Titre (masqué pour page de succès) */}
      {!showSuccess && (
        <div className="text-center px-20 py-8">
          <h1 className="font-['Audiowide',cursive] text-4xl text-[#002222] mb-4">
            Plan Enterprise
          </h1>
          <p className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">
            Solution sur mesure pour les grandes entreprises
          </p>
        </div>
      )}

      {/* Sélection de plan - Plan Enterprise sélectionné (masqué pour page de succès) */}
      {!showSuccess && (
        <div className="flex items-center gap-[30px] justify-center mb-10 px-20">
          {/* Plan Starter - Non sélectionné */}
          <div className="relative w-[406.67px] p-[30px] rounded-2xl border border-[#D4DCDC] bg-white">
            <div className="flex flex-col gap-4">
              <span className="font-['Instrument_Sans',sans-serif] text-lg text-[#002222]">Starter</span>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#002222]">29€/mois</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">Jusqu'à 25 employés</span>
            </div>
          </div>

          {/* Plan Business - Non sélectionné */}
          <div className="relative w-[406.67px] p-[30px] rounded-2xl border border-[#D4DCDC] bg-white">
            <div className="absolute -top-[15px] left-1/2 transform -translate-x-1/2 bg-[#002222] px-4 py-1.5 rounded-2xl">
              <span className="font-['Instrument_Sans',sans-serif] text-base font-medium text-white">Plus populaire</span>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-['Instrument_Sans',sans-serif] text-lg text-[#002222]">Business</span>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#002222]">79€/mois</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">Jusqu'à 100 employés</span>
            </div>
          </div>

          {/* Plan Enterprise - Sélectionné */}
          <div className="relative w-[406.67px] p-[30px] rounded-2xl bg-[#003E3E] border border-[#03D9D9]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-['Instrument_Sans',sans-serif] text-lg text-white">
                  Enterprise
                </span>
                <div className="w-6 h-6">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#03D9D9"/>
                    <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#03D9D9]">Sur mesure</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-white">Employés illimités</span>
            </div>
          </div>
        </div>
      )}

      {/* Contenu */}
      <div className="px-20 pb-16">
        {showSuccess ? renderSuccessPage() : renderContactForm()}
      </div>
    </div>
  );
}

export default TarifsEnterprise;