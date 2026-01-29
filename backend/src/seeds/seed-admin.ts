import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { RolesService } from '../roles/roles.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  try {
    const users = app.get(UsersService);
    const rolesService = app.get(RolesService);

    const email = 'adminaratechvision@gmail.com';
    const password = 'adminaratech04';
    const firstName = 'Admin';
    const lastName = 'NaratechVision';
    const roleNames = ['admin'];

    // S'assurer que le rôle admin existe
    await rolesService.upsert('admin', [
      // Users
      'User:read', 'User:create', 'User:update',
      // Companies
      'Company:read', 'Company:create', 'Company:update',
      // Subscriptions
      'SubscriptionPlan:read', 'SubscriptionPlan:create', 'SubscriptionPlan:update',
      'CompanySubscription:read', 'CompanySubscription:create',
      // Site config
      'SiteConfig:read', 'SiteConfig:update',
      // Attendance
      'Attendance:clock', 'Attendance:read', 'Attendance:report',
    ]);

    await users.upsertByEmail(email, {
      email,
      password,
      firstName,
      lastName,
      roles: roleNames,
    } as any);

    // eslint-disable-next-line no-console
    console.log(`Admin account ensured: ${email}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Admin seeder failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

