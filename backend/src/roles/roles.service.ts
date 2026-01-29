import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Role } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(@InjectModel(Role.name) private readonly roleModel: Model<Role>) {}

  async upsert(name: string, permissions: string[]): Promise<Role> {
    const lowered = name.toLowerCase();
    return this.roleModel
      .findOneAndUpdate(
        { name: lowered },
        { $set: { name: lowered, permissions } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async findByNames(names: string[]): Promise<Role[]> {
    const lowered = (names || []).map((n) => n.toLowerCase());
    return this.roleModel.find({ name: { $in: lowered } }).exec();
  }

  async getPermissionsForRoles(roleNames: string[]): Promise<string[]> {
    const roles = await this.findByNames(roleNames);
    const perms = new Set<string>();
    for (const r of roles) {
      for (const p of r.permissions || []) perms.add(p);
    }
    return Array.from(perms);
  }
}
