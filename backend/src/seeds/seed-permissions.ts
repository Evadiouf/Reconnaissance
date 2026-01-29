import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PermissionsService } from '../permissions/permissions.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  try {
    const permissions = app.get(PermissionsService);

    const list = [
      // Users
      'User:create',
      'User:read',
      'User:update',
      'User:delete',
      // Companies
      'Company:create',
      'Company:read',
      'Company:update',
      'Company:delete',
      // Subscription plans
      'SubscriptionPlan:create',
      'SubscriptionPlan:read',
      'SubscriptionPlan:update',
      'SubscriptionPlan:delete',
      // Company subscriptions
      'CompanySubscription:create',
      'CompanySubscription:read',
      'CompanySubscription:update',
      'CompanySubscription:delete',
      // Site config
      'SiteConfig:read',
      'SiteConfig:update',
      // Attendance
      'Attendance:clock',
      'Attendance:read',
      'Attendance:report',
    ];

    for (const p of list) {
      await permissions.upsert(p);
    }

    // eslint-disable-next-line no-console
    console.log('Permissions seeded');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Permissions seeder failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
