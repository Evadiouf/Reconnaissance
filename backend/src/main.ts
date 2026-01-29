import { NestFactory } from '@nestjs/core';
import { Logger, LogLevel, VersioningType, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Augmenter la limite de taille du body parser pour les images base64
  // Limite par défaut: 100KB, nouvelle limite: 10MB
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  const config = app.get<ConfigService>(ConfigService);

  // Logging levels
  const logLevels = (config.get<string>('LOG_LEVELS') || 'log,error,warn')
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean) as LogLevel[];
  app.useLogger(logLevels);

  // CORS
  const corsOrigins = (config.get<string>('CORS_ORIGINS') || '*')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins.length === 1 && corsOrigins[0] === '*' ? true : corsOrigins,
    methods: config.get<string>('CORS_METHODS') || 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: config.get<string>('CORS_CREDENTIALS', 'true') === 'true',
  });

  // Global prefix and versioning
  const apiPrefix = config.get<string>('API_PREFIX', 'api');
  app.setGlobalPrefix(apiPrefix);

  const versionStrategy = (config.get<string>('VERSIONING_STRATEGY', 'uri') || 'uri').toLowerCase();
  const defaultVersion = config.get<string>('API_VERSION', '1');
  if (versionStrategy === 'header') {
    app.enableVersioning({
      type: VersioningType.HEADER,
      header: config.get<string>('VERSION_HEADER', 'Accept-Version'),
      defaultVersion,
    });
  } else {
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion,
    });
  }

  // Swagger
  if ((config.get<string>('ENABLE_SWAGGER', 'true') || 'true') === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(config.get<string>('SWAGGER_TITLE', 'API'))
      .setDescription(config.get<string>('SWAGGER_DESC', 'API documentation'))
      .setVersion(config.get<string>('SWAGGER_VERSION', '1.0'))
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(config.get<string>('SWAGGER_PATH', 'docs'), app, document);
  }

  const port = parseInt(config.get<string>('PORT') || '3000', 10);
  await app.listen(port);
  const logger = new Logger('Bootstrap');
  logger.log(`Server running on http://localhost:${port}/${apiPrefix}`);
}
bootstrap();
