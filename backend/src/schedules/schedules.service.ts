import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CompaniesService } from '../companies/companies.service';
import { Schedule } from './schemas/schedule.schema';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectModel(Schedule.name) private readonly scheduleModel: Model<Schedule>,
    private readonly companiesService: CompaniesService,
  ) {}

  private async getRequesterCompanyId(requesterUserId: string): Promise<string> {
    const companyId = await this.companiesService.findCompanyIdByUserId(requesterUserId);
    if (!companyId) {
      throw new BadRequestException("Aucune entreprise associée à cet utilisateur");
    }
    return companyId;
  }

  private async syncKioskSlots(companyId: string): Promise<void> {
    const schedules = await this.scheduleModel
      .find({ company: new Types.ObjectId(companyId) })
      .select('startTime endTime department')
      .lean()
      .exec();
    await this.companiesService.syncKioskSlotsFromSchedules(companyId, schedules);
  }

  async listMyCompanySchedules(requesterUserId: string) {
    const companyId = await this.getRequesterCompanyId(requesterUserId);
    return this.scheduleModel
      .find({ company: new Types.ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async createForMyCompany(requesterUserId: string, dto: CreateScheduleDto) {
    const companyId = await this.getRequesterCompanyId(requesterUserId);
    const created = new this.scheduleModel({
      ...dto,
      company: new Types.ObjectId(companyId),
      workDays: Array.isArray(dto.workDays) ? dto.workDays : [],
      graceMinutes: dto.graceMinutes ?? 0,
    });
    const saved = await created.save();
    await this.syncKioskSlots(companyId);
    return saved;
  }

  async updateMyCompanySchedule(requesterUserId: string, scheduleId: string, dto: UpdateScheduleDto) {
    if (!Types.ObjectId.isValid(scheduleId)) {
      throw new BadRequestException('scheduleId invalide');
    }

    const companyId = await this.getRequesterCompanyId(requesterUserId);
    const schedule = await this.scheduleModel
      .findById(scheduleId)
      .select('_id company')
      .exec();

    if (!schedule) {
      throw new NotFoundException('Horaire introuvable');
    }

    if (schedule.company?.toString?.() !== companyId) {
      throw new ForbiddenException('Accès interdit à cet horaire');
    }

    const updated = await this.scheduleModel
      .findOneAndUpdate(
        { _id: schedule._id, company: new Types.ObjectId(companyId) },
        { $set: dto },
        { new: true },
      )
      .exec();
    await this.syncKioskSlots(companyId);
    return updated;
  }

  async deleteMyCompanySchedule(requesterUserId: string, scheduleId: string) {
    if (!Types.ObjectId.isValid(scheduleId)) {
      throw new BadRequestException('scheduleId invalide');
    }

    const companyId = await this.getRequesterCompanyId(requesterUserId);
    const deleted = await this.scheduleModel
      .findOneAndDelete({ _id: new Types.ObjectId(scheduleId), company: new Types.ObjectId(companyId) })
      .exec();

    if (!deleted) {
      throw new NotFoundException('Horaire introuvable');
    }

    await this.syncKioskSlots(companyId);
    return { message: 'Horaire supprimé' };
  }

  async ensureScheduleBelongsToCompany(companyId: string, scheduleId: string): Promise<void> {
    if (!Types.ObjectId.isValid(companyId) || !Types.ObjectId.isValid(scheduleId)) {
      throw new BadRequestException('companyId ou scheduleId invalide');
    }

    const exists = await this.scheduleModel
      .exists({ _id: new Types.ObjectId(scheduleId), company: new Types.ObjectId(companyId) })
      .exec();

    if (!exists) {
      throw new ForbiddenException("Horaire invalide pour cette entreprise");
    }
  }
}
