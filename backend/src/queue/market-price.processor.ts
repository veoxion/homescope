import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MarketPricesService } from '../market-prices/market-prices.service';
import { MARKET_PRICE_QUEUE } from './queue.module';

export interface RecalculateAllJob {
  type: 'recalculate-all';
}

export interface RecalculateBuildingsJob {
  type: 'recalculate-buildings';
  buildingIds: string[];
}

export type MarketPriceJobData = RecalculateAllJob | RecalculateBuildingsJob;

@Processor(MARKET_PRICE_QUEUE)
export class MarketPriceProcessor extends WorkerHost {
  private readonly logger = new Logger(MarketPriceProcessor.name);

  constructor(private readonly marketPricesService: MarketPricesService) {
    super();
  }

  async process(job: Job<MarketPriceJobData>) {
    this.logger.log(`시세 재계산 작업 시작: ${job.id} (${job.data.type})`);

    if (job.data.type === 'recalculate-all') {
      const result = await this.marketPricesService.calculateAll();
      this.logger.log(`시세 재계산 완료: ${result.totalUpserted}건`);
      return result;
    }

    if (job.data.type === 'recalculate-buildings') {
      const result = await this.marketPricesService.calculateForBuildings(
        job.data.buildingIds,
      );
      this.logger.log(`시세 배치 재계산 완료: ${result.totalUpserted}건`);
      return result;
    }

    this.logger.error(`알 수 없는 작업 유형: ${(job.data as any).type}`);
    throw new Error(`알 수 없는 작업 유형: ${(job.data as any).type}`);
  }
}
