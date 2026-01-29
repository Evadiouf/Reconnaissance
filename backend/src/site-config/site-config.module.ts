import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SiteConfig, SiteConfigSchema } from './schemas/site-config.schema';
import { SiteConfigService } from './site-config.service';
import { SiteConfigController } from './site-config.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: SiteConfig.name, schema: SiteConfigSchema }])],
  controllers: [SiteConfigController],
  providers: [SiteConfigService],
  exports: [SiteConfigService],
})
export class SiteConfigModule {}
