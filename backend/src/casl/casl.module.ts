import { Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';
import { RolesModule } from '../roles/roles.module';
import { PoliciesGuard } from './policies.guard';

@Module({
  imports: [RolesModule],
  providers: [CaslAbilityFactory, PoliciesGuard],
  exports: [CaslAbilityFactory, PoliciesGuard],
})
export class CaslModule {}
