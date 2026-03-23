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

const MOLIT_REQUEST_TIMEOUT_MS = 10000;
const MOLIT_REQUEST_INTERVAL_MS = 200;
const MOLIT_MAX_RETRIES = 3;

/** 법정동코드(5자리) → 시도 시군구 매핑 */
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
  private readonly baseUrl =
    'http://apis.data.go.kr/1613000/RTMSDataSvcAptTradeDev';
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

  /**
   * 특정 법정동 코드 + 연월 기준으로 아파트 매매 실거래를 수집한다.
   * @param lawdCd 법정동 코드 (5자리, 예: 11110)
   * @param dealYm 거래연월 (YYYYMM, 예: 202503)
   */
  async fetchAptTrades(lawdCd: string, dealYm: string) {
    if (!this.apiKey) {
      throw new BadRequestException(
        'MOLIT_API_KEY가 설정되지 않았습니다. .env에 API 키를 등록해주세요.',
      );
    }

    // 입력값 검증
    if (!/^\d{5}$/.test(lawdCd)) {
      throw new BadRequestException(`유효하지 않은 법정동 코드: "${lawdCd}" (5자리 숫자 필요)`);
    }
    if (!/^\d{6}$/.test(dealYm)) {
      throw new BadRequestException(`유효하지 않은 거래연월: "${dealYm}" (YYYYMM 형식 필요)`);
    }

    this.logger.log(`실거래 수집: lawdCd=${lawdCd}, dealYm=${dealYm}`);

    const data = await this.callMolitApi(lawdCd, dealYm);

    // 응답 구조 검증 (resultCode: '00' 또는 '000' 모두 정상)
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
      this.logger.warn(`데이터 없음: lawdCd=${lawdCd}, dealYm=${dealYm}`);
      return { fetched: 0, saved: 0, errors: 0, affectedBuildingIds: [] as string[] };
    }

    const items: MolitTradeItem[] = Array.isArray(body.items.item)
      ? body.items.item
      : [body.items.item];

    // 응답 데이터 기본 검증
    const validItems = items.filter((item) => {
      if (!item.dealAmount || !item.umdNm || !item.excluUseAr || !item.floor) {
        this.logger.debug(`필수 필드 누락 건 제외: ${JSON.stringify(item).slice(0, 200)}`);
        return false;
      }
      return true;
    });

    this.logger.log(`${validItems.length}/${items.length}건 유효 (lawdCd=${lawdCd}, dealYm=${dealYm})`);
    return this.saveTradeItems(validItems, lawdCd);
  }

  private async callMolitApi(lawdCd: string, dealYm: string): Promise<any> {
    // serviceKey는 이미 인코딩된 값이므로 URL에 직접 포함하여 이중 인코딩 방지
    const encodedKey = encodeURIComponent(this.apiKey);
    const url = `${this.baseUrl}/getRTMSDataSvcAptTradeDev?serviceKey=${encodedKey}`;
    const params = {
      LAWD_CD: lawdCd,
      DEAL_YMD: dealYm,
      pageNo: '1',
      numOfRows: '1000',
      type: 'json',
    };

    for (let attempt = 1; attempt <= MOLIT_MAX_RETRIES; attempt++) {
      // rate limit
      await this.throttleMolit();

      try {
        const { data } = await firstValueFrom(
          this.http
            .get(url, { params, timeout: MOLIT_REQUEST_TIMEOUT_MS })
            .pipe(
              timeout(MOLIT_REQUEST_TIMEOUT_MS),
              catchError((err) => { throw err; }),
            ),
        );

        // XML 에러 응답 감지 (API 키 오류 시 JSON 대신 XML 반환하는 경우)
        if (typeof data === 'string' && data.includes('<OpenAPI_ServiceResponse>')) {
          this.logger.error('MOLIT API가 XML 에러를 반환했습니다 — API 키를 확인해주세요');
          throw new Error('MOLIT API 인증 실패 — serviceKey를 확인해주세요');
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

  private async saveTradeItems(items: MolitTradeItem[], sggCd: string) {
    let saved = 0;
    const affectedBuildingIds = new Set<string>();
    const errors: string[] = [];

    for (const item of items) {
      try {
        const sggName = SGG_CODE_MAP[sggCd] ?? sggCd;
        const fullAddress = `${sggName} ${item.umdNm} ${item.jibun}`.trim();
        const price = parseInt(item.dealAmount.replace(/,/g, '').trim(), 10);
        const areaM2 = parseFloat(item.excluUseAr);
        const floor = parseInt(item.floor, 10);
        const buildYear = parseInt(item.buildYear, 10);

        // 파싱 결과 검증
        if (isNaN(price) || price <= 0) {
          this.logger.debug(`가격 파싱 실패: "${item.dealAmount}"`);
          continue;
        }
        if (isNaN(areaM2) || areaM2 <= 0) {
          this.logger.debug(`면적 파싱 실패: "${item.excluUseAr}"`);
          continue;
        }

        const tradedAt = new Date(
          parseInt(item.dealYear),
          parseInt(item.dealMonth) - 1,
          parseInt(item.dealDay),
        );
        if (isNaN(tradedAt.getTime())) {
          this.logger.debug(`날짜 파싱 실패: ${item.dealYear}-${item.dealMonth}-${item.dealDay}`);
          continue;
        }

        // 건물 upsert (주소 기준)
        let building = await this.prisma.building.findUnique({
          where: { address: fullAddress },
        });

        if (!building) {
          // 지오코딩으로 좌표 획득
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
              ${item.aptNm || null},
              ${buildYear},
              '아파트',
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
              tradeType: '매매',
              price,
              areaM2,
              floor,
              tradedAt,
            },
          });
          saved++;
          affectedBuildingIds.add(building!.id);
        } catch (e: any) {
          if (e.code !== 'P2002') throw e;
          // 중복 거래 — 정상적으로 무시
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

  /**
   * 여러 지역·기간에 대해 데이터를 수집하고 시세를 재계산한다.
   * @param lawdCds 법정동 코드 배열
   * @param months 수집할 최근 개월 수 (기본 12)
   */
  async syncAll(lawdCds: string[], months = 12) {
    if (!lawdCds || lawdCds.length === 0) {
      throw new BadRequestException('법정동 코드를 1개 이상 입력해주세요.');
    }
    if (months < 1 || months > 36) {
      throw new BadRequestException('수집 개월 수는 1~36 사이여야 합니다.');
    }

    const allAffected = new Set<string>();
    const now = new Date();
    const summary: Array<{ lawdCd: string; dealYm: string; fetched: number; saved: number; errors: number }> = [];

    for (const lawdCd of lawdCds) {
      for (let i = 0; i < months; i++) {
        const target = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const dealYm = `${target.getFullYear()}${String(target.getMonth() + 1).padStart(2, '0')}`;

        try {
          const result = await this.fetchAptTrades(lawdCd, dealYm);
          result.affectedBuildingIds?.forEach((id) => allAffected.add(id));
          summary.push({ lawdCd, dealYm, fetched: result.fetched, saved: result.saved, errors: result.errors });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          this.logger.error(`수집 실패: ${lawdCd}/${dealYm} — ${msg}`);
          summary.push({ lawdCd, dealYm, fetched: 0, saved: 0, errors: 1 });
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
