import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { IdempotencyMiddleware } from './common/idempotency.middleware';
import { ThrottlerConfig } from './common/throttler.config';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FinancialRecordsModule } from './modules/financial-records/financial-records.module';

@Module({
  imports: [
    ThrottlerConfig,
    AuthModule,
    DashboardModule,
    FinancialRecordsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(IdempotencyMiddleware).forRoutes('*');
  }
}
