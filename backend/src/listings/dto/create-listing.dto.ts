import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateListingDto {
  @IsUUID() buildingId: string;
  @IsString() tradeType: string; // 매매, 전세, 월세

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) salePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) jeonsePrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) deposit?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) monthlyRent?: number;

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
