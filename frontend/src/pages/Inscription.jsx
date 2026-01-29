import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/Button';
import imgInscription from '../assets/images/image 14.png'
import authService from '../services/authService';

function Field({ label, placeholder, type = 'text', value, onChange, name, required = false, disabled = false, rows }) {
  if (type === 'textarea') {
    return (
      <div className="flex flex-col gap-0.5">
        <label className="font-instrument text-sm font-semibold text-[#002222]">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <div className={`flex items-center justify-between gap-4 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-2.5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
          <textarea
            name={name}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={rows || 4}
            className="flex-1 bg-transparent outline-none font-instrument text-base text-[#002222] placeholder-[#5A6565] disabled:cursor-not-allowed resize-none"
          />
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-0.5">
      <label className="font-instrument text-sm font-semibold text-[#002222]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className={`flex items-center justify-between gap-4 bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-2.5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className="flex-1 bg-transparent outline-none font-instrument text-base text-[#002222] placeholder-[#5A6565] disabled:cursor-not-allowed"
        />
      </div>
    </div>
  );
}

const ArrowDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6L8 10L12 6" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.667 10C1.667 10 4.583 4.167 10 4.167C15.417 4.167 18.333 10 18.333 10C18.333 10 15.417 15.833 10 15.833C4.583 15.833 1.667 10 1.667 10Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="10" r="2.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M1.667 10C1.667 10 4.583 4.167 10 4.167C15.417 4.167 18.333 10 18.333 10C18.333 10 15.417 15.833 10 15.833C4.583 15.833 1.667 10 1.667 10Z" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="10" r="2.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.5 2.5L17.5 17.5" stroke="#5A6565" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

function Inscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    nomEntreprise: '',
    secteur: '',
    adresse: '',
    telephone: '',
    email: '',
    siteWeb: '',
    personneContact: '',
    nombreEmployes: '0',
    nombreCameras: '0',
    plan: 'Standard',
    description: '',
    motDePasse: '',
    confirmerMotDePasse: ''
  });

  const [isSectorDropdownOpen, setIsSectorDropdownOpen] = useState(false);
  const [isPlanDropdownOpen, setIsPlanDropdownOpen] = useState(false);
  const [showMotDePasse, setShowMotDePasse] = useState(false);
  const [showConfirmerMotDePasse, setShowConfirmerMotDePasse] = useState(false);
  const sectorDropdownRef = useRef(null);
  const planDropdownRef = useRef(null);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [invitationToken, setInvitationToken] = useState(null);
  const [invitationData, setInvitationData] = useState(null);
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenError, setTokenError] = useState(null);

  const isCompanyInvitation = Boolean(invitationData?.subscriptionFormData || invitationData?.companyTypeId);

  // Gérer les clics en dehors des dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sectorDropdownRef.current && !sectorDropdownRef.current.contains(event.target)) {
        setIsSectorDropdownOpen(false);
      }
      if (planDropdownRef.current && !planDropdownRef.current.contains(event.target)) {
        setIsPlanDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Valider le token d'invitation au chargement de la page
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setInvitationToken(token);
      setIsValidatingToken(true);
      
      authService.validateInvitationToken(token)
        .then((result) => {
          if (result.valid) {
            if (result.invitation?.status === 'pending_subscription') {
              setTimeout(() => {
                authService
                  .validateInvitationToken(token)
                  .then((retry) => {
                    if (retry.valid && retry.invitation?.status !== 'pending_subscription') {
                      setInvitationData(retry.invitation);
                      setFormData((prev) => ({
                        ...prev,
                        email: retry.invitation.email,
                      }));
                      setTokenError(null);
                      return;
                    }
                    navigate(`/tarifs?token=${token}`, { replace: true });
                  })
                  .catch(() => {
                    navigate(`/tarifs?token=${token}`, { replace: true });
                  });
              }, 800);
              return;
            }
            setInvitationData(result.invitation);
            // Pré-remplir les champs depuis l'invitation (email + infos entreprise si dispo)
            setFormData((prev) => {
              const inv = result.invitation || {};
              const sfd = inv.subscriptionFormData || {};
              return {
                ...prev,
                email: inv.email ?? prev.email,
                nomEntreprise: inv.companyName ?? sfd.nomEntreprise ?? prev.nomEntreprise,
                adresse: inv.companyAddress ?? sfd.adresse ?? prev.adresse,
                telephone: inv.companyPhone ?? sfd.telephone ?? prev.telephone,
                siteWeb: inv.companyWebsite ?? sfd.siteWeb ?? prev.siteWeb,
              };
            });
            setTokenError(null);
          } else {
            setTokenError(result.message || 'Token d\'invitation invalide');
          }
        })
        .catch((error) => {
          console.error('Erreur lors de la validation du token:', error);
          setTokenError('Erreur lors de la validation du token d\'invitation');
        })
        .finally(() => {
          setIsValidatingToken(false);
        });
    }
  }, [searchParams]);

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

  const validateForm = () => {
    const newErrors = {};
    console.log('🔍 Validation - invitationData:', invitationData, 'isCompanyInvitation:', isCompanyInvitation);

    if (!formData.prenom.trim()) {
      newErrors.prenom = 'Le prénom est requis';
      console.log('❌ Erreur: prénom manquant');
    }

    if (!formData.nom.trim()) {
      newErrors.nom = 'Le nom est requis';
      console.log('❌ Erreur: nom manquant');
    }

    // Champs entreprise: requis en inscription libre et en invitation entreprise.
    // Secteur: requis uniquement en inscription libre.
    const needsCompanyFields = !invitationData || isCompanyInvitation;
    console.log('🔍 needsCompanyFields:', needsCompanyFields);
    
    if (needsCompanyFields) {
      if (!formData.adresse.trim()) {
        newErrors.adresse = 'L\'adresse est requise';
        console.log('❌ Erreur: adresse manquante');
      }

      if (!formData.nomEntreprise.trim()) {
        newErrors.nomEntreprise = 'Le nom d\'entreprise est requis';
        console.log('❌ Erreur: nomEntreprise manquant');
      }

      if (!invitationData && !formData.secteur.trim()) {
        newErrors.secteur = 'Le secteur d\'activité est requis';
        console.log('❌ Erreur: secteur manquant');
      }

      if (!formData.telephone.trim()) {
        newErrors.telephone = 'Le téléphone est requis';
        console.log('❌ Erreur: telephone manquant');
      }

      if (!formData.siteWeb.trim()) {
        newErrors.siteWeb = 'Le site web est requis';
        console.log('❌ Erreur: siteWeb manquant');
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est requis';
      console.log('❌ Erreur: email manquant');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
      console.log('❌ Erreur: email invalide');
    }

    if (!formData.motDePasse) {
      newErrors.motDePasse = 'Le mot de passe est requis';
      console.log('❌ Erreur: motDePasse manquant');
    } else if (formData.motDePasse.length < 6) {
      newErrors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
      console.log('❌ Erreur: motDePasse trop court');
    }

    if (!formData.confirmerMotDePasse) {
      newErrors.confirmerMotDePasse = 'Veuillez confirmer votre mot de passe';
      console.log('❌ Erreur: confirmerMotDePasse manquant');
    } else if (formData.motDePasse !== formData.confirmerMotDePasse) {
      newErrors.confirmerMotDePasse = 'Les mots de passe ne correspondent pas';
      console.log('❌ Erreur: mots de passe ne correspondent pas');
    }

    console.log('📊 Erreurs détectées:', Object.keys(newErrors).length, newErrors);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('📝 Formulaire soumis, validation en cours...');
    console.log('📋 Données du formulaire:', {
      prenom: formData.prenom,
      nom: formData.nom,
      email: formData.email,
      secteur: formData.secteur,
      adresse: formData.adresse,
      nomEntreprise: formData.nomEntreprise,
      telephone: formData.telephone,
      siteWeb: formData.siteWeb,
      motDePasse: formData.motDePasse ? '***' : '',
      confirmerMotDePasse: formData.confirmerMotDePasse ? '***' : '',
      invitationData: invitationData ? 'présente' : 'absente',
      isCompanyInvitation
    });
    
    const isValid = validateForm();
    
    // Attendre que setErrors soit appliqué
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Récupérer les erreurs après validation
    const currentErrors = {};
    if (!formData.prenom.trim()) currentErrors.prenom = 'Le prénom est requis';
    if (!formData.nom.trim()) currentErrors.nom = 'Le nom est requis';
    if ((!invitationData || isCompanyInvitation) && !formData.adresse.trim()) currentErrors.adresse = 'L\'adresse est requise';
    if ((!invitationData || isCompanyInvitation) && !formData.nomEntreprise.trim()) currentErrors.nomEntreprise = 'Le nom d\'entreprise est requis';
    if (!invitationData && !formData.secteur.trim()) currentErrors.secteur = 'Le secteur d\'activité est requis';
    if ((!invitationData || isCompanyInvitation) && !formData.telephone.trim()) currentErrors.telephone = 'Le téléphone est requis';
    if ((!invitationData || isCompanyInvitation) && !formData.siteWeb.trim()) currentErrors.siteWeb = 'Le site web est requis';
    if (!formData.email.trim()) currentErrors.email = 'L\'email est requis';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) currentErrors.email = 'L\'email n\'est pas valide';
    if (!formData.motDePasse) currentErrors.motDePasse = 'Le mot de passe est requis';
    else if (formData.motDePasse.length < 6) currentErrors.motDePasse = 'Le mot de passe doit contenir au moins 6 caractères';
    if (!formData.confirmerMotDePasse) currentErrors.confirmerMotDePasse = 'Veuillez confirmer votre mot de passe';
    else if (formData.motDePasse !== formData.confirmerMotDePasse) currentErrors.confirmerMotDePasse = 'Les mots de passe ne correspondent pas';
    
    console.log('✅ Validation:', isValid, 'Erreurs détectées:', currentErrors);
    console.log('📊 Nombre d\'erreurs:', Object.keys(currentErrors).length);
    
    if (!isValid || Object.keys(currentErrors).length > 0) {
      console.log('❌ Formulaire invalide, arrêt de la soumission');
      setErrors(currentErrors);
      
      // Scroll vers la première erreur
      const firstErrorField = Object.keys(currentErrors)[0];
      if (firstErrorField) {
        setTimeout(() => {
          const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
          if (errorElement) {
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            errorElement.focus();
          }
        }, 100);
      }
      return;
    }

    console.log('🚀 Démarrage de l\'inscription...');
    setIsSubmitting(true);

    try {
      const registrationData = {
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        email: formData.email.trim(),
        motDePasse: formData.motDePasse,
        nomEntreprise: formData.nomEntreprise.trim(),
        // Pour une invitation, utiliser companyTypeId, sinon utiliser le secteur sélectionné
        typeOrganisation: invitationData?.companyTypeId || formData.secteur || undefined,
        address: formData.adresse.trim() || undefined,
        phone: formData.telephone.trim() || undefined,
        website: formData.siteWeb.trim() || undefined,
        invitationToken: invitationToken || undefined
      };
      
      console.log('📤 Envoi des données d\'inscription:', { ...registrationData, motDePasse: '***' });
      
      await authService.register(registrationData);
      
      console.log('✅ Inscription réussie !');

      // Créer un enregistrement utilisateur dans localStorage
      const existingUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const userRecord = {
        id: Date.now().toString(),
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        nomComplet: `${formData.prenom.trim()} ${formData.nom.trim()}`,
        fullName: `${formData.prenom.trim()} ${formData.nom.trim()}`,
        nomEntreprise: formData.nomEntreprise.trim(),
        email: formData.email.trim(),
        telephone: formData.telephone.trim() || '',
        phone: formData.telephone.trim() || '',
        departement: invitationData?.department || 'Non spécifié',
        department: invitationData?.department || 'Non spécifié',
        dateInscription: new Date().toISOString()
      };
      localStorage.setItem('users', JSON.stringify([...existingUsers, userRecord]));
      
      // Mettre à jour currentUser si c'est le même utilisateur qui vient de s'inscrire
      const currentUserStr = localStorage.getItem('currentUser');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.email === formData.email.trim()) {
          const updatedCurrentUser = {
            ...currentUser,
            nomComplet: userRecord.nomComplet,
            fullName: userRecord.fullName,
            telephone: userRecord.telephone,
            phone: userRecord.phone,
            departement: userRecord.departement,
            department: userRecord.department,
            nomEntreprise: userRecord.nomEntreprise
          };
          localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
        }
      }

      // Créer un enregistrement d'employé dans localStorage pour la page Employé
      const employeesKey = `employees:user:${formData.email.trim().toLowerCase()}`;
      const existingEmployees = JSON.parse(localStorage.getItem(employeesKey) || '[]');
      const initials = `${formData.prenom.trim().charAt(0).toUpperCase()}${formData.nom.trim().charAt(0).toUpperCase()}`;
      const employeeRecord = {
        id: Date.now().toString(),
        nomComplet: `${formData.prenom.trim()} ${formData.nom.trim()}`,
        name: `${formData.prenom.trim()} ${formData.nom.trim()}`,
        email: formData.email.trim(),
        telephone: formData.telephone.trim() || '',
        departement: invitationData?.department || 'Non spécifié',
        department: invitationData?.department || 'Non spécifié',
        poste: invitationData?.role || 'Non spécifié',
        position: invitationData?.role || 'Non spécifié',
        lieuDeTravail: formData.adresse.trim() || 'Non spécifié',
        location: formData.adresse.trim() || 'Non spécifié',
        isActive: true,
        status: 'Actif',
        statusBg: '#E6F7F9',
        statusColor: '#01A04E',
        attendance: '0%',
        initials: initials,
        // Informations supplémentaires de l'entreprise
        nomEntreprise: formData.nomEntreprise.trim(),
        secteur: formData.secteur.trim(),
        siteWeb: formData.siteWeb.trim(),
        personneContact: formData.personneContact.trim(),
        nombreEmployes: formData.nombreEmployes || '0',
        plan: formData.plan || 'Standard',
        description: formData.description.trim()
      };
      localStorage.setItem(employeesKey, JSON.stringify([...existingEmployees, employeeRecord]));

      // Créer un enregistrement d'entreprise dans localStorage pour la page Entreprises (seulement si pas d'invitation)
      if (!invitationData && formData.nomEntreprise.trim()) {
        const existingCompanies = JSON.parse(localStorage.getItem('companies') || '[]');
        const companyRecord = {
          id: Date.now().toString(),
          name: formData.nomEntreprise.trim(),
          email: formData.email.trim(),
          sector: formData.secteur.trim(),
          location: formData.adresse.trim() || '',
          contact: {
            name: formData.personneContact.trim() || '',
            phone: formData.telephone.trim() || '',
            email: formData.email.trim()
          },
          employees: parseInt(formData.nombreEmployes) || 0,
          cameras: parseInt(formData.nombreCameras) || 0,
          plan: formData.plan || 'Standard',
          status: 'Actif',
          website: formData.siteWeb.trim() || '',
          description: formData.description.trim() || ''
        };
        localStorage.setItem('companies', JSON.stringify([...existingCompanies, companyRecord]));
        
        // Déclencher un événement pour notifier les autres composants
        window.dispatchEvent(new Event('companiesUpdated'));
      }

      // Afficher un message de succès
      alert('Inscription réussie ! Vous pouvez maintenant vous connecter avec votre email et votre mot de passe.');

      // Rediriger vers la page de connexion
      navigate('/connexion');

    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      
      // Gestion des erreurs réseau
      if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
        alert('Impossible de se connecter au serveur. Veuillez vérifier que le backend est démarré sur http://localhost:3000');
        setIsSubmitting(false);
        return;
      }

      // Gestion des erreurs HTTP
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 500) {
          const message = data?.message || data?.error || 'Erreur serveur interne. Veuillez vérifier les logs du backend ou contacter le support.';
          alert(`Erreur serveur (500): ${message}\n\nDétails: ${JSON.stringify(data, null, 2)}`);
        } else if (status === 400) {
          const message = data?.message || data?.error || 'Données invalides. Veuillez vérifier les informations saisies.';
          alert(`Erreur de validation (400): ${message}`);
        } else if (status === 403) {
          alert('Il faut une invitation');
        } else if (status === 409) {
          const message = data?.message || data?.error || 'Cet email est déjà utilisé.';
          alert(`Cet email est déjà utilisé.\n\n${message}\n\nVoulez-vous vous connecter à la place ?`);
          // Optionnel : rediriger vers la page de connexion
          // navigate('/connexion');
        } else {
          const message = data?.message || data?.error || error.message || 'Une erreur est survenue lors de l\'inscription.';
          alert(`Erreur (${status}): ${message}`);
        }
      } else {
        // Erreur sans réponse (réseau, timeout, etc.)
        alert(`Erreur de connexion: ${error.message || 'Impossible de contacter le serveur. Vérifiez que le backend est démarré.'}`);
      }
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
                Complétez votre profil pour créer votre compte RH et accéder à la plateforme.
              </p>
            </div>

            {/* Image visuelle (Figma: image 14) */}
            <div className="mt-10 rounded-2xl overflow-hidden max-w-[507px]">
              <img src={imgInscription} alt="Illustration Inscription" className="w-full h-auto object-cover" />
            </div>
          </div>
        </div>

        {/* Right form card */}
        <div className="flex items-center justify-center px-5 sm:px-10 lg:px-20 py-10">
          <form onSubmit={handleSubmit} className="w-full max-w-[540px] bg-white border border-[#D4DCDC] rounded-2xl p-8 space-y-6">
            {/* Headings */}
            <div className="space-y-2.5">
              <h2 className="font-audiowide text-[34px] leading-none" style={{ color: '#002222' }}>S'inscrire</h2>
              <p className="font-instrument text-base" style={{ color: '#5A6565' }}>
                Complétez votre profil pour créer votre compte RH et accéder à la plateforme
              </p>
              {invitationData && (
                <div className="bg-[#E6F7F9] border border-[#0389A6] rounded-lg p-3 mt-2">
                  <p className="font-instrument text-sm text-[#002222]">
                    <strong>Invitation acceptée :</strong> Vous avez été invité(e) en tant que <strong>{invitationData.role}</strong> dans le département <strong>{invitationData.department}</strong>.
                  </p>
                </div>
              )}
              {tokenError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                  <p className="font-instrument text-sm text-red-600">
                    <strong>Erreur :</strong> {tokenError}
                  </p>
                  <p className="font-instrument text-xs text-red-500 mt-1">
                    Vous pouvez toujours créer un compte, mais l'invitation ne sera pas appliquée.
                  </p>
                </div>
              )}
              {isValidatingToken && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                  <p className="font-instrument text-sm text-blue-600">
                    Validation du token d'invitation en cours...
                  </p>
                </div>
              )}
            </div>

            {/* Fields rows */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Field 
                  label="Prénom" 
                  placeholder="Prénom" 
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleInputChange}
                  required
                />
                {errors.prenom && <p className="text-red-500 text-sm mt-1">{errors.prenom}</p>}
              </div>
              <div>
                <Field 
                  label="Nom" 
                  placeholder="Diop" 
                  name="nom"
                  value={formData.nom}
                  onChange={handleInputChange}
                  required
                />
                {errors.nom && <p className="text-red-500 text-sm mt-1">{errors.nom}</p>}
              </div>
            </div>

            <div>
              <Field 
                label="Adresse" 
                placeholder="Adresse" 
                value={formData.adresse}
                onChange={handleInputChange}
                name="adresse"
                required={!invitationData || isCompanyInvitation}
                disabled={isCompanyInvitation && Boolean(formData.adresse?.trim())}
              />
              {errors.adresse && <p className="text-red-500 text-sm mt-1">{errors.adresse}</p>}
            </div>

            {(!invitationData || isCompanyInvitation) && (
            <>
              <div>
                <Field 
                  label="Nom de l'entreprise" 
                  placeholder="Nom de l'entreprise" 
                  value={formData.nomEntreprise}
                  onChange={handleInputChange}
                  name="nomEntreprise"
                  required
                  disabled={isCompanyInvitation && Boolean(formData.nomEntreprise?.trim())}
                />
                {errors.nomEntreprise && <p className="text-red-500 text-sm mt-1">{errors.nomEntreprise}</p>}
              </div>

            {/* Secteur d'activité */}
            {!isCompanyInvitation && (
            <div>
              <label className="font-instrument text-sm font-semibold text-[#002222]">
                Secteur d'activité <span className="text-red-500">*</span>
              </label>
              <div className="relative mt-0.5" ref={sectorDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsSectorDropdownOpen(!isSectorDropdownOpen);
                    setIsPlanDropdownOpen(false);
                  }}
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                >
                  <span className="font-instrument text-base text-[#5A6565]">
                    {formData.secteur || 'Sélectionner..'}
                  </span>
                  <ArrowDownIcon />
                </button>
                
                {isSectorDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-[9999] overflow-hidden max-h-[300px] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {['Technologie', 'Finance', 'Télécommunications', 'Hôtellerie', 'Agriculture', 'Santé', 'Éducation', 'Commerce'].map((sector) => (
                      <button
                        key={sector}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData({ ...formData, secteur: sector });
                          setIsSectorDropdownOpen(false);
                        }}
                        className="w-full px-6 py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                      >
                        {sector}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {errors.secteur && <p className="text-red-500 text-sm mt-1">{errors.secteur}</p>}
            </div>
            )}

            {/* Téléphone et Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Field 
                  label="Téléphone" 
                  placeholder="Téléphone" 
                  value={formData.telephone}
                  onChange={handleInputChange}
                  name="telephone"
                  required
                  disabled={isCompanyInvitation && Boolean(formData.telephone?.trim())}
                />
                {errors.telephone && <p className="text-red-500 text-sm mt-1">{errors.telephone}</p>}
              </div>
              {!invitationData && (
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
              )}
            </div>

            {/* Site web */}
            <div>
              <Field 
                label="Site web" 
                placeholder="www.entreprise.sn" 
                name="siteWeb"
                value={formData.siteWeb}
                onChange={handleInputChange}
                required
                disabled={false}
              />
              {errors.siteWeb && <p className="text-red-500 text-sm mt-1">{errors.siteWeb}</p>}
            </div>

            {/* Personne de contact */}
            <div>
              <Field 
                label="Personne de contact" 
                placeholder="Nom du responsable" 
                name="personneContact"
                value={formData.personneContact}
                onChange={handleInputChange}
              />
            </div>

            {/* Nombre d'employés et Nombre de caméras */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Field 
                  label="Nombre d'employés" 
                  placeholder="0" 
                  type="number"
                  name="nombreEmployes"
                  value={formData.nombreEmployes}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Field 
                  label="Nombre de caméras" 
                  placeholder="0" 
                  type="number"
                  name="nombreCameras"
                  value={formData.nombreCameras}
                  onChange={handleInputChange}
                />
              </div>
            </div>

            {/* Plan d'abonnement */}
            <div>
              <label className="font-instrument text-sm font-semibold text-[#002222]">
                Plan d'abonnement
              </label>
              <div className="relative mt-0.5" ref={planDropdownRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setIsPlanDropdownOpen(!isPlanDropdownOpen);
                    setIsSectorDropdownOpen(false);
                  }}
                  className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-2.5 flex justify-between items-center hover:bg-[#E5E9E9] transition-colors"
                >
                  <span className="font-instrument text-base text-[#5A6565]">
                    {formData.plan}
                  </span>
                  <ArrowDownIcon />
                </button>
                
                {isPlanDropdownOpen && (
                  <div
                    className="absolute top-full left-0 mt-1 w-full bg-white border border-[#D4DCDC] rounded-2xl shadow-lg z-[9999] overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {['Standard', 'Enterprise', 'Premium'].map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setFormData({ ...formData, plan });
                          setIsPlanDropdownOpen(false);
                        }}
                        className="w-full px-6 py-2.5 text-left font-instrument text-base text-[#5A6565] hover:bg-[#ECEFEF]"
                      >
                        {plan}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <Field 
                label="Description" 
                placeholder="Description de l'entreprise..." 
                type="textarea"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={4}
              />
            </div>
            </>
            )}

            {invitationData && (
              <div>
                <Field 
                  label="Email" 
                  placeholder="votre.email@entreprise.com" 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  disabled={true} // Désactiver si l'email vient d'une invitation
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                <p className="text-xs text-[#5A6565] mt-1">
                  L'email est verrouillé car il correspond à votre invitation.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-instrument text-sm font-semibold text-[#002222]">
                  Mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-0.5">
                  <input
                    type={showMotDePasse ? "text" : "password"}
                    name="motDePasse"
                    value={formData.motDePasse}
                    onChange={handleInputChange}
                    placeholder="Crée un mot de passe sécurisé"
                    required
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-4 pr-12 font-instrument text-base text-[#002222] outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent placeholder:text-[#5A6565]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMotDePasse(!showMotDePasse)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#D4DCDC] rounded-md transition-colors cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    {showMotDePasse ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {errors.motDePasse && <p className="text-red-500 text-sm mt-1">{errors.motDePasse}</p>}
              </div>
              <div>
                <label className="font-instrument text-sm font-semibold text-[#002222]">
                  Confirmer mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative mt-0.5">
                  <input
                    type={showConfirmerMotDePasse ? "text" : "password"}
                  name="confirmerMotDePasse"
                  value={formData.confirmerMotDePasse}
                  onChange={handleInputChange}
                    placeholder="Confirmé votre mot de passe sécurisé"
                  required
                    className="w-full bg-[#ECEFEF] border border-[#D4DCDC] rounded-2xl px-6 py-4 pr-12 font-instrument text-base text-[#002222] outline-none focus:ring-2 focus:ring-[#0389A6] focus:border-transparent placeholder:text-[#5A6565]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmerMotDePasse(!showConfirmerMotDePasse)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-[#D4DCDC] rounded-md transition-colors cursor-pointer"
                    style={{ pointerEvents: 'auto' }}
                  >
                    {showConfirmerMotDePasse ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                {errors.confirmerMotDePasse && <p className="text-red-500 text-sm mt-1">{errors.confirmerMotDePasse}</p>}
              </div>
            </div>

            {/* Consent */}
            <div className="pt-2">
              <p className="font-instrument text-base" style={{ color: '#002222' }}>
                En créant votre compte, vous acceptez nos <span className="underline">conditions d'utilisation</span> et notre <span className="underline">politique de confidentialité</span>.
              </p>
            </div>

            {/* Submit */}
            <div>
              <Button 
                variant="primary" 
                type="submit"
                className="w-full bg-[#0389A6] hover:bg-[#037996] text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Inscription en cours...' : "S'inscrire"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Inscription;
