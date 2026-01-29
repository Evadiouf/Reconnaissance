// Service pour gérer l'authentification à deux facteurs via SMS et Email

/**
 * Génère un code de vérification à 6 chiffres
 */
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Envoie un code de vérification par email
 */
export const sendVerificationCodeByEmail = async (email, code) => {
  try {
    // Dans une vraie application, on appellerait l'API backend pour envoyer l'email
    // Pour l'instant, on simule l'envoi
    console.log(`Code de vérification envoyé par email à ${email}: ${code}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du code par email:', error);
    return false;
  }
};

/**
 * Envoie un code de vérification par SMS
 */
export const sendVerificationCodeBySMS = async (phone, code) => {
  try {
    // Dans une vraie application, on appellerait l'API backend pour envoyer le SMS
    // Pour l'instant, on simule l'envoi
    console.log(`Code de vérification envoyé par SMS à ${phone}: ${code}`);
    
    return true;
  } catch (error) {
    console.error('Erreur lors de l\'envoi du code par SMS:', error);
    return false;
  }
};

/**
 * Vérifie un code de vérification
 */
export const verifyCode = (inputCode, phone, email) => {
  try {
    // Vérifier le code stocké (même code pour SMS et email)
    const codeData = localStorage.getItem('2fa_verification_code');
    if (codeData) {
      const { code, phone: storedPhone, email: storedEmail, expiresAt } = JSON.parse(codeData);
      
      // Vérifier que le code correspond et n'est pas expiré
      if (Date.now() < expiresAt && code === inputCode) {
        // Vérifier que le téléphone ou l'email correspond
        if ((phone && phone === storedPhone) || (email && email === storedEmail)) {
          localStorage.removeItem('2fa_verification_code');
          return { valid: true, method: phone ? 'sms' : 'email' };
        }
      } else if (Date.now() >= expiresAt) {
        localStorage.removeItem('2fa_verification_code');
        return { valid: false, error: 'Code expiré' };
      }
    }
    
    return { valid: false, error: 'Code invalide ou expiré' };
  } catch (error) {
    console.error('Erreur lors de la vérification du code:', error);
    return { valid: false, error: 'Erreur lors de la vérification' };
  }
};

/**
 * Envoie les codes de vérification (SMS et Email)
 */
export const sendVerificationCodes = async (phone, email) => {
  const code = generateVerificationCode();
  
  // Stocker le code avec expiration (5 minutes) - même code pour SMS et email
  const codeData = {
    code,
    phone: phone || null,
    email: email || null,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
    createdAt: Date.now()
  };
  localStorage.setItem('2fa_verification_code', JSON.stringify(codeData));
  
  const [smsSent, emailSent] = await Promise.all([
    phone ? sendVerificationCodeBySMS(phone, code) : Promise.resolve(false),
    email ? sendVerificationCodeByEmail(email, code) : Promise.resolve(false)
  ]);
  
  return {
    success: smsSent || emailSent,
    smsSent,
    emailSent,
    code // Pour les tests, on retourne le code. En production, ne pas le retourner
  };
};

