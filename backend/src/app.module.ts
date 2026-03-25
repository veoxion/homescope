import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { BuildingsModule } from './buildings/buildings.module';
import { ListingsModule } from './listings/listings.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MarketPricesModule } from './market-prices/market-prices.module';
import { PoisModule } from './pois/pois.module';
import { FinanceModule } from './finance/finance.module';
import { DataPipelineModule } from './data-pipeline/data-pipeline.module';
import { HealthModule } from './health/health.module';

const optionalImports: any[] = [];

// Redis가 설정된 경우에만 QueueModule 로드
if (process.env.REDIS_HOST) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { QueueModule } = require('./queue/queue.module');
  optionalImports.push(QueueModule);
}

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
      {
        name: 'medium',
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    BuildingsModule,
    ListingsModule,
    TransactionsModule,
    MarketPricesModule,
    PoisModule,
    FinanceModule,
    DataPipelineModule,
    HealthModule,
    ...optionalImports,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
