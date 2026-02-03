import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from './users/users.service';
import { RolesService } from './roles/roles.service';
import { CompanyTypesService } from './companies/company-types.service';

/** Secteurs par défaut (même liste que seed-company-types) */
const DEFAULT_COMPANY_TYPES = [
  'Technologie',
  'Finance',
  'Santé',
  'Éducation',
  'Commerce',
  'Industrie',
  'Services',
  'Télécommunications',
  'Hôtellerie',
  'Agriculture',
];

/**
 * Au démarrage de l'application :
 * - S'il n'existe aucun super admin, en crée un (SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD).
 * - S'il n'existe aucun type d'entreprise, seed les secteurs par défaut.
 * Permet de débloquer la prod (Render) sans lancer les seeds à la main.
 */
@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
    private readonly rolesService: RolesService,
    private readonly companyTypesService: CompanyTypesService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.bootstrapSuperAdmin();
    await this.bootstrapCompanyTypes();
  }

  private async bootstrapSuperAdmin(): Promise<void> {
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

  private async bootstrapCompanyTypes(): Promise<void> {
    try {
      const existing = await this.companyTypesService.listAll();
      if (existing.length > 0) {
        this.logger.debug(`${existing.length} type(s) d'entreprise déjà en base, skip seed secteurs`);
        return;
      }

      this.logger.log('Aucun type d\'entreprise en base : création des secteurs par défaut...');
      for (const name of DEFAULT_COMPANY_TYPES) {
        await this.companyTypesService.upsert(name);
      }
      this.logger.log(`${DEFAULT_COMPANY_TYPES.length} secteurs créés`);
    } catch (err: any) {
      this.logger.warn('Bootstrap types d\'entreprise échoué (non bloquant):', err?.message || err);
    }
  }
}
