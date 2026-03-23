import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  async findByBuilding(buildingId: string, limit = 20) {
    return this.prisma.transaction.findMany({
      where: { buildingId },
      orderBy: { tradedAt: 'desc' },
      take: limit,
    });
  }
}
