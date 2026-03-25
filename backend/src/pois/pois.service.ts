import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { QueryPoisDto } from './dto/query-pois.dto';

interface KakaoPlace {
  id: string;
  place_name: string;
  category_group_code: string;
  category_group_name: string;
  x: string; // lng
  y: string; // lat
  distance: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  SW8: '지하철역',
  BU4: '버스정류장',
  SC4: '학교',
};

@Injectable()
export class PoisService {
  private readonly logger = new Logger(PoisService.name);
  private readonly kakaoApiUrl =
    'https://dapi.kakao.com/v2/local/search/category.json';
  private apiKeyWarned = false;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async findNearby(dto: QueryPoisDto) {
    const apiKey = this.configService.get<string>('KAKAO_API_KEY');
    if (!apiKey) {
      if (!this.apiKeyWarned) {
        this.logger.warn('KAKAO_API_KEY가 설정되지 않았습니다. POI 조회가 동작하지 않습니다.');
        this.apiKeyWarned = true;
      }
      return { pois: [] };
    }
    const categories = dto.category ? [dto.category] : ['SW8', 'BU4', 'SC4'];

    const results = await Promise.all(
      categories.map((categoryGroupCode) =>
        this.fetchCategory(apiKey!, categoryGroupCode, dto),
      ),
    );

    return {
      pois: results
        .flat()
        .map((place: KakaoPlace) => ({
          id: place.id,
          name: place.place_name,
          category:
            CATEGORY_LABELS[place.category_group_code] ??
            place.category_group_name,
          lat: parseFloat(place.y),
          lng: parseFloat(place.x),
          distance: parseInt(place.distance, 10),
        }))
        .sort((a, b) => a.distance - b.distance),
    };
  }

  private async fetchCategory(
    apiKey: string,
    categoryGroupCode: string,
    dto: QueryPoisDto,
  ) {
    try {
      const response = await firstValueFrom(
        this.httpService.get(this.kakaoApiUrl, {
          params: {
            category_group_code: categoryGroupCode,
            x: dto.lng,
            y: dto.lat,
            radius: dto.radius ?? 500,
            size: 15,
          },
          headers: { Authorization: `KakaoAK ${apiKey}` },
        }),
      );
      return response.data.documents ?? [];
    } catch (error) {
      this.logger.error(
        `POI 카테고리 조회 실패 (${categoryGroupCode}): ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }
}
