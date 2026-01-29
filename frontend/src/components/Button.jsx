/**
 * Composant Bouton réutilisable
 * @param {string} variant - 'primary' (fond vert) ou 'secondary' (bordure verte)
 * @param {string} children - Contenu du bouton
 * @param {function} onClick - Fonction de gestion du clic
 * @param {string} className - Classes CSS supplémentaires
 * @param {string} type - Type de bouton ('button', 'submit', 'reset')
 * @param {boolean} disabled - État désactivé du bouton
 */
function Button({ variant = 'primary', children, onClick, className = '', type = 'button', disabled = false, ...props }) {
  const baseClasses = 'px-4 py-2.5 rounded-2xl font-instrument text-base transition-all duration-300';
  
  const variants = {
    primary: 'bg-primary text-dark-bg hover:bg-[#02C8C8] active:scale-95',
    secondary: 'border border-primary text-primary hover:bg-primary/10 active:scale-95'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

export default Button;



