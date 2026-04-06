import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { prisma } from '@repo/database';

@Injectable()
export class CategoriesService {
  async create(dto: { name: string; description?: string }) {
    const existing = await prisma.category.findUnique({
      where: { name: dto.name },
    });

    if (existing) throw new ConflictException('Category already exists');

    return prisma.category.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async findAll() {
    return prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async remove(id: string) {
    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    return prisma.category.delete({ where: { id } });
  }
}
