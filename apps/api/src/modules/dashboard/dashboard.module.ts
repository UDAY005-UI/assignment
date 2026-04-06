import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from '../auth/jwt.strategy';
import { RolesGuard } from '../auth/roles.guard';

@Module({
  imports: [PassportModule, JwtModule.register({})],
  providers: [DashboardService, JwtStrategy, RolesGuard],
  controllers: [DashboardController],
})
export class DashboardModule {}
