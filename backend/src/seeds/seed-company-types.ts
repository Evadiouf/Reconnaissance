import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { CompanyTypesService } from '../companies/company-types.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });

  try {
    const types = app.get(CompanyTypesService);

    const defs: Array<{ name: string; description?: string }> = [
      { name: 'Technologie' },
      { name: 'Finance' },
      { name: 'Santé' },
      { name: 'Éducation' },
      { name: 'Commerce' },
      { name: 'Industrie' },
      { name: 'Services' },
      { name: 'Télécommunications' },
      { name: 'Hôtellerie' },
      { name: 'Agriculture' },
    ];

    for (const def of defs) {
      await types.upsert(def.name, def.description);
    }

    // eslint-disable-next-line no-console
    console.log('Company types seeded');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Company types seeder failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
