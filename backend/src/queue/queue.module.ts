import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MarketPricesModule } from '../market-prices/market-prices.module';
import { MarketPriceProcessor } from './market-price.processor';

export const MARKET_PRICE_QUEUE = 'market-price';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
        },
      }),
    }),
    BullModule.registerQueue({ name: MARKET_PRICE_QUEUE }),
    MarketPricesModule,
  ],
  providers: [MarketPriceProcessor],
  exports: [BullModule],
})
export class QueueModule {}
