import { Controller, Post, Body, UseGuards, HttpCode, Logger } from '@nestjs/common';
import { DataPipelineService } from './data-pipeline.service';
import { MarketPricesService } from '../market-prices/market-prices.service';
import { AdminApiKeyGuard } from '../common/admin-api-key.guard';

@Controller('data-pipeline')
@UseGuards(AdminApiKeyGuard)
export class DataPipelineController {
  private readonly logger = new Logger(DataPipelineController.name);

  constructor(
    private readonly pipelineService: DataPipelineService,
    private readonly marketPricesService: MarketPricesService,
  ) {}

  // ──────────────────────────────────────────────
  // 아파트
  // ──────────────────────────────────────────────

  /** 아파트 매매 실거래 수집 */
  @Post('fetch')
  fetchTrades(@Body() body: { lawdCd: string; dealYm: string }) {
    return this.pipelineService.fetchAptTrades(body.lawdCd, body.dealYm);
  }

  /** 아파트 전세/월세 실거래 수집 */
  @Post('fetch-apt-rent')
  fetchAptRent(@Body() body: { lawdCd: string; dealYm: string }) {
    return this.pipelineService.fetchAptRent(body.lawdCd, body.dealYm);
  }

  // ──────────────────────────────────────────────
  // 오피스텔
  // ──────────────────────────────────────────────

  /** 오피스텔 매매 실거래 수집 */
  @Post('fetch-offi-trade')
  fetchOffiTrades(@Body() body: { lawdCd: string; dealYm: string }) {
    return this.pipelineService.fetchOffiTrades(body.lawdCd, body.dealYm);
  }

  /** 오피스텔 전세/월세 실거래 수집 */
  @Post('fetch-offi-rent')
  fetchOffiRent(@Body() body: { lawdCd: string; dealYm: string }) {
    return this.pipelineService.fetchOffiRent(body.lawdCd, body.dealYm);
  }

  // ──────────────────────────────────────────────
  // 연립다세대 (빌라)
  // ──────────────────────────────────────────────

  /** 연립다세대(빌라) 매매 실거래 수집 */
  @Post('fetch-rh-trade')
  fetchRhTrades(@Body() body: { lawdCd: string; dealYm: string }) {
    return this.pipelineService.fetchRhTrades(body.lawdCd, body.dealYm);
  }

  /** 연립다세대(빌라) 전세/월세 실거래 수집 */
  @Post('fetch-rh-rent')
  fetchRhRent(@Body() body: { lawdCd: string; dealYm: string }) {
    return this.pipelineService.fetchRhRent(body.lawdCd, body.dealYm);
  }

  // ──────────────────────────────────────────────
  // 일괄 수집
  // ──────────────────────────────────────────────

  /**
   * 여러 지역의 최근 N개월 데이터 일괄 수집 + 시세 재계산.
   * endpointKeys로 수집 대상을 지정할 수 있음.
   * - 기본: ['aptTrade'] (아파트 매매만)
   * - 전체: ['all'] (아파트/오피스텔/빌라 매매+전세/월세)
   * - 선택: ['aptTrade', 'aptRent', 'offiTrade'] 등
   */
  @Post('sync')
  syncAll(
    @Body()
    body: {
      lawdCds: string[];
      months?: number;
      endpointKeys?: string[];
    },
  ) {
    return this.pipelineService.syncAll(
      body.lawdCds,
      body.months,
      body.endpointKeys,
    );
  }

  /** 모든 건물 시세 재계산 (비동기 - 즉시 202 반환) */
  @Post('recalculate-prices')
  @HttpCode(202)
  recalculatePrices() {
    this.marketPricesService.calculateAll().catch((err) => {
      this.logger.error(`시세 재계산 실패: ${err.message}`);
    });
    return { message: '시세 재계산이 백그라운드에서 시작되었습니다.' };
  }

  /** 좌표 미설정 건물 일괄 지오코딩 */
  @Post('geocode-missing')
  geocodeMissing() {
    return this.pipelineService.geocodeMissingBuildings();
  }
}
