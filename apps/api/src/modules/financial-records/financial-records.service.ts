import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { prisma } from '@repo/database';
import { Role } from '@repo/database';
import { auditQueue } from './services/audit.queue';
import { CreateRecordDto } from './dto/create-record.dto';
import { UpdateRecordDto } from './dto/update-record.dto';
import { FilterRecordsDto } from './dto/filter-records.dto';

@Injectable()
export class FinancialRecordsService {
  async create(userId: string, dto: CreateRecordDto) {
    const record = await prisma.financialRecord.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        type: dto.type,
        notes: dto.notes,
        date: new Date(dto.date),
      },
    });

    await auditQueue.add('audit', {
      userId,
      recordId: record.id,
      action: 'CREATED',
      snapshot: record,
    });

    return record;
  }

  async findAll(userId: string, role: Role, filters: FilterRecordsDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const where: any = {
      isDeleted: false,
      ...(role !== Role.ADMIN && { userId }),
      ...(filters.type && { type: filters.type }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.from || filters.to
        ? {
            date: {
              ...(filters.from && { gte: new Date(filters.from) }),
              ...(filters.to && { lte: new Date(filters.to) }),
            },
          }
        : {}),
    };

    return prisma.financialRecord.findMany({
      include: { category: true },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(userId: string, role: Role, id: string) {
    const record = await prisma.financialRecord.findUnique({
      where: { id },
      include: { category: true },
    });

    if (!record || record.isDeleted) {
      throw new NotFoundException('Record not found');
    }

    if (role !== Role.ADMIN && record.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return record;
  }

  async update(userId: string, role: Role, id: string, dto: UpdateRecordDto) {
    const record = await this.findOne(userId, role, id);

    const updated = await prisma.financialRecord.update({
      where: { id: record.id },
      data: {
        ...(dto.amount && { amount: dto.amount }),
        ...(dto.type && { type: dto.type }),
        ...(dto.categoryId && { categoryId: dto.categoryId }),
        ...(dto.notes && { notes: dto.notes }),
        ...(dto.date && { date: new Date(dto.date) }),
      },
    });

    await auditQueue.add('audit', {
      userId,
      recordId: updated.id,
      action: 'UPDATED',
      snapshot: updated,
    });

    return updated;
  }

  async softDelete(userId: string, role: Role, id: string) {
    const record = await this.findOne(userId, role, id);

    const deleted = await prisma.financialRecord.update({
      where: { id: record.id },
      data: { isDeleted: true },
    });

    await auditQueue.add('audit', {
      userId,
      recordId: deleted.id,
      action: 'DELETED',
      snapshot: deleted,
    });

    return { message: 'Record deleted' };
  }

  async restore(userId: string, role: Role, id: string) {
    const record = await prisma.financialRecord.findUnique({
      where: { id },
    });

    if (!record) throw new NotFoundException('Record not found');
    if (role !== Role.ADMIN && record.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const restored = await prisma.financialRecord.update({
      where: { id },
      data: { isDeleted: false },
    });

    await auditQueue.add('audit', {
      userId,
      recordId: restored.id,
      action: 'RESTORED',
      snapshot: restored,
    });

    return restored;
  }
}
