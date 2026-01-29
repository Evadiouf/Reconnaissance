import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mailjet from 'node-mailjet';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly mailjet?: Mailjet;
  private readonly fromEmail: string;
  private readonly fromName: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILJET_API_KEY');
    const apiSecret = this.configService.get<string>('MAILJET_API_SECRET');

    if (!apiKey || !apiSecret) {
      this.logger.warn('Mailjet credentials not configured, email sending will be disabled');
    } else {
      this.mailjet = new Mailjet({
        apiKey,
        apiSecret,
      });
    }

    this.fromEmail = this.configService.get<string>('MAILJET_FROM_EMAIL', 'noreply@sen-pointage.com');
    this.fromName = this.configService.get<string>('MAILJET_FROM_NAME', 'Sen Pointage');
  }

  async sendCompanyInvitationEmail(
    toEmail: string,
    companyName: string,
    invitationLink: string,
  ): Promise<{ emailSent: boolean; emailError?: string }> {
    if (!this.mailjet) {
      this.logger.warn('Mailjet not configured, skipping email send');
      return { emailSent: false, emailError: 'MAILJET_NOT_CONFIGURED' };
    }

    const emailData = {
      Messages: [
        {
          From: {
            Email: this.fromEmail,
            Name: this.fromName,
          },
          To: [
            {
              Email: toEmail,
            },
          ],
          Subject: `Invitation à Sen Pointage - ${companyName}`,
          TextPart: this.getCompanyInvitationTextEmail(companyName, invitationLink),
          HTMLPart: this.getCompanyInvitationHtmlEmail(companyName, invitationLink),
        },
      ],
    };

    try {
      await this.mailjet.post('send', { version: 'v3.1' }).request(emailData);
      this.logger.log(`Company invitation email sent successfully to ${toEmail}`);
      return { emailSent: true };
    } catch (error: any) {
      this.logger.error('Error sending company invitation email:', error);

      let errorMessage = "Erreur inconnue lors de l'envoi de l'email";
      if (error.response?.body) {
        const errorBody = error.response.body;
        if (errorBody.ErrorMessage) {
          errorMessage = errorBody.ErrorMessage;
        } else if (errorBody.Messages && errorBody.Messages[0]?.Errors) {
          const errors = errorBody.Messages[0].Errors;
          errorMessage = errors.map((e: any) => e.ErrorMessage || e.Error).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.logger.error('Mailjet error details:', JSON.stringify(error.response?.body || error, null, 2));

      if (errorMessage.includes('not verified') || errorMessage.includes('Sender address')) {
        errorMessage = "L'adresse email d'envoi n'est pas vérifiée dans Mailjet.";
      } else if (errorMessage.includes('Invalid API key') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Les clés API Mailjet sont invalides.';
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('quota')) {
        errorMessage = "Limite d'envoi d'emails atteinte.";
      }

      return { emailSent: false, emailError: errorMessage };
    }
  }

  async sendSupportRequestEmail(
    toEmail: string,
    payload: {
      requestNumber: string;
      category: string;
      subject: string;
      description: string;
      email: string;
      phone?: string;
    },
  ): Promise<{ emailSent: boolean; emailError?: string }> {
    if (!this.mailjet) {
      this.logger.warn('Mailjet not configured, skipping email send');
      return { emailSent: false, emailError: 'MAILJET_NOT_CONFIGURED' };
    }

    const subject = `Demande Support - ${payload.requestNumber} - ${payload.subject}`;

    const textPart = [
      `Nouvelle demande Support`,
      ``,
      `Numéro de demande: ${payload.requestNumber}`,
      `Catégorie: ${payload.category}`,
      `Sujet: ${payload.subject}`,
      ``,
      `Description:`,
      `${payload.description}`,
      ``,
      `Email: ${payload.email}`,
      `Téléphone: ${payload.phone || ''}`,
    ].join('\n');

    const htmlPart = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande Support</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:24px 32px;background:#0389A6;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;">Nouvelle demande Support</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px 0;color:#333;font-size:14px;"><strong>Numéro de demande:</strong> ${payload.requestNumber}</p>
              <p style="margin:0 0 12px 0;color:#333;font-size:14px;"><strong>Catégorie:</strong> ${payload.category}</p>
              <p style="margin:0 0 12px 0;color:#333;font-size:14px;"><strong>Sujet:</strong> ${payload.subject}</p>
              <p style="margin:20px 0 8px 0;color:#333;font-size:14px;"><strong>Description:</strong></p>
              <pre style="margin:0;padding:12px;background:#f8f9fa;border-radius:6px;white-space:pre-wrap;word-wrap:break-word;color:#333;font-size:13px;line-height:1.5;">${payload.description}</pre>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <p style="margin:0 0 8px 0;color:#333;font-size:14px;"><strong>Email:</strong> ${payload.email}</p>
              <p style="margin:0;color:#333;font-size:14px;"><strong>Téléphone:</strong> ${payload.phone || ''}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8f9fa;border-radius:0 0 8px 8px;">
              <p style="margin:0;color:#666;font-size:12px;">Envoyé depuis Sen Pointage</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const emailData = {
      Messages: [
        {
          From: {
            Email: this.fromEmail,
            Name: this.fromName,
          },
          To: [
            {
              Email: toEmail,
            },
          ],
          Subject: subject,
          TextPart: textPart,
          HTMLPart: htmlPart,
        },
      ],
    };

    try {
      await this.mailjet.post('send', { version: 'v3.1' }).request(emailData);
      this.logger.log(`Support request email sent successfully to ${toEmail}`);
      return { emailSent: true };
    } catch (error: any) {
      this.logger.error('Error sending support request email:', error);

      let errorMessage = "Erreur inconnue lors de l'envoi de l'email";
      if (error.response?.body) {
        const errorBody = error.response.body;
        if (errorBody.ErrorMessage) {
          errorMessage = errorBody.ErrorMessage;
        } else if (errorBody.Messages && errorBody.Messages[0]?.Errors) {
          const errors = errorBody.Messages[0].Errors;
          errorMessage = errors.map((e: any) => e.ErrorMessage || e.Error).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.logger.error('Mailjet error details:', JSON.stringify(error.response?.body || error, null, 2));

      if (errorMessage.includes('not verified') || errorMessage.includes('Sender address')) {
        errorMessage = "L'adresse email d'envoi n'est pas vérifiée dans Mailjet.";
      } else if (errorMessage.includes('Invalid API key') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Les clés API Mailjet sont invalides.';
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('quota')) {
        errorMessage = "Limite d'envoi d'emails atteinte.";
      }

      return { emailSent: false, emailError: errorMessage };
    }
  }

  async sendEnterpriseRequestEmail(
    toEmail: string,
    payload: {
      requestNumber: string;
      categorieDemande: string;
      sujet: string;
      description: string;
      email: string;
      telephone?: string;
    },
  ): Promise<{ emailSent: boolean; emailError?: string }> {
    if (!this.mailjet) {
      this.logger.warn('Mailjet not configured, skipping email send');
      return { emailSent: false, emailError: 'MAILJET_NOT_CONFIGURED' };
    }

    const subject = `Demande Enterprise (Sur mesure) - ${payload.requestNumber} - ${payload.sujet}`;

    const textPart = [
      `Nouvelle demande Enterprise (Sur mesure)`,
      ``,
      `Numéro de demande: ${payload.requestNumber}`,
      `Catégorie: ${payload.categorieDemande}`,
      `Sujet: ${payload.sujet}`,
      ``,
      `Description:`,
      `${payload.description}`,
      ``,
      `Email: ${payload.email}`,
      `Téléphone: ${payload.telephone || ''}`,
    ].join('\n');

    const htmlPart = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Demande Enterprise</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#f4f4f4;">
  <table role="presentation" style="width:100%;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:40px 0;">
        <table role="presentation" style="width:600px;border-collapse:collapse;background:#ffffff;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding:24px 32px;background:#0389A6;border-radius:8px 8px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;">Nouvelle demande Enterprise (Sur mesure)</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 12px 0;color:#333;font-size:14px;"><strong>Numéro de demande:</strong> ${payload.requestNumber}</p>
              <p style="margin:0 0 12px 0;color:#333;font-size:14px;"><strong>Catégorie:</strong> ${payload.categorieDemande}</p>
              <p style="margin:0 0 12px 0;color:#333;font-size:14px;"><strong>Sujet:</strong> ${payload.sujet}</p>
              <p style="margin:20px 0 8px 0;color:#333;font-size:14px;"><strong>Description:</strong></p>
              <pre style="margin:0;padding:12px;background:#f8f9fa;border-radius:6px;white-space:pre-wrap;word-wrap:break-word;color:#333;font-size:13px;line-height:1.5;">${payload.description}</pre>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
              <p style="margin:0 0 8px 0;color:#333;font-size:14px;"><strong>Email:</strong> ${payload.email}</p>
              <p style="margin:0;color:#333;font-size:14px;"><strong>Téléphone:</strong> ${payload.telephone || ''}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#f8f9fa;border-radius:0 0 8px 8px;">
              <p style="margin:0;color:#666;font-size:12px;">Envoyé depuis Sen Pointage</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    const emailData = {
      Messages: [
        {
          From: {
            Email: this.fromEmail,
            Name: this.fromName,
          },
          To: [
            {
              Email: toEmail,
            },
          ],
          Subject: subject,
          TextPart: textPart,
          HTMLPart: htmlPart,
        },
      ],
    };

    try {
      await this.mailjet.post('send', { version: 'v3.1' }).request(emailData);
      this.logger.log(`Enterprise request email sent successfully to ${toEmail}`);
      return { emailSent: true };
    } catch (error: any) {
      this.logger.error('Error sending enterprise request email:', error);

      let errorMessage = "Erreur inconnue lors de l'envoi de l'email";
      if (error.response?.body) {
        const errorBody = error.response.body;
        if (errorBody.ErrorMessage) {
          errorMessage = errorBody.ErrorMessage;
        } else if (errorBody.Messages && errorBody.Messages[0]?.Errors) {
          const errors = errorBody.Messages[0].Errors;
          errorMessage = errors.map((e: any) => e.ErrorMessage || e.Error).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      this.logger.error('Mailjet error details:', JSON.stringify(error.response?.body || error, null, 2));

      if (errorMessage.includes('not verified') || errorMessage.includes('Sender address')) {
        errorMessage = "L'adresse email d'envoi n'est pas vérifiée dans Mailjet.";
      } else if (errorMessage.includes('Invalid API key') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Les clés API Mailjet sont invalides.';
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('quota')) {
        errorMessage = "Limite d'envoi d'emails atteinte.";
      }

      return { emailSent: false, emailError: errorMessage };
    }
  }

  async sendResetPasswordEmail(toEmail: string, token: string): Promise<void> {
    if (!this.mailjet) {
      this.logger.warn('Mailjet not configured, skipping email send');
      return;
    }

    // Utiliser l'URL frontend configurée ou localhost par défaut
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const fullResetUrl = `${frontendUrl}/reinitialiser-mot-de-passe?token=${token}&email=${encodeURIComponent(toEmail)}`;

    const emailData = {
      Messages: [
        {
          From: {
            Email: this.fromEmail,
            Name: this.fromName,
          },
          To: [
            {
              Email: toEmail,
            },
          ],
          Subject: 'Réinitialisation de votre mot de passe',
          TextPart: this.getResetPasswordTextEmail(fullResetUrl),
          HTMLPart: this.getResetPasswordHtmlEmail(fullResetUrl),
        },
      ],
    };

    try {
      const result = await this.mailjet.post('send', { version: 'v3.1' }).request(emailData);
      this.logger.log(`Password reset email sent successfully to ${toEmail}`);
    } catch (error: any) {
      this.logger.error('Error sending password reset email:', error.message);
      return;
    }
  }

  private getResetPasswordTextEmail(resetUrl: string): string {
    return `
Bonjour,

Vous avez demandé une réinitialisation de votre mot de passe.

Pour réinitialiser votre mot de passe, veuillez cliquer sur le lien suivant ou copier le token ci-dessous :

${resetUrl}

Ce lien est valide pendant 30 minutes.

Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.

Cordialement,
L'équipe Sen Pointage
    `.trim();
  }

  private getResetPasswordHtmlEmail(resetUrl: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Réinitialisation de mot de passe</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #007bff; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Réinitialisation de mot de passe</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Bonjour,
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Vous avez demandé une réinitialisation de votre mot de passe.
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Pour réinitialiser votre mot de passe, veuillez cliquer sur le bouton ci-dessous :
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Réinitialiser mon mot de passe
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Ou copiez ce lien dans votre navigateur :<br>
                <a href="${resetUrl}" style="color: #007bff; word-break: break-all;">${resetUrl}</a>
              </p>
              <p style="margin: 20px 0 0 0; color: #ff6600; font-size: 14px; font-weight: bold;">
                ⏰ Ce lien est valide pendant 30 minutes.
              </p>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                Cordialement,<br>
                L'équipe Sen Pointage
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  async sendRHInvitationEmail(
    toEmail: string,
    role: string,
    department: string,
    invitationLink?: string
  ): Promise<void> {
    if (!this.mailjet) {
      this.logger.warn('Mailjet not configured, skipping email send');
      return;
    }

    // Utiliser l'URL d'invitation fournie ou construire depuis FRONTEND_URL
    // Si FRONTEND_URL contient localhost, ne pas inclure d'URL dans l'email
    let finalInvitationLink: string | undefined = invitationLink;
    
    if (!finalInvitationLink) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      // Ne pas utiliser localhost dans les emails
      if (frontendUrl && !frontendUrl.includes('localhost') && !frontendUrl.includes('127.0.0.1')) {
        finalInvitationLink = `${frontendUrl}/inscription?invitation=true`;
      }
      // Si c'est localhost, on laisse undefined pour ne pas inclure d'URL
    }

    const emailData = {
      Messages: [
        {
          From: {
            Email: this.fromEmail,
            Name: this.fromName,
          },
          To: [
            {
              Email: toEmail,
            },
          ],
          Subject: 'Invitation à rejoindre Sen Pointage en tant que RH',
          TextPart: this.getRHInvitationTextEmail(role, department, finalInvitationLink),
          HTMLPart: this.getRHInvitationHtmlEmail(role, department, finalInvitationLink),
        },
      ],
    };

    try {
      const result = await this.mailjet.post('send', { version: 'v3.1' }).request(emailData);
      this.logger.log(`RH invitation email sent successfully to ${toEmail}`);
    } catch (error: any) {
      this.logger.error('Error sending RH invitation email:', error);
      
      // Extraire le message d'erreur de Mailjet
      let errorMessage = 'Erreur inconnue lors de l\'envoi de l\'email';
      
      if (error.response?.body) {
        const errorBody = error.response.body;
        if (errorBody.ErrorMessage) {
          errorMessage = errorBody.ErrorMessage;
        } else if (errorBody.Messages && errorBody.Messages[0]?.Errors) {
          const errors = errorBody.Messages[0].Errors;
          errorMessage = errors.map((e: any) => e.ErrorMessage || e.Error).join(', ');
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      this.logger.error('Mailjet error details:', JSON.stringify(error.response?.body || error, null, 2));
      
      // Messages d'erreur plus explicites
      if (errorMessage.includes('not verified') || errorMessage.includes('Sender address')) {
        errorMessage = 'L\'adresse email d\'envoi n\'est pas vérifiée dans Mailjet. Veuillez vérifier votre domaine ou utiliser une adresse email vérifiée.';
      } else if (errorMessage.includes('Invalid API key') || errorMessage.includes('Unauthorized')) {
        errorMessage = 'Les clés API Mailjet sont invalides. Vérifiez votre configuration.';
      } else if (errorMessage.includes('Rate limit') || errorMessage.includes('quota')) {
        errorMessage = 'Limite d\'envoi d\'emails atteinte. Réessayez plus tard.';
      }
      
      throw new Error(errorMessage);
    }
  }

  private getRHInvitationTextEmail(role: string, department: string, invitationLink?: string): string {
    const linkSection = invitationLink 
      ? `Pour créer votre compte et accéder à la plateforme, veuillez cliquer sur le lien suivant :\n\n${invitationLink}\n`
      : `Pour créer votre compte et accéder à la plateforme, vous recevrez prochainement un lien d'inscription.\n`;
    
    return `
Bonjour,

Vous avez été invité(e) à rejoindre Sen Pointage en tant que ${role} dans le département ${department}.

${linkSection}Une fois votre compte créé, vous pourrez gérer les ressources humaines de votre entreprise.

Si vous n'avez pas demandé cette invitation, veuillez ignorer cet email.

Cordialement,
L'équipe Sen Pointage
    `.trim();
  }

  private getRHInvitationHtmlEmail(role: string, department: string, invitationLink?: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Sen Pointage</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #0389A6; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Invitation à rejoindre Sen Pointage</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Bonjour,
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Vous avez été invité(e) à rejoindre <strong>Sen Pointage</strong> en tant que <strong>${role}</strong> dans le département <strong>${department}</strong>.
              </p>
              ${invitationLink ? `
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Pour créer votre compte et accéder à la plateforme, veuillez cliquer sur le bouton ci-dessous :
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${invitationLink}" style="display: inline-block; padding: 12px 30px; background-color: #0389A6; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Créer mon compte
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Ou copiez ce lien dans votre navigateur :<br>
                <a href="${invitationLink}" style="color: #0389A6; word-break: break-all;">${invitationLink}</a>
              </p>
              ` : `
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Pour créer votre compte et accéder à la plateforme, vous recevrez prochainement un lien d'inscription par email.
              </p>
              <p style="margin: 0 0 30px 0; color: #666666; font-size: 14px; line-height: 1.5; padding: 15px; background-color: #f8f9fa; border-radius: 5px; border-left: 4px solid #0389A6;">
                <strong>Note :</strong> Le lien d'inscription vous sera envoyé dans un prochain email une fois que la plateforme sera disponible.
              </p>
              `}
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Une fois votre compte créé, vous pourrez gérer les ressources humaines de votre entreprise.
              </p>
              <p style="margin: 20px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Si vous n'avez pas demandé cette invitation, veuillez ignorer cet email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                Cordialement,<br>
                L'équipe Sen Pointage
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  private getCompanyInvitationTextEmail(companyName: string, invitationLink: string): string {
    return `
Bonjour,

Vous avez été invité(e) à rejoindre Sen Pointage pour l'entreprise ${companyName}.

Pour continuer, veuillez ouvrir ce lien afin de choisir un abonnement, puis finaliser votre inscription :

${invitationLink}

Cordialement,
L'équipe Sen Pointage
    `.trim();
  }

  private getCompanyInvitationHtmlEmail(companyName: string, invitationLink: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation Sen Pointage</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px; text-align: center; background-color: #0389A6; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px;">Invitation à rejoindre Sen Pointage</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Bonjour,
              </p>
              <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Vous avez été invité(e) à rejoindre <strong>Sen Pointage</strong> pour l'entreprise <strong>${companyName}</strong>.
              </p>
              <p style="margin: 0 0 30px 0; color: #333333; font-size: 16px; line-height: 1.5;">
                Cliquez sur le bouton ci-dessous pour choisir un abonnement puis finaliser votre inscription :
              </p>
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 0;">
                    <a href="${invitationLink}" style="display: inline-block; padding: 12px 30px; background-color: #0389A6; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Continuer
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 30px 0 0 0; color: #666666; font-size: 14px; line-height: 1.5;">
                Ou copiez ce lien dans votre navigateur :<br>
                <a href="${invitationLink}" style="color: #0389A6; word-break: break-all;">${invitationLink}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px;">
              <p style="margin: 0; color: #666666; font-size: 12px; text-align: center;">
                Cordialement,<br>
                L'équipe Sen Pointage
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }
}


