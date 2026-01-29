import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Permission } from './schemas/permission.schema';

@Injectable()
export class PermissionsService {
  constructor(@InjectModel(Permission.name) private readonly permissionModel: Model<Permission>) {}

  async upsert(name: string, description?: string): Promise<Permission> {
    const lowered = name.toLowerCase();
    return this.permissionModel
      .findOneAndUpdate(
        { name: lowered },
        { $set: { name: lowered, description } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async findAll(): Promise<Permission[]> {
    return this.permissionModel.find().sort({ name: 1 }).exec();
  }
}
