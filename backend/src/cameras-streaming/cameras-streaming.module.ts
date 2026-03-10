import { Module } from '@nestjs/common';
import { CamerasStreamingController } from './cameras-streaming.controller';
import { CamerasStreamingService } from './cameras-streaming.service';

@Module({
  controllers: [CamerasStreamingController],
  providers: [CamerasStreamingService],
  exports: [CamerasStreamingService],
})
export class CamerasStreamingModule {}
