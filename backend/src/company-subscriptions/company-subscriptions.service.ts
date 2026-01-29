import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompanySubscription, PaymentStatus, SubscriptionStatus } from './schemas/company-subscription.schema';
import { CreateCompanySubscriptionDto } from './dto/create-company-subscription.dto';
import { CreateCompanySubscriptionByInvitationDto } from './dto/create-company-subscription-by-invitation.dto';
import { CreateSubscriptionDto, PlanType } from './dto/create-subscription.dto';
import { Company } from '../companies/schemas/company.schema';
import { SubscriptionPlan } from '../subscriptions/schemas/subscription-plan.schema';
import { CompanyInvitationsService } from '../company-invitations/company-invitations.service';
import { PaymentService, PaymentMethod } from '../payment/payment.service';

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  const targetMonth = d.getMonth() + months;
  const year = d.getFullYear() + Math.floor(targetMonth / 12);
  const month = targetMonth % 12;
  // Handle end of month rollover
  const day = Math.min(d.getDate(), [31, (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month]);
  return new Date(year, month, day, d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
}

@Injectable()
export class CompanySubscriptionsService {
  constructor(
    @InjectModel(CompanySubscription.name) private readonly csModel: Model<CompanySubscription>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlan>,
    private readonly companyInvitationsService: CompanyInvitationsService,
    private readonly paymentService: PaymentService,
  ) {}

  async create(dto: CreateCompanySubscriptionDto, requesterUserId?: string): Promise<CompanySubscription> {
    const companyId = new Types.ObjectId(dto.companyId);
    const planId = new Types.ObjectId(dto.planId);

    const company = await this.companyModel.findById(companyId).exec();
    if (!company) throw new NotFoundException('Company not found');
    if (requesterUserId && company.owner?.toString() !== requesterUserId) {
      throw new UnauthorizedException('Only owner can subscribe');
    }

    const plan = await this.planModel.findById(planId).exec();
    if (!plan) throw new NotFoundException('Plan not found');

    const activationDate = dto.activationDate ? new Date(dto.activationDate) : new Date();
    const expirationDate = addMonths(activationDate, plan.recurrenceMonths);

    const sub = new this.csModel({
      company: companyId,
      plan: planId,
      amount: dto.amount ?? plan.amount,
      currency: dto.currency ?? plan.currency,
      activationDate,
      expirationDate,
      isActive: true,
    });
    return sub.save();
  }

  async createByInvitation(dto: CreateCompanySubscriptionByInvitationDto): Promise<CompanySubscription> {
    try {
      console.log('🔍 [createByInvitation] Début de la création d\'abonnement');
      console.log('📋 DTO reçu:', JSON.stringify(dto, null, 2));

      console.log('1️⃣ Validation du token d\'invitation...');
      const invitation = await this.companyInvitationsService.validateForSubscription(dto.token);
      console.log('✅ Invitation validée:', invitation._id);

      console.log('2️⃣ Extraction des IDs...');
      const invitationCompany: any = invitation.company as any;
      const companyIdRaw =
        invitationCompany?._id?.toString?.() ??
        invitationCompany?.toString?.() ??
        invitationCompany;
      if (!companyIdRaw || !Types.ObjectId.isValid(companyIdRaw)) {
        throw new BadRequestException('Invalid company id in invitation');
      }
      if (!dto.planId || !Types.ObjectId.isValid(dto.planId)) {
        throw new BadRequestException('Invalid planId');
      }

      const companyId = new Types.ObjectId(companyIdRaw);
      const planId = new Types.ObjectId(dto.planId);
      console.log('   - Company ID:', companyId.toString());
      console.log('   - Plan ID:', planId.toString());

      console.log('3️⃣ Vérification de l\'entreprise...');
      const company = await this.companyModel.findById(companyId).exec();
      if (!company) throw new NotFoundException('Company not found');
      console.log('✅ Entreprise trouvée:', company.name);

      console.log('4️⃣ Vérification du plan...');
      const plan = await this.planModel.findById(planId).exec();
      if (!plan) throw new NotFoundException('Plan not found');
      if (!plan.isActive) throw new BadRequestException('Plan is not active');
      console.log('✅ Plan trouvé:', plan.name);

      // Mettre à jour les infos de l'entreprise depuis le formulaire (pour affichage Entreprises)
      try {
        const sfd: any = dto.subscriptionFormData || {};
        const employeeCount =
          sfd.nombreEmployes != null && sfd.nombreEmployes !== '' ? Number(sfd.nombreEmployes) : undefined;
        const camerasCount =
          sfd.nombreCameras != null && sfd.nombreCameras !== '' ? Number(sfd.nombreCameras) : undefined;

        await this.companyModel
          .updateOne(
            { _id: companyId },
            {
              $set: {
                ...(sfd.adresse ? { address: String(sfd.adresse).trim() } : {}),
                ...(sfd.telephone ? { phone: String(sfd.telephone).trim() } : {}),
                ...(sfd.nomComplet ? { contactName: String(sfd.nomComplet).trim() } : {}),
                ...(sfd.email ? { contactEmail: String(sfd.email).trim().toLowerCase() } : {}),
                ...(sfd.siteWeb ? { website: String(sfd.siteWeb).trim() } : {}),
                ...(Number.isFinite(employeeCount as any) ? { employeeCount } : {}),
                ...(Number.isFinite(camerasCount as any) ? { cameras: camerasCount } : {}),
                status: 'Actif',
                plan: plan.name || company.plan || 'Standard',
              },
            },
          )
          .exec();
      } catch (e) {
        console.warn(
          '⚠️ Impossible de mettre à jour Company depuis subscriptionFormData:',
          (e as any)?.message || e,
        );
      }

      console.log('5️⃣ Vérification des abonnements existants...');
      const existingActive = await this.findActiveSubscriptionByCompanyId(companyId.toString());
      if (existingActive) {
        throw new BadRequestException('Company already has an active subscription');
      }
      console.log('✅ Pas d\'abonnement actif existant');

      console.log('6️⃣ Calcul des dates...');
      const activationDate = dto.activationDate ? new Date(dto.activationDate) : new Date();
      const expirationDate = addMonths(activationDate, plan.recurrenceMonths);
      console.log('   - Date d\'activation:', activationDate);
      console.log('   - Date d\'expiration:', expirationDate);

      console.log('6️⃣b Calcul des champs requis (nouveau schéma)...');
      const rawEmployees = (dto.subscriptionFormData as any)?.nombreEmployes;
      const numberOfEmployees = rawEmployees != null && rawEmployees !== '' ? Number(rawEmployees) : 0;
      const numberOfMonths = plan.recurrenceMonths ?? 1;
      const totalAmount = dto.amount ?? plan.amount;

      const rawPaymentMethod =
        (dto.subscriptionFormData as any)?.paymentMethod ??
        (dto.subscriptionFormData as any)?.selectedPaymentMethod;
      const paymentMethod = (() => {
        switch ((rawPaymentMethod ?? '').toString().toLowerCase()) {
          case 'wave':
            return 'wave';
          case 'orange':
          case 'orange_money':
          case 'om':
            return 'orange_money';
          case 'free':
          case 'free_money':
            return 'free_money';
          default:
            return 'autre';
        }
      })();

      const pricePerEmployee =
        numberOfEmployees > 0 && numberOfMonths > 0 ? totalAmount / (numberOfEmployees * numberOfMonths) : 0;

      console.log('7️⃣ Création de l\'abonnement...');
      const sub = new this.csModel({
        company: companyId,
        plan: planId,
        // Nouveaux champs requis
        pricePerEmployee,
        numberOfEmployees,
        numberOfMonths,
        totalAmount,
        paymentMethod,
        paymentStatus: PaymentStatus.PAID,
        status: SubscriptionStatus.ACTIVE,
        startDate: activationDate,
        endDate: expirationDate,

        // Anciens champs pour compatibilité
        amount: totalAmount,
        currency: dto.currency ?? plan.currency,
        activationDate,
        expirationDate,
        isActive: true,
      });
      const saved = await sub.save();
      console.log('✅ Abonnement créé:', saved._id);

      console.log('8️⃣ Marquage de l\'invitation comme souscrite...');
      await this.companyInvitationsService.markAsSubscribed(
        dto.token,
        (saved as any)._id.toString(),
        dto.subscriptionFormData,
      );
      console.log('✅ Invitation marquée comme souscrite');

      console.log('🎉 Abonnement créé avec succès!');
      return saved;
    } catch (error) {
      console.error('❌ [createByInvitation] ERREUR:', error);
      console.error('📝 Détails de l\'erreur:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      throw error;
    }
  }

  async findActiveSubscriptionByCompanyId(companyId: string): Promise<CompanySubscription | null> {
    const now = new Date();
    return this.csModel
      .findOne({
        company: new Types.ObjectId(companyId),
        isActive: true,
        expirationDate: { $gt: now },
      })
      .sort({ expirationDate: -1 })
      .exec();
  }

  async listByCompany(companyId: string): Promise<CompanySubscription[]> {
    return this.csModel
      .find({ company: new Types.ObjectId(companyId) })
      .sort({ activationDate: -1 })
      .exec();
  }

  async listByCompanyAuthorized(companyId: string, requesterUserId: string): Promise<CompanySubscription[]> {
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) throw new NotFoundException('Company not found');
    if (company.owner?.toString() !== requesterUserId) {
      throw new UnauthorizedException('Only owner can view subscriptions');
    }
    return this.listByCompany(companyId);
  }

  /**
   * Nouvelle méthode pour créer un abonnement avec paiement simulé
   * Flux complet : validation -> création PENDING -> paiement -> activation
   */
  async createSubscription(dto: CreateSubscriptionDto): Promise<CompanySubscription> {
    console.log('📝 Création d\'un nouvel abonnement:', dto);

    // 1. Vérifier que l'entreprise existe
    const companyId = new Types.ObjectId(dto.companyId);
    const company = await this.companyModel.findById(companyId).exec();
    if (!company) {
      throw new NotFoundException('Entreprise non trouvée');
    }

    // 2. Récupérer le plan d'abonnement correspondant
    const plan = await this.getPlanByType(dto.plan);
    if (!plan) {
      throw new NotFoundException('Plan d\'abonnement non trouvé');
    }

    // 3. Valider les règles métier
    this.validateSubscriptionRules(dto, plan);

    // 4. Calculer le montant total
    const { pricePerEmployee, totalAmount } = this.calculateAmount(dto, plan);

    // 5. Créer l'abonnement avec statut PENDING
    const subscription = new this.csModel({
      company: companyId,
      plan: plan._id,
      pricePerEmployee,
      numberOfEmployees: dto.numberOfEmployees || 0,
      numberOfMonths: dto.numberOfMonths,
      totalAmount,
      currency: plan.currency,
      paymentMethod: dto.paymentMethod,
      paymentStatus: PaymentStatus.PENDING,
      status: SubscriptionStatus.INACTIVE,
    });

    const savedSubscription = await subscription.save();
    console.log('✅ Abonnement créé avec statut PENDING:', savedSubscription._id);

    // 6. Déclencher le paiement simulé
    try {
      const paymentResult = await this.paymentService.processPayment(
        totalAmount,
        plan.currency,
        dto.paymentMethod as unknown as PaymentMethod,
      );

      // 7. Mettre à jour l'abonnement selon le résultat du paiement
      if (paymentResult.success) {
        // Paiement réussi : activer l'abonnement
        const startDate = new Date();
        const endDate = addMonths(startDate, dto.numberOfMonths);

        savedSubscription.paymentStatus = PaymentStatus.PAID;
        savedSubscription.status = SubscriptionStatus.ACTIVE;
        savedSubscription.transactionId = paymentResult.transactionId;
        savedSubscription.startDate = startDate;
        savedSubscription.endDate = endDate;
        
        // Compatibilité avec l'ancien système
        savedSubscription.isActive = true;
        savedSubscription.activationDate = startDate;
        savedSubscription.expirationDate = endDate;
        savedSubscription.amount = totalAmount;

        await savedSubscription.save();
        console.log('✅ Paiement réussi - Abonnement activé');
      } else {
        // Paiement échoué
        savedSubscription.paymentStatus = PaymentStatus.FAILED;
        savedSubscription.transactionId = paymentResult.transactionId;
        await savedSubscription.save();
        console.log('❌ Paiement échoué - Abonnement non activé');
      }

      return savedSubscription;
    } catch (error) {
      // En cas d'erreur lors du paiement, marquer comme échoué
      savedSubscription.paymentStatus = PaymentStatus.FAILED;
      await savedSubscription.save();
      console.error('❌ Erreur lors du traitement du paiement:', error);
      throw new BadRequestException('Erreur lors du traitement du paiement');
    }
  }

  /**
   * Récupère un plan d'abonnement par son type
   */
  private async getPlanByType(planType: PlanType): Promise<SubscriptionPlan | null> {
    const planName = planType.charAt(0).toUpperCase() + planType.slice(1);
    return this.planModel.findOne({ 
      name: { $regex: new RegExp(planName, 'i') },
      isActive: true,
      visible: true,
    }).exec();
  }

  /**
   * Valide les règles métier pour la souscription
   */
  private validateSubscriptionRules(dto: CreateSubscriptionDto, plan: SubscriptionPlan): void {
    // Vérifier la limite d'employés pour Starter
    if (dto.plan === PlanType.STARTER) {
      if (!dto.numberOfEmployees) {
        throw new BadRequestException('Le nombre d\'employés est obligatoire pour le plan Starter');
      }
      if (dto.numberOfEmployees > 15) {
        throw new BadRequestException('Le plan Starter est limité à 15 employés maximum');
      }
    }

    // Vérifier la limite d'employés pour Business
    if (dto.plan === PlanType.BUSINESS) {
      if (!dto.numberOfEmployees) {
        throw new BadRequestException('Le nombre d\'employés est obligatoire pour le plan Business');
      }
      if (dto.numberOfEmployees > 50) {
        throw new BadRequestException('Le plan Business est limité à 50 employés maximum');
      }
    }

    // Enterprise n'a pas de limite d'employés
    if (dto.plan === PlanType.ENTERPRISE && !dto.numberOfEmployees) {
      // Pour Enterprise, on peut définir un nombre par défaut ou le laisser à 0
      dto.numberOfEmployees = 0;
    }
  }

  /**
   * Calcule le montant total de l'abonnement
   */
  private calculateAmount(dto: CreateSubscriptionDto, plan: SubscriptionPlan): {
    pricePerEmployee: number;
    totalAmount: number;
  } {
    let pricePerEmployee: number;

    // Déterminer le prix par employé selon le plan
    if (dto.plan === PlanType.STARTER) {
      pricePerEmployee = 16; // 16€ par employé
    } else if (dto.plan === PlanType.BUSINESS) {
      pricePerEmployee = 14; // 14€ par employé
    } else {
      // Enterprise : tarif sur mesure (utiliser le montant du plan)
      pricePerEmployee = plan.amount || 0;
    }

    // Calculer le montant total
    let totalAmount: number;
    if (dto.plan === PlanType.ENTERPRISE) {
      // Pour Enterprise, utiliser le montant fixe du plan
      totalAmount = plan.amount * dto.numberOfMonths;
    } else {
      // Pour Starter et Business : prix par employé * nombre d'employés * nombre de mois
      totalAmount = pricePerEmployee * (dto.numberOfEmployees || 0) * dto.numberOfMonths;
    }

    console.log(`💰 Calcul du montant:`);
    console.log(`   - Plan: ${dto.plan}`);
    console.log(`   - Prix par employé: ${pricePerEmployee}€`);
    console.log(`   - Nombre d'employés: ${dto.numberOfEmployees || 0}`);
    console.log(`   - Nombre de mois: ${dto.numberOfMonths}`);
    console.log(`   - Montant total: ${totalAmount}€`);

    return { pricePerEmployee, totalAmount };
  }
}
