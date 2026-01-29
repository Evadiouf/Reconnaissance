import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CompanySubscriptionsService } from '../../company-subscriptions/company-subscriptions.service';

@Injectable()
export class SubscriptionActiveGuard implements CanActivate {
  constructor(private readonly companySubscriptionsService: CompanySubscriptionsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const companyId =
      req?.body?.companyId ||
      req?.query?.companyId ||
      req?.params?.companyId ||
      req?.companyId;

    if (!companyId) {
      throw new BadRequestException('companyId requis');
    }

    const active = await this.companySubscriptionsService.findActiveSubscriptionByCompanyId(companyId);
    if (!active) {
      throw new ForbiddenException('Abonnement requis');
    }

    return true;
  }
}
