import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import paymentImage from '../assets/payment-image-3d1afd.png';
import subscriptionService from '../services/subscriptionService';
import companySubscriptionService from '../services/companySubscriptionService';
import authService from '../services/authService';

function TarifsStarter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const invitationToken = searchParams.get('token');

  const [currentStep, setCurrentStep] = useState(1);
  const [requestNumber, setRequestNumber] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [planId, setPlanId] = useState(null);
  const [showInviteGate, setShowInviteGate] = useState(false);
  const [gateEmail, setGateEmail] = useState('');
  const [gateToken, setGateToken] = useState('');
  const [gateError, setGateError] = useState('');
  const [gateLoading, setGateLoading] = useState(false);

  // État pour toutes les sections
  const [formData, setFormData] = useState({
    // Section 1 - Informations de l'entreprise
    nomEntreprise: '',
    secteurActivite: '',
    nombreEmployes: '',
    pays: 'Sénégal',
    ville: '',
    adresse: '',
    
    // Section 2 - Informations de contact
    nomComplet: '',
    fonction: '',
    email: '',
    telephone: '',
    
    // Section 3 - Besoins spécifiques
    nombreSites: '1',
    nombreCameras: '1',
    fonctionnalitesDesired: [],
    commentaires: '',
    integrationSouhaitee: ''
  });

  const secteurs = [
    'Technologie', 'Finance', 'Santé', 'Éducation', 'Commerce', 
    'Industrie', 'Services', 'Autre'
  ];

  const fonctionnalitesOptions = [
    'Reconnaissance faciale avancée',
    'Rapports personnalisés',
    'Intégration API complète',
    'Support prioritaire 24/7',
    'Formation équipe avancée',
    'Installation multi-sites',
    'Analytics avancés',
    'Gestion multi-utilisateurs'
  ];

  const integrationOptions = [
    'Système RH existant',
    'Logiciel de paie',
    'ERP (SAP, Oracle)',
    'Active Directory',
    'Autre système'
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFonctionnaliteToggle = (fonctionnalite) => {
    setFormData(prev => ({
      ...prev,
      fonctionnalitesDesired: prev.fonctionnalitesDesired.includes(fonctionnalite)
        ? prev.fonctionnalitesDesired.filter(f => f !== fonctionnalite)
        : [...prev.fonctionnalitesDesired, fonctionnalite]
    }));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      if (invitationToken) {
        navigate(`/tarifs?token=${invitationToken}`);
      } else {
        navigate('/tarifs');
      }
    }
  };

  // Générer un numéro de demande unique
  const generateRequestNumber = () => {
    const prefix = 'REQ-';
    const randomNumber = Math.floor(Math.random() * 90000000) + 10000000; // 8 chiffres
    return prefix + randomNumber;
  };

  useEffect(() => {
    if (invitationToken) return;
    setShowInviteGate(true);
  }, [invitationToken]);

  useEffect(() => {
    if (!invitationToken) return;

    let isMounted = true;
    (async () => {
      try {
        console.log('Chargement des plans publics pour Starter...');
        const publicPlans = await subscriptionService.getPublicPlans();
        console.log('Plans publics reçus:', publicPlans);
        
        if (!Array.isArray(publicPlans) || publicPlans.length === 0) {
          console.error('Aucun plan public disponible');
          return;
        }

        const sorted = [...publicPlans].sort((a, b) => {
          const aUnlimited = a?.employeeLimit == null;
          const bUnlimited = b?.employeeLimit == null;
          if (aUnlimited !== bUnlimited) return aUnlimited ? 1 : -1;
          const aAmount = typeof a?.amount === 'number' ? a.amount : Number.MAX_SAFE_INTEGER;
          const bAmount = typeof b?.amount === 'number' ? b.amount : Number.MAX_SAFE_INTEGER;
          return aAmount - bAmount;
        });

        console.log('Plans triés:', sorted);
        
        // Chercher le plan Starter par nom ou prendre le 1er plan (index 0)
        let apiPlan = sorted.find(p => p?.name?.toLowerCase().includes('starter'));
        if (!apiPlan && sorted.length > 0) {
          apiPlan = sorted[0];
        }
        
        console.log('Plan Starter sélectionné:', apiPlan);
        
        const id = apiPlan?._id || apiPlan?.id;
        console.log('Plan ID:', id);
        
        if (isMounted) {
          if (id) {
            setPlanId(id);
          } else {
            console.error('Impossible de récupérer l\'ID du plan Starter');
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement du plan starter:', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [invitationToken]);

  const handleSubmit = async () => {
    if (invitationToken) {
      if (!planId) {
        alert('Plan indisponible, veuillez réessayer.');
        return;
      }

      try {
        await companySubscriptionService.createByInvitation({
          token: invitationToken,
          planId,
          subscriptionFormData: formData,
        });

        alert('Abonnement créé avec succès ! Veuillez finaliser votre inscription.');
        navigate(`/inscription?token=${invitationToken}`, { replace: true });
      } catch (error) {
        console.error('Erreur lors de la création de l\'abonnement:', error);
        const message = error.response?.data?.message || error.message || 'Une erreur est survenue lors de la création de l\'abonnement.';
        alert(message);
      }
      return;
    }

    setShowInviteGate(true);
  };

  const normalizeInvitationTokenInput = (raw) => {
    const value = (raw || '').trim();
    if (!value) return '';

    try {
      const url = new URL(value);
      const qpToken = url.searchParams.get('token');
      if (qpToken) return qpToken.trim();
    } catch (_) {
      // ignore
    }

    const match = value.match(/[?&]token=([^&]+)/i);
    if (match?.[1]) {
      try {
        return decodeURIComponent(match[1]).trim();
      } catch (_) {
        return match[1].trim();
      }
    }

    return value;
  };

  const formatInvitationErrorMessage = (message) => {
    const normalized = (message || '').toString().toLowerCase();
    if (normalized.includes('accepted') || normalized.includes('acceptée') || normalized.includes('accepté')) {
      return "Invitation déjà utilisée. Connectez-vous ou demandez une nouvelle invitation.";
    }
    return message;
  };

  const handleValidateInvitation = async () => {
    setGateError('');
    const token = normalizeInvitationTokenInput(gateToken);
    const email = (gateEmail || '').trim().toLowerCase();

    if (!email || !token) {
      setGateError('Email et token requis');
      return;
    }

    setGateLoading(true);
    try {
      const res = await authService.validateInvitationToken(token);
      if (!res?.valid) {
        setGateError(formatInvitationErrorMessage(res?.message || 'Token invalide'));
        return;
      }

      const invitedEmail = (res?.invitation?.email || '').toLowerCase();
      if (invitedEmail && invitedEmail !== email) {
        setGateError("L'email ne correspond pas à celui de l'invitation");
        return;
      }

      navigate(`/tarifs/starter?token=${encodeURIComponent(token)}`, { replace: true });
    } catch (e) {
      setGateError(e?.response?.data?.message || e?.message || 'Erreur lors de la validation');
    } finally {
      setGateLoading(false);
    }
  };

  const renderInviteGate = () => (
    <div className="flex justify-center">
      <div className="w-[469px] bg-white rounded-[30px] p-[30px]">
        <div className="flex flex-col gap-5">
          <h2 className="font-['Instrument_Sans',sans-serif] text-base font-bold leading-[2.125] text-center text-[#002222]">
            Vérification d'invitation
          </h2>
          <div className="w-full">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#002222] text-center">
              Veuillez demander une invitation
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full mt-2">
            <button
              onClick={() => {
                setShowInviteGate(false);
                setGateError('');
                navigate('/tarifs');
              }}
              className="w-full px-6 py-3 rounded-2xl border border-[#D4DCDC] text-[#002222] font-['Instrument_Sans',sans-serif] text-base font-medium hover:bg-gray-50 transition-colors"
            >
              Retour
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSummaryColumn = () => (
    <div className="w-[360px] space-y-[30px]">
      <div className="bg-white rounded-2xl border border-[#D4DCDC]">
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
          <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
            Récapitulatif
          </h2>
        </div>

        <div className="p-5 space-y-5">
          <div className="pb-5 border-b border-[#D4DCDC]">
            <p className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#5A6565] mb-1.5">
              Plan sélectionné
            </p>
            <h3 className="font-['Audiowide',cursive] text-2xl text-[#002222] mb-1.5">
              Starter
            </h3>
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">
              Pour les petites équipes
            </p>
          </div>

          <div className="pb-5 border-b border-[#D4DCDC]">
            <div className="font-['Audiowide',cursive] text-2xl text-[#002222]">
              16€ /mois / employés
            </div>
          </div>

          <div className="pb-5 border-b border-[#D4DCDC]">
            <p className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] mb-4">
              Fonctionnalités incluses:
            </p>
            <div className="space-y-1.5">
              {[
                'Reconnaissance faciale illimitée',
                'Dashboard en temps réel',
                'Rapports de base (PDF/Excel)',
                'Support par email',
                '1 caméra incluse',
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M4.17 5.83L8.33 10L15.83 2.5" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[rgba(3,217,217,0.1)] border border-[#03D9D9] rounded-2xl p-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-5 h-5">
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M4.17 5.83L8.33 10L15.83 2.5" stroke="#03D9D9" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="font-['Instrument_Sans',sans-serif] text-sm font-bold text-[#03D9D9]">
                Essai gratuit de 14 jours
              </span>
            </div>
            <p className="font-['Instrument_Sans',sans-serif] text-xs text-[#5A6565]">
              Sans engagement, sans carte bancaire
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#D4DCDC] p-5">
        <h3 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#5A6565] mb-2.5">
          Besoin d'aide ?
        </h3>
        <p className="font-['Instrument_Sans',sans-serif] text-sm font-semibold text-[#002222] mb-2.5">
          Notre équipe est là pour vous accompagner
        </p>

        <div className="space-y-2.5">
          <div className="flex items-center gap-4">
            <div className="w-5 h-5">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M1.67 1.67h5l2.5 5-2.5 1.67a12.5 12.5 0 0 0 5.83 5.83L13.33 11.67l5 2.5v5a1.67 1.67 0 0 1-1.67 1.67C7.5 20.83 1.67 15 1.67 5.83A1.67 1.67 0 0 1 1.67 1.67z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">
              +221 33 XXX XX XX
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-5 h-5">
              <svg viewBox="0 0 20 20" fill="none">
                <path d="M1.67 2.92h16.67L10 14.17 1.67 2.92z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1.67 6.25L10 14.17l8.33-7.92" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">
              contact@senpointage.sn
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // Rendu des étapes de progression
  const renderProgressSteps = () => (
    <div className="flex justify-center mb-8">
      <div className="flex items-center gap-[205px]">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex flex-col items-center gap-1">
            <div className={`w-10 h-10 rounded-[20px] flex items-center justify-center ${
              step <= currentStep ? 'bg-[#03D9D9]' : 'bg-[rgba(3,217,217,0.1)]'
            }`}>
              <span className={`font-['Audiowide',cursive] text-xl ${
                step <= currentStep ? 'text-white' : 'text-[#002222]'
              }`}>
                {step}
              </span>
            </div>
            <span className={`font-['Instrument_Sans',sans-serif] text-xs font-medium text-center ${
              step <= currentStep ? 'text-[#002222]' : 'text-[#5A6565]'
            }`}>
              {step === 1 ? 'Contexte' : step === 2 ? 'Génération IA' : 'Finalisation'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSection1 = () => (
    <div className="flex gap-[30px]">
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-[#D4DCDC]">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
            <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
              Informations de l'entreprise
            </h2>
          </div>

          <div className="p-5">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-5">
              Parlez-nous de votre entreprise
            </p>

            <div className="space-y-5">
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Nom de l'entreprise
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="text"
                      value={formData.nomEntreprise}
                      onChange={(e) => handleInputChange('nomEntreprise', e.target.value)}
                      placeholder="Ex: TechCorp Sénégal"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Secteur d'activité
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <select
                      value={formData.secteurActivite}
                      onChange={(e) => handleInputChange('secteurActivite', e.target.value)}
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] focus:outline-none appearance-none"
                      required
                    >
                      <option value="">Sélectionnez...</option>
                      {secteurs.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Nombre d'employés
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="number"
                      min="1"
                      value={formData.nombreEmployes}
                      onChange={(e) => handleInputChange('nombreEmployes', e.target.value)}
                      placeholder="Ex: 15"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Pays
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="text"
                      value={formData.pays}
                      onChange={(e) => handleInputChange('pays', e.target.value)}
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Ville
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="text"
                      value={formData.ville}
                      onChange={(e) => handleInputChange('ville', e.target.value)}
                      placeholder="Ex: Dakar"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Adresse
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="text"
                      value={formData.adresse}
                      onChange={(e) => handleInputChange('adresse', e.target.value)}
                      placeholder="Ex: Avenue Léopold Sédar Senghor"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-5 pt-2.5 border-t border-[#D4DCDC] mt-5">
              <button
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-2xl border border-[#D4DCDC] font-['Instrument_Sans',sans-serif] text-base text-[#002222] hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2.5 rounded-2xl bg-[#03D9D9] text-white font-['Instrument_Sans',sans-serif] text-base hover:bg-[#02c4c4]"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderSummaryColumn()}
    </div>
  );

  const renderSection2 = () => (
    <div className="flex gap-[30px]">
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-[#D4DCDC]">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
            <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
              Informations de contact
            </h2>
          </div>

          <div className="p-5">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-5">
              Comment pouvons-nous vous contacter ?
            </p>

            <div className="space-y-5">
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Nom complet
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="text"
                      value={formData.nomComplet}
                      onChange={(e) => handleInputChange('nomComplet', e.target.value)}
                      placeholder="Ex: Amadou Diallo"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Fonction
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="text"
                      value={formData.fonction}
                      onChange={(e) => handleInputChange('fonction', e.target.value)}
                      placeholder="Directeur"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Email
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Ex: amadou@entreprise.sn"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Téléphone
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => handleInputChange('telephone', e.target.value)}
                      placeholder="Ex: +221 77 123 45 67"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-5 pt-2.5 border-t border-[#D4DCDC] mt-5">
              <button
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-2xl border border-[#D4DCDC] font-['Instrument_Sans',sans-serif] text-base text-[#002222] hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2.5 rounded-2xl bg-[#03D9D9] text-white font-['Instrument_Sans',sans-serif] text-base hover:bg-[#02c4c4]"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderSummaryColumn()}
    </div>
  );

  const renderSection3 = () => (
    <div className="flex gap-[30px]">
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-[#D4DCDC]">
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
            <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
              Vos besoins spécifiques
            </h2>
          </div>

          <div className="p-5">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-5">
              Aidez-nous à personnaliser votre solution Starter
            </p>

            <div className="space-y-5">
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Nombre de sites
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="number"
                      min="1"
                      value={formData.nombreSites}
                      onChange={(e) => handleInputChange('nombreSites', e.target.value)}
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Nombre de caméras souhaitées
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="number"
                      min="1"
                      value={formData.nombreCameras}
                      onChange={(e) => handleInputChange('nombreCameras', e.target.value)}
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                    Intégration avec système existant
                  </label>
                </div>
                <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                  <select
                    value={formData.integrationSouhaitee}
                    onChange={(e) => handleInputChange('integrationSouhaitee', e.target.value)}
                    className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] focus:outline-none appearance-none"
                  >
                    <option value="">Sélectionnez...</option>
                    {integrationOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="mb-3">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                    Fonctionnalités souhaitées (Starter)
                  </label>
                </div>
                <div className="space-y-2">
                  {fonctionnalitesOptions.map((fonctionnalite) => (
                    <div key={fonctionnalite} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleFonctionnaliteToggle(fonctionnalite)}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          formData.fonctionnalitesDesired.includes(fonctionnalite)
                            ? 'bg-[#03D9D9] border-[#03D9D9]'
                            : 'bg-white border-[#D4DCDC]'
                        }`}
                      >
                        {formData.fonctionnalitesDesired.includes(fonctionnalite) && (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                            <path d="M2.5 6L4.5 8L9.5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">
                        {fonctionnalite}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-0.5">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                    Commentaires ou besoins particuliers
                  </label>
                </div>
                <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                  <textarea
                    value={formData.commentaires}
                    onChange={(e) => handleInputChange('commentaires', e.target.value)}
                    placeholder="Décrivez vos besoins spécifiques pour le plan Starter..."
                    rows="4"
                    className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end items-center gap-5 pt-2.5 border-t border-[#D4DCDC] mt-5">
              <button
                onClick={handlePrev}
                className="px-4 py-2.5 rounded-2xl border border-[#D4DCDC] font-['Instrument_Sans',sans-serif] text-base text-[#002222] hover:bg-gray-50"
              >
                Précédent
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2.5 rounded-2xl bg-[#03D9D9] text-white font-['Instrument_Sans',sans-serif] text-base hover:bg-[#02c4c4]"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </div>

      {renderSummaryColumn()}
    </div>
  );

  const renderSection4 = () => (
    <div className="max-w-[890px] mx-auto">
      <div className="bg-white rounded-2xl border border-[#D4DCDC] p-6">
        <h2 className="font-['Instrument_Sans',sans-serif] text-lg font-semibold text-[#002222] mb-5">
          Finalisation
        </h2>

        <div className="flex flex-col gap-4">
          <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl p-4">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">
              Vérifiez vos informations puis confirmez.
            </p>
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={handlePrev}
              className="px-4 py-2.5 rounded-2xl border border-[#D4DCDC] font-['Instrument_Sans',sans-serif] text-base text-[#002222] hover:bg-gray-50"
            >
              Précédent
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-2xl bg-[#03D9D9] text-white font-['Instrument_Sans',sans-serif] text-base hover:bg-[#02c4c4]"
            >
              Confirmer ma demande Starter
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Section 5 - Demande envoyée avec succès
  const renderSection5 = () => (
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
                Demande envoyée avec succès !
              </h2>
              <p className="font-['Instrument_Sans',sans-serif] text-sm leading-[1.71] text-center text-[#5A6565] w-full">
                Numéro de demande: {requestNumber}
              </p>
              <p className="font-['Instrument_Sans',sans-serif] text-sm leading-[1.71] text-center text-[#5A6565] w-full">
                Nous vous contacterons sous 24h
              </p>
            </div>

            {/* Boutons d'action */}
            <div className="flex flex-col gap-3 w-full mt-4">
              <button
                onClick={() => {
                  const { token, isAuthenticated } = authService.getStoredAuth();
                  if (isAuthenticated && token) {
                    navigate('/dashboard');
                    return;
                  }
                  if (invitationToken) {
                    navigate(`/inscription?token=${invitationToken}`);
                    return;
                  }
                  navigate('/connexion');
                }}
                className="w-full px-6 py-3 rounded-2xl bg-[#03D9D9] text-white font-['Instrument_Sans',sans-serif] text-base font-medium hover:bg-[#02c4c4] transition-colors"
              >
                Accéder au tableau de bord
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full px-6 py-3 rounded-2xl border border-[#D4DCDC] text-[#002222] font-['Instrument_Sans',sans-serif] text-base font-medium hover:bg-gray-50 transition-colors"
              >
                Retour à l'accueil
              </button>
            </div>
          </div>
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

      {/* Bouton Retour (masqué pour section 5) */}
      {currentStep !== 5 && (
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

      {/* Titre (masqué pour section 5) */}
      {currentStep !== 5 && (
        <div className="text-center px-20 py-8">
          <h1 className="font-['Audiowide',cursive] text-4xl text-[#002222] mb-4">
            Choisissez votre plan
          </h1>
          <p className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">
            Complétez les étapes ci-dessous pour démarrer avec SenPointage
          </p>
        </div>
      )}

      {/* Sélection de plan - Plan Starter sélectionné (masqué pour section 5) */}
      {currentStep !== 5 && (
        <div className="flex items-center gap-[30px] justify-center mb-10 px-20">
          <div className="relative w-[406.67px] p-[30px] rounded-2xl bg-[#003E3E] border border-[#03D9D9]">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-['Instrument_Sans',sans-serif] text-lg text-white">
                  Starter
                </span>
                <div className="w-6 h-6">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#03D9D9"/>
                    <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#03D9D9]">16€ /mois / employés</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-white">Jusqu'à 15 employés</span>
            </div>
          </div>

          <div className="relative w-[406.67px] p-[30px] rounded-2xl border border-[#D4DCDC] bg-white">
            <div className="absolute -top-[15px] left-1/2 transform -translate-x-1/2 bg-[#002222] px-4 py-1.5 rounded-2xl">
              <span className="font-['Instrument_Sans',sans-serif] text-base font-medium text-white">Plus populaire</span>
            </div>
            <div className="flex flex-col gap-4">
              <span className="font-['Instrument_Sans',sans-serif] text-lg text-[#002222]">Business</span>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#002222]">14€ /mois / employés</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">Jusqu'à 50 employés</span>
            </div>
          </div>

          <div className="relative w-[406.67px] p-[30px] rounded-2xl border border-[#D4DCDC] bg-white">
            <div className="flex flex-col gap-4">
              <span className="font-['Instrument_Sans',sans-serif] text-lg text-[#002222]">Enterprise</span>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#002222]">Sur mesure</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">Employés illimités</span>
            </div>
          </div>
        </div>
      )}

      {/* Étapes de progression (masqué pour section 5) */}
      {currentStep !== 5 && renderProgressSteps()}

      {/* Contenu selon l'étape */}
      <div className="px-20 pb-16">
        {showInviteGate ? renderInviteGate() : (currentStep === 5 ? renderSection5() : (
          <>
            {currentStep === 1 ? renderSection1() : currentStep === 2 ? renderSection2() : currentStep === 3 ? renderSection3() : renderSection4()}
          </>
        ))}
      </div>
    </div>
  );
}

export default TarifsStarter;