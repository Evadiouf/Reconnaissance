import { Injectable } from '@nestjs/common';
import { Ability, AbilityBuilder, AbilityClass } from '@casl/ability';
import { RolesService } from '../roles/roles.service';

export type AppAbility = Ability<[string, string]>; // [action, subject]

@Injectable()
export class CaslAbilityFactory {
  constructor(private readonly rolesService: RolesService) {}

  async createForUser(user: { roles?: string[] }): Promise<AppAbility> {
    const { can, build } = new AbilityBuilder<AppAbility>(Ability as AbilityClass<AppAbility>);

    const roles = user.roles || [];
    const permissions = await this.rolesService.getPermissionsForRoles(roles);

    if (permissions.includes('*')) {
      can('manage', 'all');
    } else {
      for (const perm of permissions) {
        const [subject, action] = (perm || '').split(':');
        if (!subject || !action) continue;
        can(action, subject);
      }
    }

    return build();
  }
}
