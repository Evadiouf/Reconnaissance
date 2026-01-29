import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RHInvitation, InvitationStatus } from './schemas/rh-invitation.schema';
import { CreateRHInvitationDto } from './dto/create-rh-invitation.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(RHInvitation.name)
    private readonly invitationModel: Model<RHInvitation>,
  ) {}

  /**
   * Crée une nouvelle invitation RH avec un token unique
   */
  async createInvitation(
    dto: CreateRHInvitationDto,
    invitedBy: string,
  ): Promise<RHInvitation> {
    // Vérifier si une invitation en attente existe déjà pour cet email
    const existingInvitation = await this.invitationModel.findOne({
      email: dto.email.toLowerCase(),
      status: InvitationStatus.PENDING,
    });

    if (existingInvitation) {
      // Vérifier si l'invitation existante est expirée
      if (existingInvitation.expiresAt < new Date()) {
        // Marquer l'ancienne invitation comme expirée
        await this.invitationModel.updateOne(
          { _id: existingInvitation._id },
          { status: InvitationStatus.EXPIRED },
        );
      } else {
        throw new BadRequestException(
          'Une invitation en attente existe déjà pour cet email',
        );
      }
    }

    // Générer un token unique
    const token = this.generateToken();

    // Définir la date d'expiration (7 jours par défaut)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Créer l'invitation
    const invitation = new this.invitationModel({
      token,
      email: dto.email.toLowerCase(),
      role: dto.role,
      department: dto.department,
      invitedBy,
      status: InvitationStatus.PENDING,
      expiresAt,
      sessionTimeout: dto.sessionTimeout,
    });

    return invitation.save();
  }

  /**
   * Valide un token d'invitation
   */
  async validateToken(token: string): Promise<RHInvitation> {
    const invitation = await this.invitationModel.findOne({ token });

    if (!invitation) {
      throw new NotFoundException('Token d\'invitation invalide');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException(
        `Cette invitation a déjà été ${invitation.status === InvitationStatus.ACCEPTED ? 'acceptée' : invitation.status === InvitationStatus.EXPIRED ? 'expirée' : 'annulée'}`,
      );
    }

    if (invitation.expiresAt < new Date()) {
      // Marquer comme expirée
      await this.invitationModel.updateOne(
        { _id: invitation._id },
        { status: InvitationStatus.EXPIRED },
      );
      throw new BadRequestException('Cette invitation a expiré');
    }

    return invitation;
  }

  /**
   * Marque une invitation comme acceptée
   */
  async markAsAccepted(token: string, acceptedBy: string): Promise<void> {
    const invitation = await this.validateToken(token);

    await this.invitationModel.updateOne(
      { _id: invitation._id },
      {
        status: InvitationStatus.ACCEPTED,
        acceptedBy,
        acceptedAt: new Date(),
      },
    );
  }

  /**
   * Génère un token unique sécurisé
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Récupère une invitation par token
   */
  async findByToken(token: string): Promise<RHInvitation | null> {
    return this.invitationModel.findOne({ token }).exec();
  }

  /**
   * Récupère toutes les invitations pour un utilisateur (invité par)
   */
  async findByInviter(invitedBy: string): Promise<RHInvitation[]> {
    return this.invitationModel
      .find({ invitedBy })
      .sort({ createdAt: -1 })
      .exec();
  }
}





