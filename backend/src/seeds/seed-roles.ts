import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { RolesService } from '../roles/roles.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  try {
    const roles = app.get(RolesService);

    const defs: Record<string, string[]> = {
      superadmin: ['*'],
      admin: [
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
      ],
      user: [
        'Company:read',
        'SubscriptionPlan:read',
        'CompanySubscription:read',
        'SiteConfig:read',
        // Attendance
        'Attendance:clock', 'Attendance:read',
      ],
    };

    for (const [name, perms] of Object.entries(defs)) {
      await roles.upsert(name, perms);
    }

    // eslint-disable-next-line no-console
    console.log('Roles seeded');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Roles seeder failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
