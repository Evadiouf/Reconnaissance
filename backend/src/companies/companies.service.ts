import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { Company } from './schemas/company.schema';
import { CreateCompanyDto } from './dto/create-company.dto';
import { InviteRHDto } from './dto/invite-rh.dto';
import { EmailService } from '../email/email.service';
import { InvitationsService } from '../invitations/invitations.service';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name) private readonly companyModel: Model<Company>,
    private readonly emailService: EmailService,
    private readonly invitationsService: InvitationsService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateCompanyDto, ownerId: string): Promise<Company> {
    const company = new this.companyModel({
      name: dto.name,
      type: new Types.ObjectId(dto.typeId),
      owner: new Types.ObjectId(ownerId),
      employees: [],
      address: dto.address,
      phone: dto.phone,
      email: dto.email?.toLowerCase(),
      website: dto.website,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail?.toLowerCase(),
      plan: dto.plan || 'Standard',
      status: 'Actif',
      cameras: 0,
    });
    return company.save();
  }

  async findByOwner(ownerId: string): Promise<Company[]> {
    return this.companyModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .populate('type', 'name')
      .populate('employees', 'firstName lastName email phone roles')
      .exec();
  }

  async findAll(): Promise<Company[]> {
    return this.companyModel
      .find({})
      .populate('type', 'name')
      .populate('employees', 'firstName lastName email phone roles')
      .exec();
  }

  /**
   * Trouve le companyId d'un utilisateur (en tant que propriétaire ou employé)
   * Retourne le premier companyId trouvé
   */
  async findCompanyIdByUserId(userId: string): Promise<string | null> {
    const userObjectId = new Types.ObjectId(userId);
    
    // Chercher d'abord comme propriétaire
    const companyAsOwner = await this.companyModel
      .findOne({ owner: userObjectId })
      .select('_id')
      .exec();
    
    if (companyAsOwner) {
      return (companyAsOwner as any)._id.toString();
    }
    
    // Si pas trouvé comme propriétaire, chercher comme employé
    const companyAsEmployee = await this.companyModel
      .findOne({ employees: userObjectId })
      .select('_id')
      .exec();
    
    if (companyAsEmployee) {
      return (companyAsEmployee as any)._id.toString();
    }
    
    return null;
  }

  async inviteRH(dto: InviteRHDto, invitedBy: string): Promise<{ token: string }> {
    // Créer l'invitation en base de données avec un token unique
    const invitation = await this.invitationsService.createInvitation(
      {
        email: dto.email,
        role: dto.role,
        department: dto.department,
        sessionTimeout: dto.sessionTimeout,
      },
      invitedBy,
    );

    // Construire le lien d'invitation avec le token
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
    const invitationLink = `${frontendUrl}/inscription?token=${invitation.token}`;

    // Envoyer l'email d'invitation avec le lien contenant le token
    await this.emailService.sendRHInvitationEmail(
      dto.email,
      dto.role,
      dto.department,
      invitationLink,
    );

    return { token: invitation.token };
  }

  async addEmployeeToCompany(companyId: string, userId: string): Promise<void> {
    await this.companyModel
      .updateOne(
        { _id: new Types.ObjectId(companyId) },
        { $addToSet: { employees: new Types.ObjectId(userId) } },
      )
      .exec();
  }

  async removeEmployeeFromCompany(companyId: string, userId: string): Promise<void> {
    await this.companyModel
      .updateOne(
        { _id: new Types.ObjectId(companyId) },
        { $pull: { employees: new Types.ObjectId(userId) } },
      )
      .exec();
  }

  async isCompanyOwner(companyId: string, userId: string): Promise<boolean> {
    const exists = await this.companyModel
      .exists({ _id: new Types.ObjectId(companyId), owner: new Types.ObjectId(userId) })
      .exec();
    return !!exists;
  }

  async isUserInCompany(companyId: string, userId: string): Promise<boolean> {
    const userObjectId = new Types.ObjectId(userId);
    const exists = await this.companyModel
      .exists({
        _id: new Types.ObjectId(companyId),
        $or: [{ owner: userObjectId }, { employees: userObjectId }],
      })
      .exec();
    return !!exists;
  }

  async transferOwnership(companyId: string, newOwnerUserId: string): Promise<void> {
    await this.companyModel
      .updateOne(
        { _id: new Types.ObjectId(companyId) },
        {
          $set: {
            owner: new Types.ObjectId(newOwnerUserId),
            status: 'Actif',
          },
          $pull: {
            employees: new Types.ObjectId(newOwnerUserId),
          },
        },
      )
      .exec();
  }

  async getCompanyEmployees(userId: string): Promise<any[]> {
    const userObjectId = new Types.ObjectId(userId);
    
    // Trouver l'entreprise de l'utilisateur (propriétaire ou employé)
    const company = await this.companyModel
      .findOne({
        $or: [
          { owner: userObjectId },
          { employees: userObjectId }
        ]
      })
      .populate('owner', '_id firstName lastName email phone department position location workingScheduleId isActive roles')
      .populate('employees', '_id firstName lastName email phone department position location workingScheduleId isActive roles')
      .exec();
    
    if (!company) {
      return [];
    }
    
    const normalizeUser = (emp: any) => ({
      _id: emp._id.toString(),
      id: emp._id.toString(),
      firstName: emp.firstName,
      lastName: emp.lastName,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      location: emp.location,
      workingScheduleId: emp.workingScheduleId ? emp.workingScheduleId.toString?.() || emp.workingScheduleId : emp.workingScheduleId,
      isActive: emp.isActive,
      roles: emp.roles,
    });

    const users: any[] = [];
    if (company.owner) users.push(company.owner);
    users.push(...(company.employees || []));

    const uniqueById = new Map<string, any>();
    for (const u of users) {
      const id = u?._id ? u._id.toString() : null;
      if (!id) continue;
      if (!uniqueById.has(id)) uniqueById.set(id, u);
    }

    return Array.from(uniqueById.values())
      .filter((u) => {
        const roles = Array.isArray(u?.roles) ? u.roles : [];
        // Ne pas exposer les comptes admin plateforme dans la liste des employés
        return !roles.includes('superadmin');
      })
      .map(normalizeUser);
  }

  async getAllCompaniesWithEmployees(): Promise<any[]> {
    // Récupérer toutes les entreprises avec leurs employés
    const companies = await this.companyModel
      .find()
      .populate('owner', '_id firstName lastName email phone department position location workingScheduleId isActive roles')
      .populate('employees', '_id firstName lastName email phone department position location workingScheduleId isActive roles')
      .exec();

    const normalizeUser = (emp: any) => ({
      _id: emp._id.toString(),
      id: emp._id.toString(),
      firstName: emp.firstName,
      lastName: emp.lastName,
      name: `${emp.firstName} ${emp.lastName}`,
      email: emp.email,
      phone: emp.phone,
      department: emp.department,
      position: emp.position,
      location: emp.location,
      workingScheduleId: emp.workingScheduleId ? emp.workingScheduleId.toString?.() || emp.workingScheduleId : emp.workingScheduleId,
      isActive: emp.isActive,
      roles: emp.roles,
    });

    return companies.map(company => ({
      _id: (company._id as any).toString(),
      name: company.name,
      owner: company.owner ? normalizeUser(company.owner) : null,
      employees: (company.employees || []).map(normalizeUser),
    }));
  }
}
