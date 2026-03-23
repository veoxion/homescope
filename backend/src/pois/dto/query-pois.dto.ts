import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryPoisDto {
  @Type(() => Number)
  @IsNumber()
  lat: number;

  @Type(() => Number)
  @IsNumber()
  lng: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  radius?: number = 500;

  @IsOptional()
  @IsString()
  category?: string; // SW8, BU4, SC4
}
