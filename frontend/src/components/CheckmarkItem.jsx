/**
 * Composant élément avec checkmark
 * @param {string} text - Texte à afficher
 */
function CheckmarkItem({ text }) {
  return (
    <div className="flex items-center gap-3">
      {/* Icône checkmark */}
      <div className="flex-shrink-0">
        <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {/* Texte */}
      <span className="font-instrument text-base text-white/90">{text}</span>
    </div>
  );
}

export default CheckmarkItem;



