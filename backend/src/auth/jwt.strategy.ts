import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

 const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
   superadmin: ['*'],
   admin: [
     'User:read', 'User:create', 'User:update',
     'Company:read', 'Company:create', 'Company:update',
     'SubscriptionPlan:read', 'SubscriptionPlan:create', 'SubscriptionPlan:update',
     'CompanySubscription:read', 'CompanySubscription:create',
     'SiteConfig:read', 'SiteConfig:update',
     'Attendance:clock', 'Attendance:read', 'Attendance:report',
   ],
   user: [
     'Company:read',
     'SubscriptionPlan:read',
     'CompanySubscription:read',
     'SiteConfig:read',
     'Attendance:clock', 'Attendance:read',
   ],
   rh: [
     // RH inherits user permissions at minimum
     'Company:read',
     'SubscriptionPlan:read',
     'CompanySubscription:read',
     'SiteConfig:read',
     'Attendance:clock', 'Attendance:read',
   ],
 };

 function computeFallbackPermissions(roles: string[]): string[] {
   const perms = new Set<string>();
   for (const r of roles || []) {
     const key = String(r || '').toLowerCase();
     for (const p of DEFAULT_ROLE_PERMISSIONS[key] || []) perms.add(p);
   }
   return Array.from(perms);
 }

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly rolesService: RolesService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const userId = payload.sub;
    const user = userId ? await this.usersService.findById(userId) : null;
    const rolesFromDb = (user as any)?.roles;
    const rolesFromToken = payload.roles;

    const roles =
      Array.isArray(rolesFromDb) && rolesFromDb.length > 0
        ? rolesFromDb
        : Array.isArray(rolesFromToken) && rolesFromToken.length > 0
          ? rolesFromToken
          : ['user'];

    let permissions = await this.rolesService.getPermissionsForRoles(roles);
    if (!Array.isArray(permissions) || permissions.length === 0) {
      // Fallback when roles collection isn't seeded (common in fresh/prod DBs)
      permissions = computeFallbackPermissions(roles);
    }
    return {
      userId,
      email: user?.email || payload.email,
      roles,
      permissions,
    };
  }
}
