import { Module } from '@nestjs/common';
import { MarketPricesService } from './market-prices.service';

@Module({
  providers: [MarketPricesService],
  exports: [MarketPricesService],
})
export class MarketPricesModule {}
