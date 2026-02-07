import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan } from './schemas/subscription-plan.schema';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { SiteConfigService } from '../site-config/site-config.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(SubscriptionPlan.name) private readonly planModel: Model<SubscriptionPlan>,
    private readonly siteConfigService: SiteConfigService,
  ) {}

  private async ensureDefaultPlansSeeded(): Promise<void> {
    const existing = await this.planModel.exists({});
    if (existing) return;
    await this.seedDefaultPlans();
  }

  async create(dto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    let currency = dto.currency;
    if (!currency) {
      const cfg = await this.siteConfigService.get();
      currency = cfg?.defaultCurrency || 'USD';
    }
    const plan = new this.planModel({
      name: dto.name,
      amount: dto.amount,
      recurrenceMonths: dto.recurrenceMonths,
      currency,
      isActive: dto.isActive ?? true,
      visible: dto.visible ?? true,
      employeeLimit: dto.employeeLimit,
    });
    return plan.save();
  }

  async listVisible(): Promise<SubscriptionPlan[]> {
    const plans = await this.planModel.find({ visible: true, isActive: true }).sort({ amount: 1 }).exec();
    if (plans.length > 0) return plans;

    await this.ensureDefaultPlansSeeded();
    return this.planModel.find({ visible: true, isActive: true }).sort({ amount: 1 }).exec();
  }

  async listAll(): Promise<SubscriptionPlan[]> {
    return this.planModel.find().sort({ amount: 1 }).exec();
  }

  async seedDefaultPlans() {
    const existingPlans = await this.listAll();
    
    if (existingPlans.length > 0) {
      return {
        success: false,
        message: `${existingPlans.length} plan(s) déjà existant(s). Supprimez-les d'abord pour recréer.`,
        existingPlans: existingPlans.map(p => ({
          id: p._id,
          name: p.name,
          amount: p.amount,
          currency: p.currency,
          employeeLimit: p.employeeLimit
        }))
      };
    }

    const plans: SubscriptionPlan[] = [];

    // Plan Starter
    const starter = await this.create({
      name: 'Starter',
      amount: 15000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: 10,
      isActive: true,
      visible: true,
    });
    plans.push(starter);

    // Plan Business
    const business = await this.create({
      name: 'Business',
      amount: 45000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: 50,
      isActive: true,
      visible: true,
    });
    plans.push(business);

    // Plan Enterprise
    const enterprise = await this.create({
      name: 'Enterprise',
      amount: 120000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: undefined,
      isActive: true,
      visible: true,
    });
    plans.push(enterprise);

    return {
      success: true,
      message: 'Plans d\'abonnement créés avec succès',
      plans: plans.map(p => ({
        id: p._id,
        name: p.name,
        amount: p.amount,
        currency: p.currency,
        employeeLimit: p.employeeLimit || 'Illimité'
      }))
    };
  }

  async resetAndSeedPlans() {
    const deletedCount = await this.planModel.deleteMany({}).exec();
    
    console.log(`🗑️  ${deletedCount.deletedCount} plan(s) supprimé(s)`);

    const plans: SubscriptionPlan[] = [];

    // Plan Starter
    const starter = await this.create({
      name: 'Starter',
      amount: 15000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: 10,
      isActive: true,
      visible: true,
    });
    plans.push(starter);

    // Plan Business
    const business = await this.create({
      name: 'Business',
      amount: 45000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: 50,
      isActive: true,
      visible: true,
    });
    plans.push(business);

    // Plan Enterprise
    const enterprise = await this.create({
      name: 'Enterprise',
      amount: 120000,
      recurrenceMonths: 1,
      currency: 'XOF',
      employeeLimit: undefined,
      isActive: true,
      visible: true,
    });
    plans.push(enterprise);

    return {
      success: true,
      message: `${deletedCount.deletedCount} ancien(s) plan(s) supprimé(s) et 3 nouveaux plans créés avec succès`,
      plans: plans.map(p => ({
        id: p._id,
        name: p.name,
        amount: p.amount,
        currency: p.currency,
        employeeLimit: p.employeeLimit || 'Illimité'
      }))
    };
  }
}
