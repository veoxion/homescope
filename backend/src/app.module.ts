import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { BuildingsModule } from './buildings/buildings.module';
import { ListingsModule } from './listings/listings.module';
import { TransactionsModule } from './transactions/transactions.module';
import { MarketPricesModule } from './market-prices/market-prices.module';
import { PoisModule } from './pois/pois.module';
import { FinanceModule } from './finance/finance.module';
import { DataPipelineModule } from './data-pipeline/data-pipeline.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BuildingsModule,
    ListingsModule,
    TransactionsModule,
    MarketPricesModule,
    PoisModule,
    FinanceModule,
    DataPipelineModule,
  ],
})
export class AppModule {}
