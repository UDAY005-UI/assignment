import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { FinancialRecordsController } from './financial-records.controller';
import { FinancialRecordsService } from './financial-records.service';
import { CategoriesService } from './services/categories.service';
import { JwtStrategy } from '../auth/jwt.strategy';
import { auditWorker } from './services/audit.worker';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [
    FinancialRecordsService,
    CategoriesService,
    JwtStrategy,
    RolesGuard,
    { provide: 'AUDIT_WORKER', useValue: auditWorker },
  ],
  controllers: [FinancialRecordsController],
})
export class FinancialRecordsModule {}
