import { SetMetadata } from '@nestjs/common';
import { AppAbility } from './casl-ability.factory';

export interface PolicyHandler {
  handle(ability: AppAbility): boolean;
}

export type PolicyHandlerCallback = (ability: AppAbility) => boolean;

export const POLICIES_KEY = 'policies';
export const CheckPolicies = (...handlers: (PolicyHandler | PolicyHandlerCallback)[]) =>
  SetMetadata(POLICIES_KEY, handlers);
