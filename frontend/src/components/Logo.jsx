import { useNavigate } from 'react-router-dom';
import logoImage from '../assets/images/logo.jpeg';

function Logo() {
  const navigate = useNavigate();

  const handleNavigateHome = () => navigate('/');

  return (
    <div
      onClick={handleNavigateHome}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleNavigateHome();
        }
      }}
      className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
      role="button"
      tabIndex={0}
      aria-label="Retour à l'accueil"
    >
      <img 
        src={logoImage} 
        alt="Sen Pointage Logo" 
        className="h-8 w-auto object-contain"
      />
      <span className="font-['Audiowide',cursive] text-2xl" style={{ color: '#002222' }}>
        Sen Pointage
      </span>
    </div>
  );
}

export default Logo;



