import { Injectable } from '@nestjs/common';

export enum PaymentMethod {
  WAVE = 'wave',
  ORANGE_MONEY = 'orange_money',
  FREE_MONEY = 'free_money',
  AUTRE = 'autre',
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  message: string;
  timestamp: Date;
}

@Injectable()
export class PaymentService {
  /**
   * Simule un paiement avec un taux de succès de 90%
   * Dans un environnement de production, ce service appellerait les APIs réelles
   * de Wave, Orange Money, etc.
   */
  async processPayment(
    amount: number,
    currency: string,
    paymentMethod: PaymentMethod,
  ): Promise<PaymentResult> {
    console.log(`💳 Traitement du paiement simulé:`);
    console.log(`   - Montant: ${amount} ${currency}`);
    console.log(`   - Méthode: ${paymentMethod}`);

    // Simuler un délai de traitement (500ms - 2s)
    const delay = Math.random() * 1500 + 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simuler un taux de succès de 90%
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      const transactionId = this.generateTransactionId(paymentMethod);
      console.log(`✅ Paiement simulé réussi - Transaction ID: ${transactionId}`);
      
      return {
        success: true,
        transactionId,
        message: `Paiement de ${amount} ${currency} effectué avec succès via ${paymentMethod}`,
        timestamp: new Date(),
      };
    } else {
      console.log(`❌ Paiement simulé échoué`);
      
      return {
        success: false,
        transactionId: 'FAILED-' + Date.now(),
        message: 'Échec du paiement. Veuillez réessayer.',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Génère un ID de transaction simulé selon le moyen de paiement
   */
  private generateTransactionId(paymentMethod: PaymentMethod): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    
    switch (paymentMethod) {
      case PaymentMethod.WAVE:
        return `WAVE-${timestamp}-${random}`;
      case PaymentMethod.ORANGE_MONEY:
        return `OM-${timestamp}-${random}`;
      case PaymentMethod.FREE_MONEY:
        return `FM-${timestamp}-${random}`;
      default:
        return `PAY-${timestamp}-${random}`;
    }
  }

  /**
   * Vérifie le statut d'une transaction (pour usage futur)
   */
  async checkTransactionStatus(transactionId: string): Promise<PaymentResult> {
    console.log(`🔍 Vérification du statut de la transaction: ${transactionId}`);
    
    // Simulation: toutes les transactions existantes sont considérées comme réussies
    return {
      success: true,
      transactionId,
      message: 'Transaction trouvée et validée',
      timestamp: new Date(),
    };
  }
}
