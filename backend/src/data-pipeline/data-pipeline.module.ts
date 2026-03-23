import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { DataPipelineController } from './data-pipeline.controller';
import { DataPipelineService } from './data-pipeline.service';
import { MarketPricesModule } from '../market-prices/market-prices.module';
import { BuildingsModule } from '../buildings/buildings.module';

@Module({
  imports: [HttpModule, MarketPricesModule, BuildingsModule],
  controllers: [DataPipelineController],
  providers: [DataPipelineService],
  exports: [DataPipelineService],
})
export class DataPipelineModule {}
