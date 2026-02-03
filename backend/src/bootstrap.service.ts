import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { RolesService } from './roles/roles.service';

/**
 * Au démarrage de l'application, s'il n'existe aucun super admin en base,
 * en crée un à partir des variables SUPERADMIN_EMAIL et SUPERADMIN_PASSWORD.
 * Permet de débloquer la connexion en production (Render) sans lancer le seed à la main.
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const email = this.config.get<string>('SUPERADMIN_EMAIL');
    const password = this.config.get<string>('SUPERADMIN_PASSWORD');

    if (!email || !password) {
      this.logger.debug('SUPERADMIN_EMAIL ou SUPERADMIN_PASSWORD non définis, skip bootstrap super admin');
      return;
    }

    try {
      const hasSuperadmin = await this.usersService.hasAnySuperadmin();
      if (hasSuperadmin) {
        this.logger.debug('Un super admin existe déjà, skip bootstrap');
        return;
      }

      this.logger.log('Aucun super admin en base : création depuis les variables d\'environnement...');

      await this.rolesService.upsert('superadmin', ['*']);
      await this.usersService.upsertByEmail(email, {
        email,
        password,
        firstName: this.config.get<string>('SUPERADMIN_FIRST_NAME', 'Super'),
        lastName: this.config.get<string>('SUPERADMIN_LAST_NAME', 'Admin'),
        roles: ['superadmin'],
      } as any);

      this.logger.log(`Super admin créé : ${email}`);
    } catch (err: any) {
      this.logger.warn('Bootstrap super admin échoué (non bloquant):', err?.message || err);
    }
  }
}
