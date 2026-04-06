/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FinancialRecordsService } from './financial-records.service';
import { CategoriesService } from './services/categories.service';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@repo/database';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { FilterRecordsDto } from './dto/filter-records.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('financial-records')
export class FinancialRecordsController {
  constructor(
    private readonly recordsService: FinancialRecordsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  @Post()
  @Roles(Role.ADMIN, Role.ANALYST)
  create(@Req() req: any, @Body() dto: CreateRecordDto) {
    return this.recordsService.create(req.user.sub, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  findAll(@Req() req: any, @Query() filters: FilterRecordsDto) {
    return this.recordsService.findAll(req.user.sub, req.user.role, filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.recordsService.findOne(req.user.sub, req.user.role, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.ANALYST)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRecordDto,
  ) {
    return this.recordsService.update(req.user.sub, req.user.role, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  softDelete(@Req() req: any, @Param('id') id: string) {
    return this.recordsService.softDelete(req.user.sub, req.user.role, id);
  }

  @Patch(':id/restore')
  @Roles(Role.ADMIN)
  restore(@Req() req: any, @Param('id') id: string) {
    return this.recordsService.restore(req.user.sub, req.user.role, id);
  }

  @Post('categories')
  @Roles(Role.ADMIN)
  createCategory(@Body() dto: { name: string; description?: string }) {
    return this.categoriesService.create(dto);
  }

  @Get('categories')
  @Roles(Role.ADMIN, Role.ANALYST, Role.VIEWER)
  findAllCategories() {
    return this.categoriesService.findAll();
  }

  @Delete('categories/:id')
  @Roles(Role.ADMIN)
  removeCategory(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
