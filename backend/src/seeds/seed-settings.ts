import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import { SiteConfigService } from '../site-config/site-config.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['log', 'error', 'warn'] });
  try {
    const config = app.get<ConfigService>(ConfigService);
    const site = app.get(SiteConfigService);

    const name = config.get<string>('SITE_NAME', 'Sen Pointage');
    const description = config.get<string>('SITE_DESCRIPTION', '');

    const defaultLanguage = config.get<string>('SITE_DEFAULT_LANGUAGE', 'fr');
    const languagesCsv = config.get<string>('SITE_LANGUAGES', 'fr:Français:true,en:English:true');
    const languages = (languagesCsv || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((s) => {
        const [code, name, enabled] = s.split(':');
        return { code, name, enabled: (enabled ?? 'true') === 'true' };
      });

    const defaultCurrency = config.get<string>('SITE_DEFAULT_CURRENCY', 'XOF');
    const currenciesCsv = config.get<string>('SITE_CURRENCIES', 'XOF:XOF:true,USD:$:true,EUR:€:true');
    const currencies = (currenciesCsv || '')
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
      .map((s) => {
        const [code, symbol, enabled] = s.split(':');
        return { code, symbol, enabled: (enabled ?? 'true') === 'true' };
      });

    await site.upsert({ name, description, languages, defaultLanguage, currencies, defaultCurrency });

    // eslint-disable-next-line no-console
    console.log('Site settings seeded');
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Settings seeder failed:', err);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
