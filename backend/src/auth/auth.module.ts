import { DynamicModule, Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRedisConnectionToken } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { AuthService } from './auth.service';
import { LocalStrategy } from './local.strategy';
import { JwtStrategy } from './jwt.strategy';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { RolesGuard } from './guards/roles.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesModule } from '../roles/roles.module';

/** Store en mémoire pour reset-password quand Redis est désactivé (REDIS_HOST=skip). */
function createMemoryRedisStore(): { setex: (k: string, ttl: number, v: string) => Promise<'OK'>; get: (k: string) => Promise<string | null>; del: (k: string) => Promise<number> } {
  const store = new Map<string, { value: string; timeout: NodeJS.Timeout }>();
  return {
    setex(key: string, ttlSeconds: number, value: string): Promise<'OK'> {
      const t = store.get(key);
      if (t) clearTimeout(t.timeout);
      store.set(key, { value, timeout: setTimeout(() => store.delete(key), ttlSeconds * 1000) });
      return Promise.resolve('OK');
    },
    get(key: string): Promise<string | null> {
      return Promise.resolve(store.get(key)?.value ?? null);
    },
    del(key: string): Promise<number> {
      const t = store.get(key);
      if (t) {
        clearTimeout(t.timeout);
        store.delete(key);
      }
      return Promise.resolve(1);
    },
  };
}

@Module({})
export class AuthModule {
  static forRootAsync(options: { inject: any[]; useFactory: (config: ConfigService) => unknown }): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        ConfigModule,
        UsersModule,
        RolesModule,
        PassportModule,
        {
          module: class RedisOrMemoryModule {},
          global: true,
          providers: [
            {
              provide: getRedisConnectionToken(),
              useFactory: (config: ConfigService) => {
                const host = (config.get<string>('REDIS_HOST') || 'localhost').trim().toLowerCase();
                const skip = !host || host === 'skip' || host === 'disabled' || host === 'false';
                if (skip) {
                  return createMemoryRedisStore();
                }
                const password = config.get<string>('REDIS_PASSWORD');
                const validPassword =
                  password &&
                  password.trim() !== '' &&
                  password !== 'your_redis_password_here';
                const client = new Redis({
                  host,
                  port: config.get<number>('REDIS_PORT', 6379),
                  ...(validPassword ? { password } : {}),
                  db: config.get<number>('REDIS_DB', 0),
                  maxRetriesPerRequest: 2,
                  retryStrategy: () => null,
                  lazyConnect: true,
                });
                client.on('error', () => {
                  // évite "Unhandled error event" dans la console
                });
                return client;
              },
              inject: [ConfigService],
            },
          ],
          exports: [getRedisConnectionToken()],
        },
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService): JwtModuleOptions => ({
            secret: config.getOrThrow<string>('JWT_SECRET'),
            signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '1d') as '1d' | '7d' | number },
          }),
        }),
      ],
      providers: [AuthService, LocalStrategy, JwtStrategy, RolesGuard, PermissionsGuard],
      controllers: [AuthController],
      exports: [PassportModule, JwtModule, RolesGuard, PermissionsGuard],
    };
  }
}
