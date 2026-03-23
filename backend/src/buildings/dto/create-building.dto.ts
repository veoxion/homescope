import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateBuildingDto {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng: number;
  @IsString() address: string;
  @IsOptional() @IsString() buildingName?: string;
  @Type(() => Number) @IsNumber() buildYear: number;
  @IsString() residenceType: string; // 아파트, 오피스텔, 빌라, 원룸
}
