import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request, UseGuards, Version } from '@nestjs/common';
import { CompanySubscriptionsService } from './company-subscriptions.service';
import { CreateCompanySubscriptionDto } from './dto/create-company-subscription.dto';
import { CreateCompanySubscriptionByInvitationDto } from './dto/create-company-subscription-by-invitation.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('company-subscriptions')
export class CompanySubscriptionsController {
  constructor(private readonly service: CompanySubscriptionsService) {}

  @Post('by-invitation')
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createByInvitation(@Body() dto: CreateCompanySubscriptionByInvitationDto) {
    return this.service.createByInvitation(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async create(@Request() req: any, @Body() dto: CreateCompanySubscriptionDto) {
    return this.service.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':companyId')
  @Version('1')
  async listByCompany(@Request() req: any, @Param('companyId') companyId: string) {
    return this.service.listByCompanyAuthorized(companyId, req.user.userId);
  }
}

/**
 * Nouveau controller pour le système d'abonnement avec paiement
 */
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly service: CompanySubscriptionsService) {}

  /**
   * POST /subscriptions
   * Crée un nouvel abonnement avec paiement simulé
   * 
   * @param dto - Données de souscription (plan, nombre d'employés, durée, moyen de paiement)
   * @returns L'abonnement créé avec son statut de paiement
   */
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    console.log('📥 Requête de création d\'abonnement reçue');
    return this.service.createSubscription(dto);
  }
}
