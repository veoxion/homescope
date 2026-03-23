import { IsEnum, IsNumber, IsOptional, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LoanLimitDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number; // 만원

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  ltvPercent?: number; // % (기본 70)
}

export class InterestDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  loanAmount: number; // 만원

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  annualRate: number; // % (예: 3.5 = 3.5%)

  @IsEnum(['원리금균등', '원금균등'])
  repaymentType: '원리금균등' | '원금균등';

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  months: number;

  @IsOptional()
  @IsArray()
  rateChanges?: Array<{ fromMonth: number; annualRate: number }>;
}
