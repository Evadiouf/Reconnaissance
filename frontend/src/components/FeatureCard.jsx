/**
 * Composant Carte de fonctionnalité
 * @param {string} title - Titre de la fonctionnalité
 * @param {string} description - Description de la fonctionnalité
 * @param {string|JSX} icon - Icône ou élément visuel
 * @param {string} className - Classes CSS supplémentaires
 */
function FeatureCard({ title, description, icon, className = '' }) {
  return (
    <div className={`bg-dark-card border border-primary/20 rounded-2xl p-8 hover:border-primary/40 transition-all duration-300 ${className}`}>
      {/* Icône */}
      <div className="bg-primary/20 rounded-2xl w-16 h-16 flex items-center justify-center mb-6">
        {icon}
      </div>

      {/* Contenu */}
      <div className="space-y-2.5">
        <h3 className="font-audiowide text-lg text-white">{title}</h3>
        <p className="font-instrument text-base text-white/90 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
}

export default FeatureCard;



