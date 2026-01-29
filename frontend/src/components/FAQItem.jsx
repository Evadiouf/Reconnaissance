import { useState } from 'react';

/**
 * Composant Item FAQ avec accordéon
 * @param {string} question - La question
 * @param {string} answer - La réponse
 */
function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-primary/40 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-2.5 flex items-center justify-between gap-4 text-left hover:bg-primary/5 transition-colors"
      >
        <span className="font-instrument text-base text-white flex-1">{question}</span>
        <svg
          className={`w-5 h-5 text-primary transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-5 py-3 border-t border-primary/20">
          <p className="font-instrument text-base text-white/70 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
}

export default FAQItem;





































