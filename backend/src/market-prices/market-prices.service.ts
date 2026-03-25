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
   * 단일 SQL로 중위값 계산 + UPSERT를 수행하여 N+1 문제를 제거.
   */
  async calculateAll() {
    this.logger.log('시세 일괄 재계산 시작 (배치 SQL)');

    const result: Array<{ upserted: number }> = await this.prisma.$queryRaw`
      WITH median_data AS (
        SELECT
          building_id,
          trade_type,
          area_m2,
          COUNT(*)::int AS tx_count,
          (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price))::int AS median_price,
          CASE
            WHEN COUNT(monthly_rent) FILTER (WHERE monthly_rent IS NOT NULL) > 0
            THEN (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY monthly_rent)
                  FILTER (WHERE monthly_rent IS NOT NULL))::int
            ELSE NULL
          END AS median_monthly_rent,
          (NOW() - INTERVAL '12 months')::date AS period_start,
          CURRENT_DATE AS period_end
        FROM transactions
        WHERE traded_at >= NOW() - INTERVAL '12 months'
        GROUP BY building_id, trade_type, area_m2
      ),
      upserted AS (
        INSERT INTO market_prices (
          id, building_id, trade_type, area_m2,
          median_price, median_monthly_rent, transaction_count,
          period_start, period_end, calculated_at
        )
        SELECT
          gen_random_uuid(),
          building_id, trade_type, area_m2,
          median_price, median_monthly_rent, tx_count,
          period_start, period_end, NOW()
        FROM median_data
        ON CONFLICT (building_id, trade_type, area_m2)
        DO UPDATE SET
          median_price = EXCLUDED.median_price,
          median_monthly_rent = EXCLUDED.median_monthly_rent,
          transaction_count = EXCLUDED.transaction_count,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end,
          calculated_at = NOW()
        RETURNING 1
      )
      SELECT COUNT(*)::int AS upserted FROM upserted
    `;

    const count = result[0]?.upserted ?? 0;
    this.logger.log(`시세 일괄 재계산 완료: ${count}건 upsert`);
    return { totalUpserted: count };
  }

  /**
   * 여러 건물의 시세를 배치로 재계산한다.
   * syncAll에서 영향받은 건물들만 대상으로 사용.
   */
  async calculateForBuildings(buildingIds: string[]) {
    if (buildingIds.length === 0) return { totalUpserted: 0 };

    this.logger.log(`시세 배치 재계산: ${buildingIds.length}개 건물`);

    const result: Array<{ upserted: number }> = await this.prisma.$queryRaw`
      WITH median_data AS (
        SELECT
          building_id,
          trade_type,
          area_m2,
          COUNT(*)::int AS tx_count,
          (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price))::int AS median_price,
          CASE
            WHEN COUNT(monthly_rent) FILTER (WHERE monthly_rent IS NOT NULL) > 0
            THEN (PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY monthly_rent)
                  FILTER (WHERE monthly_rent IS NOT NULL))::int
            ELSE NULL
          END AS median_monthly_rent,
          (NOW() - INTERVAL '12 months')::date AS period_start,
          CURRENT_DATE AS period_end
        FROM transactions
        WHERE building_id = ANY(${buildingIds}::uuid[])
          AND traded_at >= NOW() - INTERVAL '12 months'
        GROUP BY building_id, trade_type, area_m2
      ),
      upserted AS (
        INSERT INTO market_prices (
          id, building_id, trade_type, area_m2,
          median_price, median_monthly_rent, transaction_count,
          period_start, period_end, calculated_at
        )
        SELECT
          gen_random_uuid(),
          building_id, trade_type, area_m2,
          median_price, median_monthly_rent, tx_count,
          period_start, period_end, NOW()
        FROM median_data
        ON CONFLICT (building_id, trade_type, area_m2)
        DO UPDATE SET
          median_price = EXCLUDED.median_price,
          median_monthly_rent = EXCLUDED.median_monthly_rent,
          transaction_count = EXCLUDED.transaction_count,
          period_start = EXCLUDED.period_start,
          period_end = EXCLUDED.period_end,
          calculated_at = NOW()
        RETURNING 1
      )
      SELECT COUNT(*)::int AS upserted FROM upserted
    `;

    const count = result[0]?.upserted ?? 0;
    this.logger.log(`시세 배치 재계산 완료: ${count}건 upsert`);
    return { totalUpserted: count };
  }

  private median(sorted: number[]): number {
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }
}
