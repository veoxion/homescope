import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class MarketPricesService {
  private readonly logger = new Logger(MarketPricesService.name);

  constructor(private prisma: PrismaService) {}

  async findByBuilding(buildingId: string) {
    return this.prisma.marketPrice.findMany({
      where: { buildingId },
      orderBy: [{ tradeType: 'asc' }, { areaM2: 'asc' }],
    });
  }

  /**
   * 특정 건물의 시세를 실거래 데이터 기반으로 계산/갱신한다.
   * 최근 12개월 거래의 중위값(median)을 계산.
   */
  async calculateForBuilding(buildingId: string) {
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setMonth(periodStart.getMonth() - 12);

    const groups: Array<{
      trade_type: string;
      area_m2: Prisma.Decimal;
      prices: number[];
      monthly_rents: (number | null)[];
    }>[] = await this.prisma.$queryRaw`
      SELECT
        trade_type,
        area_m2,
        ARRAY_AGG(price ORDER BY price) AS prices,
        ARRAY_AGG(monthly_rent ORDER BY price) AS monthly_rents,
        COUNT(*)::int AS tx_count
      FROM transactions
      WHERE building_id = ${buildingId}::uuid
        AND traded_at >= ${periodStart}
        AND traded_at <= ${periodEnd}
      GROUP BY trade_type, area_m2
    `;

    let upsertCount = 0;
    for (const group of groups as any[]) {
      const prices = group.prices as number[];
      const medianPrice = this.median(prices);
      const monthlyRents = (group.monthly_rents as (number | null)[]).filter(
        (r): r is number => r != null,
      );
      const medianMonthlyRent =
        monthlyRents.length > 0 ? this.median(monthlyRents) : null;

      await this.prisma.marketPrice.upsert({
        where: {
          uq_market_prices_bta: {
            buildingId,
            tradeType: group.trade_type,
            areaM2: group.area_m2,
          },
        },
        update: {
          medianPrice,
          medianMonthlyRent,
          transactionCount: group.tx_count,
          periodStart,
          periodEnd,
          calculatedAt: new Date(),
        },
        create: {
          buildingId,
          tradeType: group.trade_type,
          areaM2: group.area_m2,
          medianPrice,
          medianMonthlyRent,
          transactionCount: group.tx_count,
          periodStart,
          periodEnd,
        },
      });
      upsertCount++;
    }

    return { buildingId, upsertCount };
  }

  /**
   * 모든 건물의 시세를 일괄 재계산한다.
   */
  async calculateAll() {
    const buildings: Array<{ id: string }> = await this.prisma.$queryRaw`
      SELECT DISTINCT building_id AS id FROM transactions
      WHERE traded_at >= NOW() - INTERVAL '12 months'
    `;

    this.logger.log(`시세 계산 시작: ${buildings.length}개 건물`);
    let processed = 0;

    for (const { id } of buildings) {
      await this.calculateForBuilding(id);
      processed++;
      if (processed % 100 === 0) {
        this.logger.log(`시세 계산 진행: ${processed}/${buildings.length}`);
      }
    }

    this.logger.log(`시세 계산 완료: ${processed}개 건물`);
    return { totalBuildings: processed };
  }

  private median(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }
}
