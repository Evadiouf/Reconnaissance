import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createHash } from 'crypto';
import { Company } from '../../companies/schemas/company.schema';
import { CompanySubscriptionsService } from '../../company-subscriptions/company-subscriptions.service';

@Injectable()
export class KioskTokenGuard implements CanActivate {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly companySubscriptionsService: CompanySubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const raw = req.headers['x-kiosk-token'] as string | undefined;

    if (!raw) throw new UnauthorizedException('Token kiosque manquant');

    const hash = createHash('sha256').update(raw).digest('hex');
    const company = await this.companyModel.findOne({ kioskToken: hash }).select('_id').lean();

    if (!company) throw new UnauthorizedException('Token kiosque invalide');

    const companyId = String(company._id);
    const active = await this.companySubscriptionsService.findActiveSubscriptionByCompanyId(companyId);
    if (!active) throw new UnauthorizedException('Abonnement inactif — pointage kiosque suspendu');

    req.kioskMode = true;
    req.kioskCompanyId = companyId;

    return true;
  }
}
