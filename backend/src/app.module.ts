import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { RolesModule } from './roles/roles.module';
import { CompaniesModule } from './companies/companies.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { CaslModule } from './casl/casl.module';
import { SiteConfigModule } from './site-config/site-config.module';
import { CompanySubscriptionsModule } from './company-subscriptions/company-subscriptions.module';
import { PermissionsModule } from './permissions/permissions.module';
import { AttendanceModule } from './attendance/attendance.module';
import { InvitationsModule } from './invitations/invitations.module';
import { CompanyInvitationsModule } from './company-invitations/company-invitations.module';
import { FileManagerModule } from './filemanager/filemanager.module';
import { FaceRecognitionModule } from './face-recognition/face-recognition.module';
import { EnterpriseRequestsModule } from './enterprise-requests/enterprise-requests.module';
import { SupportRequestsModule } from './support-requests/support-requests.module';
import { SchedulesModule } from './schedules/schedules.module';
import { BootstrapService } from './bootstrap.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('RATE_LIMIT_TTL', 60),
            limit: config.get<number>('RATE_LIMIT_LIMIT', 100),
          },
        ],
      }),
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
        dbName: config.get<string>('MONGO_DB_NAME'),
      }),
    }),
    EmailModule,
    UsersModule,
    AuthModule,
    RolesModule,
    CaslModule,
    CompaniesModule,
    SubscriptionsModule,
    SiteConfigModule,
    CompanySubscriptionsModule,
    PermissionsModule,
    AttendanceModule,
    InvitationsModule,
    CompanyInvitationsModule,
    FileManagerModule,
    FaceRecognitionModule,
    EnterpriseRequestsModule,
    SupportRequestsModule,
    SchedulesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    BootstrapService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
