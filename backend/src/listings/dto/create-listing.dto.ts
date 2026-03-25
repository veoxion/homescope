import { IsNumber, IsOptional, IsString, IsUUID, Min, IsEnum, ValidateIf, IsDefined } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @IsUUID() buildingId: string;
  @IsEnum(['매매', '전세', '월세']) tradeType: string;

  @ValidateIf((o) => o.tradeType === '매매')
  @IsDefined({ message: '매매 거래에는 salePrice가 필수입니다.' })
  @Type(() => Number) @IsNumber() @Min(0) salePrice?: number;

  @ValidateIf((o) => o.tradeType === '전세')
  @IsDefined({ message: '전세 거래에는 jeonsePrice가 필수입니다.' })
  @Type(() => Number) @IsNumber() @Min(0) jeonsePrice?: number;

  @ValidateIf((o) => o.tradeType === '월세')
  @IsDefined({ message: '월세 거래에는 deposit이 필수입니다.' })
  @Type(() => Number) @IsNumber() @Min(0) deposit?: number;

  @ValidateIf((o) => o.tradeType === '월세')
  @IsDefined({ message: '월세 거래에는 monthlyRent가 필수입니다.' })
  @Type(() => Number) @IsNumber() @Min(0) monthlyRent?: number;

  @Type(() => Number) @IsNumber() @Min(0) areaM2: number;
  @Type(() => Number) @IsNumber() floor: number;
  @Type(() => Number) @IsNumber() @Min(1) roomCount: number;
}

export class UpdateListingDto {
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) jeonsePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) deposit?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monthlyRent?: number;
  @IsOptional() @IsString() status?: string;
}
