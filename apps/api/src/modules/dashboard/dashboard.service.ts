import { Injectable } from '@nestjs/common';
import { prisma } from '@repo/database';
import { RecordType } from '@repo/database';

@Injectable()
export class DashboardService {
  async getSummary(userId: string) {
    const records = await prisma.financialRecord.findMany({
      where: { userId, isDeleted: false },
    });

    const totalIncome = records
      .filter((r) => r.type === RecordType.INCOME)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    const totalExpenses = records
      .filter((r) => r.type === RecordType.EXPENSE)
      .reduce((sum, r) => sum + Number(r.amount), 0);

    return {
      totalIncome,
      totalExpenses,
      netBalance: totalIncome - totalExpenses,
    };
  }

  async getCategoryBreakdown(userId: string) {
    const records = await prisma.financialRecord.groupBy({
      by: ['categoryId', 'type'],
      where: { userId, isDeleted: false },
      _sum: { amount: true },
    });

    const categoryIds = [...new Set(records.map((r) => r.categoryId))];

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const categoryMap = Object.fromEntries(
      categories.map((c) => [c.id, c.name]),
    );

    return records.map((r) => ({
      category: categoryMap[r.categoryId],
      type: r.type,
      total: Number(r._sum.amount),
    }));
  }

  async getRecentActivity(userId: string) {
    return prisma.financialRecord.findMany({
      where: { userId, isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { category: true },
    });
  }

  async getMonthlyTrends(userId: string) {
    const records = await prisma.financialRecord.findMany({
      where: { userId, isDeleted: false },
      select: {
        amount: true,
        type: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    });

    const trendsMap: Record<string, { income: number; expense: number }> = {};

    for (const record of records) {
      const key = `${record.date.getFullYear()}-${String(record.date.getMonth() + 1).padStart(2, '0')}`;

      if (!trendsMap[key]) {
        trendsMap[key] = { income: 0, expense: 0 };
      }

      if (record.type === RecordType.INCOME) {
        trendsMap[key].income += Number(record.amount);
      } else {
        trendsMap[key].expense += Number(record.amount);
      }
    }

    return Object.entries(trendsMap).map(([month, data]) => ({
      month,
      ...data,
      net: data.income - data.expense,
    }));
  }

  async getWeeklyTrends(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const records = await prisma.financialRecord.findMany({
      where: {
        userId,
        isDeleted: false,
        date: { gte: sevenDaysAgo },
      },
      select: {
        amount: true,
        type: true,
        date: true,
      },
      orderBy: { date: 'asc' },
    });

    const trendsMap: Record<string, { income: number; expense: number }> = {};

    for (const record of records) {
      const key = record.date.toISOString().split('T')[0];

      if (!trendsMap[key]) {
        trendsMap[key] = { income: 0, expense: 0 };
      }

      if (record.type === RecordType.INCOME) {
        trendsMap[key].income += Number(record.amount);
      } else {
        trendsMap[key].expense += Number(record.amount);
      }
    }

    return Object.entries(trendsMap).map(([day, data]) => ({
      day,
      ...data,
      net: data.income - data.expense,
    }));
  }
}
