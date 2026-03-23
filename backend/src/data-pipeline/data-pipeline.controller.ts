import { Controller, Post, Body } from '@nestjs/common';
import { DataPipelineService } from './data-pipeline.service';
import { MarketPricesService } from '../market-prices/market-prices.service';

@Controller('data-pipeline')
export class DataPipelineController {
  constructor(
    private readonly pipelineService: DataPipelineService,
    private readonly marketPricesService: MarketPricesService,
  ) {}

  /** 특정 지역·연월의 실거래 데이터 수집 */
  @Post('fetch')
  fetchTrades(@Body() body: { lawdCd: string; dealYm: string }) {
    return this.pipelineService.fetchAptTrades(body.lawdCd, body.dealYm);
  }

  /** 여러 지역의 최근 N개월 데이터 일괄 수집 + 시세 재계산 */
  @Post('sync')
  syncAll(@Body() body: { lawdCds: string[]; months?: number }) {
    return this.pipelineService.syncAll(body.lawdCds, body.months);
  }

  /** 모든 건물 시세 재계산 */
  @Post('recalculate-prices')
  recalculatePrices() {
    return this.marketPricesService.calculateAll();
  }

  /** 좌표 미설정 건물 일괄 지오코딩 */
  @Post('geocode-missing')
  geocodeMissing() {
    return this.pipelineService.geocodeMissingBuildings();
  }
}
