import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryListingsDto {
  @Type(() => Number) @IsNumber() swLat: number;
  @Type(() => Number) @IsNumber() swLng: number;
  @Type(() => Number) @IsNumber() neLat: number;
  @Type(() => Number) @IsNumber() neLng: number;
  @IsOptional() @IsString() tradeType?: string;
  @IsOptional() @IsString() residenceTypes?: string; // comma-separated
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) priceMin?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) @Max(10000000) priceMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) depositMin?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) @Max(10000000) depositMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) monthlyRentMin?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) @Max(100000) monthlyRentMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) areaMin?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) @Max(10000) areaMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(1) page?: number = 1;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(1) @Max(500) limit?: number = 50;
}
