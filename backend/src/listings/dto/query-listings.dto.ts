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
  @Type(() => Number) @IsOptional() @IsNumber() priceMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) depositMin?: number;
  @Type(() => Number) @IsOptional() @IsNumber() depositMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(0) monthlyRentMin?: number;
  @Type(() => Number) @IsOptional() @IsNumber() monthlyRentMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() areaMin?: number;
  @Type(() => Number) @IsOptional() @IsNumber() areaMax?: number;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(1) page?: number = 1;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(1) @Max(500) limit?: number = 50;
}
