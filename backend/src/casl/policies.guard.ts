import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from './casl-ability.factory';
import { POLICIES_KEY, PolicyHandler, PolicyHandlerCallback } from './policies.decorator';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(private reflector: Reflector, private abilityFactory: CaslAbilityFactory) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handlers = this.reflector.getAllAndOverride<(PolicyHandler | PolicyHandlerCallback)[]>(POLICIES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!handlers || handlers.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();
    const ability = await this.abilityFactory.createForUser(user || {});

    return handlers.every((handler) => this.execPolicyHandler(handler, ability));
  }

  private execPolicyHandler(handler: PolicyHandler | PolicyHandlerCallback, ability: AppAbility): boolean {
    if (typeof handler === 'function') {
      return (handler as PolicyHandlerCallback)(ability);
    }
    return (handler as PolicyHandler).handle(ability);
  }
}
