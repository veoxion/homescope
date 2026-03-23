import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BuildingsController } from './buildings.controller';
import { BuildingsService } from './buildings.service';
import { GeocodingService } from './geocoding.service';
import { TransactionsModule } from '../transactions/transactions.module';
import { MarketPricesModule } from '../market-prices/market-prices.module';
import { ListingsModule } from '../listings/listings.module';

@Module({
  imports: [HttpModule, TransactionsModule, MarketPricesModule, ListingsModule],
  controllers: [BuildingsController],
  providers: [BuildingsService, GeocodingService],
  exports: [BuildingsService, GeocodingService],
})
export class BuildingsModule {}
