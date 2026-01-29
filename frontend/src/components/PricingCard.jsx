import { useLocation, useNavigate } from 'react-router-dom';
import Button from './Button';

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
 * Composant Carte de tarification
 * @param {string} name - Nom du plan
 * @param {string} description - Description du plan
 * @param {string} price - Prix du plan
 * @param {string} period - Période (ex: "Jusqu'à 25 employés")
 * @param {Array} features - Liste des fonctionnalités
 * @param {boolean} popular - Indique si c'est le plan le plus populaire
 * @param {string} buttonText - Texte du bouton
 * @param {string} buttonVariant - Variante du bouton
 */
function PricingCard({
  name,
  description,
  price,
  period,
  features,
  popular = false,
  to,
  buttonText = 'Commencer l\'essai',
  buttonVariant = 'secondary',
  onButtonClick
}) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <div className={`relative flex flex-col bg-dark-card border border-primary/20 rounded-2xl p-8 sm:p-12 ${popular ? 'border-primary' : ''}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-dark-bg px-4 py-1.5 rounded-2xl">
          <span className="font-instrument font-medium text-sm">Plus populaire</span>
        </div>
      )}

      {/* En-tête */}
      <div className="space-y-0.5 mb-4">
        <h3 className="font-audiowide text-xl text-white">{name}</h3>
        <p className="font-instrument text-base text-white/90">{description}</p>
      </div>

      {/* Prix */}
      <div className="mb-6">
        <div className="font-audiowide text-3xl text-white mb-1">{price}</div>
        <p className="font-instrument text-base text-white/90">{period}</p>
      </div>

      {/* Bouton */}
      <Button
        variant={buttonVariant}
        className="w-full mb-6"
        onClick={() => {
          // Rediriger vers l'interface spécifique de chaque plan
          if (typeof onButtonClick === 'function') {
            onButtonClick();
            return;
          }
          navigate(to || `/tarifs/${name.toLowerCase()}`);
        }}
      >
        {buttonText}
      </Button>

      {/* Liste des fonctionnalités */}
      <div className="space-y-4 flex-1">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-4">
            <svg
              className="w-7 h-7 text-primary flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span className="font-instrument text-base text-white/90">{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PricingCard;



















