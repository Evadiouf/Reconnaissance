import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { CompanyInvitation, CompanyInvitationStatus } from './schemas/company-invitation.schema';
import { CreateCompanyInvitationDto } from './dto/create-company-invitation.dto';
import { Company } from '../companies/schemas/company.schema';
import { EmailService } from '../email/email.service';

@Injectable()
export class CompanyInvitationsService {
  constructor(
    @InjectModel(CompanyInvitation.name) private readonly invitationModel: Model<CompanyInvitation>,
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  async createInvitation(dto: CreateCompanyInvitationDto, invitedBy: string) {
    const token = this.generateToken();

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (dto.expiresInDays || 7));

    const company = new this.companyModel({
      name: dto.companyName,
      type: new Types.ObjectId(dto.typeId),
      owner: new Types.ObjectId(invitedBy),
      employees: [],
      address: dto.address,
      phone: dto.phone,
      website: dto.website,
      email: dto.email.toLowerCase(),
      status: 'En attente',
    });
    const savedCompany = await company.save();

    const invitation = new this.invitationModel({
      token,
      email: dto.email.toLowerCase(),
      company: (savedCompany as any)._id,
      invitedBy: new Types.ObjectId(invitedBy),
      status: CompanyInvitationStatus.PENDING_SUBSCRIPTION,
      expiresAt,
    });

    const savedInvitation = await invitation.save();

    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const invitationLink = `${frontendUrl}/tarifs?token=${savedInvitation.token}`;

    const emailResult = await this.emailService.sendCompanyInvitationEmail(
      dto.email.toLowerCase(),
      dto.companyName,
      invitationLink,
    );

    return {
      token: savedInvitation.token,
      companyId: (savedCompany as any)._id?.toString?.(),
      invitationLink,
      ...emailResult,
    };
  }

  async findByToken(token: string): Promise<CompanyInvitation | null> {
    return this.invitationModel.findOne({ token }).populate('company', 'name address phone website email type').exec();
  }

  async validateToken(token: string, allowedStatuses?: CompanyInvitationStatus[]): Promise<CompanyInvitation> {
    const invitation = await this.invitationModel
      .findOne({ token })
      .populate('company', 'name address phone website email type')
      .exec();
    if (!invitation) throw new NotFoundException("Token d'invitation invalide");

    if (invitation.expiresAt < new Date()) {
      await this.invitationModel.updateOne({ _id: invitation._id }, { $set: { status: CompanyInvitationStatus.EXPIRED } }).exec();
      throw new BadRequestException("Cette invitation a expiré");
    }

    const forbidden = [CompanyInvitationStatus.CANCELLED, CompanyInvitationStatus.EXPIRED, CompanyInvitationStatus.ACCEPTED];
    if (forbidden.includes(invitation.status)) {
      throw new BadRequestException(`Cette invitation a déjà été ${invitation.status}`);
    }

    if (allowedStatuses && allowedStatuses.length > 0 && !allowedStatuses.includes(invitation.status)) {
      throw new BadRequestException('Invitation dans un état invalide');
    }

    return invitation;
  }

  async validateForSubscription(token: string): Promise<CompanyInvitation> {
    return this.validateToken(token, [CompanyInvitationStatus.PENDING_SUBSCRIPTION]);
  }

  async validateForRegistration(token: string): Promise<CompanyInvitation> {
    return this.validateToken(token, [CompanyInvitationStatus.SUBSCRIBED]);
  }

  async markAsSubscribed(token: string, subscriptionId: string, subscriptionFormData?: Record<string, any>): Promise<void> {
    const invitation = await this.validateForSubscription(token);
    await this.invitationModel
      .updateOne(
        { _id: invitation._id },
        {
          $set: {
            status: CompanyInvitationStatus.SUBSCRIBED,
            subscription: new Types.ObjectId(subscriptionId),
            ...(subscriptionFormData ? { subscriptionFormData } : {}),
            subscribedAt: new Date(),
          },
        },
      )
      .exec();
  }

  async markAsAccepted(token: string, acceptedBy: string): Promise<void> {
    const invitation = await this.validateForRegistration(token);
    await this.invitationModel
      .updateOne(
        { _id: invitation._id },
        {
          $set: {
            status: CompanyInvitationStatus.ACCEPTED,
            acceptedBy: new Types.ObjectId(acceptedBy),
            acceptedAt: new Date(),
          },
        },
      )
      .exec();
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}
