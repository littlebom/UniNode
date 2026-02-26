import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CacheModule } from '@nestjs/cache-manager'
import { redisStore } from 'cache-manager-redis-yet'
import { BullModule } from '@nestjs/bullmq'
import { ScheduleModule } from '@nestjs/schedule'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'
import { TerminusModule } from '@nestjs/terminus'
import { EventEmitterModule } from '@nestjs/event-emitter'
import { APP_GUARD } from '@nestjs/core'

import { validateEnv } from './config/env.validation'
import { HealthModule } from './health/health.module'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './auth/jwt-auth.guard'
import { RolesGuard } from './auth/guards/roles.guard'
import { DIDModule } from './did/did.module'
import { CryptoModule } from './crypto/crypto.module'
import { StudentModule } from './student/student.module'
import { VCModule } from './vc/vc.module'
import { SISModule } from './sis/sis.module'
import { TransferModule } from './transfer/transfer.module'
import { CourseModule } from './course/course.module'
import { RegistrySyncModule } from './registry-sync/registry-sync.module'
import { ExternalModule } from './external/external.module'
import { MetricsModule } from './metrics/metrics.module'

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),

    // Database (with connection pool tuning)
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.get<string>('DATABASE_URL'),
        ssl: config.get<string>('DATABASE_SSL') === 'true',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/../migrations/*{.ts,.js}'],
        synchronize: false,
        logging: config.get<string>('NODE_ENV') === 'development',
        extra: {
          max: config.get<number>('DB_POOL_MAX', 20),
          min: config.get<number>('DB_POOL_MIN', 5),
          idleTimeoutMillis: 30000,
        },
      }),
    }),

    // Redis Cache (application-level caching)
    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = new URL(config.get<string>('REDIS_URL', 'redis://localhost:6379'))
        return {
          store: await redisStore({
            socket: {
              host: redisUrl.hostname,
              port: parseInt(redisUrl.port || '6379', 10),
            },
            password: config.get<string>('REDIS_PASSWORD') || undefined,
          }),
          ttl: 300000, // 5 min default (ms)
          max: 500,
        }
      },
    }),

    // Redis + BullMQ
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: new URL(config.get<string>('REDIS_URL', 'redis://localhost:6379')).hostname,
          port: parseInt(new URL(config.get<string>('REDIS_URL', 'redis://localhost:6379')).port || '6379', 10),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),

    // Scheduler
    ScheduleModule.forRoot(),

    // Event Emitter
    EventEmitterModule.forRoot(),

    // Rate Limiting
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [{
        ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1000,
        limit: config.get<number>('RATE_LIMIT_MAX', 200),
      }],
    }),

    // Health Checks
    TerminusModule,

    // Feature Modules
    AuthModule,
    CryptoModule,
    DIDModule,
    HealthModule,
    StudentModule,
    VCModule,
    SISModule,
    TransferModule,
    CourseModule,
    RegistrySyncModule,
    ExternalModule,
    MetricsModule,
  ],
  providers: [
    // APP_GUARD order: ThrottlerGuard → JwtAuthGuard → RolesGuard
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
