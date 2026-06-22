import { Module } from '@nestjs/common';
import { FaceRecognitionService } from './face-recognition.service';
import { FaceRecognitionController } from './face-recognition.controller';
import { KioskAuthModule } from '../auth/kiosk-auth.module';

@Module({
  imports: [KioskAuthModule],
  controllers: [FaceRecognitionController],
  providers: [FaceRecognitionService],
  exports: [FaceRecognitionService],
})
export class FaceRecognitionModule {}

