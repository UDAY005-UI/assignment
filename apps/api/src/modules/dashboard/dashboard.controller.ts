/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.dashboardService.getSummary(req.user.sub);
  }

  @Get('categories')
  async getCategoryBreakdown(@Req() req: any) {
    return this.dashboardService.getCategoryBreakdown(req.user.sub);
  }

  @Get('recent')
  async getRecentActivity(@Req() req: any) {
    return this.dashboardService.getRecentActivity(req.user.sub);
  }

  @Get('trends/monthly')
  async getMonthlyTrends(@Req() req: any) {
    return this.dashboardService.getMonthlyTrends(req.user.sub);
  }

  @Get('trends/weekly')
  async getWeeklyTrends(@Req() req: any) {
    return this.dashboardService.getWeeklyTrends(req.user.sub);
  }
}
