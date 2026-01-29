import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards, Version } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('subscription-plans')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('public')
  @Version('1')
  async listPublic() {
    return this.subscriptionsService.listVisible();
  }

  @Post('seed')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @HttpCode(HttpStatus.CREATED)
  async seedPlans() {
    return this.subscriptionsService.seedDefaultPlans();
  }

  @Post('reset')
  @Version('1')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @HttpCode(HttpStatus.OK)
  async resetPlans() {
    return this.subscriptionsService.resetAndSeedPlans();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'superadmin')
  @Get()
  @Version('1')
  async listAll() {
    return this.subscriptionsService.listAll();
  }
}
