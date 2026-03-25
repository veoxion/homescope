import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { AxiosError } from 'axios';

export interface GeocodingResult {
  lat: number;
  lng: number;
  matchedAddress: string;
}

/**
 * 카카오 주소 검색 API를 사용한 지오코딩 서비스.
 *
 * 방어 전략:
 * - 요청당 타임아웃 5초
 * - 호출 간 최소 100ms 간격 (rate limit 방지)
 * - 최대 2회 재시도 (네트워크 오류만)
 * - 실패 시 null 반환 (호출자가 fallback 결정)
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);
  private readonly apiKey: string;
  private readonly apiUrl = 'https://dapi.kakao.com/v2/local/search/address.json';
  private readonly REQUEST_TIMEOUT_MS = 5000;
  private readonly REQUEST_INTERVAL_MS = 100;
  private readonly MAX_RETRIES = 2;
  private lastRequestTime = 0;
  private throttleLock: Promise<void> = Promise.resolve();

  constructor(
    private readonly http: HttpService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.get<string>('KAKAO_API_KEY', '');
    if (!this.apiKey) {
      this.logger.warn('KAKAO_API_KEY가 설정되지 않았습니다. 지오코딩이 동작하지 않습니다.');
    }
  }

  /**
   * 주소를 좌표로 변환한다.
   * @returns 좌표 결과 또는 null (실패 시)
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      this.logger.warn('KAKAO_API_KEY 미설정 — 지오코딩 건너뜀');
      return null;
    }

    if (!address || address.trim().length === 0) {
      this.logger.warn('빈 주소 — 지오코딩 건너뜀');
      return null;
    }

    // rate limit: 최소 간격 보장
    await this.throttle();

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const result = await this.callApi(address);
        return result;
      } catch (error) {
        const isLastAttempt = attempt === this.MAX_RETRIES;
        const shouldRetry = this.isRetryableError(error);

        if (shouldRetry && !isLastAttempt) {
          this.logger.warn(
            `지오코딩 재시도 (${attempt}/${this.MAX_RETRIES}): "${address}" — ${this.getErrorMessage(error)}`,
          );
          await this.delay(500 * attempt); // 점진적 대기
          continue;
        }

        this.logger.error(
          `지오코딩 최종 실패: "${address}" — ${this.getErrorMessage(error)}`,
        );
        return null;
      }
    }

    return null;
  }

  /**
   * 좌표가 (0, 0)인 건물들을 일괄 지오코딩한다.
   */
  async geocodeMissingBuildings(prisma: any): Promise<{ total: number; success: number; failed: number }> {
    const buildings: Array<{ id: string; address: string }> = await prisma.$queryRaw`
      SELECT id, address FROM buildings
      WHERE ST_X(location::geometry) = 0 AND ST_Y(location::geometry) = 0
    `;

    this.logger.log(`좌표 미설정 건물 ${buildings.length}건 지오코딩 시작`);

    let success = 0;
    let failed = 0;

    for (const building of buildings) {
      const result = await this.geocode(building.address);

      if (result) {
        await prisma.$executeRaw`
          UPDATE buildings
          SET location = ST_SetSRID(ST_MakePoint(${result.lng}, ${result.lat}), 4326)::geography,
              updated_at = NOW()
          WHERE id = ${building.id}::uuid
        `;
        success++;
      } else {
        failed++;
      }

      if ((success + failed) % 50 === 0) {
        this.logger.log(`지오코딩 진행: ${success + failed}/${buildings.length} (성공: ${success}, 실패: ${failed})`);
      }
    }

    this.logger.log(`지오코딩 완료: 총 ${buildings.length}, 성공 ${success}, 실패 ${failed}`);
    return { total: buildings.length, success, failed };
  }

  private async callApi(address: string): Promise<GeocodingResult | null> {
    const response = await firstValueFrom(
      this.http
        .get(this.apiUrl, {
          params: { query: address, analyze_type: 'similar' },
          headers: { Authorization: `KakaoAK ${this.apiKey}` },
          timeout: this.REQUEST_TIMEOUT_MS,
        })
        .pipe(
          timeout(this.REQUEST_TIMEOUT_MS),
          catchError((err) => {
            throw err;
          }),
        ),
    );

    // 응답 구조 검증
    const data = response?.data;
    if (!data || typeof data !== 'object') {
      this.logger.warn(`비정상 응답 형식: "${address}"`);
      return null;
    }

    // 카카오 API 에러 코드 체크
    if (data.errorType) {
      this.logger.error(`카카오 API 에러: ${data.errorType} — ${data.message}`);
      if (data.errorType === 'AccessDeniedError') {
        throw new Error('카카오 API 인증 실패 — API 키를 확인해주세요');
      }
      return null;
    }

    const documents = data.documents;
    if (!Array.isArray(documents) || documents.length === 0) {
      this.logger.debug(`검색 결과 없음: "${address}"`);
      return null;
    }

    const first = documents[0];
    const x = parseFloat(first.x);
    const y = parseFloat(first.y);

    // 좌표 유효성 검증: 대한민국 범위 (lat 33~39, lng 124~132)
    if (isNaN(x) || isNaN(y) || y < 33 || y > 39 || x < 124 || x > 132) {
      this.logger.warn(`유효하지 않은 좌표: "${address}" → (${y}, ${x})`);
      return null;
    }

    return {
      lat: y,
      lng: x,
      matchedAddress: first.address_name ?? address,
    };
  }

  private isRetryableError(error: unknown): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      // 429(Rate Limit), 500~599(서버 오류), 네트워크 오류만 재시도
      if (!status) return true; // 네트워크 오류 (타임아웃 등)
      return status === 429 || status >= 500;
    }
    // 타임아웃 에러
    if (error instanceof Error && error.name === 'TimeoutError') return true;
    return false;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      const msg = error.response?.data?.message ?? error.message;
      return status ? `HTTP ${status}: ${msg}` : `네트워크 오류: ${error.message}`;
    }
    if (error instanceof Error) return error.message;
    return String(error);
  }

  private throttle(): Promise<void> {
    this.throttleLock = this.throttleLock.then(async () => {
      const now = Date.now();
      const elapsed = now - this.lastRequestTime;
      if (elapsed < this.REQUEST_INTERVAL_MS) {
        await this.delay(this.REQUEST_INTERVAL_MS - elapsed);
      }
      this.lastRequestTime = Date.now();
    });
    return this.throttleLock;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
