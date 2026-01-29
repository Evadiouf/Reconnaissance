import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import FeatureCard from '../components/FeatureCard';
import CheckmarkItem from '../components/CheckmarkItem';
import PricingCard from '../components/PricingCard';
import FAQItem from '../components/FAQItem';
import imgImage6 from '../assets/images/image 6.png'
import imgFrame16 from '../assets/images/Frame 16.png'
import imgFrame35 from '../assets/images/Frame 35.png'
import imgAvantages from '../assets/images/image 10.png'
import imgCta from '../assets/images/image 11.png'

/**
 * Fonction utilitaire pour scroller vers une ancre sans rafraîchir
 */
const scrollToAnchor = (anchorId) => {
  const element = document.getElementById(anchorId.replace('#', ''));
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};


/**
 * Page d'accueil principale
 */
function Home() {
  const location = useLocation();
  const navigate = useNavigate();

  // Gérer le scroll automatique vers les ancres
  useEffect(() => {
    if (location.hash) {
      // Attendre que le DOM soit prêt
      setTimeout(() => {
        scrollToAnchor(location.hash);
      }, 100);
    }
  }, [location.hash]);
  // Données des fonctionnalités
  const features = [
    {
      title: 'Reconnaissance Faciale Sécurisée',
      description: 'Éliminez la fraude de pointage grâce à notre technologie de reconnaissance faciale avancée avec détection de vivacité.',
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Multi-Caméras',
      description: 'Support complet pour webcams, caméras IP et RTSP avec configuration flexible et surveillance d\'état.',
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: 'Gestion en Temps Réel',
      description: 'Suivez les présences instantanément avec des données précises et des alertes automatiques pour les retards.',
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Gestion Flexible',
      description: 'Configurez des horaires personnalisés, gérez plusieurs sites et adaptez-vous aux horaires flexibles.',
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: 'Rapports Intelligents',
      description: 'Générez des rapports détaillés avec graphiques interactifs et exports Excel/PDF personnalisables.',
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: 'Interface Intuitive',
      description: 'Dashboard moderne avec navigation ergonomique adaptée aux administrateurs RH et employés.',
      icon: (
        <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  // Données des cas d'usage
  const useCases = [
    {
      title: 'Entreprises',
      description: 'PME et grandes entreprises cherchant à moderniser leur système de gestion des présences'
    },
    {
      title: 'Établissements d\'Enseignement',
      description: 'Écoles et universités pour simplifier le suivi des présences étudiants et personnel'
    },
    {
      title: 'Sites Industriels',
      description: 'Environnements industriels nécessitant un contrôle strict des entrées/sorties'
    }
  ];

  // Données des tarifs
  const pricingPlans = [
    {
      name: 'Starter',
      description: 'Pour les petites équipes',
      price: '16€ /mois / employés',
      period: 'Jusqu\'à 15 employés',
      features: [
        'Reconnaissance faciale illimitée',
        'Dashboard en temps réel',
        'Rapports de base (PDF/Excel)',
        'Support par email',
        '1 caméra incluse'
      ],
      buttonText: 'Commencer l\'essai',
      buttonVariant: 'secondary'
    },
    {
      name: 'Business',
      description: 'Pour les entreprises en croissance',
      price: '14€ /mois / employés',
      period: 'Jusqu\'à 50 employés',
      features: [
        'Tout de Starter +',
        'Gestion multi-sites',
        'Rapports avancés personnalisables',
        'API d\'intégration',
        'Support prioritaire 24/7',
        'Jusqu\'à 5 caméras',
        'Horaires flexibles avancés'
      ],
      popular: true,
      buttonText: 'Commencer l\'essai',
      buttonVariant: 'primary'
    },
    {
      name: 'Enterprise',
      description: 'Pour les grandes organisations',
      price: 'Sur mesure',
      period: 'Employés illimités',
      features: [
        'Tout de Business +',
        'Déploiement sur site',
        'Formation personnalisée',
        'Gestionnaire de compte dédié',
        'SLA garanti 99,9%',
        'Caméras illimitées',
        'Personnalisation complète',
        'Conformité sur mesure'
      ],
      buttonText: 'Nous contacter',
      buttonVariant: 'secondary'
    }
  ];

  // Données FAQ
  const faqItems = [
    {
      question: 'Comment fonctionne la reconnaissance faciale de SenPointage ?',
      answer: 'SenPointage utilise des algorithmes d\'intelligence artificielle avancés pour analyser et identifier les visages en temps réel. Notre technologie de détection de vivacité (liveness detection) garantit qu\'il s\'agit bien d\'une personne réelle et non d\'une photo ou d\'une vidéo, éliminant ainsi toute tentative de fraude. Le système est capable de reconnaître les employés même avec des changements d\'apparence mineurs (lunettes, coiffure, etc.).'
    },
    {
      question: 'SenPointage est-il conforme au RGPD ?',
      answer: 'Oui, SenPointage est entièrement conforme au RGPD. Toutes les données biométriques sont traitées de manière sécurisée, chiffrée et stockée localement ou dans des centres de données certifiés. Les utilisateurs ont un contrôle total sur leurs données et peuvent les supprimer à tout moment.'
    },
    {
      question: 'Quel matériel est nécessaire pour procéder avec SenPointage ?',
      answer: 'SenPointage fonctionne avec la plupart des caméras standard : webcams USB, caméras IP et flux RTSP. Aucun matériel spécialisé n\'est requis. Le système fonctionne sur Windows, Linux et peut être déployé sur serveur local ou cloud.'
    },
    {
      question: 'Combien de temps prend l\'installation ?',
      answer: 'L\'installation de SenPointage est très rapide. Pour la version cloud, vous pouvez commencer en quelques minutes. Pour un déploiement sur site, l\'installation complète prend généralement moins d\'une heure avec notre support.'
    }
  ];

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* Section Hero */}
      <section id="essayer" className="pt-32 pb-20 px-5 sm:px-10 lg:px-20 relative overflow-hidden">
        {/* Effets visuels de fond */}
        <div className="absolute top-20 right-0 w-[720px] h-[476px] bg-primary/20 blur-[530px] -z-10"></div>
        <div className="absolute bottom-20 left-0 w-[720px] h-[476px] bg-primary/20 blur-[530px] -z-10"></div>

        <div className="max-w-[1440px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Contenu gauche */}
            <div className="space-y-10">
              {/* Badge */}
              <div className="inline-block">
                <div className="bg-primary/10 border border-primary/30 rounded-2xl px-2.5 py-1.5">
                  <span className="font-instrument text-base text-primary">Reconnaissance Faciale Avancée</span>
                </div>
              </div>

              {/* Titre et description */}
              <div className="space-y-7.5">
                <h1 className="font-audiowide text-5xl lg:text-6xl text-white leading-tight">
                  Révolutionnez la gestion des présences en entreprise
                </h1>
                <p className="font-instrument text-base text-white/90 leading-relaxed max-w-2xl">
                  SenPointage utilise la reconnaissance faciale pour automatiser le pointage, éliminer la fraude et fournir des données précises en temps réel.
                </p>
              </div>

              {/* Boutons CTA */}
              <div className="flex flex-wrap items-center gap-5">
                <Button variant="secondary" onClick={() => scrollToAnchor('#fonctionnalites')}>
                  Voir la démo
                </Button>
              </div>

              {/* Points de confiance */}
              <div className="flex flex-wrap items-center gap-10 pt-5">
                <CheckmarkItem text="Installation rapide" />
                <CheckmarkItem text="Conformité RGPD" />
                <CheckmarkItem text="Support 24/7" />
              </div>
            </div>

            {/* Visuel droit - Placeholder pour image */}
            <div className="relative">
              {/* Effet vectoriel */}
              

              {/* Cadres décoratifs */}
              <img src={imgFrame35} alt="Frame 35" className="absolute left-0 -bottom-6 w-48 md:w-56 lg:w-72 opacity-90" />
              <img src={imgFrame16} alt="Frame 16" className="absolute right-6 top-20 w-24 md:w-28 lg:w-32 opacity-80 rotate-12 origin-center" />

              {/* Carte principale avec image */}
              <div className="bg-dark-card border border-primary/20 rounded-2xl p-3 md:p-4 aspect-square flex items-center justify-center">
                <div className="relative w-full h-full rounded-xl overflow-hidden">
                  <img src={imgImage6} alt="Interface SenPointage" className="w-full h-full object-cover" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section Fonctionnalités */}
      <section id="fonctionnalites" className="py-20 px-5 sm:px-10 lg:px-20">
        <div className="max-w-[1440px] mx-auto">
          {/* En-tête */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-audiowide text-4xl lg:text-5xl text-white">Fonctionnalités Avancées</h2>
            <p className="font-instrument text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
              Une solution complète qui combine sécurité, simplicité et intelligence artificielle pour moderniser votre gestion des présences.
            </p>
          </div>

          {/* Grille de fonctionnalités */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Section Avantages */}
      <section id="avantages" className="py-20 px-5 sm:px-10 lg:px-20 bg-dark-card/50">
        <div className="max-w-[1440px] mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Contenu */}
            <div className="space-y-10">
              <div className="space-y-4">
                <h2 className="font-audiowide text-4xl lg:text-5xl text-white">Pourquoi choisir SenPointage ?</h2>
                <p className="font-instrument text-base text-white/90 leading-relaxed">
                  Une solution économique développée sur des technologies open-source, offrant une alternative moderne aux systèmes traditionnels coûteux.
                </p>
              </div>

              {/* Liste des avantages */}
              <div className="space-y-7.5">
                <CheckmarkItem text="Réduction de 90% du temps administratif" />
                <CheckmarkItem text="Élimination complète de la fraude de pointage" />
                <CheckmarkItem text="Conformité RGPD et protection des données" />
                <CheckmarkItem text="ROI visible dès le premier mois" />
                <CheckmarkItem text="Support technique 24/7" />
                <CheckmarkItem text="Installation simple et rapide" />
              </div>

              <Button variant="primary" onClick={() => scrollToAnchor('#essayer')}>
                Commencer maintenant
              </Button>
            </div>

            {/* Image */}
            <div className="bg-dark-card border border-primary/20 rounded-2xl p-2 md:p-3 lg:p-4 aspect-square overflow-hidden">
              <img src={imgAvantages} alt="Pourquoi choisir SenPointage" className="w-full h-full object-cover rounded-xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Section Cas d'usage */}
      <section id="cas-usage" className="py-20 px-5 sm:px-10 lg:px-20">
        <div className="max-w-[1440px] mx-auto">
          {/* En-tête */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-audiowide text-4xl lg:text-5xl text-white">Adapté à vos besoins</h2>
            <p className="font-instrument text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
              SenPointage s'adapte à tous types d'organisations, des PME aux grandes entreprises industrielles.
            </p>
          </div>

          {/* Grille de cas d'usage */}
          <div className="grid md:grid-cols-3 gap-8">
            {useCases.map((useCase, index) => (
              <div
                key={index}
                className="bg-dark-card border border-primary/20 rounded-2xl p-8 space-y-5 hover:border-primary/40 transition-all duration-300"
              >
                <div className="bg-primary/20 rounded-2xl w-16 h-16 flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-audiowide text-lg text-white">{useCase.title}</h3>
                <p className="font-instrument text-base text-white/90 leading-relaxed">{useCase.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section Tarifs */}
      <section id="tarifs" className="py-20 px-5 sm:px-10 lg:px-20 bg-dark-card/50">
        <div className="max-w-[1440px] mx-auto">
          {/* En-tête */}
          <div className="mb-16 space-y-4 max-w-2xl">
            <h2 className="font-audiowide text-4xl lg:text-5xl text-white">Tarifs transparents et flexibles</h2>
            <p className="font-instrument text-base text-white/90 leading-relaxed">
              Choisissez le plan qui correspond à vos besoins. Tous les plans incluent notre technologie de reconnaissance faciale avancée et un support dédié.
            </p>
          </div>

          {/* Grille de tarifs */}
          <div className="grid md:grid-cols-3 gap-8 mb-10">
            {pricingPlans.map((plan, index) => (
              <PricingCard
                key={index}
                {...plan}
              />
            ))}
          </div>

          {/* Note sur l'essai gratuit */}
          <div className="text-center space-y-3.5">
            <p className="font-instrument text-base text-white/50">
              Tous les plans incluent 14 jours d'essai gratuit, sans carte bancaire requis
            </p>
            <div className="flex items-center justify-center gap-2">
              <span className="font-instrument text-base text-white/50">Des questions sur nos tarifs ?</span>
              <a 
                href="#contact" 
                onClick={(e) => {
                  e.preventDefault();
                  scrollToAnchor('#contact');
                }}
                className="font-instrument font-medium text-base text-white hover:text-primary transition-colors"
              >
                Contactez notre équipe commerciale
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Section FAQ */}
      <section id="faq" className="py-20 px-5 sm:px-10 lg:px-20">
        <div className="max-w-[1440px] mx-auto">
          {/* En-tête */}
          <div className="text-center mb-16 space-y-4">
            <h2 className="font-audiowide text-4xl lg:text-5xl text-white">Questions fréquemment posées</h2>
            <p className="font-instrument text-base text-white/90 max-w-2xl mx-auto leading-relaxed">
              Trouvez rapidement les réponses aux questions les plus courantes sur SenPointage.
            </p>
          </div>

          {/* Liste FAQ */}
          <div className="max-w-4xl mx-auto space-y-5">
            {faqItems.map((item, index) => (
              <FAQItem key={index} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* Section CTA Finale */}
      <section id="cta" className="py-20 px-5 sm:px-10 lg:px-20">
        <div className="max-w-[1440px] mx-auto">
          <div className="bg-gradient-to-br from-dark-card to-dark-bg border border-primary/20 rounded-2xl p-12 lg:p-16">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Contenu */}
              <div className="space-y-6">
                <h2 className="font-audiowide text-4xl lg:text-5xl text-white">
                  Prêt à moderniser votre gestion des présences ?
                </h2>
                <p className="font-instrument text-base text-white/90 leading-relaxed">
                  Rejoignez les entreprises qui ont choisi SenPointage pour automatiser leur pointage et éliminer la fraude définitivement.
                </p>
                <div className="flex flex-wrap items-center gap-5">
                  <Button variant="secondary" onClick={() => navigate('/contact')}>
                    Contacter le support
                  </Button>
                </div>
              </div>

              {/* Image */}
              <div className="bg-dark-card/50 border border-primary/20 rounded-2xl p-2 md:p-3 lg:p-4 aspect-square overflow-hidden">
                <img src={imgCta} alt="CTA SenPointage" className="w-full h-full object-cover rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}

export default Home;

