import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RolesService } from '../roles/roles.service';
import { UsersService } from '../users/users.service';

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

    const permissions = await this.rolesService.getPermissionsForRoles(roles);
    return {
      userId,
      email: user?.email || payload.email,
      roles,
      permissions,
    };
  }
}
