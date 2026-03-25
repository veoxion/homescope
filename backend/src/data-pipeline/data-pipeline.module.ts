import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { DataPipelineController } from './data-pipeline.controller';
import { DataPipelineService } from './data-pipeline.service';
import { MarketPricesModule } from '../market-prices/market-prices.module';
import { BuildingsModule } from '../buildings/buildings.module';
import { MARKET_PRICE_QUEUE } from '../queue/queue.module';

@Module({
  imports: [
    HttpModule,
    MarketPricesModule,
    BuildingsModule,
    BullModule.registerQueue({ name: MARKET_PRICE_QUEUE }),
  ],
  controllers: [DataPipelineController],
  providers: [DataPipelineService],
  exports: [DataPipelineService],
})
export class DataPipelineModule {}
