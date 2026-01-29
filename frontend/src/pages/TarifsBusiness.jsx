import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Logo from '../components/Logo';
import paymentImage from '../assets/payment-image-3d1afd.png';
import subscriptionService from '../services/subscriptionService';
import companySubscriptionService from '../services/companySubscriptionService';
import authService from '../services/authService';

function TarifsBusiness() {
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

  // État pour toutes les sections Business
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
    
    // Section 3 - Besoins spécifiques Business
    nombreSites: '1',
    nombreCameras: '2',
    fonctionnalitesDesired: [],
    commentaires: '',
    integrationSouhaitee: '',
    supportLevel: 'standard'
  });

  const secteurs = [
    'Technologie', 'Finance', 'Santé', 'Éducation', 'Commerce', 
    'Industrie', 'Services', 'Autre'
  ];

  // Fonctionnalités spécifiques au plan Business
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
    const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
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
        console.log('🔍 Chargement des plans publics pour Business...');
        console.log('🔗 URL de base API:', import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');
        
        const publicPlans = await subscriptionService.getPublicPlans();
        console.log('✅ Plans publics reçus:', publicPlans);
        console.log('📊 Type:', typeof publicPlans, '| Array?', Array.isArray(publicPlans), '| Length:', publicPlans?.length);
        
        if (!publicPlans) {
          console.error('❌ publicPlans est null ou undefined');
          alert('Erreur: Impossible de charger les plans d\'abonnement. Vérifiez que le backend est démarré.');
          return;
        }
        
        if (!Array.isArray(publicPlans)) {
          console.error('❌ publicPlans n\'est pas un tableau:', publicPlans);
          return;
        }
        
        if (publicPlans.length === 0) {
          console.error('❌ Aucun plan public disponible');
          alert('Aucun plan d\'abonnement disponible. Contactez l\'administrateur.');
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

        console.log('📋 Plans triés:', sorted.map(p => ({ name: p.name, id: p._id })));
        
        // Chercher le plan Business par nom ou prendre le 2ème plan (index 1)
        let apiPlan = sorted.find(p => p?.name?.toLowerCase().includes('business'));
        if (!apiPlan && sorted.length > 1) {
          apiPlan = sorted[1];
          console.log('⚠️ Plan Business non trouvé par nom, utilisation de l\'index [1]');
        } else if (!apiPlan && sorted.length === 1) {
          apiPlan = sorted[0];
          console.log('⚠️ Un seul plan disponible, utilisation de l\'index [0]');
        }
        
        console.log('🎯 Plan Business sélectionné:', apiPlan);
        
        const id = apiPlan?._id || apiPlan?.id;
        console.log('🆔 Plan ID extrait:', id);
        
        if (isMounted) {
          if (id) {
            setPlanId(id);
            console.log('✅ planId défini:', id);
          } else {
            console.error('❌ Impossible de récupérer l\'ID du plan Business');
            alert('Erreur: Impossible de récupérer l\'ID du plan. Rechargez la page.');
          }
        }
      } catch (error) {
        console.error('❌ ERREUR lors du chargement du plan business:', error);
        console.error('📝 Détails de l\'erreur:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
        alert(`Erreur de connexion au serveur: ${error.message}\nVérifiez que le backend est démarré sur http://localhost:3000`);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [invitationToken]);

  const handleSubmit = async () => {
    console.log('🚀 handleSubmit appelé');
    console.log('📋 État actuel:', { invitationToken, planId, formData });
    
    if (!invitationToken) {
      setShowInviteGate(true);
      return;
    }

    console.log('✅ invitationToken présent:', invitationToken);
    
    if (!planId) {
      console.error('❌ planId est manquant!');
      console.error('🔍 Valeur de planId:', planId);
      alert('Plan indisponible, veuillez réessayer.');
      return;
    }

    console.log('✅ planId présent:', planId);
    console.log('📤 Envoi de la requête de création d\'abonnement...');

    try {
      const payload = {
        token: invitationToken,
        planId,
        subscriptionFormData: formData,
      };
      console.log('📦 Payload:', payload);
      
      const result = await companySubscriptionService.createByInvitation(payload);
      console.log('✅ Abonnement créé avec succès:', result);

      alert('Abonnement créé avec succès ! Veuillez finaliser votre inscription.');
      navigate(`/inscription?token=${invitationToken}`, { replace: true });
    } catch (error) {
      console.error('❌ ERREUR lors de la création de l\'abonnement:', error);
      console.error('📝 Détails:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText,
      });
      const message = error.response?.data?.message || error.message || 'Une erreur est survenue lors de la création de l\'abonnement.';
      alert(`Erreur: ${message}`);
    }
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

      navigate(`/tarifs/business?token=${encodeURIComponent(token)}`, { replace: true });
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

  // Section 1 - Informations de l'entreprise Business
  const renderSection1 = () => (
    <div className="flex gap-[30px]">
      {/* Colonne gauche - Formulaire */}
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-[#D4DCDC]">
          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
            <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
              Informations de l'entreprise
            </h2>
          </div>

          {/* Contenu */}
          <div className="p-5">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-5">
              Parlez-nous de votre entreprise
            </p>

            <div className="space-y-5">
              {/* Première ligne */}
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
                    >
                      <option value="">Sélectionnez...</option>
                      {secteurs.map(secteur => (
                        <option key={secteur} value={secteur}>{secteur}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Deuxième ligne */}
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Nombre d'employés (max 50 pour Business)
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="number"
                      max="50"
                      value={formData.nombreEmployes}
                      onChange={(e) => handleInputChange('nombreEmployes', e.target.value)}
                      placeholder="Ex: 50"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
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

              {/* Troisième ligne */}
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

            {/* Boutons */}
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

      {/* Colonne droite - Récapitulatif */}
      {renderSummaryColumn()}
    </div>
  );

  // Section 2 - Informations de contact Business
  const renderSection2 = () => (
    <div className="flex gap-[30px]">
      {/* Colonne gauche - Formulaire */}
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-[#D4DCDC]">
          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
            <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
              Informations de contact
            </h2>
          </div>

          {/* Contenu */}
          <div className="p-5">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-5">
              Comment pouvons-nous vous contacter ?
            </p>

            <div className="space-y-5">
              {/* Première ligne */}
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Nom complet *
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
                      placeholder="Directeur IT"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Deuxième ligne */}
              <div className="flex gap-5">
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Email professionnel *
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="Ex: amadou@techcorp.sn"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                      required
                    />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="mb-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                      Téléphone *
                    </label>
                  </div>
                  <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-[26px] py-2.5">
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => handleInputChange('telephone', e.target.value)}
                      placeholder="Ex: +221 77 123 45 67"
                      className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section Protection des données */}
              <div className="bg-[rgba(3,217,217,0.1)] border border-[#03D9D9] rounded-2xl p-5">
                <h3 className="font-['Instrument_Sans',sans-serif] text-sm font-bold text-[#03D9D9] mb-2">
                  Protection des données
                </h3>
                <p className="font-['Instrument_Sans',sans-serif] text-xs text-[#5A6565] leading-6">
                  Vos informations sont sécurisées et ne seront utilisées que pour vous contacter concernant votre demande. Nous respectons le RGPD et la loi sénégalaise sur la protection des données personnelles.
                </p>
              </div>
            </div>

            {/* Boutons */}
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

      {/* Colonne droite - Récapitulatif */}
      {renderSummaryColumn()}
    </div>
  );

  // Section 3 - Besoins spécifiques Business
  const renderSection3 = () => (
    <div className="flex gap-[30px]">
      {/* Colonne gauche - Formulaire */}
      <div className="flex-1">
        <div className="bg-white rounded-2xl border border-[#D4DCDC]">
          {/* Header */}
          <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
            <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
              Vos besoins spécifiques
            </h2>
          </div>

          {/* Contenu */}
          <div className="p-5">
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-5">
              Aidez-nous à personnaliser votre solution Business
            </p>

            <div className="space-y-5">
              {/* Première ligne */}
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

              {/* Intégration souhaitée */}
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

              {/* Fonctionnalités souhaitées */}
              <div>
                <div className="mb-3">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] px-2.5">
                    Fonctionnalités souhaitées (Business)
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

              {/* Commentaires */}
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
                    placeholder="Décrivez vos besoins spécifiques pour le plan Business..."
                    rows="4"
                    className="w-full bg-transparent font-['Instrument_Sans',sans-serif] text-base text-[#002222] placeholder-[#5A6565] focus:outline-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Boutons */}
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

      {/* Colonne droite - Récapitulatif */}
      {renderSummaryColumn()}
    </div>
  );

  // Section 4 - Confirmation de commande Business
  const renderSection4 = () => (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-[#D4DCDC]">
        {/* Header */}
        <div className="flex items-center gap-4 px-5 py-4 border-b border-[#D4DCDC]">
          <h2 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
            Confirmez votre demande
          </h2>
        </div>

        {/* Contenu */}
        <div className="p-5">
          <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565] mb-6">
            Vérifiez les informations ci-dessous avant de soumettre votre demande d'abonnement Business.
          </p>

          {/* Récapitulatif du plan Business */}
          <div className="bg-[rgba(3,217,217,0.1)] border border-[#03D9D9] rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] mb-1">
                  Plan Business
                </h3>
                <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">
                  Pour les entreprises en croissance
                </p>
              </div>
              <div className="text-right">
                <span className="font-['Audiowide',cursive] text-2xl text-[#03D9D9]">14€</span>
                <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">/mois / employés</p>
              </div>
            </div>
            <p className="font-['Instrument_Sans',sans-serif] text-sm font-semibold text-[#03D9D9]">
              Prix estimé avec vos options
            </p>
            <p className="font-['Audiowide',cursive] text-2xl text-[#03D9D9]">14€ /mois / employés</p>
          </div>

          {/* Informations générales */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5">
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 7.5h15v10a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 1-2.5-2.5v-10z" stroke="#002222" strokeWidth="1.5"/>
                  <path d="M6.25 2.5v5M13.75 2.5v5" stroke="#002222" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                Informations générales
              </h3>
            </div>
            
            <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Secteur:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.secteurActivite || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Employés:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.nombreEmployes || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Sites:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.nombreSites}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Caméras:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.nombreCameras}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-5 h-5">
                <svg viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="6" r="4" stroke="#002222" strokeWidth="1.5"/>
                  <path d="M2 18c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#002222" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                Contact
              </h3>
            </div>
            
            <div className="bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl p-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Nom:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.nomComplet || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Fonction:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.fonction || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Email:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.email || 'Non renseigné'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">Téléphone:</span>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                    {formData.telephone || 'Non renseigné'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section Paiement */}
          <div className="mb-6 pt-6 border-t border-[#D4DCDC]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5">
                <svg viewBox="0 0 20 20" fill="none">
                  <path d="M2.5 5h15v10a2.5 2.5 0 0 1-2.5 2.5H5a2.5 2.5 0 0 1-2.5-2.5V5z" stroke="#002222" strokeWidth="1.5"/>
                  <path d="M2.5 7.5h15M7.5 12.5h5" stroke="#002222" strokeWidth="1.5"/>
                </svg>
              </div>
              <h3 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222]">
                Méthodes de paiement
              </h3>
            </div>
            <div className="bg-white border border-[#D4DCDC] rounded-2xl p-4">
              <p className="font-['Instrument_Sans',sans-serif] text-sm text-[#5A6565] mb-4 text-center">
                Veuillez choisir votre méthode de paiement
              </p>
              
              {/* Grille des méthodes de paiement */}
              <div className="grid grid-cols-3 gap-3">
                {/* VISA/Mastercard */}
                <button
                  onClick={() => setSelectedPaymentMethod('card')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'card'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#1A1F71] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">VISA</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">Carte bancaire</span>
                  </div>
                </button>

                {/* Orange Money */}
                <button
                  onClick={() => setSelectedPaymentMethod('orange')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'orange'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#FF6600] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">OM</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">Orange Money</span>
                  </div>
                </button>

                {/* Free Money */}
                <button
                  onClick={() => setSelectedPaymentMethod('free')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'free'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-black rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">FREE</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">Free Money</span>
                  </div>
                </button>

                {/* Expresso */}
                <button
                  onClick={() => setSelectedPaymentMethod('expresso')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'expresso'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#8B4C9F] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">E</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">Expresso</span>
                  </div>
                </button>

                {/* Wizall Money */}
                <button
                  onClick={() => setSelectedPaymentMethod('wizall')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'wizall'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#00A859] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">W</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">Wizall Money</span>
                  </div>
                </button>

                {/* Wari */}
                <button
                  onClick={() => setSelectedPaymentMethod('wari')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'wari'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#7CB342] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">W</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">Wari</span>
                  </div>
                </button>

                {/* PayPal */}
                <button
                  onClick={() => setSelectedPaymentMethod('paypal')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'paypal'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#0070BA] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">PP</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">PayPal</span>
                  </div>
                </button>

                {/* YUP */}
                <button
                  onClick={() => setSelectedPaymentMethod('yup')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'yup'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#FF6B9D] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">YUP</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">YUP</span>
                  </div>
                </button>

                {/* Wave */}
                <button
                  onClick={() => setSelectedPaymentMethod('wave')}
                  className={`p-4 rounded-xl border-2 transition-all hover:scale-105 ${
                    selectedPaymentMethod === 'wave'
                      ? 'border-[#0389A6] bg-[rgba(3,137,166,0.1)]'
                      : 'border-[#D4DCDC] bg-white hover:border-[#0389A6]'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-[#1E88E5] rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">W</span>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-xs text-[#002222]">Wave</span>
                  </div>
                </button>
              </div>

              {/* Message de confirmation */}
              {selectedPaymentMethod && (
                <div className="mt-4 p-4 bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-xl">
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#0389A6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="font-['Instrument_Sans',sans-serif] text-sm text-[#0389A6]">
                      Méthode de paiement sélectionnée : <strong>{selectedPaymentMethod === 'card' ? 'Carte bancaire' : selectedPaymentMethod === 'orange' ? 'Orange Money' : selectedPaymentMethod === 'free' ? 'Free Money' : selectedPaymentMethod === 'expresso' ? 'Expresso' : selectedPaymentMethod === 'wizall' ? 'Wizall Money' : selectedPaymentMethod === 'wari' ? 'Wari' : selectedPaymentMethod === 'paypal' ? 'PayPal' : selectedPaymentMethod === 'yup' ? 'YUP' : 'Wave'}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Boutons finaux */}
          <div className="flex justify-end items-center gap-5 pt-4 border-t border-[#D4DCDC]">
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
              Confirmer ma demande Business
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Section 5 - Demande envoyée avec succès Business
  const renderSection5 = () => (
    <div className="flex justify-center">
      <div className="w-[469px] bg-white rounded-[30px] p-[30px]">
        <div className="flex flex-col items-center gap-5">
          {/* Icône de succès */}
          <div className="w-[60px] h-[60px] bg-[rgba(1,160,78,0.1)] rounded-2xl flex items-center justify-center">
            <div className="w-[30px] h-[30px]">
              <svg viewBox="0 0 30 30" fill="none">
                <circle cx="15" cy="15" r="12.5" stroke="#01A04E" strokeWidth="2.5"/>
                <path d="M8 12l3 3 5-5" stroke="#01A04E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>

          {/* Contenu */}
          <div className="flex flex-col items-center gap-[22px] w-full">
            <div className="flex flex-col items-center gap-1.5 w-full">
              <h2 className="font-['Instrument_Sans',sans-serif] text-base font-bold leading-[2.125] text-center text-[#002222] w-full">
                Demande Business envoyée avec succès !
              </h2>
              <p className="font-['Instrument_Sans',sans-serif] text-sm leading-[1.71] text-center text-[#5A6565] w-full">
                Numéro de demande: {requestNumber}
              </p>
              <p className="font-['Instrument_Sans',sans-serif] text-sm leading-[1.71] text-center text-[#5A6565] w-full">
                Nous vous contacterons sous 24h pour votre plan Business
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

  // Colonne de récapitulatif Business (sections 1-3)
  const renderSummaryColumn = () => (
    <div className="w-[360px] space-y-[30px]">
      {/* Récapitulatif */}
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
              Business
            </h3>
            <p className="font-['Instrument_Sans',sans-serif] text-base text-[#5A6565]">
              Pour les entreprises en croissance
            </p>
          </div>

          <div className="pb-5 border-b border-[#D4DCDC]">
            <p className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#002222] mb-4">
              Fonctionnalités incluses:
            </p>
            <div className="space-y-1.5">
              {[
                'Reconnaissance faciale avancée',
                'Dashboard temps réel + Analytics',
                'Rapports personnalisés',
                'Support prioritaire 24/7',
                'Jusqu\'à 5 caméras incluses',
                'Intégration API complète',
                'Formation équipe avancée',
                'Gestion multi-utilisateurs'
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

      {/* Section Besoin d'aide */}
      <div className="bg-white rounded-2xl border border-[#D4DCDC] p-5">
        <h3 className="font-['Instrument_Sans',sans-serif] text-base font-semibold text-[#5A6565] mb-2.5">
          Besoin d'aide ?
        </h3>
        <p className="font-['Instrument_Sans',sans-serif] text-sm font-semibold text-[#002222] mb-2.5">
          Notre équipe Business est là pour vous accompagner
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
              business@senpointage.sn
            </span>
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
            Plan Business
          </h1>
          <p className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">
            Pour les entreprises en croissance
          </p>
        </div>
      )}

      {/* Sélection de plan - Plan Business sélectionné (masqué pour section 5) */}
      {currentStep !== 5 && (
        <div className="flex items-center gap-[30px] justify-center mb-10 px-20">
          {/* Plan Starter - Non sélectionné */}
          <div className="relative w-[406.67px] p-[30px] rounded-2xl border border-[#D4DCDC] bg-white">
            <div className="flex flex-col gap-4">
              <span className="font-['Instrument_Sans',sans-serif] text-lg text-[#002222]">Starter</span>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#002222]">16€ /mois / employés</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">Jusqu'à 15 employés</span>
            </div>
          </div>

          {/* Plan Business - Sélectionné */}
          <div className="relative w-[406.67px] p-[30px] rounded-2xl bg-white border-2 border-[#03D9D9] shadow-lg">
            <div className="absolute -top-[15px] left-1/2 transform -translate-x-1/2 bg-[#03D9D9] px-4 py-1.5 rounded-2xl">
              <span className="font-['Instrument_Sans',sans-serif] text-base font-medium text-white">
                Plus populaire
              </span>
            </div>
            
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="font-['Instrument_Sans',sans-serif] text-lg text-[#002222]">
                  Business
                </span>
                <div className="w-6 h-6">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#03D9D9"/>
                    <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <span className="font-['Audiowide',cursive] text-[32px] text-[#03D9D9]">14€ /mois / employés</span>
              <span className="font-['Instrument_Sans',sans-serif] text-base text-[#002222]">Jusqu'à 50 employés</span>
            </div>
          </div>

          {/* Plan Enterprise - Non sélectionné */}
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

export default TarifsBusiness;