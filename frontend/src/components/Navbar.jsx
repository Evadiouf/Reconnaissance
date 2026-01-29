import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from './Button';
import logoImage from '../assets/images/logo.jpeg';

/**
 * Fonction utilitaire pour scroller vers une ancre
 */
const scrollToAnchor = (anchorId) => {
  const id = anchorId.replace('#', '');
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

/**
 * Composant Navbar avec logo, menu et boutons d'action
 */
function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = [
    { label: 'Fonctionnalités', to: '#fonctionnalites' },
    { label: 'Avantages', to: '#avantages' },
    { label: 'Cas d\'usage', to: '#cas-usage' },
    { label: 'Tarif', to: '#tarifs' }
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-bg/95 backdrop-blur-sm border-b border-primary/20">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-10 lg:px-20">
        <div className="flex items-center justify-between h-20 gap-10">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img 
              src={logoImage} 
              alt="Sen Pointage Logo" 
              className="h-8 w-auto object-contain"
            />
            <span className="font-audiowide text-2xl text-white hover:text-primary transition-colors">
            Sen Pointage
            </span>
          </Link>

          {/* Menu Desktop */}
          <div className="hidden md:flex items-center gap-10">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.to}
                onClick={(e) => {
                  if (location.pathname === '/') {
                    e.preventDefault();
                    scrollToAnchor(item.to);
                  }
                  // Si on est sur une autre page, laisser le lien href normal naviguer
                }}
                className="font-instrument text-base text-white hover:text-primary transition-colors py-2.5"
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Boutons d'action */}
          <div className="hidden sm:flex items-center gap-5">
            <Button variant="secondary" onClick={() => {
              if (location.pathname === '/') {
                scrollToAnchor('#fonctionnalites');
              } else {
                navigate('/#fonctionnalites');
              }
            }}>
              Démo
            </Button>
            <Button variant="primary" onClick={() => navigate('/connexion')}>
              Se connecter
            </Button>
          </div>

          {/* Menu Mobile - Hamburger (simplifié pour l'instant) */}
          <button className="md:hidden text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;


