import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { MarketPricesService } from '../market-prices/market-prices.service';
import { GeocodingService } from '../buildings/geocoding.service';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';

interface MolitTradeItem {
  dealAmount: string;
  buildYear: string;
  dealYear: string;
  dealMonth: string;
  dealDay: string;
  aptNm: string;
  excluUseAr: string;
  jibun: string;
  floor: string;
  umdNm: string;
  sggCd: string;
  deposit?: string;
  monthlyRent?: string;
}

/** 주거 유형별 API 엔드포인트 정의 */
interface ApiEndpoint {
  /** API 경로 (baseUrl 이후) */
  path: string;
  /** 거래 유형 */
  tradeType: '매매' | '전세' | '월세';
  /** 주거 형태 */
  residenceType: '아파트' | '오피스텔' | '빌라';
  /** 건물명 필드 (API마다 다를 수 있음) */
  nameField: string;
}

/** 지원하는 모든 API 엔드포인트 */
const API_ENDPOINTS: Record<string, ApiEndpoint> = {
  // 아파트
  aptTrade: {
    path: '/RTMSDataSvcAptTradeDev/getRTMSDataSvcAptTradeDev',
    tradeType: '매매',
    residenceType: '아파트',
    nameField: 'aptNm',
  },
  aptRent: {
    path: '/RTMSDataSvcAptRent/getRTMSDataSvcAptRent',
    tradeType: '전세',
    residenceType: '아파트',
    nameField: 'aptNm',
  },
  // 오피스텔
  offiTrade: {
    path: '/RTMSDataSvcOffiTrade/getRTMSDataSvcOffiTrade',
    tradeType: '매매',
    residenceType: '오피스텔',
    nameField: 'offiNm',
  },
  offiRent: {
    path: '/RTMSDataSvcOffiRent/getRTMSDataSvcOffiRent',
    tradeType: '전세',
    residenceType: '오피스텔',
    nameField: 'offiNm',
  },
  // 연립다세대 (빌라)
  rhTrade: {
    path: '/RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade',
    tradeType: '매매',
    residenceType: '빌라',
    nameField: 'aptNm',
  },
  rhRent: {
    path: '/RTMSDataSvcRHRent/getRTMSDataSvcRHRent',
    tradeType: '전세',
    residenceType: '빌라',
    nameField: 'aptNm',
  },
};

const MOLIT_REQUEST_TIMEOUT_MS = 10000;
const MOLIT_REQUEST_INTERVAL_MS = 200;
const MOLIT_MAX_RETRIES = 3;
const MOLIT_BASE_URL = 'http://apis.data.go.kr/1613000';

/** 법정동코드(5자리) -> 시도 시군구 매핑 */
const SGG_CODE_MAP: Record<string, string> = {
  '11110': '서울특별시 종로구', '11140': '서울특별시 중구', '11170': '서울특별시 용산구',
  '11200': '서울특별시 성동구', '11215': '서울특별시 광진구', '11230': '서울특별시 동대문구',
  '11260': '서울특별시 중랑구', '11290': '서울특별시 성북구', '11305': '서울특별시 강북구',
  '11320': '서울특별시 도봉구', '11350': '서울특별시 노원구', '11380': '서울특별시 은평구',
  '11410': '서울특별시 서대문구', '11440': '서울특별시 마포구', '11470': '서울특별시 양천구',
  '11500': '서울특별시 강서구', '11530': '서울특별시 구로구', '11545': '서울특별시 금천구',
  '11560': '서울특별시 영등포구', '11590': '서울특별시 동작구', '11620': '서울특별시 관악구',
  '11650': '서울특별시 서초구', '11680': '서울특별시 강남구', '11710': '서울특별시 송파구',
  '11740': '서울특별시 강동구',
  '41110': '경기도 수원시 장안구', '41111': '경기도 수원시 장안구', '41113': '경기도 수원시 권선구',
  '41115': '경기도 수원시 팔달구', '41117': '경기도 수원시 영통구',
  '41130': '경기도 성남시 수정구', '41131': '경기도 성남시 수정구', '41133': '경기도 성남시 중원구',
  '41135': '경기도 성남시 분당구',
  '41150': '경기도 의정부시', '41170': '경기도 안양시 만안구', '41171': '경기도 안양시 만안구',
  '41173': '경기도 안양시 동안구', '41190': '경기도 부천시',
  '41210': '경기도 광명시', '41220': '경기도 평택시', '41250': '경기도 동두천시',
  '41270': '경기도 안산시 상록구', '41271': '경기도 안산시 상록구', '41273': '경기도 안산시 단원구',
  '41280': '경기도 고양시 덕양구', '41281': '경기도 고양시 덕양구', '41285': '경기도 고양시 일산동구',
  '41287': '경기도 고양시 일산서구',
  '41290': '경기도 과천시', '41310': '경기도 구리시', '41360': '경기도 남양주시',
  '41370': '경기도 오산시', '41390': '경기도 시흥시', '41410': '경기도 군포시',
  '41430': '경기도 의왕시', '41450': '경기도 하남시', '41460': '경기도 용인시 처인구',
  '41461': '경기도 용인시 처인구', '41463': '경기도 용인시 기흥구', '41465': '경기도 용인시 수지구',
  '41480': '경기도 파주시', '41500': '경기도 이천시', '41550': '경기도 안성시',
  '41570': '경기도 김포시', '41590': '경기도 화성시', '41610': '경기도 광주시',
  '41630': '경기도 양주시', '41650': '경기도 포천시', '41670': '경기도 여주시',
};

/** 국토교통부 실거래 데이터 수집 파이프라인 */
@Injectable()
export class DataPipelineService {
  private readonly logger = new Logger(DataPipelineService.name);
  private readonly apiKey: string;
  private lastMolitRequestTime = 0;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    private readonly prisma: PrismaService,
    private readonly marketPricesService: MarketPricesService,
    private readonly geocodingService: GeocodingService,
  ) {
    this.apiKey = this.config.get<string>('MOLIT_API_KEY', '');
  }

  // ──────────────────────────────────────────────
  // 공개 API: 개별 수집
  // ──────────────────────────────────────────────

  /**
   * 아파트 매매 실거래를 수집한다.
   */
  async fetchAptTrades(lawdCd: string, dealYm: string) {
    return this.fetchTrades(lawdCd, dealYm, API_ENDPOINTS.aptTrade);
  }

  /**
   * 아파트 전세/월세 실거래를 수집한다.
   * API 응답에 monthlyRent > 0이면 월세, 아니면 전세로 분류.
   */
  async fetchAptRent(lawdCd: string, dealYm: string) {
    return this.fetchTrades(lawdCd, dealYm, API_ENDPOINTS.aptRent);
  }

  /**
   * 오피스텔 매매 실거래를 수집한다.
   */
  async fetchOffiTrades(lawdCd: string, dealYm: string) {
    return this.fetchTrades(lawdCd, dealYm, API_ENDPOINTS.offiTrade);
  }

  /**
   * 오피스텔 전세/월세 실거래를 수집한다.
   */
  async fetchOffiRent(lawdCd: string, dealYm: string) {
    return this.fetchTrades(lawdCd, dealYm, API_ENDPOINTS.offiRent);
  }

  /**
   * 연립다세대(빌라) 매매 실거래를 수집한다.
   */
  async fetchRhTrades(lawdCd: string, dealYm: string) {
    return this.fetchTrades(lawdCd, dealYm, API_ENDPOINTS.rhTrade);
  }

  /**
   * 연립다세대(빌라) 전세/월세 실거래를 수집한다.
   */
  async fetchRhRent(lawdCd: string, dealYm: string) {
    return this.fetchTrades(lawdCd, dealYm, API_ENDPOINTS.rhRent);
  }

  // ──────────────────────────────────────────────
  // 공개 API: 일괄 수집
  // ──────────────────────────────────────────────

  /**
   * 여러 지역/기간에 대해 데이터를 수집하고 시세를 재계산한다.
   * @param lawdCds 법정동 코드 배열
   * @param months 수집할 최근 개월 수 (기본 12)
   * @param endpointKeys 수집할 API 종류 (기본: 아파트 매매만, 'all'이면 전체)
   */
  async syncAll(
    lawdCds: string[],
    months = 12,
    endpointKeys: string[] = ['aptTrade'],
  ) {
    if (!lawdCds || lawdCds.length === 0) {
      throw new BadRequestException('법정동 코드를 1개 이상 입력해주세요.');
    }
    if (months < 1 || months > 36) {
      throw new BadRequestException('수집 개월 수는 1~36 사이여야 합니다.');
    }

    // 'all' 키워드 지원
    const keys =
      endpointKeys.includes('all')
        ? Object.keys(API_ENDPOINTS)
        : endpointKeys.filter((k) => k in API_ENDPOINTS);

    if (keys.length === 0) {
      throw new BadRequestException(
        `유효하지 않은 endpointKeys. 사용 가능: ${Object.keys(API_ENDPOINTS).join(', ')}, all`,
      );
    }

    const allAffected = new Set<string>();
    const now = new Date();
    const summary: Array<{
      lawdCd: string;
      dealYm: string;
      endpoint: string;
      fetched: number;
      saved: number;
      errors: number;
    }> = [];

    for (const lawdCd of lawdCds) {
      for (let i = 0; i < months; i++) {
        const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dealYm = `${target.getFullYear()}${String(target.getMonth() + 1).padStart(2, '0')}`;

        for (const key of keys) {
          try {
            const result = await this.fetchTrades(lawdCd, dealYm, API_ENDPOINTS[key]);
            result.affectedBuildingIds?.forEach((id) => allAffected.add(id));
            summary.push({
              lawdCd,
              dealYm,
              endpoint: key,
              fetched: result.fetched,
              saved: result.saved,
              errors: result.errors,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            this.logger.error(`수집 실패: ${key} ${lawdCd}/${dealYm} - ${msg}`);
            summary.push({ lawdCd, dealYm, endpoint: key, fetched: 0, saved: 0, errors: 1 });
          }
        }
      }
    }

    // 영향받은 건물의 시세 재계산
    this.logger.log(`시세 재계산: ${allAffected.size}개 건물`);
    for (const buildingId of allAffected) {
      await this.marketPricesService.calculateForBuilding(buildingId);
    }

    return { totalAffectedBuildings: allAffected.size, summary };
  }

  /**
   * 좌표가 (0,0)인 건물들을 일괄 지오코딩한다.
   */
  async geocodeMissingBuildings() {
    return this.geocodingService.geocodeMissingBuildings(this.prisma);
  }

  // ──────────────────────────────────────────────
  // 핵심 수집 로직 (범용)
  // ──────────────────────────────────────────────

  private async fetchTrades(lawdCd: string, dealYm: string, endpoint: ApiEndpoint) {
    if (!this.apiKey) {
      throw new BadRequestException(
        'MOLIT_API_KEY가 설정되지 않았습니다. .env에 API 키를 등록해주세요.',
      );
    }

    if (!/^\d{5}$/.test(lawdCd)) {
      throw new BadRequestException(`유효하지 않은 법정동 코드: "${lawdCd}" (5자리 숫자 필요)`);
    }
    if (!/^\d{6}$/.test(dealYm)) {
      throw new BadRequestException(`유효하지 않은 거래연월: "${dealYm}" (YYYYMM 형식 필요)`);
    }

    this.logger.log(
      `[${endpoint.residenceType}/${endpoint.tradeType}] 수집: lawdCd=${lawdCd}, dealYm=${dealYm}`,
    );

    const data = await this.callMolitApi(lawdCd, dealYm, endpoint.path);

    const header = data?.response?.header;
    const resultCode = header?.resultCode;
    if (resultCode !== '00' && resultCode !== '000') {
      const code = resultCode ?? 'UNKNOWN';
      const msg = header?.resultMsg ?? '알 수 없는 오류';
      this.logger.error(`MOLIT API 오류 응답: [${code}] ${msg}`);
      throw new Error(`MOLIT API 오류: [${code}] ${msg}`);
    }

    const body = data?.response?.body;
    if (!body?.items?.item) {
      this.logger.warn(
        `[${endpoint.residenceType}/${endpoint.tradeType}] 데이터 없음: ${lawdCd}/${dealYm}`,
      );
      return { fetched: 0, saved: 0, errors: 0, affectedBuildingIds: [] as string[] };
    }

    const items: MolitTradeItem[] = Array.isArray(body.items.item)
      ? body.items.item
      : [body.items.item];

    const validItems = items.filter((item) => {
      if (!item.umdNm || !item.excluUseAr || !item.floor) {
        this.logger.debug(`필수 필드 누락 건 제외: ${JSON.stringify(item).slice(0, 200)}`);
        return false;
      }
      // 매매는 dealAmount 필수, 전세/월세는 deposit 필수
      if (endpoint.tradeType === '매매' && !item.dealAmount) return false;
      if (endpoint.tradeType !== '매매' && !item.deposit) return false;
      return true;
    });

    this.logger.log(
      `[${endpoint.residenceType}/${endpoint.tradeType}] ${validItems.length}/${items.length}건 유효`,
    );
    return this.saveTradeItems(validItems, lawdCd, endpoint);
  }

  private async callMolitApi(lawdCd: string, dealYm: string, apiPath: string): Promise<any> {
    const encodedKey = encodeURIComponent(this.apiKey);
    const url = `${MOLIT_BASE_URL}${apiPath}?serviceKey=${encodedKey}`;
    const params = {
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYm,
      pageNo: '1',
      numOfRows: '1000',
      type: 'json',
    };

    for (let attempt = 1; attempt <= MOLIT_MAX_RETRIES; attempt++) {
      await this.throttleMolit();

      try {
        const { data } = await firstValueFrom(
          this.http
            .get(url, { params, timeout: MOLIT_REQUEST_TIMEOUT_MS })
            .pipe(
              timeout(MOLIT_REQUEST_TIMEOUT_MS),
              catchError((err) => {
                throw err;
              }),
            ),
        );

        if (typeof data === 'string' && data.includes('<OpenAPI_ServiceResponse>')) {
          this.logger.error('MOLIT API가 XML 에러를 반환했습니다 - API 키를 확인해주세요');
          throw new Error('MOLIT API 인증 실패 - serviceKey를 확인해주세요');
        }

        return data;
      } catch (error) {
        const isLastAttempt = attempt === MOLIT_MAX_RETRIES;

        if (this.isRetryableError(error) && !isLastAttempt) {
          const waitMs = 1000 * attempt;
          this.logger.warn(
            `MOLIT API 재시도 (${attempt}/${MOLIT_MAX_RETRIES}), ${waitMs}ms 후: ${this.getErrorMessage(error)}`,
          );
          await this.delay(waitMs);
          continue;
        }

        throw error;
      }
    }
  }

  private async saveTradeItems(
    items: MolitTradeItem[],
    sggCd: string,
    endpoint: ApiEndpoint,
  ) {
    let saved = 0;
    const affectedBuildingIds = new Set<string>();
    const errors: string[] = [];

    for (const item of items) {
      try {
        const sggName = SGG_CODE_MAP[sggCd] ?? sggCd;
        const fullAddress = `${sggName} ${item.umdNm} ${item.jibun}`.trim();
        const areaM2 = parseFloat(item.excluUseAr);
        const floor = parseInt(item.floor, 10);
        const buildYear = parseInt(item.buildYear, 10);

        if (isNaN(areaM2) || areaM2 <= 0) {
          this.logger.debug(`면적 파싱 실패: "${item.excluUseAr}"`);
          continue;
        }

        // 거래 유형 및 가격 결정
        let tradeType: string;
        let price: number;
        let deposit: number | null = null;
        let monthlyRent: number | null = null;

        if (endpoint.tradeType === '매매') {
          tradeType = '매매';
          price = parseInt(item.dealAmount.replace(/,/g, '').trim(), 10);
          if (isNaN(price) || price <= 0) {
            this.logger.debug(`매매가 파싱 실패: "${item.dealAmount}"`);
            continue;
          }
        } else {
          // 전세/월세 API: monthlyRent > 0이면 월세, 아니면 전세
          deposit = parseInt((item.deposit ?? '0').replace(/,/g, '').trim(), 10);
          monthlyRent = parseInt((item.monthlyRent ?? '0').replace(/,/g, '').trim(), 10);

          if (isNaN(deposit)) deposit = 0;
          if (isNaN(monthlyRent)) monthlyRent = 0;

          if (monthlyRent > 0) {
            tradeType = '월세';
            price = deposit; // price 필드에 보증금 저장
          } else {
            tradeType = '전세';
            price = deposit; // price 필드에 전세금 저장
            monthlyRent = null;
          }

          if (price <= 0) {
            this.logger.debug(`보증금/전세금 0 이하: 건너뜀`);
            continue;
          }
        }

        const tradedAt = new Date(
          parseInt(item.dealYear),
          parseInt(item.dealMonth) - 1,
          parseInt(item.dealDay),
        );
        if (isNaN(tradedAt.getTime())) {
          this.logger.debug(
            `날짜 파싱 실패: ${item.dealYear}-${item.dealMonth}-${item.dealDay}`,
          );
          continue;
        }

        // 건물명: API마다 필드명이 다를 수 있음
        const buildingName =
          (item as any)[endpoint.nameField] || item.aptNm || null;

        // 건물 upsert (주소 기준)
        let building = await this.prisma.building.findUnique({
          where: { address: fullAddress },
        });

        if (!building) {
          const geo = await this.geocodingService.geocode(fullAddress);
          const lng = geo?.lng ?? 0;
          const lat = geo?.lat ?? 0;

          if (!geo) {
            this.logger.debug(`지오코딩 실패, 좌표 (0,0)으로 저장: "${fullAddress}"`);
          }

          building = await this.prisma.$queryRaw`
            INSERT INTO buildings (id, location, address, building_name, build_year, residence_type, created_at, updated_at)
            VALUES (
              gen_random_uuid(),
              ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
              ${fullAddress},
              ${buildingName},
              ${buildYear},
              ${endpoint.residenceType},
              NOW(), NOW()
            )
            ON CONFLICT (address) DO UPDATE SET updated_at = NOW()
            RETURNING *
          `.then((rows: any[]) => rows[0]);
        }

        // 실거래 insert (중복 무시)
        try {
          await this.prisma.transaction.create({
            data: {
              buildingId: building!.id,
              tradeType,
              price,
              deposit: tradeType !== '매매' ? deposit : undefined,
              monthlyRent: tradeType === '월세' ? monthlyRent : undefined,
              areaM2,
              floor,
              tradedAt,
            },
          });
          saved++;
          affectedBuildingIds.add(building!.id);
        } catch (e: any) {
          if (e.code !== 'P2002') throw e;
          // 중복 거래 - 정상적으로 무시
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(msg);
        if (errors.length <= 5) {
          this.logger.error(`항목 저장 실패: ${msg}`);
        }
      }
    }

    if (errors.length > 5) {
      this.logger.error(`... 외 ${errors.length - 5}건 추가 오류`);
    }

    return {
      fetched: items.length,
      saved,
      errors: errors.length,
      affectedBuildingIds: [...affectedBuildingIds],
    };
  }

  // ──────────────────────────────────────────────
  // 유틸리티
  // ──────────────────────────────────────────────

  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      if (!status) return true;
      return status === 429 || status >= 500;
    }
    if (error instanceof Error && error.name === 'TimeoutError') return true;
    return false;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      return status ? `HTTP ${status}: ${error.message}` : `네트워크 오류: ${error.message}`;
    }
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private async throttleMolit() {
    const now = Date.now();
    const elapsed = now - this.lastMolitRequestTime;
    if (elapsed < MOLIT_REQUEST_INTERVAL_MS) {
      await this.delay(MOLIT_REQUEST_INTERVAL_MS - elapsed);
    }
    this.lastMolitRequestTime = Date.now();
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
