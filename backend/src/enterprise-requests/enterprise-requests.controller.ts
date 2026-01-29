import { Body, Controller, HttpCode, HttpStatus, Post, Version } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CreateEnterpriseRequestDto } from './dto/create-enterprise-request.dto';
import { EnterpriseRequestsService } from './enterprise-requests.service';

@ApiTags('Enterprise Requests')
@Controller('enterprise-requests')
export class EnterpriseRequestsController {
  constructor(private readonly service: EnterpriseRequestsService) {}

  @Post()
  @Version('1')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Envoyer une demande Enterprise (Sur mesure) par email' })
  @ApiResponse({ status: 201, description: 'Demande reçue' })
  async create(@Body() dto: CreateEnterpriseRequestDto) {
    return this.service.create(dto);
  }
}
