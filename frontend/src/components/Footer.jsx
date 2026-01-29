import { Link } from 'react-router-dom';

/**
 * Composant Footer avec liens et copyright
 */
function Footer() {
  const footerSections = [
    {
      title: 'Produit',
      links: [
        { label: 'Fonctionnalités', to: '#fonctionnalites' },
        { label: 'Tarifs', to: '#tarifs' },
        { label: 'Sécurité', to: '#securite' }
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Documentation', to: '#documentation' },
        { label: 'Support technique', to: '#support' },
        { label: 'Contact', to: '#contact' }
      ]
    },
    {
      title: 'Entreprise',
      links: [
        { label: 'À propos', to: '#a-propos' },
        { label: 'Confidentialité', to: '#confidentialite' },
        { label: 'Mentions légales', to: '#mentions-legales' }
      ]
    }
  ];

  return (
    <footer className="bg-dark-bg border-t border-primary/25">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-20 py-10">
        <div className="flex flex-col md:flex-row gap-10 md:gap-20 lg:gap-40 mb-10">
          {/* Logo et description */}
          <div className="space-y-5 w-full md:w-auto">
            <div className="space-y-2.5">
              <h3 className="font-audiowide text-2xl text-white">Sen Pointage</h3>
              <p className="font-instrument text-sm text-white/60">Reconnaissance Faciale</p>
            </div>
            <p className="font-instrument text-base text-white/90 max-w-xs">
              La solution moderne de gestion des présences par reconnaissance faciale.
            </p>
          </div>

          {/* Sections de liens */}
          <div className="flex flex-wrap gap-10 md:gap-16 lg:gap-24 flex-1">
            {footerSections.map((section) => (
              <div key={section.title} className="space-y-6">
                <h4 className="font-audiowide text-base text-white">{section.title}</h4>
                <div className="space-y-6 opacity-70">
                  {section.links.map((link) => (
                    <a
                      key={link.label}
                      href={link.to}
                      className="block font-instrument text-base text-white hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="pt-10 border-t border-primary/25">
          <p className="font-instrument text-base text-white/50 text-center">
            © 2025 SenPointage. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;

