import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { CreateEnterpriseRequestDto } from './dto/create-enterprise-request.dto';

@Injectable()
export class EnterpriseRequestsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private generateRequestNumber(): string {
    const prefix = 'REQ-';
    const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
    return prefix + randomNumber;
  }

  async create(dto: CreateEnterpriseRequestDto): Promise<{ requestNumber: string; emailSent: boolean; emailError?: string }> {
    const requestNumber = this.generateRequestNumber();

    const toEmail = this.configService.get<string>('ENTERPRISE_CONTACT_EMAIL', 'contact@naratechvision.com');

    const res = await this.emailService.sendEnterpriseRequestEmail(toEmail, {
      requestNumber,
      categorieDemande: dto.categorieDemande,
      sujet: dto.sujet,
      description: dto.description,
      email: dto.email,
      telephone: dto.telephone,
    });

    return { requestNumber, ...res };
  }
}
