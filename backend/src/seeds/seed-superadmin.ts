import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  try {
    const config = app.get<ConfigService>(ConfigService);
    const users = app.get(UsersService);
    const rolesService = app.get(RolesService);

    const email = config.get<string>('SUPERADMIN_EMAIL');
    const password = config.get<string>('SUPERADMIN_PASSWORD');
    const firstName = config.get<string>('SUPERADMIN_FIRST_NAME', 'Super');
    const lastName = config.get<string>('SUPERADMIN_LAST_NAME', 'Admin');
    const roleNames = (config.get<string>('SUPERADMIN_ROLES', 'superadmin') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const permissions = (config.get<string>('SUPERADMIN_PERMISSIONS', '*') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (!email || !password) {
      throw new Error('SUPERADMIN_EMAIL and SUPERADMIN_PASSWORD must be set');
    }

    // Ensure roles exist with permissions
    for (const r of roleNames) {
      await rolesService.upsert(r, permissions);
    }

    await users.upsertByEmail(email, {
      email,
      password,
      firstName,
      lastName,
      roles: roleNames,
    } as any);

    // eslint-disable-next-line no-console
    console.log(`Super admin ensured: ${email}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Seeder failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
