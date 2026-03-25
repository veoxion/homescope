import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { LoanLimitDto, InterestDto } from './dto/finance.dto';

@ApiTags('Finance')
@Controller('finance')
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('loan-limit')
  getLoanLimit(@Query() dto: LoanLimitDto) {
    return this.service.calculateLoanLimit(dto);
  }

  @Get('interest')
  getInterest(@Query() dto: InterestDto) {
    return this.service.calculateInterest(dto);
  }
}
