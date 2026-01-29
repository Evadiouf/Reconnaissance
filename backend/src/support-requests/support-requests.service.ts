import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';

@Injectable()
export class SupportRequestsService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  private generateRequestNumber(): string {
    const prefix = 'SUP-';
    const randomNumber = Math.floor(Math.random() * 90000000) + 10000000;
    return prefix + randomNumber;
  }

  async create(dto: CreateSupportRequestDto): Promise<{ requestNumber: string; emailSent: boolean; emailError?: string }> {
    const requestNumber = this.generateRequestNumber();

    const toEmail = this.configService.get<string>('SUPPORT_CONTACT_EMAIL', 'contact@naratechvision.com');

    const res = await this.emailService.sendSupportRequestEmail(toEmail, {
      requestNumber,
      category: dto.category,
      subject: dto.subject,
      description: dto.description,
      email: dto.email,
      phone: dto.phone,
    });

    return { requestNumber, ...res };
  }
}
