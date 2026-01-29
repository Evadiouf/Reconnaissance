import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SiteConfig } from './schemas/site-config.schema';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';

@Injectable()
export class SiteConfigService {
  constructor(@InjectModel(SiteConfig.name) private readonly configModel: Model<SiteConfig>) {}

  async get(): Promise<SiteConfig | null> {
    return this.configModel.findOne().exec();
  }

  async upsert(update: UpdateSiteConfigDto): Promise<SiteConfig> {
    return this.configModel
      .findOneAndUpdate({}, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .exec();
  }
}
