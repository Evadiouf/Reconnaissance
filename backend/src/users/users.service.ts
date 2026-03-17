import { Injectable, ConflictException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { TimeEntry } from '../attendance/schemas/time-entry.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { InvitationsService } from '../invitations/invitations.service';
import { RHInvitation } from '../invitations/schemas/rh-invitation.schema';
import { CompaniesService } from '../companies/companies.service';
import { CompanyInvitationsService } from '../company-invitations/company-invitations.service';
import { CompanyInvitation, CompanyInvitationStatus } from '../company-invitations/schemas/company-invitation.schema';
import { CompanySubscriptionsService } from '../company-subscriptions/company-subscriptions.service';
import { CompanyTypesService } from '../companies/company-types.service';
import { SchedulesService } from '../schedules/schedules.service';
import { FaceRecognitionService } from '../face-recognition/face-recognition.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    @InjectModel(TimeEntry.name) private readonly timeEntryModel: Model<TimeEntry>,
    private readonly invitationsService: InvitationsService,
    private readonly companiesService: CompaniesService,
    private readonly companyInvitationsService: CompanyInvitationsService,
    private readonly companySubscriptionsService: CompanySubscriptionsService,
    private readonly companyTypesService: CompanyTypesService,
    private readonly schedulesService: SchedulesService,
    private readonly faceRecognitionService: FaceRecognitionService,
  ) {}

  /**
   * Crée un employé : enregistré en base MongoDB (db = MONGO_DB_NAME, collection "users")
   * puis rattaché à l'entreprise (collection "companies", champ employees).
   * La photo du visage est enregistrée côté frontend via l'API face-recognition/register → serveur Naratech.
   */
  async createEmployee(requesterUserId: string, dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const email = (dto.email || '').trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('Email requis');
    }

    const companyId = dto.companyId || (await this.companiesService.findCompanyIdByUserId(requesterUserId));
    if (!companyId) {
      throw new BadRequestException("Aucune entreprise associée à cet utilisateur");
    }

    // Si l'utilisateur existe déjà, le rattacher à l'entreprise et retourner.
    const existing = await this.userModel.findOne({ email }).exec();
    if (existing) {
      try {
        await this.companiesService.addEmployeeToCompany(companyId, (existing as any)._id.toString());
      } catch (err: any) {
        throw new BadRequestException(
          `Impossible de rattacher l'employé existant à l'entreprise (companyId=${companyId}). ${err?.message || ''}`.trim(),
        );
      }

      const patch: any = {};
      if (typeof dto.phone === 'string') patch.phone = dto.phone;
      if (typeof dto.department === 'string') patch.department = dto.department;
      if (typeof dto.position === 'string') patch.position = dto.position;
      if (typeof dto.location === 'string') patch.location = dto.location;
      if (Object.keys(patch).length > 0) {
        await this.userModel.updateOne({ _id: (existing as any)._id }, { $set: patch }).exec();
      }

      if (dto.workingScheduleId) {
        await this.schedulesService.ensureScheduleBelongsToCompany(companyId, dto.workingScheduleId);
        await this.userModel
          .updateOne(
            { _id: (existing as any)._id },
            { $set: { workingScheduleId: new Types.ObjectId(dto.workingScheduleId) } },
          )
          .exec();
      }

      const obj = (existing as any).toObject?.() ?? existing;
      delete (obj as any).password;
      return obj as any;
    }

    // Créer l'employé sans invitation: rôle user (et rattachement company)
    const hashed = await bcrypt.hash(dto.password, 10);
    const userData: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      email,
      password: hashed,
      roles: ['user'],
    };

    if (typeof dto.phone === 'string') userData.phone = dto.phone;
    if (typeof dto.department === 'string') userData.department = dto.department;
    if (typeof dto.position === 'string') userData.position = dto.position;
    if (typeof dto.location === 'string') userData.location = dto.location;

    if (dto.workingScheduleId) {
      await this.schedulesService.ensureScheduleBelongsToCompany(companyId, dto.workingScheduleId);
      userData.workingScheduleId = new Types.ObjectId(dto.workingScheduleId);
    }

    const created = new this.userModel(userData);
    const saved = await created.save();
    // Employé bien inséré en base (collection "users" de la db MONGO_DB_NAME)

    try {
      await this.companiesService.addEmployeeToCompany(companyId, (saved as any)._id.toString());
      // Rattachement enregistré (collection "companies", champ employees)
    } catch (err: any) {
      throw new BadRequestException(
        `Employé créé mais rattachement à l'entreprise impossible (companyId=${companyId}). ${err?.message || ''}`.trim(),
      );
    }

    const obj = saved.toObject();
    delete (obj as any).password;
    return obj as any;
  }

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    try {
      console.log('🔵 [UsersService.create] Début de la création d\'utilisateur');
      console.log('📋 Données reçues:', {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        companyId: dto.companyId,
        hasPassword: !!dto.password
      });

      // Si un token d'invitation est fourni, le valider
      let invitation: RHInvitation | null = null;
      let companyInvitation: CompanyInvitation | null = null;
      if (dto.invitationToken) {
        // 1) Tenter de traiter le token comme une invitation entreprise (même si pas encore SUBSCRIBED)
        try {
          companyInvitation = await this.companyInvitationsService.validateToken(dto.invitationToken, undefined);
        } catch (err: any) {
          companyInvitation = null;
        }

        // 2) Sinon, traiter comme une invitation RH
        if (!companyInvitation) {
          invitation = await this.invitationsService.validateToken(dto.invitationToken);
        }

        const invitedEmail = (companyInvitation?.email || invitation?.email || '').toLowerCase();
        if (invitedEmail && invitedEmail !== dto.email.toLowerCase()) {
          throw new BadRequestException("L'email fourni ne correspond pas à celui de l'invitation");
        }

        // 3) Gating: abonnement obligatoire avant inscription
        if (companyInvitation) {
          if (companyInvitation.status !== CompanyInvitationStatus.SUBSCRIBED) {
            throw new ForbiddenException('Abonnement requis avant inscription');
          }

          const companyRef: any = companyInvitation.company as any;
          const companyId = companyRef?._id?.toString?.() ?? companyRef?.toString?.() ?? companyRef;
          const active = await this.companySubscriptionsService.findActiveSubscriptionByCompanyId(companyId);
          if (!active) {
            throw new ForbiddenException('Abonnement requis avant inscription');
          }

          const normalize = (v: any) => (v ?? '').toString().trim().toLowerCase();
          const company: any = companyInvitation.company as any;
          const snap: any = (companyInvitation as any).subscriptionFormData || {};

          const mismatches: string[] = [];

          const expectedCompanyName = normalize(snap.nomEntreprise || company?.name);
          if (dto.companyName && expectedCompanyName && normalize(dto.companyName) !== expectedCompanyName) {
            mismatches.push("nom d'entreprise");
          }

          const expectedTypeId = (company?.type?._id || company?.type)?.toString?.() || '';
          if (dto.typeId && expectedTypeId && dto.typeId.toString() !== expectedTypeId) {
            mismatches.push("secteur");
          }

          const expectedAddress = normalize(snap.adresse || company?.address);
          if (dto.address && expectedAddress && normalize(dto.address) !== expectedAddress) {
            mismatches.push('adresse');
          }

          const expectedPhone = normalize(snap.telephone || snap.telephoneSupport || company?.phone);
          if (dto.phone && expectedPhone && normalize(dto.phone) !== expectedPhone) {
            mismatches.push('téléphone');
          }

          const expectedWebsite = normalize(snap.siteWeb || company?.website);
          if (dto.website && expectedWebsite && normalize(dto.website) !== expectedWebsite) {
            mismatches.push('site web');
          }

          if (mismatches.length > 0) {
            throw new BadRequestException(
              `Les informations ne correspondent pas à celles fournies lors de l'abonnement: ${mismatches.join(', ')}`,
            );
          }
        }
      }

    const hashed = await bcrypt.hash(dto.password, 10);
      const userData: any = {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email.toLowerCase(),
        password: hashed,
        ...(dto.phone ? { phone: dto.phone.trim() } : {}),
        ...(dto.department ? { department: dto.department.trim() } : {}),
      };

      // Si une invitation est valide, assigner le rôle
      if (invitation) {
        // Garder le rôle invité + garantir le rôle "user" (Attendance:clock)
        userData.roles = Array.from(new Set([invitation.role, 'user']));
        // Note: Le département pourrait être stocké dans un champ séparé si nécessaire
        // Pour l'instant, on assigne juste le rôle
      } else if (companyInvitation) {
        userData.roles = ['rh', 'user'];
      } else {
        // Si pas d'invitation, assigner le rôle "user" par défaut
        // Le rôle "user" a les permissions de base incluant Attendance:clock
        userData.roles = ['user'];
      }

      console.log('💾 [UsersService.create] Création du document User dans MongoDB...');
      console.log('📝 Données à sauvegarder:', {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        roles: userData.roles,
        hasPassword: !!userData.password
      });

      const created = new this.userModel(userData);
      const saved = await created.save();
      
      const savedUserId = (saved as any)._id?.toString();
      console.log('✅ [UsersService.create] Utilisateur créé avec succès dans MongoDB!');
      console.log('🆔 ID MongoDB:', savedUserId);
      console.log('👤 Nom complet:', `${saved.firstName} ${saved.lastName}`);
      console.log('📧 Email:', saved.email);
      
      // Marquer l'invitation comme acceptée
      if (invitation) {
        await this.invitationsService.markAsAccepted(
          dto.invitationToken!,
          (saved as any)._id.toString(),
        );

        // Rattacher l'utilisateur à l'entreprise de l'invitant (si possible)
        try {
          const inviterId = (invitation as any).invitedBy?.toString?.() || null;
          if (inviterId) {
            const companyId = await this.companiesService.findCompanyIdByUserId(inviterId);
            if (companyId) {
              await this.companiesService.addEmployeeToCompany(companyId, (saved as any)._id.toString());
            }
          }
        } catch {
          // On ne bloque pas la création du compte si le rattachement échoue
        }
      }

      // Invitation entreprise: transférer l'ownership + marquer acceptée
      if (companyInvitation) {
        const companyRef: any = companyInvitation.company as any;
        const companyId = companyRef?._id?.toString?.() ?? companyRef?.toString?.() ?? companyRef;
        // IMPORTANT (multi-tenant): l'entreprise invitée doit devenir propriétaire de son "dossier".
        // On transfère donc l'ownership à l'utilisateur qui finalise l'inscription via le token entreprise.
        // Cela évite que l'admin plateforme reste owner de toutes les entreprises invitées (et donc que
        // my-company-id / employees puissent retourner la mauvaise entreprise en cas d'appartenance multiple).
        try {
          await this.companiesService.transferOwnership(companyId, (saved as any)._id.toString());
        } catch {
          // Ne pas bloquer la création du compte si le transfert échoue
        }
        await this.companyInvitationsService.markAsAccepted(dto.invitationToken!, (saved as any)._id.toString());
      }

      // Si companyId est fourni directement (ajout d'employé sans invitation)
      if (dto.companyId && !invitation && !companyInvitation) {
        console.log('🏢 [UsersService.create] Rattachement à l\'entreprise...');
        console.log('🆔 CompanyId:', dto.companyId);
        console.log('👤 UserId:', savedUserId);
        try {
          await this.companiesService.addEmployeeToCompany(dto.companyId, savedUserId);
          console.log('✅ [UsersService.create] Employé rattaché à l\'entreprise avec succès!');
        } catch (error: any) {
          console.error('❌ [UsersService.create] Erreur lors du rattachement de l\'employé à l\'entreprise:', error);
          console.error('📋 Détails de l\'erreur:', {
            message: error?.message,
            stack: error?.stack,
            companyId: dto.companyId,
            userId: savedUserId
          });
          // Relancer pour éviter un employé créé mais non rattaché (pointage impossible)
          throw error;
        }
      } else {
        console.log('ℹ️ [UsersService.create] Aucun companyId fourni, pas de rattachement à l\'entreprise');
      }

      // Créer une entreprise si companyName est fourni (inscription libre)
      if (!invitation && !companyInvitation && !dto.companyId && dto.companyName) {
        try {
          // Si typeId est fourni, l'utiliser, sinon chercher/créer le type par nom
          let finalTypeId: string | undefined = dto.typeId;
          
          // Si typeId est fourni, vérifier si c'est un ObjectId valide ou un nom
          if (finalTypeId) {
            const typeName = finalTypeId.trim();
            // Vérifier si c'est un ObjectId valide
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(typeName);
            
            if (!isValidObjectId) {
              // C'est probablement un nom de secteur, créer ou trouver le type
              const companyType = await this.companyTypesService.upsert(typeName);
              finalTypeId = (companyType as any)._id.toString();
            }
            // Si c'est déjà un ObjectId valide, on garde finalTypeId tel quel
          }
          
          // Si on n'a toujours pas de typeId, utiliser un type par défaut
          if (!finalTypeId) {
            const defaultType = await this.companyTypesService.upsert('Autre');
            finalTypeId = (defaultType as any)._id.toString();
          }
          
          // À ce stade, finalTypeId ne peut plus être undefined
          await this.companiesService.create(
            {
              name: dto.companyName,
              typeId: finalTypeId!,
              address: dto.address,
              phone: dto.phone,
              email: dto.email,
              website: dto.website,
              contactName: dto.firstName + ' ' + dto.lastName,
              contactEmail: dto.email,
              plan: 'Standard',
            },
            (saved as any)._id.toString(),
          );
        } catch (error) {
          console.error('Erreur lors de la création de l\'entreprise:', error);
          // Ne pas bloquer la création du compte si la création de l'entreprise échoue
        }
      }

      const obj = saved.toObject();
      delete (obj as any).password;
      console.log('🎉 [UsersService.create] Création terminée avec succès!');
      console.log('📤 Retour des données (sans mot de passe):', {
        _id: obj._id,
        firstName: obj.firstName,
        lastName: obj.lastName,
        email: obj.email,
        roles: obj.roles
      });
      return obj as any;
    } catch (error: any) {
      console.error('❌ [UsersService.create] ERREUR lors de la création de l\'utilisateur!');
      console.error('📋 Détails de l\'erreur:', {
        message: error?.message,
        code: error?.code,
        name: error?.name,
        stack: error?.stack,
        keyPattern: error?.keyPattern,
        keyValue: error?.keyValue
      });
      
      // Gérer l'erreur de clé dupliquée MongoDB (E11000)
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'email';
        console.error(`⚠️ Email ou champ ${field} déjà existant:`, error.keyValue);
        throw new ConflictException(`Un utilisateur avec cet ${field} existe déjà.`);
      }
      // Relancer l'erreur si ce n'est pas une erreur de duplication
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
  }

  /** Retourne true si au moins un utilisateur a le rôle superadmin (pour bootstrap). */
  async hasAnySuperadmin(): Promise<boolean> {
    const exists = await this.userModel.exists({ roles: 'superadmin' }).exec();
    return !!exists;
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async upsertByEmail(email: string, data: Partial<CreateUserDto & { roles: string[]; permissions: string[] }>): Promise<User> {
    const lowered = email.toLowerCase();
    const update: any = { ...data };
    if (data.password) {
      update.password = await bcrypt.hash(data.password, 10);
    }
    if (data.email) {
      update.email = data.email.toLowerCase();
    }
    const user = await this.userModel
      .findOneAndUpdate({ email: lowered }, { $set: update }, { new: true, upsert: true, setDefaultsOnInsert: true })
      .exec();
    return user;
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('+password').exec();
  }

  async setPasswordById(id: string, plain: string): Promise<void> {
    const hashed = await bcrypt.hash(plain, 10);
    await this.userModel.updateOne({ _id: id }, { $set: { password: hashed } }).exec();
  }

  async updateUserById(
    requesterUserId: string,
    targetUserId: string,
    patch: Partial<
      Pick<User, 'firstName' | 'lastName' | 'email' | 'isActive' | 'phone' | 'department' | 'position' | 'location'>
    > & { workingScheduleId?: string },
  ): Promise<Omit<User, 'password'>> {
    const companyId = await this.companiesService.findCompanyIdByUserId(requesterUserId);
    if (!companyId) {
      throw new BadRequestException("Aucune entreprise associée à cet utilisateur");
    }

    const allowed: any = {};
    if (patch.firstName !== undefined) allowed.firstName = String(patch.firstName);
    if (patch.lastName !== undefined) allowed.lastName = String(patch.lastName);
    if (patch.email !== undefined) allowed.email = String(patch.email).trim().toLowerCase();
    if (patch.isActive !== undefined) allowed.isActive = !!patch.isActive;
    if (patch.phone !== undefined) allowed.phone = String(patch.phone);
    if (patch.department !== undefined) allowed.department = String(patch.department);
    if (patch.position !== undefined) allowed.position = String(patch.position);
    if (patch.location !== undefined) allowed.location = String(patch.location);

    if (patch.workingScheduleId !== undefined) {
      if (patch.workingScheduleId === null || patch.workingScheduleId === '') {
        allowed.workingScheduleId = undefined;
      } else {
        await this.schedulesService.ensureScheduleBelongsToCompany(companyId, String(patch.workingScheduleId));
        allowed.workingScheduleId = new Types.ObjectId(String(patch.workingScheduleId));
      }
    }

    if (Object.keys(allowed).length === 0) {
      throw new BadRequestException('Aucun champ à mettre à jour');
    }

    const targetInCompany = await this.companiesService.isUserInCompany(companyId, targetUserId);
    if (!targetInCompany) {
      throw new ForbiddenException("Utilisateur non autorisé ou hors entreprise");
    }

    const updated = await this.userModel
      .findByIdAndUpdate(new Types.ObjectId(targetUserId), { $set: allowed }, { new: true })
      .exec();

    if (!updated) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    const obj = (updated as any).toObject?.() ?? updated;
    delete (obj as any).password;
    return obj as any;
  }

  async updateMyProfile(
    userId: string,
    patch: { firstName?: string; lastName?: string; phone?: string; department?: string; position?: string; location?: string },
  ): Promise<Omit<User, 'password'>> {
    const allowed: any = {};
    if (patch.firstName !== undefined) allowed.firstName = String(patch.firstName).trim();
    if (patch.lastName !== undefined) allowed.lastName = String(patch.lastName).trim();
    if (patch.phone !== undefined) allowed.phone = String(patch.phone).trim();
    if (patch.department !== undefined) allowed.department = String(patch.department).trim();
    if (patch.position !== undefined) allowed.position = String(patch.position).trim();
    if (patch.location !== undefined) allowed.location = String(patch.location).trim();

    if (Object.keys(allowed).length === 0) {
      throw new BadRequestException('Aucun champ à mettre à jour');
    }

    const updated = await this.userModel
      .findByIdAndUpdate(new Types.ObjectId(userId), { $set: allowed }, { new: true })
      .exec();

    if (!updated) {
      throw new BadRequestException('Utilisateur introuvable');
    }

    const obj = (updated as any).toObject?.() ?? updated;
    delete (obj as any).password;
    return obj as any;
  }

  async deleteUserById(
    requesterUserId: string,
    targetUserId: string,
  ): Promise<{ deleted: boolean }> {
    const companyId = await this.companiesService.findCompanyIdByUserId(requesterUserId);
    if (!companyId) {
      throw new BadRequestException("Aucune entreprise associée à cet utilisateur");
    }

    const targetInCompany = await this.companiesService.isUserInCompany(companyId, targetUserId);
    if (!targetInCompany) {
      throw new ForbiddenException("Utilisateur non autorisé ou hors entreprise");
    }

    const isOwner = await this.companiesService.isCompanyOwner(companyId, targetUserId);
    if (isOwner) {
      throw new ForbiddenException('Impossible de supprimer le propriétaire de l\'entreprise');
    }

    // Supprimer les photos/visages du serveur (Naratech) pour éviter doublons et reconnaissance sur un employé supprimé
    try {
      await this.faceRecognitionService.deleteEmployeeTrainingImage(targetUserId);
    } catch (err: any) {
      // Ne pas bloquer la suppression : l'employé peut ne pas avoir de photo enregistrée (404, etc.)
      console.warn(
        `[UsersService.deleteUserById] Photo(s) non supprimée(s) côté Naratech pour ${targetUserId}:`,
        err?.message || err,
      );
    }

    try {
      await this.companiesService.removeEmployeeFromCompany(companyId, targetUserId);
    } catch {
      // Ne pas bloquer
    }

    // Supprimer tous les pointages de cet employé (tout doit disparaître)
    const deleteEntriesResult = await this.timeEntryModel
      .deleteMany({ user: new Types.ObjectId(targetUserId) })
      .exec();
    if (deleteEntriesResult.deletedCount > 0) {
      console.log(`[UsersService.deleteUserById] ${deleteEntriesResult.deletedCount} pointage(s) supprimé(s) pour ${targetUserId}`);
    }

    await this.userModel.deleteOne({ _id: new Types.ObjectId(targetUserId) }).exec();
    return { deleted: true };
  }
}
