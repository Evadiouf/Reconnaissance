import { Module } from '@nestjs/common';
import { EnterpriseRequestsController } from './enterprise-requests.controller';
import { EnterpriseRequestsService } from './enterprise-requests.service';

@Module({
  controllers: [EnterpriseRequestsController],
  providers: [EnterpriseRequestsService],
})
export class EnterpriseRequestsModule {}
