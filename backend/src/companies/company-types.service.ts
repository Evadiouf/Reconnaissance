import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CompanyType } from './schemas/company-type.schema';
import { CreateCompanyTypeDto } from './dto/create-company-type.dto';

@Injectable()
export class CompanyTypesService {
  constructor(@InjectModel(CompanyType.name) private readonly typeModel: Model<CompanyType>) {}

  async listAll(): Promise<CompanyType[]> {
    return this.typeModel.find().sort({ name: 1 }).exec();
  }

  async create(dto: CreateCompanyTypeDto): Promise<CompanyType> {
    const created = new this.typeModel({
      name: dto.name,
      description: dto.description,
    });
    return created.save();
  }

  async upsert(name: string, description?: string): Promise<CompanyType> {
    const normalized = (name || '').trim().toLowerCase();
    const updated = await this.typeModel
      .findOneAndUpdate(
        { name: normalized },
        { $set: { name: normalized, description } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();
    return updated;
  }
}
