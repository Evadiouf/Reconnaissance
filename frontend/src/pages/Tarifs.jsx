import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import Logo from '../components/Logo';
import PricingCard from '../components/PricingCard';
import subscriptionService from '../services/subscriptionService';
import companySubscriptionService from '../services/companySubscriptionService';
import companiesService from '../services/companiesService';
import authService from '../services/authService';
import paymentImage from '../assets/payment-image-3d1afd.png';

/**
 * Page Tarifs - Parcours d'abonnement complet
 * Basé sur les designs Figma fournis
 */
function Tarifs() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const invitationToken = searchParams.get('token');
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState('starter');
  const [showInviteGate, setShowInviteGate] = useState(false);
  const [pendingPlanSlug, setPendingPlanSlug] = useState(null);
  const [gateEmail, setGateEmail] = useState('');
  const [gateToken, setGateToken] = useState('');
  const [gateError, setGateError] = useState('');
  const [gateLoading, setGateLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Informations entreprise
    nomEntreprise: '',
    secteurActivite: '',
    nombreEmployes: '',
    pays: 'Sénégal',
    ville: '',
    adresse: '',
    // Contact support
    categorieSupport: '',
    sujetSupport: '',
    descriptionSupport: '',
    emailSupport: '',
    telephoneSupport: ''
  });

  const [plans, setPlans] = useState([
    {
      id: 'starter',
      name: 'Starter',
      price: '16€ /mois / employés',
      description: 'Pour les petites équipes - Jusqu\'à 15 employés',
      features: [
        'Reconnaissance faciale illimitée',
        'Dashboard en temps réel',
        'Rapports de base (PDF/Excel)',
        'Support par email',
        '1 caméra incluse'
      ],
      isPopular: false,
      bgColor: 'bg-white',
      textColor: 'text-[#002222]',
      priceColor: 'text-[#002222]',
      borderColor: 'border-[#D4DCDC]'
    },
    {
      id: 'business',
      name: 'Business',
      price: '14€ /mois / employés',
      description: 'Pour les entreprises en croissance - Jusqu\'à 50 employés',
      features: [
        'Reconnaissance faciale illimitée',
        'Dashboard en temps réel',
        'Rapports avancés (PDF/Excel)',
        'Support prioritaire',
        '3 caméras incluses',
        'API intégration'
      ],
      isPopular: true,
      bgColor: 'bg-[#003E3E]',
      textColor: 'text-white',
      priceColor: 'text-[#03D9D9]',
      borderColor: 'border-[#0389A6]'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 'Sur mesure',
      description: 'Pour les grandes organisations - Employés illimités',
      features: [
        'Reconnaissance faciale illimitée',
        'Dashboard en temps réel',
        'Rapports personnalisés',
        'Support dédié 24/7',
        'Caméras illimitées',
        'API complète',
        'Formation sur site'
      ],
      isPopular: false,
      bgColor: 'bg-white',
      textColor: 'text-[#002222]',
      priceColor: 'text-[#002222]',
      borderColor: 'border-[#D4DCDC]'
    }
  ]);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevHtmlPosition = document.documentElement.style.position;
    const prevScrollRestoration = window.history.scrollRestoration;

    document.body.style.overflow = 'auto';
    document.body.style.position = 'static';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.position = 'static';
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.documentElement.style.position = prevHtmlPosition;
      window.history.scrollRestoration = prevScrollRestoration;
    };
  }, []);

  // Charger les plans depuis l'API
  useEffect(() => {
    const loadPlans = async () => {
      try {
        const publicPlans = await subscriptionService.getPublicPlans();
        if (publicPlans && Array.isArray(publicPlans) && publicPlans.length > 0) {
          // Adapter les plans de l'API au format attendu
          // Le backend ne fournit pas de champ "name" pour SubscriptionPlan.
          // On mappe donc les plans de manière déterministe:
          // - d'abord ceux qui ont une limite d'employés (employeeLimit)
          // - puis triés par amount
          // - assignés dans l'ordre starter -> business -> enterprise
          const sorted = [...publicPlans].sort((a, b) => {
            const aUnlimited = a?.employeeLimit == null;
            const bUnlimited = b?.employeeLimit == null;
            if (aUnlimited !== bUnlimited) return aUnlimited ? 1 : -1;
            const aAmount = typeof a?.amount === 'number' ? a.amount : Number.MAX_SAFE_INTEGER;
            const bAmount = typeof b?.amount === 'number' ? b.amount : Number.MAX_SAFE_INTEGER;
            return aAmount - bAmount;
          });

          const apiBySlug = {
            starter: sorted[0],
            business: sorted[1],
            enterprise: sorted[2],
          };

          setPlans((prev) =>
            prev.map((uiPlan) => {
              const apiPlan = apiBySlug[uiPlan.id];
              if (!apiPlan) return uiPlan;

              const isPopular = apiPlan.isPopular || uiPlan.id === 'business';
              return {
                ...uiPlan,
                isPopular,
                bgColor: isPopular ? 'bg-[#003E3E]' : 'bg-white',
                textColor: isPopular ? 'text-white' : 'text-[#002222]',
                priceColor: isPopular ? 'text-[#03D9D9]' : 'text-[#002222]',
                borderColor: isPopular ? 'border-[#0389A6]' : 'border-[#D4DCDC]',
                planData: apiPlan,
              };
            }),
          );
        }
      } catch (error) {
        console.error('Erreur lors du chargement des plans:', error);
        // En cas d'erreur, utiliser les plans par défaut
      }
    };

    loadPlans();
  }, []);

  const secteurs = [
    'Technologie',
    'Finance',
    'Santé',
    'Éducation',
    'Commerce',
    'Industrie',
    'Services',
    'Autre'
  ];

  const categoriesSupport = [
    'Question technique',
    'Problème de facturation',
    'Demande de fonctionnalité',
    'Support installation',
    'Autre'
  ];

  // Gestion des formulaires
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePlanSelect = (planId) => {
    setSelectedPlan(planId);
    navigate(`/tarifs/${planId}?token=${invitationToken}`);
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

  const openInviteGate = (slug) => {
    setGateError('');
    setPendingPlanSlug(slug);
    setShowInviteGate(true);
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

      const slug = pendingPlanSlug || 'starter';
      navigate(`/tarifs/${slug}?token=${encodeURIComponent(token)}`);
    } catch (e) {
      setGateError(e?.response?.data?.message || e?.message || 'Erreur lors de la validation');
    } finally {
      setGateLoading(false);
    }
  };

  const renderInviteGate = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-5">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          setShowInviteGate(false);
          setGateError('');
        }}
      />

      <div className="relative w-[469px] bg-white rounded-[30px] p-[30px]">
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

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Récupérer le plan sélectionné
      const selectedPlanData = plans.find(p => p.id === selectedPlanKey);
      if (!selectedPlanData || !selectedPlanData.planData) {
        alert('Veuillez sélectionner un plan');
        return;
      }

      const planId = selectedPlanData.planData._id || selectedPlanData.planData.id;

      if (invitationToken) {
        await companySubscriptionService.createByInvitation({
          token: invitationToken,
          planId,
          subscriptionFormData: formData,
        });

        alert('Abonnement créé avec succès ! Veuillez finaliser votre inscription.');
        navigate(`/inscription?token=${invitationToken}`, { replace: true });
        return;
      }

      // Créer l'entreprise
      // Note: typeId devrait être récupéré depuis une liste de types d'entreprise
      // Pour l'instant, on utilise un placeholder - à adapter selon votre backend
      const typeId = formData.secteurActivite; // TODO: Récupérer l'ID réel du type d'entreprise
      
      const company = await companiesService.create({
        name: formData.nomEntreprise,
        typeId: typeId
      });

      // Créer l'abonnement pour l'entreprise
      const subscription = await companySubscriptionService.create({
        companyId: company._id || company.id,
        planId
      });

      alert('Abonnement créé avec succès ! Redirection vers le dashboard...');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur lors de la création de l\'abonnement:', error);
      const message = error.response?.data?.message || error.message || 'Une erreur est survenue lors de la création de l\'abonnement.';
      alert(message);
    }
  };

  const handleSupportSubmit = () => {
    const subject = encodeURIComponent(formData.sujetSupport || 'Demande de support');
    const body = encodeURIComponent(
      `Catégorie: ${formData.categorieSupport || ''}\n` +
      `Sujet: ${formData.sujetSupport || ''}\n\n` +
      `Description:\n${formData.descriptionSupport || ''}\n\n` +
      `Email: ${formData.emailSupport || ''}\n` +
      `Téléphone: ${formData.telephoneSupport || ''}\n\n` +
      `Plan: ${selectedPlanKey || ''}`
    );

    window.location.href = `mailto:contact@naratechvision.com?subject=${subject}&body=${body}`;
  };

  // Effet pour récupérer le plan depuis l'URL
  const planFromUrl = searchParams.get('plan');
  const selectedPlanKey = invitationToken && planFromUrl && ['starter', 'business', 'enterprise'].includes(planFromUrl)
    ? planFromUrl
    : selectedPlan;
  useEffect(() => {
    if (!invitationToken) return;
    // Ne rediriger que si on est sur /tarifs avec un paramètre plan explicite
    // Ne pas rediriger si on arrive directement sur /tarifs?token=...
    if (planFromUrl && ['starter', 'business', 'enterprise'].includes(planFromUrl) && location.pathname === '/tarifs') {
      navigate(`/tarifs/${planFromUrl}?token=${invitationToken}`, { replace: true });
    }
  }, [planFromUrl, invitationToken, navigate, location.pathname]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

  // Rendu des étapes de progression
  const renderProgressSteps = () => (
    <div className="flex justify-center items-center gap-[205px] mb-10">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex flex-col items-center gap-1">
          <div className={`w-10 h-10 rounded-[20px] flex items-center justify-center ${
            step === currentStep ? 'bg-[#0389A6]' : 'bg-[rgba(3,137,166,0.1)]'
          }`}>
            <span className={`font-['Audiowide',cursive] text-xl leading-[0.8] ${
              step === currentStep ? 'text-white' : 'text-[#002222]'
            }`}>
              {step}
            </span>
          </div>
          <span className={`font-['Instrument_Sans',sans-serif] text-xs font-medium leading-[1.33] text-center ${
            step === currentStep ? 'text-[#002222]' : 'text-[#5A6565]'
          }`}>
            {step === 1 ? 'Contexte' : step === 2 ? 'Génération IA' : 'Finalisation'}
          </span>
        </div>
      ))}
    </div>
  );

  // Rendu de la sélection de plan
  const renderPlanSelection = () => (
    <div className="flex items-center gap-[30px] justify-center mb-10">
      {plans.map((plan) => (
        <div
          key={plan.id}
          onClick={() => handlePlanSelect(plan.id)}
          className={`relative w-[406.67px] p-[30px] rounded-2xl border cursor-pointer transition-all ${
            selectedPlanKey === plan.id 
              ? `${plan.bgColor} ${plan.borderColor} border-[1.06px]` 
              : 'bg-white border-[#D4DCDC] border-[1.06px]'
          }`}
        >
          {plan.isPopular && (
            <div className="absolute -top-[15px] left-1/2 transform -translate-x-1/2 bg-[#03D9D9] px-4 py-1.5 rounded-2xl">
              <span className="font-['Instrument_Sans',sans-serif] text-base font-medium leading-[1.625] text-white">
                Plus populaire
              </span>
            </div>
          )}
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className={`font-['Instrument_Sans',sans-serif] text-lg leading-[1.22] ${
                selectedPlan === plan.id ? plan.textColor : 'text-[#002222]'
              }`}>
                {plan.name}
              </span>
              {selectedPlan === plan.id && plan.id === 'business' && (
                <div className="w-6 h-6">
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill="#03D9D9"/>
                    <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </div>
            
            <span className={`font-['Audiowide',cursive] text-[32px] leading-[1.27] ${
              selectedPlan === plan.id ? plan.priceColor : 'text-[#002222]'
            }`}>
              {plan.price}
            </span>
            
            <span className={`font-['Instrument_Sans',sans-serif] text-base leading-[1.22] ${
              selectedPlan === plan.id ? plan.textColor : 'text-[#002222]'
            }`}>
              {plan.description}
            </span>
          </div>
        </div>
      ))}
    </div>
  );

  // Rendu du formulaire d'informations entreprise
  const renderCompanyForm = () => (
    <div className="max-w-[890px] mx-auto">
      <div className="bg-white border border-[#D4DCDC] rounded-2xl">
        {/* En-tête */}
        <div className="flex items-center gap-4 p-5 border-b border-[#D4DCDC]">
          <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.5] text-[#002222]">
            Informations de l'entreprise
          </span>
        </div>

        {/* Contenu */}
        <div className="p-5 space-y-5">
          <p className="font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-center text-[#5A6565]">
            Parlez-nous de votre entreprise
          </p>

          {/* Première ligne */}
          <div className="flex gap-5">
            <div className="flex-1 space-y-0.5">
              <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                Nom de l'entreprise
              </label>
              <input
                type="text"
                value={formData.nomEntreprise}
                onChange={(e) => handleInputChange('nomEntreprise', e.target.value)}
                placeholder="Ex: TechCorp Sénégal"
                className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565]"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                Secteur d'activité
              </label>
              <select
                value={formData.secteurActivite}
                onChange={(e) => handleInputChange('secteurActivite', e.target.value)}
                className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] appearance-none"
              >
                <option value="">Sélectionnez...</option>
                {secteurs.map(secteur => (
                  <option key={secteur} value={secteur}>{secteur}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Deuxième ligne */}
          <div className="flex gap-5">
            <div className="flex-1 space-y-0.5">
              <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                Nombre d'employé
              </label>
              <input
                type="number"
                value={formData.nombreEmployes}
                onChange={(e) => handleInputChange('nombreEmployes', e.target.value)}
                placeholder="Ex: 50"
                className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565]"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                Pays
              </label>
              <input
                type="text"
                value={formData.pays}
                onChange={(e) => handleInputChange('pays', e.target.value)}
                className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565]"
              />
            </div>
          </div>

          {/* Troisième ligne */}
          <div className="flex gap-5">
            <div className="flex-1 space-y-0.5">
              <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                Ville
              </label>
              <input
                type="text"
                value={formData.ville}
                onChange={(e) => handleInputChange('ville', e.target.value)}
                placeholder="Ex: Dakar"
                className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565]"
              />
            </div>
            <div className="flex-1 space-y-0.5">
              <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                Adresse
              </label>
              <input
                type="text"
                value={formData.adresse}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                placeholder="Ex: Avenue Léopold Sédar Senghor"
                className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565]"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end items-center gap-5 p-[10px_30px] border-t border-[#D4DCDC]">
          <button
            onClick={() => {
              setCurrentStep(1);
              if (invitationToken) {
                navigate(`/tarifs?token=${invitationToken}`);
                return;
              }
              navigate('/tarifs');
            }}
            className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-[#002222] hover:bg-gray-50"
          >
            Précédent
          </button>
          <button
            onClick={handleNextStep}
            className="px-4 py-2.5 bg-[#0389A6] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-white hover:bg-[#027a94]"
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );

  // Rendu du récapitulatif
  const renderSummary = () => {
    const selectedPlanData = plans.find(p => p.id === selectedPlanKey);
    const selectedPlanTagline =
      selectedPlanKey === 'starter'
        ? 'Pour les petites équipes'
        : selectedPlanKey === 'business'
          ? 'Pour les entreprises en croissance'
          : 'Pour les grandes organisations';
    
    return (
      <div className="flex gap-[30px] max-w-[1280px] mx-auto">
        {/* Récapitulatif */}
        <div className="w-[360px]">
          <div className="bg-white border border-[#D4DCDC] rounded-2xl">
            {/* En-tête */}
            <div className="flex items-center gap-4 p-5 border-b border-[#D4DCDC]">
              <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.5] text-[#002222]">
                Récapitulatif
              </span>
            </div>

            {/* Contenu */}
            <div className="p-[16px_20px_20px] space-y-5">
              {/* Plan sélectionné */}
              <div className="pb-5 border-b border-[#D4DCDC] space-y-1.5">
                <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.5] text-[#5A6565]">
                  Plan sélectionné
                </span>
                <div className="font-['Audiowide',cursive] text-2xl leading-[1] text-[#002222]">
                  {selectedPlanData?.name}
                </div>
                <div className="font-['Instrument_Sans',sans-serif] text-base leading-[1.5] text-[#5A6565]">
                  {selectedPlanTagline}
                </div>
              </div>

              {/* Prix */}
              <div className="pb-5 border-b border-[#D4DCDC]">
                <div className="font-['Audiowide',cursive] text-2xl leading-[1] text-[#002222]">
                  {selectedPlanData?.price}
                </div>
              </div>

              {/* Fonctionnalités */}
              <div className="pb-5 border-b border-[#D4DCDC] space-y-4">
                <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.5] text-[#002222]">
                  Fonctionnalités incluses:
                </span>
                <div className="space-y-1.5">
                  {selectedPlanData?.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="w-5 h-5 flex-shrink-0">
                        <svg viewBox="0 0 20 20" fill="none">
                          <path d="M4.17 5.83L11.67 13.33L15.83 9.17" stroke="#01A04E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <span className="font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#002222]">
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Essai gratuit */}
              <div className="p-[10px_16px] bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-2xl space-y-1">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M4.17 5.83L11.67 13.33L15.83 9.17" stroke="#0389A6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <span className="font-['Instrument_Sans',sans-serif] text-sm font-bold leading-[1.22] text-[#0389A6]">
                    Essai gratuit de 14 jours
                  </span>
                </div>
                <p className="font-['Instrument_Sans',sans-serif] text-xs leading-[1.22] text-[#5A6565]">
                  Sans engagement, sans carte bancaire
                </p>
              </div>
            </div>
          </div>

          {selectedPlanKey === 'enterprise' && (
            <>
              {/* Besoin d'aide */}
              <div className="mt-[30px] bg-white border border-[#D4DCDC] rounded-2xl p-[16px_20px_20px] space-y-2.5">
                <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.5] text-[#5A6565]">
                  Besoin d'aide ?
                </span>
                <div className="font-['Instrument_Sans',sans-serif] text-sm font-semibold leading-[1.71] text-[#002222]">
                  Notre équipe est là pour vous accompagner
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M1.67 1.67h16.67v16.67H1.67z" fill="none"/>
                      <path d="M6.67 3.33v13.33M13.33 3.33v13.33" stroke="#5A6565" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span className="font-['Instrument_Sans',sans-serif] text-base leading-[1.5] text-[#5A6565]">
                    +221 33 XXX XX XX
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M1.67 2.92h16.67v14.17H1.67z" fill="none"/>
                      <path d="M1.67 6.25l8.33 5.83 8.33-5.83" stroke="#5A6565" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span className="font-['Instrument_Sans',sans-serif] text-base leading-[1.5] text-[#5A6565]">
                    contact@senpointage.sn
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedPlanKey === 'enterprise' ? (
          <div className="flex-1">
            <div className="bg-white border border-[#D4DCDC] rounded-2xl">
            {/* En-tête */}
            <div className="flex items-center gap-4 p-5 border-b border-[#D4DCDC]">
              <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.5] text-[#002222]">
                Contacter le support
              </span>
            </div>

            {/* Contenu */}
            <div className="p-5 space-y-5">
              <p className="font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-center text-[#5A6565]">
                Notre équipe est disponible 24/7 pour vous aider. Décrivez votre problème et nous vous répondrons rapidement.
              </p>

              {/* Assistance immédiate */}
              <div className="p-[16px_21px] bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5">
                    <svg viewBox="0 0 20 20" fill="none">
                      <path d="M1.67 1.67h16.67v16.67H1.67z" fill="none"/>
                      <path d="M6.67 3.33v13.33M13.33 3.33v13.33" stroke="#0389A6" strokeWidth="1.5"/>
                    </svg>
                  </div>
                  <span className="font-['Instrument_Sans',sans-serif] text-base font-bold leading-[1.22] text-[#0389A6]">
                    Besoin d'une assistance immédiate ?
                  </span>
                </div>
                <div className="flex gap-[100px]">
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5">
                      <svg viewBox="0 0 20 20" fill="none">
                        <path d="M1.67 1.67h16.67v16.67H1.67z" fill="none"/>
                        <path d="M6.67 3.33v13.33M13.33 3.33v13.33" stroke="#0389A6" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-base leading-[1.5] text-[#0389A6]">
                      +221 33 XXX XX XX
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-5 h-5">
                      <svg viewBox="0 0 20 20" fill="none">
                        <path d="M1.67 2.92h16.67v14.17H1.67z" fill="none"/>
                        <path d="M1.67 6.25l8.33 5.83 8.33-5.83" stroke="#0389A6" strokeWidth="1.5"/>
                      </svg>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-base leading-[1.5] text-[#0389A6]">
                      contact@naratechvision.com
                    </span>
                  </div>
                </div>
              </div>

              {/* Formulaire */}
              <div className="space-y-5">
                {/* Catégorie */}
                <div className="space-y-0.5">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                    Catégorie de la demande *
                  </label>
                  <select
                    value={formData.categorieSupport}
                    onChange={(e) => handleInputChange('categorieSupport', e.target.value)}
                    className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] appearance-none"
                  >
                    <option value="">Sélectionnez une catégorie...</option>
                    {categoriesSupport.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Sujet */}
                <div className="space-y-0.5">
                  <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                    Sujet *
                  </label>
                  <input
                    type="text"
                    value={formData.sujetSupport}
                    onChange={(e) => handleInputChange('sujetSupport', e.target.value)}
                    placeholder="Ex: Problème de connexion à la caméra"
                    className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565]"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2.5">
                  <div className="space-y-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                      Description détaillée *
                    </label>
                    <textarea
                      value={formData.descriptionSupport}
                      onChange={(e) => handleInputChange('descriptionSupport', e.target.value)}
                      placeholder="Décrivez votre problème ou votre question en détail...

Informations utiles :
- Étapes pour reproduire le problème
- Messages d'erreur
- Navigateur utilisé
- Captures d'écran (si disponibles)"
                      rows={6}
                      className="w-full p-[16px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565] resize-none"
                    />
                  </div>
                  <p className="font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-[#5A6565]">
                    Plus vous nous donnez de détails, plus nous pourrons vous aider rapidement.
                  </p>
                </div>

                {/* Contact */}
                <div className="flex gap-5">
                  <div className="flex-1 space-y-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                      Email de contact *
                    </label>
                    <input
                      type="email"
                      value={formData.emailSupport}
                      onChange={(e) => handleInputChange('emailSupport', e.target.value)}
                      placeholder="votre@email.com"
                      className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565]"
                    />
                  </div>
                  <div className="flex-1 space-y-0.5">
                    <label className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.625] text-[#002222] px-2.5">
                      Téléphone (facultatif)
                    </label>
                    <input
                      type="tel"
                      value={formData.telephoneSupport}
                      onChange={(e) => handleInputChange('telephoneSupport', e.target.value)}
                      placeholder="+221 77 123 45 67"
                      className="w-full p-[10px_26px] bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.625] text-[#5A6565] placeholder-[#5A6565]"
                    />
                  </div>
                </div>

                {/* Engagement */}
                <div className="p-[16px_21px] bg-[rgba(3,137,166,0.1)] border border-[#0389A6] rounded-2xl">
                  <div className="flex gap-4">
                    <div className="w-6 h-6 flex-shrink-0">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" fill="#0389A6"/>
                        <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <span className="font-['Instrument_Sans',sans-serif] text-base font-bold leading-[1.875] text-[#0389A6]">
                      Notre engagement :
                      Support en français et wolof
                      Suivi par email de votre demande
                      Accès à la base de connaissances
                      Support 24/7 pour les urgences
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end items-center gap-5 p-[10px_30px] border-t border-[#D4DCDC]">
              <button
                onClick={handlePrevStep}
                className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-[#002222] hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSupportSubmit}
                className="px-4 py-2.5 bg-[#0389A6] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-white hover:bg-[#027a94]"
              >
                Envoyer la demande
              </button>
            </div>
            </div>
          </div>
        ) : (
          <div className="flex-1">
            <div className="bg-white border border-[#D4DCDC] rounded-2xl">
              <div className="flex items-center gap-4 p-5 border-b border-[#D4DCDC]">
                <span className="font-['Instrument_Sans',sans-serif] text-base font-semibold leading-[1.5] text-[#002222]">
                  Finalisation
                </span>
              </div>
              <div className="p-5 space-y-5">
                <p className="font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-[#5A6565]">
                  Cliquez sur "Confirmer l'abonnement" pour finaliser.
                </p>
                <div className="flex justify-end items-center gap-5">
                  <button
                    onClick={handlePrevStep}
                    className="px-4 py-2.5 border border-[#D4DCDC] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-[#002222] hover:bg-gray-50"
                  >
                    Précédent
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-4 py-2.5 bg-[#0389A6] rounded-2xl font-['Instrument_Sans',sans-serif] text-base leading-[1.22] text-white hover:bg-[#027a94]"
                  >
                    Confirmer l'abonnement
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-dark-bg">
      {showInviteGate ? renderInviteGate() : null}
      <div className="bg-dark-card border-b border-primary/20 h-[70px] flex items-center justify-between px-[50px]">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="cursor-pointer"
        >
          <Logo />
        </button>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-xl border border-primary/30 text-white/90 font-instrument text-sm hover:bg-white/5 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>

      <div className="py-20 px-5 sm:px-10 lg:px-20">
        <div className="max-w-[1440px] mx-auto">
          <div className="mb-16 space-y-4 max-w-2xl">
            <h1 className="font-audiowide text-4xl lg:text-5xl text-white">Tarifs transparents et flexibles</h1>
            <p className="font-instrument text-base text-white/90 leading-relaxed">
              Choisissez le plan qui correspond à vos besoins.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {plans.map((plan) => {
              const slug = plan.id;
              const to = invitationToken
                ? `/tarifs/${slug}?token=${encodeURIComponent(invitationToken)}`
                : `/tarifs/${slug}`;

              const period =
                plan.id === 'starter'
                  ? "Jusqu'à 15 employés"
                  : plan.id === 'business'
                    ? "Jusqu'à 50 employés"
                    : 'Employés illimités';

              return (
                <PricingCard
                  key={plan.id}
                  name={plan.name}
                  description={plan.description}
                  price={plan.price}
                  period={period}
                  features={plan.features}
                  popular={plan.isPopular}
                  to={to}
                  buttonText={plan.id === 'enterprise' ? 'Nous contacter' : "Commencer l'essai"}
                  buttonVariant={plan.id === 'business' ? 'primary' : 'secondary'}
                  onButtonClick={
                    plan.id === 'enterprise'
                      ? undefined
                      : (invitationToken ? undefined : () => openInviteGate(slug))
                  }
                />
              );
            })}
          </div>

          <div className="text-center space-y-3.5">
            <p className="font-instrument text-base text-white/50">
              Tous les plans incluent 14 jours d'essai gratuit, sans carte bancaire requis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tarifs;
