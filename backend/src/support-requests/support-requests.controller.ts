import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { SupportRequestsService } from './support-requests.service';

@ApiTags('Support Requests')
@Controller('support-requests')
export class SupportRequestsController {
  constructor(private readonly service: SupportRequestsService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Envoyer une demande de support par email' })
  @ApiResponse({ status: 201, description: 'Demande reçue' })
  async create(@Body() dto: CreateSupportRequestDto) {
    return this.service.create(dto);
  }
}
