import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const user = request.user as { permissions?: string[]; roles?: string[]; email?: string } | undefined;
    const perms = user?.permissions || [];

    // Allow wildcard '*'
    if (perms.includes('*')) return true;

    const hasPermission = required.every((p) => perms.includes(p));
    
    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission refusée. Permissions requises: ${required.join(', ')}. ` +
        `Permissions de l'utilisateur: ${perms.length > 0 ? perms.join(', ') : 'Aucune'}. ` +
        `Rôles: ${user?.roles?.join(', ') || 'Aucun'}. ` +
        `Veuillez contacter l'administrateur pour obtenir les permissions nécessaires.`
      );
    }

    return true;
  }
}
