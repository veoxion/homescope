import { IsNumber, IsOptional, IsString, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class QueryBuildingsDto {
  @Type(() => Number) @IsNumber() swLat: number;
  @Type(() => Number) @IsNumber() swLng: number;
  @Type(() => Number) @IsNumber() neLat: number;
  @Type(() => Number) @IsNumber() neLng: number;
  @Type(() => Number) @IsOptional() @IsNumber() zoom?: number;
}

export class SearchBuildingsDto {
  @IsString() @MaxLength(100) q: string;
  @Type(() => Number) @IsOptional() @IsNumber() @Min(1) limit?: number = 10;
}
